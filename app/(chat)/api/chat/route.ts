import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  // Context helpers
  getContextsByIds,
  linkContextsToChat,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(' > Resumable streams are disabled due to missing REDIS_URL');
      } else {
        console.error(error);
      }
    }
  }
  return globalStreamContext;
}

/* Merge user-selected Contexts into system prompt */
function buildContextBlock(
  rows: Array<{ name: string; content: string }>,
  maxChars = 120_000,
) {
  if (!rows.length) return '';
  const joined = rows
    .map((r) => `### Context: ${r.name}\n${r.content.trim()}`)
    .join('\n\n---\n\n');
  const clamped =
    joined.length > maxChars ? joined.slice(0, maxChars) + '\n\n…(truncated)\n' : joined;
  return ['[[CONTEXTUALIZE START]]', clamped, '[[CONTEXTUALIZE END]]'].join('\n\n');
}

/* Build a synthetic user message that *adds context to the query itself* */
function buildInlineContextUserMessage(rows: Array<{ name: string; content: string }>) {
  if (!rows.length) return null;

  // Keep it short but explicit; include full content in a fenced block.
  const noteHeader = `The following user-selected context must be applied when answering.`;
  const payload = rows
    .map(
      (r, idx) =>
        `## ${idx + 1}. ${r.name}\n` +
        '```markdown\n' +
        r.content.trim() +
        '\n```',
    )
    .join('\n\n');

  const text = `${noteHeader}\n\n${payload}`;

  const synthetic: ChatMessage = {
    id: generateUUID(),
    role: 'user',
    parts: [{ type: 'text', text }],
  };

  return synthetic;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      contextIds = [],
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
      contextIds?: string[];
    } = requestBody as any;

    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:chat').toResponse();

    const userType: UserType = session.user.type;
    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });
    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message });
      await saveChat({ id, userId: session.user.id, title, visibility: selectedVisibilityType });
    } else if (chat.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);
    const requestHints: RequestHints = { longitude, latitude, city, country };

    // save only the *real* user message
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    // Merge contexts into system
    let mergedSystem = systemPrompt({ selectedChatModel, requestHints });
    let inlineContextMsg: ChatMessage | null = null;

    if (contextIds.length) {
      const rows = await getContextsByIds(contextIds);
      const block = buildContextBlock(rows.map(({ name, content }) => ({ name, content })));
      if (block) {
        mergedSystem = `${block}\n\n${mergedSystem}`;
      }

      // Link contexts to chat so they persist with history
      await linkContextsToChat({ chatId: id, contextIds });

      // ALSO inject directly into the query as a synthetic user message
      inlineContextMsg = buildInlineContextUserMessage(
        rows.map(({ name, content }) => ({ name, content })),
      );
    }

    // Build final messages array for the model
    const forModel = inlineContextMsg ? [inlineContextMsg, ...uiMessages] : uiMessages;

    // DEBUG: exact payload to model
    try {
      const modelMessages = convertToModelMessages(forModel);
      const systemPreview =
        mergedSystem.length > 3200 ? mergedSystem.slice(0, 3200) + '…(truncated)' : mergedSystem;
      console.log('[LLM REQUEST]', {
        model: selectedChatModel,
        chatId: id,
        contextIds,
        systemPreview,
        messagesCount: modelMessages.length,
        messages: modelMessages, // shows the synthetic context message too
      });
    } catch (e) {
      console.log('[LLM REQUEST] failed to log preview', e);
    }

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: mergedSystem,
          messages: convertToModelMessages(forModel),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : ['getWeather', 'createDocument', 'updateDocument', 'requestSuggestions'],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({ session, dataStream }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();
    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return new ChatSDKError('bad_request:api').toResponse();

  const session = await auth();
  if (!session?.user) return new ChatSDKError('unauthorized:chat').toResponse();

  const chat = await getChatById({ id });
  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });
  return Response.json(deletedChat, { status: 200 });
}
