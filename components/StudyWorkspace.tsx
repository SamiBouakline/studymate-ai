"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { BookOpen, BrainCircuit, Calculator, CircleHelp, FileText, Menu, Plus, Send, Trash2, X } from "lucide-react";

type Mode = "tutor" | "solve" | "quiz" | "flashcards" | "summarize";
type Message = { role: "user" | "assistant"; content: string };
type Session = { id: string; title: string; subject: string; mode: Mode; messages: Message[]; updatedAt: number };

const modes: {
  id: Mode; label: string; description: string; placeholder: string; examples: string[]; icon: typeof BrainCircuit;
}[] = [
  {
    id: "tutor", label: "Learn", icon: BrainCircuit,
    description: "Get a concept explained at your level",
    placeholder: "Ask about any concept…",
    examples: ["Explain Newton's second law with an example", "What is the difference between mitosis and meiosis?"]
  },
  {
    id: "solve", label: "Solve", icon: Calculator,
    description: "Work through a problem one step at a time",
    placeholder: "Paste a problem to work through…",
    examples: ["Help me solve 2x^2 - 5x - 3 = 0 step by step", "How do I find the derivative of x^2 * sin(x)?"]
  },
  {
    id: "quiz", label: "Quiz", icon: CircleHelp,
    description: "Answer questions one at a time and get feedback",
    placeholder: "Name a topic to be quizzed on…",
    examples: ["Quiz me on the causes of the French Revolution", "Test me on the basics of cell biology"]
  },
  {
    id: "flashcards", label: "Flashcards", icon: BookOpen,
    description: "Generate question-and-answer cards to review",
    placeholder: "Name a topic or paste your notes…",
    examples: ["Make flashcards for the main types of chemical bonds", "Make flashcards for key terms in supply and demand"]
  },
  {
    id: "summarize", label: "Summarize", icon: FileText,
    description: "Turn your notes into a structured study guide",
    placeholder: "Paste your notes here…",
    examples: ["Summarize the causes and effects of World War I", "Summarize how photosynthesis works"]
  }
];

const subjects = ["General", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English", "History"];
const levels = ["Grade 9", "Grade 10", "Grade 11", "Grade 12", "University", "Self-study"];

function makeSession(): Session {
  return { id: crypto.randomUUID(), title: "New session", subject: "General", mode: "tutor", messages: [], updatedAt: Date.now() };
}

/**
 * Language models often write math as \( ... \) and \[ ... \]. The Markdown renderer
 * only understands $...$ and $$...$$, and it also treats a backslash before ( or [ as an
 * escape, which is what produced the stray brackets and commas. Convert before rendering,
 * and leave fenced code blocks untouched.
 */
function normalizeMath(text: string): string {
  return text
    .split(/(```[\s\S]*?```)/g)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, m: string) => "\n\n$$\n" + m.trim() + "\n$$\n\n")
        .replace(/\\\(([\s\S]+?)\\\)/g, (_, m: string) => "$" + m.trim() + "$");
    })
    .join("");
}

export default function StudyWorkspace() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState("");
  const [mode, setMode] = useState<Mode>("tutor");
  const [subject, setSubject] = useState("General");
  const [level, setLevel] = useState("Grade 12");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("studymate-sessions-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as Session[];
        if (Array.isArray(parsed) && parsed.length) {
          setSessions(parsed);
          setActiveId(parsed[0].id);
          setSubject(parsed[0].subject || "General");
          setMode(parsed[0].mode || "tutor");
          return;
        }
      }
    } catch { /* Ignore invalid local browser data and start fresh. */ }
    const first = makeSession();
    setSessions([first]);
    setActiveId(first.id);
  }, []);

  useEffect(() => {
    if (sessions.length) localStorage.setItem("studymate-sessions-v1", JSON.stringify(sessions));
  }, [sessions]);

  const active = useMemo(() => sessions.find(s => s.id === activeId), [sessions, activeId]);
  const messages = active?.messages || [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  // Grow the text box with its content, up to a maximum height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [input]);

  function updateActive(patch: Partial<Session>) {
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, ...patch, updatedAt: Date.now() } : s));
  }
  function newSession() {
    const next = makeSession();
    setSessions(prev => [next, ...prev]);
    setActiveId(next.id); setSubject("General"); setMode("tutor"); setInput(""); setError(""); setSidebarOpen(false);
  }
  function openSession(session: Session) {
    setActiveId(session.id); setSubject(session.subject); setMode(session.mode); setError(""); setSidebarOpen(false);
  }
  function removeSession(id: string) {
    const next = sessions.filter(s => s.id !== id);
    if (!next.length) {
      const fresh = makeSession(); setSessions([fresh]); setActiveId(fresh.id); setSubject("General"); setMode("tutor");
    } else {
      setSessions(next);
      if (activeId === id) { setActiveId(next[0].id); setSubject(next[0].subject); setMode(next[0].mode); }
    }
  }
  function chooseMode(next: Mode) { setMode(next); updateActive({ mode: next }); }
  function chooseSubject(next: string) { setSubject(next); updateActive({ subject: next }); }

  async function sendMessage(text = input, retry = false) {
    const content = text.trim();
    if (!content || loading || !active) return;
    // On retry the user's message is already in the conversation, so don't add it twice.
    const nextMessages: Message[] = retry ? messages : [...messages, { role: "user", content }];
    setInput(""); setError(""); setLoading(true);
    const title = messages.length === 0 ? content.slice(0, 42) + (content.length > 42 ? "…" : "") : active.title;
    updateActive({ messages: nextMessages, title, subject, mode });
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, subject, level, mode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to get a response.");
      setSessions(prev => prev.map(s => s.id === activeId
        ? { ...s, messages: [...nextMessages, { role: "assistant", content: data.reply }], updatedAt: Date.now() }
        : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  const currentMode = modes.find(m => m.id === mode) || modes[0];
  const hasMessages = messages.length > 0;

  return (
    <div className="app">
      {sidebarOpen && <button className="scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-head">
          <span className="brand">StudyMate</span>
          <button className="icon-button close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18} /></button>
        </div>
        <button className="new-session" onClick={newSession}><Plus size={16} /> New session</button>
        <div className="history-label">Recent</div>
        <div className="history">
          {sessions.map(s => (
            <div key={s.id} className={`history-item ${s.id === activeId ? "selected" : ""}`}>
              <button className="history-open" onClick={() => openSession(s)} title={s.title}>{s.title}</button>
              <button className="history-delete" onClick={() => removeSession(s.id)} aria-label={`Delete ${s.title}`}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <p className="sidebar-note">Sessions are saved in this browser only.</p>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <span className="topbar-title">{hasMessages ? active?.title : "New session"}</span>
        </header>

        <div className="scroll">
          <div className="content">
            {!hasMessages ? (
              <section className="welcome">
                <h1>What are you studying today?</h1>
                <p className="lead">Choose how you want to work, then ask your question.</p>
                <div className="mode-list" role="radiogroup" aria-label="Study mode">
                  {modes.map(m => {
                    const Icon = m.icon;
                    return (
                      <button key={m.id} role="radio" aria-checked={mode === m.id} className={`mode-row ${mode === m.id ? "selected" : ""}`} onClick={() => chooseMode(m.id)}>
                        <Icon size={18} />
                        <span className="mode-name">{m.label}</span>
                        <span className="mode-desc">{m.description}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="examples">
                  <div className="examples-label">Examples</div>
                  {currentMode.examples.map(e => (
                    <button key={e} className="example" onClick={() => sendMessage(e)}>{e}</button>
                  ))}
                </div>
              </section>
            ) : (
              <section className="conversation">
                {messages.map((m, i) => m.role === "user" ? (
                  <div key={i} className="msg msg-user"><div className="bubble">{m.content}</div></div>
                ) : (
                  <div key={i} className="msg msg-ai">
                    <div className="markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeMath(m.content)}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {loading && <div className="thinking"><i /><i /><i /><span>Thinking</span></div>}
                {error && (
                  <div className="error">
                    <span>{error}</span>
                    <button onClick={() => sendMessage(messages[messages.length - 1]?.content, true)}>Try again</button>
                  </div>
                )}
                <div ref={bottomRef} />
              </section>
            )}
          </div>
        </div>

        <div className="composer-area">
          <div className="composer-inner">
            <div className="toolbar">
              {hasMessages ? (
                <div className="tabs" role="group" aria-label="Study mode">
                  {modes.map(m => (
                    <button key={m.id} className="tab" aria-pressed={mode === m.id} onClick={() => chooseMode(m.id)}>{m.label}</button>
                  ))}
                </div>
              ) : <span />}
              <div className="selects">
                <select value={subject} onChange={e => chooseSubject(e.target.value)} aria-label="Subject">
                  {subjects.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={level} onChange={e => setLevel(e.target.value)} aria-label="Education level">
                  {levels.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="composer">
              <textarea
                ref={textareaRef} value={input} rows={1} aria-label="Message"
                placeholder={currentMode.placeholder}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <button className="send" onClick={() => sendMessage()} disabled={!input.trim() || loading} aria-label="Send message"><Send size={16} /></button>
            </div>
            <p className="footnote">Press Enter to send, Shift+Enter for a new line. StudyMate can make mistakes, so check important details.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
