import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
} from 'drizzle-orm/pg-core';

/* ──────────────────────────────────────────────────────────────
   USERS
   ────────────────────────────────────────────────────────────── */
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});
export type User = InferSelectModel<typeof user>;

/* ──────────────────────────────────────────────────────────────
   CHATS
   ────────────────────────────────────────────────────────────── */
export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId').notNull().references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});
export type Chat = InferSelectModel<typeof chat>;

/* ──────────────────────────────────────────────────────────────
   CONTEXTUALIZE: Context library + linkage to chats
   ────────────────────────────────────────────────────────────── */
export const context = pgTable('Context', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  content: text('content').notNull(),               // markdown / plain text
  tags: text('tags').array().notNull().default([]), // string[]
  description: text('description'),
  createdBy: uuid('createdBy').notNull().references(() => user.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});
export type Context = InferSelectModel<typeof context>;

export const chatContext = pgTable(
  'ChatContext',
  {
    chatId: uuid('chatId').notNull().references(() => chat.id),
    contextId: uuid('contextId').notNull().references(() => context.id),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.chatId, t.contextId] }),
    chatRef: foreignKey({
      columns: [t.chatId],
      foreignColumns: [chat.id],
    }),
    contextRef: foreignKey({
      columns: [t.contextId],
      foreignColumns: [context.id],
    }),
  }),
);
export type ChatContext = InferSelectModel<typeof chatContext>;

/* ──────────────────────────────────────────────────────────────
   (Deprecated) Message_v1 + Vote_v1
   ────────────────────────────────────────────────────────────── */
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId').notNull().references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});
export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

/* ──────────────────────────────────────────────────────────────
   Messages v2 + votes v2
   ────────────────────────────────────────────────────────────── */
export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId').notNull().references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});
export type DBMessage = InferSelectModel<typeof message>;

export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId').notNull().references(() => chat.id),
    messageId: uuid('messageId').notNull().references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  }),
);
export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId').notNull().references(() => chat.id),
    messageId: uuid('messageId').notNull().references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  }),
);
export type Vote = InferSelectModel<typeof vote>;

/* ──────────────────────────────────────────────────────────────
   Documents + Suggestions + Streams
   ────────────────────────────────────────────────────────────── */
export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId').notNull().references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  }),
);
export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId').notNull().references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);
export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);
export type Stream = InferSelectModel<typeof stream>;
