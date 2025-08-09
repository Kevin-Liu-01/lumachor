````md
<p align="center">
  <img alt="Lumachor mark" src="public/brand/lumachor-mark.svg" width="84" />
</p>

<h1 align="center">Lumachor — Contextualize AI with Bulletproof Context</h1>
<p align="center">
  Built on the <a href="https://github.com/vercel/ai-chatbot">Chat SDK</a> template for Next.js & the AI SDK.
</p>

<p align="center">
  Lumachor is a turnkey <strong>Context Engine</strong> that sits on top of best-in-class LLMs and injects high-quality, tagged contexts into every conversation.<br/>
  Stop wrangling prompts—pick a use case or describe your need and get studio-quality outputs instantly.
</p>

<p align="center">
  <a href="#lumachor-overview"><strong>What is Lumachor?</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#architecture"><strong>Architecture</strong></a> ·
  <a href="#api--data-model"><strong>API & Data Model</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy</strong></a> ·
  <a href="#running-locally"><strong>Run locally</strong></a> ·
  <a href="#logo--brand"><strong>Logo & Brand</strong></a>
</p>

<br/>

---

## Lumachor Overview

**Elevator Pitch**  
Lumachor isn’t another chatbot—it’s the world’s first **Context Engine**. We curate, tag, and generate contexts you can drop into any LLM conversation (OpenAI, Anthropic, etc.). No prompt-engineering degree required.

- **Context is the moat.** Models are commoditized; the right context unlocks their power.
- **Wrapper, not a model.** We leverage leading APIs and focus on context quality.
- **End-user simplicity.** Select a template or describe your need—Lumachor retrieves or generates the context automatically.

### What you can do

- **Instant Context Generation:** “I need a calculus tutor” → Lumachor returns a tailored, structured context.
- **Tagged Context Library:** Prebuilt and discoverable with full-text search + tag filters.
- **Multi-Model Chat:** Choose providers at runtime; Lumachor slides the context into every request.
- **Research-Driven Improvement:** Our lab continuously ingests/benchmarks “state of the art” prompts and refines them for vertical excellence.

---

## Features

> All Chat SDK template features are preserved and extended. Thank you, Vercel team. 💚

- **Next.js App Router**
  - Advanced routing for seamless navigation and performance
  - React Server Components and Server Actions for fast, data-driven UIs
- **Vercel AI SDK**
  - Unified API for text, tool calls, and structured outputs
  - Hooks for building dynamic chat and generative interfaces
- **shadcn/ui**
  - Tailwind CSS + Radix UI primitives
- **Data Persistence**
  - Neon/Supabase Postgres for chat history and context storage
  - Vercel Blob for file uploads
- **Auth.js**
  - Simple, secure authentication
- **Lumachor Extensions**
  - Context Builder (generate from free-text + tags)
  - Context Library with search, tags, stars, public/private
  - Chat panel with **context injection**, **model switching**, **attachments**
  - Beautiful, responsive Sidebar + Library + Search experience
  - Elaborate, on-brand error and 404 pages

---

## Model Providers

This template ships with xAI’s `grok-2-1212` (via AI SDK) by default. With the AI SDK you can switch LLMs in a few lines to OpenAI, Anthropic, Cohere, Fireworks, and more.

---

## Architecture

**Frontend**: Next.js 14, TypeScript, Tailwind, shadcn/ui, lucide-react  
**State**: SWR (or React Query) + `useLocalStorage` for drafts/offline  
**Auth**: Auth.js  
**Storage**: Neon/Supabase Postgres + Vercel Blob

**High-level flow**

1. **User describes goal** (“What should the AI know?”).
2. **Context Retrieval/Generation**
   - If a tagged match exists → fetch it.
   - Else → generate a new context (LLM), save with metadata (name, tags, description).
3. **Chat**
   - Start a session; Lumachor injects the selected context into each request.
4. **Continuous Improvement**
   - Capture ratings/feedback to refine contexts over time.

---

## API & Data Model

### Tables (Postgres)

```sql
CREATE TABLE contexts (
  id UUID PRIMARY KEY,
  name TEXT,
  content TEXT,            -- structured JSON or markdown
  tags TEXT[],             -- e.g. ['homework','cook','interview']
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID,
  context_id UUID,         -- nullable (auto-generate on first message if none)
  messages JSONB,          -- streaming-friendly shape
  created_at TIMESTAMP DEFAULT now()
);
```
````

### Core Endpoints

- `POST /api/contexts/generate`
  Input: `{ userPrompt: string, tags: string[], model?: string }`
  Action: Calls LLM to assemble a structured context → saves row → returns context.

- `GET /api/contexts`
  Query: `?mine=1&starred=1&tags=a,b&withMeta=1`
  Action: List/paginate + filter by ownership/tags.

- `PATCH /api/contexts/:id`
  Toggle like/star, update metadata.

- `DELETE /api/contexts/:id`
  Remove context.

- `POST /api/chat` (or via route handlers with AI SDK)
  Accepts `{ messages, contextId?, model }` and streams model output with injected context.

> The **Context Builder** prompt enforces a consistent structure: Title, Description, Background & Goals, Tone & Style, Constraints & Scope, Example Prompts.

---

## UI Highlights

- **Sidebar**: Always on-screen; content gracefully insets and scrolls alongside it.
- **Library**: Sticky header controls, filterable tag rail, grid/list switcher, inspector panel.
- **Search**: Jumbo search bar, range filters (24h/7d/30d), list/grid, Enter to open top hit.
- **Input Control Pill**: Live state (auto/ready/streaming/busy) with soft indigo accents.
- **Error & 404**: On-brand, glassy, animated fallback pages.

---

## Deploy Your Own

You can deploy your own version to Vercel with one click (inherits the original template setup):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI+Chatbot&demo-description=An+Open-Source+AI+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-kv%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

---

## Running locally

Use the environment variables defined in [`.env.example`](.env.example). Vercel Project Env Vars are recommended, but a local `.env` works too.

> **Do not commit** your `.env`.

1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Pull env vars: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app should be running on [http://localhost:3000](http://localhost:3000).

---

## Roadmap (Selected)

- ✅ Context Builder (generate → tag → save → use)
- ✅ Library with stars, public/private, inspector
- ✅ Multi-model chat with context injection
- ⏭ Eval harness for automated context benchmarking
- ⏭ Analytics and context-quality scoring
- ⏭ Multimodal contexts (voice, image) & richer tools

---

## Logo & Brand

We ship the **Lumachor mark** as inline SVG and as files under `public/brand/`.

### Files

- `public/brand/lumachor-mark.svg` (default)
- `public/brand/lumachor-mark-bw.svg` (monochrome)
- `public/brand/lumachor-mark-solid.svg` (non-transparent variant)

### React usage

```tsx
// components/LumachorMark.tsx
export function LumachorMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        ry="8"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M8 18c0-4.418 3.582-8 8-8 2.8 0 5.26 1.46 6.67 3.66.2.3.06.7-.26.86l-2.22 1.1a.66.66 0 0 1-.84-.23A5.33 5.33 0 0 0 16 13.33c-2.95 0-5.33 2.38-5.33 5.34V22c0 .37-.3.67-.67.67H8.67A.67.67 0 0 1 8 22v-4Z"
        fill="currentColor"
        opacity="0.85"
      />
      <circle cx="22.5" cy="21" r="2.5" fill="#C7D2FE" opacity="0.75" />
    </svg>
  );
}
```

- **Default**: soft indigo base, subtle background rect (`opacity="0.12"`), accent dot `#C7D2FE` (indigo-200) at `opacity="0.75"`.
- **Monochrome**: use `lumachor-mark-bw.svg` or set all fills to `currentColor`.
- **Solid (non-transparent)**: `lumachor-mark-solid.svg` uses an opaque background for places where translucency clashes.

Example in README top banner:

```html
<p align="center">
  <img alt="Lumachor mark" src="public/brand/lumachor-mark.svg" width="84" />
</p>
```

---

## Acknowledgements

This project proudly builds on the **Chat SDK** template by Vercel.

- Template: <a href="https://github.com/vercel/ai-chatbot">vercel/ai-chatbot</a>
- AI SDK: <a href="https://sdk.vercel.ai/docs">sdk.vercel.ai</a>
- Next.js: <a href="https://nextjs.org">nextjs.org</a>
- shadcn/ui: <a href="https://ui.shadcn.com">ui.shadcn.com</a>

Thanks to the open-source prompt community for inspiration and research materials.

---

## License

MIT for template code unless otherwise noted. See repository LICENSE.

````

---

### Included logo files (add these to your repo)

**`public/brand/lumachor-mark.svg`** (default, soft accent)

```svg
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="28" height="28" rx="8" ry="8" fill="currentColor" opacity="0.12"/>
  <path d="M8 18c0-4.418 3.582-8 8-8 2.8 0 5.26 1.46 6.67 3.66.2.3.06.7-.26.86l-2.22 1.1a.66.66 0 0 1-.84-.23A5.33 5.33 0 0 0 16 13.33c-2.95 0-5.33 2.38-5.33 5.34V22c0 .37-.3.67-.67.67H8.67A.67.67 0 0 1 8 22v-4Z" fill="currentColor" opacity="0.85"/>
  <circle cx="22.5" cy="21" r="2.5" fill="#C7D2FE" opacity="0.75"/>
</svg>
````

**`public/brand/lumachor-mark-bw.svg`** (monochrome)

```svg
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="28" height="28" rx="8" ry="8" fill="currentColor" opacity="0.12"/>
  <path d="M8 18c0-4.418 3.582-8 8-8 2.8 0 5.26 1.46 6.67 3.66.2.3.06.7-.26.86l-2.22 1.1a.66.66 0 0 1-.84-.23A5.33 5.33 0 0 0 16 13.33c-2.95 0-5.33 2.38-5.33 5.34V22c0 .37-.3.67-.67.67H8.67A.67.67 0 0 1 8 22v-4Z" fill="currentColor" opacity="0.85"/>
  <circle cx="22.5" cy="21" r="2.5" fill="currentColor" opacity="0.65"/>
</svg>
```

**`public/brand/lumachor-mark-solid.svg`** (opaque background)

```svg
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="28" height="28" rx="8" ry="8" fill="currentColor"/>
  <path d="M8 18c0-4.418 3.582-8 8-8 2.8 0 5.26 1.46 6.67 3.66.2.3.06.7-.26.86l-2.22 1.1a.66.66 0 0 1-.84-.23A5.33 5.33 0 0 0 16 13.33c-2.95 0-5.33 2.38-5.33 5.34V22c0 .37-.3.67-.67.67H8.67A.67.67 0 0 1 8 22v-4Z" fill="white" opacity="0.9"/>
  <circle cx="22.5" cy="21" r="2.5" fill="#C7D2FE" opacity="0.85"/>
</svg>
```
