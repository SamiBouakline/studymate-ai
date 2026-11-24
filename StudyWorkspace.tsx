"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Atom, BookOpen, BrainCircuit, Calculator, Check, ChevronDown, CircleHelp,
  Clock3, Code2, Command, FileText, GraduationCap, History, Lightbulb,
  Menu, MessageCircle, Plus, Send, Settings2, Sparkles, SquarePen, Trash2,
  X, Zap
} from "lucide-react";

type Mode = "tutor" | "solve" | "quiz" | "flashcards" | "summarize";
type Message = { role: "user" | "assistant"; content: string };
type Session = { id: string; title: string; subject: string; mode: Mode; messages: Message[]; updatedAt: number };

const modes: { id: Mode; label: string; description: string; icon: typeof BrainCircuit }[] = [
  { id: "tutor", label: "AI Tutor", description: "Understand any concept", icon: BrainCircuit },
  { id: "solve", label: "Solve a problem", description: "Work through it step by step", icon: Calculator },
  { id: "quiz", label: "Quiz me", description: "Test your understanding", icon: CircleHelp },
  { id: "flashcards", label: "Flashcards", description: "Remember what matters", icon: BookOpen },
  { id: "summarize", label: "Summarize notes", description: "Turn notes into a study guide", icon: FileText }
];

const subjects = ["General", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English", "History"];
const suggestions = [
  { icon: Atom, title: "Explain a tough concept", prompt: "Explain a difficult concept in this subject using a simple analogy and then a more rigorous explanation." },
  { icon: Calculator, title: "Help me solve a problem", prompt: "I have a problem I want to solve. Help me understand the steps without giving away the final answer immediately." },
  { icon: BrainCircuit, title: "Test my knowledge", prompt: "Quiz me on the most important concepts in this subject, one question at a time." },
  { icon: Lightbulb, title: "Make it make sense", prompt: "What are the most commonly misunderstood ideas in this subject? Explain how to avoid those misconceptions." }
];

function makeSession(): Session {
  return { id: crypto.randomUUID(), title: "New study session", subject: "General", mode: "tutor", messages: [], updatedAt: Date.now() };
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  async function sendMessage(text = input) {
    const content = text.trim();
    if (!content || loading || !active) return;
    const nextMessages: Message[] = [...messages, { role: "user", content }];
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
  const ModeIcon = currentMode.icon;

  return (
    <main className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={19} /></div>
          <span className="brand-name">study<span>mate</span></span>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18} /></button>
        </div>
        <button className="new-chat-button" onClick={newSession}><Plus size={17} /> New study session <span className="shortcut">⌘ K</span></button>
        <div className="side-section">
          <div className="section-label">WORKSPACE</div>
          <button className="nav-item active"><MessageCircle size={17} /> Study assistant</button>
          <button className="nav-item" onClick={() => { chooseMode("flashcards"); setSidebarOpen(false); }}><BookOpen size={17} /> Flashcard maker</button>
          <button className="nav-item" onClick={() => { chooseMode("quiz"); setSidebarOpen(false); }}><BrainCircuit size={17} /> Practice quiz</button>
        </div>
        <div className="history-section">
          <div className="history-heading"><span className="section-label">RECENT SESSIONS</span><History size={14} /></div>
          <div className="history-list">
            {sessions.map(s => (
              <div key={s.id} className={`history-item ${s.id === activeId ? "selected" : ""}`}>
                <button onClick={() => openSession(s)} title={s.title}><MessageCircle size={15} /><span>{s.title}</span></button>
                <button className="delete-session" onClick={() => removeSession(s.id)} aria-label={`Delete ${s.title}`}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="plan-card"><div className="plan-icon"><Zap size={16} /></div><div><strong>Your learning space</strong><p>Built for curious minds.</p></div></div>
          <button className="profile-row" onClick={() => setSettingsOpen(v => !v)}>
            <div className="avatar">S</div><div className="profile-copy"><strong>Student</strong><span>Personal workspace</span></div><Settings2 size={17} />
          </button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>Study assistant</strong></div>
          </div>
          <div className="topbar-right">
            <div className="status-pill"><span className="status-dot" /> AI online</div>
            <button className="level-select" onClick={() => setSettingsOpen(v => !v)}><GraduationCap size={16} /> {level} <ChevronDown size={14} /></button>
          </div>
        </header>

        <div className="content-scroll">
          <div className="workspace-content">
            {messages.length === 0 ? (
              <div className="welcome-screen">
                <div className="welcome-eyebrow"><span className="eyebrow-spark"><Sparkles size={13} /></span> YOUR PERSONAL STUDY PARTNER</div>
                <h1>Make learning<br /><span>click.</span></h1>
                <p className="welcome-subtitle">Big questions, tricky concepts, late-night study sessions.<br className="desktop-break" /> Let&apos;s figure it out together.</p>
                <div className="context-row">
                  <label className="select-wrap"><BookOpen size={15} /><select value={subject} onChange={e => chooseSubject(e.target.value)} aria-label="Choose subject">{subjects.map(s => <option key={s}>{s}</option>)}</select><ChevronDown size={13} /></label>
                  <span className="context-divider" />
                  <span className="context-note"><Clock3 size={14} /> Learn at your own pace</span>
                </div>
                <div className="mode-grid">
                  {modes.map(m => {
                    const Icon = m.icon;
                    return <button key={m.id} className={`mode-card ${mode === m.id ? "mode-selected" : ""}`} onClick={() => chooseMode(m.id)}>
                      <span className="mode-icon"><Icon size={18} /></span><span className="mode-text"><strong>{m.label}</strong><small>{m.description}</small></span>{mode === m.id && <span className="mode-check"><Check size={13} /></span>}
                    </button>;
                  })}
                </div>
                <div className="suggestion-heading"><span>NOT SURE WHERE TO START?</span><div /></div>
                <div className="suggestion-grid">
                  {suggestions.map(s => {
                    const Icon = s.icon;
                    return <button key={s.title} className="suggestion-card" onClick={() => sendMessage(s.prompt)}><Icon size={16} /><span>{s.title}</span><span className="suggestion-arrow">↗</span></button>;
                  })}
                </div>
              </div>
            ) : (
              <div className="conversation">
                <div className="conversation-heading"><div><span className="conversation-kicker">STUDY SESSION</span><h2>{active?.title || "Study session"}</h2></div><div className="conversation-meta"><span className="mini-dot" /> {subject}</div></div>
                {messages.map((m, i) => (
                  <article key={i} className={`message-row ${m.role}`}>
                    <div className={`message-avatar ${m.role === "assistant" ? "ai-avatar" : "user-avatar"}`}>{m.role === "assistant" ? <Sparkles size={16} /> : "S"}</div>
                    <div className="message-body"><div className="message-author">{m.role === "assistant" ? "StudyMate" : "You"} <span>{m.role === "assistant" ? "AI TUTOR" : "YOU"}</span></div>
                      <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{m.content}</ReactMarkdown></div>
                    </div>
                  </article>
                ))}
                {loading && <div className="message-row assistant"><div className="message-avatar ai-avatar"><Sparkles size={16} /></div><div className="message-body"><div className="message-author">StudyMate <span>THINKING</span></div><div className="typing"><i /><i /><i /><span>Working through this with you…</span></div></div></div>}
                {error && <div className="error-banner"><CircleHelp size={16} /><span>{error}</span><button onClick={() => sendMessage(messages[messages.length - 1]?.content)}>Retry</button></div>}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        <div className="composer-area">
          <div className="composer-wrap">
            <div className="composer-context"><span className="composer-mode"><ModeIcon size={13} /> {currentMode.label}</span><span className="composer-separator">·</span><span>{subject}</span><button onClick={() => setSettingsOpen(v => !v)}>Change <ChevronDown size={12} /></button></div>
            <div className="composer">
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Ask anything, or paste a problem to work through…" rows={1} aria-label="Message StudyMate" />
              <button className="send-button" onClick={() => sendMessage()} disabled={!input.trim() || loading} aria-label="Send message">{loading ? <span className="send-spinner" /> : <Send size={17} />}</button>
            </div>
            <div className="composer-footer"><span><Command size={12} /> Enter to send <span className="footer-divider">·</span> Shift + Enter for new line</span><span>AI can make mistakes. Verify important information.</span></div>
          </div>
        </div>
      </section>

      {settingsOpen && <div className="settings-popover">
        <div className="settings-title">Learning preferences <button onClick={() => setSettingsOpen(false)}><X size={15} /></button></div>
        <label>Education level<select value={level} onChange={e => setLevel(e.target.value)}><option>Grade 9</option><option>Grade 10</option><option>Grade 11</option><option>Grade 12</option><option>University</option><option>Self-study</option></select></label>
        <label>Subject<select value={subject} onChange={e => chooseSubject(e.target.value)}>{subjects.map(s => <option key={s}>{s}</option>)}</select></label>
        <div className="settings-hint">These preferences guide how StudyMate explains concepts.</div>
      </div>}
      <div className="mobile-brand"><div className="brand-mark"><Sparkles size={15} /></div> studymate</div>
    </main>
  );
}
