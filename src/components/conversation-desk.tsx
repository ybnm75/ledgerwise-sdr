"use client";

import { Bot, CalendarClock, CornerDownLeft, Hand, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentReply } from "@/lib/agent";

type Thread = {
  id: string;
  company: string;
  contact: string;
  contactKey: string;
  subject: string;
  owner: "agent" | "human";
  state: "agent" | "handoff" | "suppressed" | "booking";
  isDemo: boolean;
  messages: Array<{ id: string; direction: "inbound" | "outbound"; sender: string; body: string; source: string; createdAt: string }>;
  decision: null | { intent: string; action: string; confidence: number; reason: string; reply: string; riskFlags: string[]; source: string };
};

const stateLabel: Record<Thread["state"], string> = {
  agent: "Agent active",
  handoff: "Needs human",
  suppressed: "Contact stopped",
  booking: "Scheduling requested"
};

export function ConversationDesk() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [testMessage, setTestMessage] = useState("Are you a bot?");
  const [result, setResult] = useState<AgentReply | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = threads.find((thread) => thread.id === selectedId) ?? threads[0];

  async function loadThreads() {
    setError("");
    try {
      const response = await fetch("/api/threads");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Conversations could not be loaded.");
      setThreads(body.data);
      setSelectedId((current) => current || body.data[0]?.id || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Conversations could not be loaded.");
    }
  }

  useEffect(() => { void loadThreads(); }, []);

  async function submitDemoReply() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/threads/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testMessage })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The reply could not be processed.");
      setThreads(body.data.threads);
      setResult(body.data.result ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The reply could not be processed.");
    } finally {
      setLoading(false);
    }
  }

  async function changeOwner() {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const owner = selected.owner === "agent" ? "human" : "agent";
      const response = await fetch(`/api/threads/${selected.id}/owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Ownership could not be changed.");
      setThreads(body.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ownership could not be changed.");
    } finally {
      setLoading(false);
    }
  }

  if (!selected) {
    return <section className="booking-view"><div className="empty-state"><strong>Loading conversations…</strong>{error ? <p className="form-error">{error}</p> : null}</div></section>;
  }

  return (
    <div className="conversation-layout">
      <section className="thread-list" aria-label="Conversation threads">
        <header className="section-header"><div><h1>Conversations</h1><p>{threads.length} demo threads</p></div><button className="button button--quiet" type="button" onClick={loadThreads}><RefreshCw size={15} aria-hidden="true" /> Refresh</button></header>
        {threads.map((thread) => (
          <button className="thread-row" data-selected={thread.id === selected.id} key={thread.id} type="button" onClick={() => { setSelectedId(thread.id); setResult(null); }}>
            <span><strong>{thread.company}</strong><small>{thread.subject}</small></span>
            <span className="thread-state" data-state={thread.state}>{stateLabel[thread.state]}</span>
          </button>
        ))}
      </section>

      <section className="thread-detail" aria-label={`${selected.company} conversation`}>
        <header className="thread-detail__header">
          <div><h2>{selected.company}</h2><p>{selected.contact} · Demo Inbox · {selected.owner === "human" ? "Human owns thread" : "Agent supervised"}</p></div>
          <button className="button button--quiet" type="button" onClick={changeOwner} disabled={loading}>
            <Hand size={16} aria-hidden="true" /> {selected.owner === "agent" ? "Take over" : "Return to agent"}
          </button>
        </header>
        <div className="message-stream">
          {selected.messages.map((message) => (
            <article className={`message message--${message.direction}`} key={message.id}>
              <small>{message.sender}{message.source.startsWith("demo") ? " · simulated" : ""}</small><p>{message.body}</p>
            </article>
          ))}
          <aside className="decision-record">
            {selected.state === "booking" ? <CalendarClock size={18} aria-hidden="true" /> : <ShieldAlert size={18} aria-hidden="true" />}
            <div><strong>{stateLabel[selected.state]}</strong><p>{selected.decision?.reason ?? "This seeded example is ready for a new demo reply."}</p></div>
          </aside>
        </div>

        <section className="reply-lab" aria-labelledby="demo-inbox-title">
          <div className="pane-heading"><h3 id="demo-inbox-title">Demo Inbox</h3><span>Simulated inbound message</span></div>
          <label className="field"><span>Prospect reply</span><textarea value={testMessage} onChange={(event) => setTestMessage(event.target.value)} /></label>
          <button className="button button--primary" type="button" onClick={submitDemoReply} disabled={loading || !testMessage.trim()} aria-busy={loading}>
            <CornerDownLeft size={16} aria-hidden="true" /> {loading ? "Processing…" : "Submit demo reply"}
          </button>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {result ? (
            <div className="agent-result" data-action={result.action}>
              <div className="agent-result__heading">
                {result.source === "model" ? <Bot size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}
                <strong>{result.action.replace("_", " ")}</strong><span className="fig">{Math.round(result.confidence * 100)}%</span>
              </div>
              <p>{result.reason}</p>
              {result.reply ? <blockquote>{result.reply}</blockquote> : <small>No automatic message was sent.</small>}
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}
