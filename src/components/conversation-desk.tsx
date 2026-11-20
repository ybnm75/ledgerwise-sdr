"use client";

import { Bot, CalendarClock, CornerDownLeft, Hand, ShieldAlert, UserRound } from "lucide-react";
import { useState } from "react";
import type { AgentReply } from "@/lib/agent";

type Thread = {
  id: string;
  company: string;
  contact: string;
  subject: string;
  state: "agent" | "handoff" | "suppressed" | "booking";
  message: string;
  decision: string;
};

const sampleThreads: Thread[] = [
  {
    id: "thread-1",
    company: "Bobo's",
    contact: "Finance team",
    subject: "Re: finance operations",
    state: "booking",
    message: "This could be useful. Are you free next Tuesday afternoon?",
    decision: "Interest detected. Live calendar availability is required before replying."
  },
  {
    id: "thread-2",
    company: "hiyo",
    contact: "Operations",
    subject: "Re: monthly close",
    state: "suppressed",
    message: "Not interested. Please remove me from your list.",
    decision: "Suppressed immediately. No further contact is permitted."
  },
  {
    id: "thread-3",
    company: "Evvy",
    contact: "Finance",
    subject: "Re: bookkeeping",
    state: "handoff",
    message: "Can you explain your SOC 2 controls and data retention terms?",
    decision: "Compliance question. The agent is not certain enough to answer."
  }
];

const stateLabel: Record<Thread["state"], string> = {
  agent: "Agent active",
  handoff: "Needs human",
  suppressed: "Suppressed",
  booking: "Booking intent"
};

export function ConversationDesk() {
  const [selectedId, setSelectedId] = useState(sampleThreads[0].id);
  const [testMessage, setTestMessage] = useState("Are you a bot?");
  const [result, setResult] = useState<AgentReply | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = sampleThreads.find((thread) => thread.id === selectedId) ?? sampleThreads[0];

  async function runAgent() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/agent/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: testMessage,
          company: selected.company,
          evidence: ["The company operates an ecommerce store.", selected.decision]
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The agent could not classify this reply.");
      setResult(body.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The agent could not classify this reply.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="conversation-layout">
      <section className="thread-list" aria-label="Conversation threads">
        <header className="section-header">
          <div><h1>Conversations</h1><p>{sampleThreads.length} active threads</p></div>
        </header>
        {sampleThreads.map((thread) => (
          <button
            className="thread-row"
            data-selected={thread.id === selected.id}
            key={thread.id}
            type="button"
            onClick={() => setSelectedId(thread.id)}
          >
            <span><strong>{thread.company}</strong><small>{thread.subject}</small></span>
            <span className="thread-state" data-state={thread.state}>{stateLabel[thread.state]}</span>
          </button>
        ))}
      </section>

      <section className="thread-detail" aria-label={`${selected.company} conversation`}>
        <header className="thread-detail__header">
          <div><h2>{selected.company}</h2><p>{selected.contact}</p></div>
          <button className="button button--quiet" type="button"><Hand size={16} aria-hidden="true" /> Take over</button>
        </header>
        <div className="message-stream">
          <article className="message message--outbound"><small>Ledgerwise agent</small><p>Would it be useful to compare notes on your current month-end close?</p></article>
          <article className="message message--inbound"><small>{selected.contact}</small><p>{selected.message}</p></article>
          <aside className="decision-record">
            {selected.state === "booking" ? <CalendarClock size={18} aria-hidden="true" /> : <ShieldAlert size={18} aria-hidden="true" />}
            <div><strong>{stateLabel[selected.state]}</strong><p>{selected.decision}</p></div>
          </aside>
        </div>

        <section className="reply-lab" aria-labelledby="reply-lab-title">
          <div className="pane-heading"><h3 id="reply-lab-title">Reply policy test</h3><span>Safe local rules run first</span></div>
          <label className="field">
            <span>Prospect reply</span>
            <textarea value={testMessage} onChange={(event) => setTestMessage(event.target.value)} />
          </label>
          <button className="button button--primary" type="button" onClick={runAgent} disabled={loading} aria-busy={loading}>
            <CornerDownLeft size={16} aria-hidden="true" /> {loading ? "Checking reply…" : "Check reply"}
          </button>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {result ? (
            <div className="agent-result" data-action={result.action}>
              <div className="agent-result__heading">
                {result.source === "model" ? <Bot size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}
                <strong>{result.action.replace("_", " ")}</strong>
                <span className="fig">{Math.round(result.confidence * 100)}%</span>
              </div>
              <p>{result.reason}</p>
              {result.reply ? <blockquote>{result.reply}</blockquote> : <small>No automatic message will be sent.</small>}
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}
