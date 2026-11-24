# StudyMate AI

A full-stack AI study assistant built with **Next.js, TypeScript, Tailwind CSS, React Markdown, KaTeX, and the Groq API**. Designed as a polished, responsive portfolio project and deployable to Vercel.

## Features

- **AI Tutor** — clear, level-aware explanations and examples.
- **Step-by-step problem solving** — supports guided reasoning rather than answer dumping.
- **Interactive quiz mode** — one question at a time with feedback.
- **Flashcard generation** — active-recall Q&A cards.
- **Study summaries** — structured notes and self-check prompts.
- **Subject and education-level context** — adapts explanations to the learner.
- **Conversation history** — saved in browser local storage.
- **Math and code rendering** — Markdown, GFM tables, fenced code, and LaTeX via KaTeX.
- **Responsive interface** — desktop, tablet, and mobile layouts.
- **Server-side AI requests** — API key stays on the server, never in client-side JavaScript.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS + custom responsive CSS |
| AI | Groq API (`openai/gpt-oss-20b`) |
| Rendering | React Markdown, remark-gfm, remark-math, rehype-katex |
| Icons | Lucide React |
| Hosting | Vercel |

## Run locally

### 1. Requirements
- Node.js 18.17+ (Node 20 LTS recommended)
- A Groq API key from [Groq Console](https://console.groq.com/)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure your API key
Copy `.env.example` to `.env.local` and add your key:
```env
GROQ_API_KEY=your_actual_key
```
Do not commit `.env.local`. It is already excluded by `.gitignore`.

### 4. Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 5. Production build check
```bash
npm run build
npm start
```

## Deploy publicly with Vercel

1. Push this project to a GitHub repository.
2. Sign in to [Vercel](https://vercel.com/) with GitHub.
3. Select **Add New → Project**, then import your `studymate-ai` repository.
4. Keep the detected framework as **Next.js**.
5. In **Environment Variables**, add:
   - Name: `GROQ_API_KEY`
   - Value: your Groq API key
   - Environments: Production, Preview, and Development (as appropriate)
6. Select **Deploy**.
7. After deployment, open the generated `*.vercel.app` URL and test a prompt.

When you change environment variables, redeploy for the changes to take effect.

## Project structure

```text
studymate-ai/
├── app/
│   ├── api/chat/route.ts     # Secure server-side Groq API endpoint
│   ├── globals.css           # Responsive design system
│   ├── layout.tsx            # App metadata and global styles
│   └── page.tsx              # Main route
├── components/
│   └── StudyWorkspace.tsx   # Chat, modes, settings, and session UI
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Engineering notes

- The browser calls `/api/chat`; the Groq key is read only by the server route.
- Conversation history is stored in the current browser's local storage. It is not synced between devices or accounts.
- The API route validates message shape and size, limits conversation length, and returns user-friendly errors.
- The model name is configured in `app/api/chat/route.ts`.
- AI-generated content can be incorrect. Users should verify important academic information.

## Potential next iterations

- User accounts and cloud-synced study history.
- Upload and extract notes/PDFs.
- Persistent flashcard decks with spaced repetition.
- Streaming responses.
- Automated tests and usage analytics.
- Per-user rate limits and abuse protection.

## License

MIT — see `LICENSE`.
