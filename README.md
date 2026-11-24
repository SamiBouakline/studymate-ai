# StudyMate AI

An AI study assistant for high school and university students. Pick a study mode, choose a subject and grade level, and get explanations, worked solutions, quizzes, flashcards, or summaries written for your level.

**Live demo: [studymateai-psi.vercel.app](https://studymateai-psi.vercel.app/)**

Built with Next.js, TypeScript, Tailwind CSS, and the Groq API.

## Study modes

| Mode | What it does |
|---|---|
| **Learn** | Explains a concept at your grade level, starting with the core idea and a worked example. |
| **Solve** | Walks through a problem step by step and explains why each step is valid, rather than only giving the final answer. |
| **Quiz** | Asks one question at a time, waits for your answer, then gives feedback and corrects misconceptions. |
| **Flashcards** | Generates question-and-answer cards for active recall. |
| **Summarize** | Turns pasted notes into a structured study guide with a short self-check. |

## Features

- Subject and grade-level selectors that change how the AI explains things.
- Math rendered with KaTeX, plus Markdown tables and syntax-friendly code blocks.
- Multiple study sessions with history, saved in your browser's local storage.
- Responsive layout with a slide-out sidebar on small screens.
- Retry on errors without duplicating your message.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS and custom CSS |
| AI | Groq API (`openai/gpt-oss-20b`) |
| Rendering | react-markdown, remark-gfm, remark-math, rehype-katex |
| Icons | lucide-react |
| Hosting | Vercel |

## How it works

The browser never talks to the AI provider directly. The chat interface sends the conversation, subject, grade level, and mode to a Next.js API route (`app/api/chat/route.ts`). That route builds a system prompt for the selected mode, calls Groq with the API key read from a server-side environment variable, and returns the reply.

Some implementation details:

- **API key stays on the server.** `GROQ_API_KEY` is only read in the API route and is never sent to the browser.
- **Input validation.** The route accepts at most 30 messages per request and 8,000 characters per message, and returns readable error messages.
- **Request timeout.** Calls to the AI provider time out after 45 seconds.
- **Math formatting.** Language models often write equations as `\( ... \)` and `\[ ... \]`, which Markdown renderers mangle. The client converts these to `$...$` and `$$...$$` before rendering, and leaves code blocks untouched. The system prompt also asks the model to use dollar-sign delimiters.
- **Mode-specific prompts.** Each study mode has its own instructions, for example the quiz mode must wait for an answer before revealing it.

## Project structure

```text
studymate-ai/
├── app/
│   ├── api/chat/route.ts      # Server-side Groq endpoint and mode prompts
│   ├── globals.css            # Design tokens, layout, and Markdown styles
│   ├── layout.tsx             # App metadata and global styles
│   └── page.tsx               # Main route
├── components/
│   └── StudyWorkspace.tsx     # Sessions, modes, chat UI, and math handling
├── .env.example
├── package.json
└── README.md
```

## Run it locally

You need Node.js 18.17 or newer and a free API key from the [Groq Console](https://console.groq.com/).

```bash
npm install
```

Copy `.env.example` to `.env.local` and add your key:

```env
GROQ_API_KEY=your_key_here
```

Start the development server and open [http://localhost:3000](http://localhost:3000):

```bash
npm run dev
```

To check a production build:

```bash
npm run build
npm start
```

## Deploy your own copy

1. Fork or clone this repository to your GitHub account.
2. In [Vercel](https://vercel.com/), choose **Add New → Project** and import the repository.
3. Under **Environment Variables**, add `GROQ_API_KEY` with your own key.
4. Deploy. After changing environment variables later, redeploy for them to take effect.

Never commit a real API key. `.env.local` is excluded by `.gitignore`.

## Known limitations

- Chat history lives in your browser's local storage, so it is not synced across devices and clears if you clear site data.
- Responses are not streamed. The full answer appears when the model finishes.
- There is no per-user rate limiting, so heavy use of the public demo can exhaust the shared Groq quota.
- Quizzes and flashcards are produced as chat text, not as interactive cards.
- AI-generated answers can be wrong. Check important academic information against your course materials.

## Ideas for next steps

- Flip-style flashcard decks with spaced repetition.
- Streaming responses.
- Uploading notes or PDFs to summarize.
- User accounts with synced study history.
- Rate limiting and automated tests.

## License

MIT. See `LICENSE`.
