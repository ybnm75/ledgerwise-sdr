"use client";

import {
  Bot,
  CalendarDays,
  History,
  LayoutDashboard,
  Check,
  ChevronLeft,
  ExternalLink,
  Inbox,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRoundCheck,
  X
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { DraftStatus, Lead } from "@/lib/types";
import { ConversationDesk } from "@/components/conversation-desk";
import { BookingDesk } from "@/components/booking-desk";
import { LogoutButton } from "@/components/logout-button";
import { TodayDesk } from "@/components/today-desk";
import { ActivityDesk } from "@/components/activity-desk";
import { ResearchStatus } from "@/components/research-status";

type View = "today" | "research" | "outreach" | "conversations" | "bookings" | "activity";
type EvidenceKind = Lead["evidence"][number]["kind"];
type AgentRun = {
  id: string;
  status: "blocked" | "awaiting_approval";
  nextAction: string;
  model: string;
  durationMs: number;
  cashCostUsd: number;
  traceEnabled: boolean;
  steps: Array<{ id: string; label: string; status: "complete" | "blocked" | "waiting"; summary: string; latencyMs: number }>;
  citations: Array<{ id: string; kind: string; claim: string; url: string }>;
  usage: { inputTokens: number; outputTokens: number; providerLatencyMs: number };
  draft?: { subject: string; body: string; status: DraftStatus; version: number };
};

const evidenceKinds: Array<{ value: EvidenceKind; label: string }> = [
  { value: "location", label: "US location" },
  { value: "trigger", label: "Current trigger" },
  { value: "scale", label: "Scale signal" },
  { value: "size", label: "Employee count" },
  { value: "revenue", label: "Revenue" },
  { value: "contact", label: "Decision-maker" },
  { value: "commerce", label: "Ecommerce activity" }
];

function leadBand(lead: Lead) {
  if (lead.status === "qualified") return "Strong fit";
  return lead.score >= 60 ? "Review" : "Research needed";
}

const navigation: Array<{ id: View; label: string; icon: typeof Inbox }> = [
  { id: "today", label: "Today", icon: LayoutDashboard },
  { id: "research", label: "Research", icon: UserRoundCheck },
  { id: "outreach", label: "Outreach", icon: Inbox },
  { id: "conversations", label: "Conversations", icon: MessageSquareText },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "activity", label: "Activity", icon: History }
];

export function SalesDesk({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedId, setSelectedId] = useState(initialLeads[0]?.id ?? "");
  const [view, setView] = useState<View>("today");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [agentRun, setAgentRun] = useState<AgentRun | null>(null);
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>("location");
  const [evidenceClaim, setEvidenceClaim] = useState("");
  const [evidenceExcerpt, setEvidenceExcerpt] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [evidenceNotice, setEvidenceNotice] = useState("");
  const [verifyingEvidence, setVerifyingEvidence] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((lead) =>
      [lead.company, lead.category, lead.location, lead.contactRole].some((value) =>
        value.toLowerCase().includes(needle)
      )
    );
  }, [leads, query]);

  const selected = leads.find((lead) => lead.id === selectedId) ?? filtered[0];
  const hasRequiredDraftEvidence = Boolean(selected?.evidence.some((item) => item.kind === "commerce") && selected?.evidence.some((item) => item.kind === "trigger"));
  const canApprove = selected?.status === "qualified" && hasRequiredDraftEvidence;

  function selectLead(id: string) {
    setSelectedId(id);
    setNotice("");
    setRecipient("");
    setEditing(false);
    setEvidenceNotice("");
    setEvidenceClaim("");
    setEvidenceExcerpt("");
    setEvidenceUrl("");
    setContactName("");
    setContactRole("");
    setAgentRun(null);
    setMobileDetail(true);
  }

  async function submitReviewedEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setVerifyingEvidence(true);
    setEvidenceNotice("Fetching the public source and verifying the exact excerpt...");
    try {
      const response = await fetch(`/api/leads/${selected.id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: evidenceKind,
          claim: evidenceClaim,
          excerpt: evidenceExcerpt,
          sourceUrl: evidenceUrl,
          ...(evidenceKind === "contact" ? { contactName, contactRole } : {})
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The evidence could not be verified.");
      setLeads((current) => current.map((lead) => {
        if (lead.id !== selected.id) return lead;
        const withoutDuplicate = lead.evidence.filter((item) => item.id !== body.data.evidence.id);
        return {
          ...lead,
          evidence: [body.data.evidence, ...withoutDuplicate],
          score: body.data.score,
          status: body.data.status,
          rationale: body.data.rationale,
          gaps: body.data.gaps,
          location: body.data.location ?? lead.location,
          contactName: body.data.contactName ?? lead.contactName,
          contactRole: body.data.contactRole ?? lead.contactRole
        };
      }));
      setEvidenceNotice(body.data.status === "qualified"
        ? "Source verified. This lead now passes every qualification gate."
        : `Source verified and recorded. ${body.data.gaps.length} gate${body.data.gaps.length === 1 ? " remains" : "s remain"}.`);
      setEvidenceClaim("");
      setEvidenceExcerpt("");
      setEvidenceUrl("");
      setContactName("");
      setContactRole("");
    } catch (caught) {
      setEvidenceNotice(caught instanceof Error ? caught.message : "The evidence could not be verified.");
    } finally {
      setVerifyingEvidence(false);
    }
  }

  async function updateDraft(status: DraftStatus) {
    if (!selected) return;
    setNotice("Saving…");
    try {
      const response = await fetch(`/api/leads/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, subject: selected.draft.subject, body: selected.draft.body, evidenceIds: selected.evidence.map((item) => item.id) })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The update was not saved.");
      setLeads((current) =>
        current.map((lead) =>
          lead.id === selected.id ? { ...lead, draft: { ...lead.draft, status: body.data.status } } : lead
        )
      );
      setNotice(status === "approved"
        ? "Draft approved and recorded. Demo delivery is now available."
        : "Draft rejected and recorded in the audit ledger.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The update was not saved.");
    }
  }

  function updateBody(body: string) {
    if (!selected) return;
    setLeads((current) =>
      current.map((lead) =>
        lead.id === selected.id ? { ...lead, draft: { ...lead.draft, body, status: "pending" } } : lead
      )
    );
  }

  function updateSubject(subject: string) {
    if (!selected) return;
    setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, draft: { ...lead.draft, subject, status: "pending" } } : lead));
  }

  async function runAgent() {
    if (!selected) return;
    setGenerating(true);
    setNotice("");
    setAgentRun(null);
    try {
      const response = await fetch(`/api/leads/${selected.id}/agent/run`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The SDR agent could not complete this run.");
      const run = body.data as AgentRun;
      setAgentRun(run);
      if (run.draft) {
        setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, draft: { subject: run.draft!.subject, body: run.draft!.body, status: run.draft!.status } } : lead));
      }
      setNotice(run.nextAction);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The SDR agent could not complete this run.");
    } finally {
      setGenerating(false);
    }
  }

  async function sendApproved() {
    if (!selected) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selected.id, to: recipient })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The email was not sent.");
      setNotice("Email sent and recorded in the audit ledger.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The email was not sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to lead review</a>
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Ledgerwise Sales Desk home">
          Ledgerwise <span>Sales Desk</span>
        </a>
        <div className="topbar__actions">
          <span className="policy-state" role="status"><ShieldCheck size={16} aria-hidden="true" /> Policy active</span>
          <LogoutButton />
        </div>
      </header>

      <nav className="task-nav" aria-label="Sales desk sections">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className="task-nav__item"
              data-active={view === item.id}
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
            >
              <Icon size={17} aria-hidden="true" /> {item.label}
            </button>
          );
        })}
      </nav>

      <main id="main" className="workspace">
        {view === "today" ? <TodayDesk leads={leads} onNavigate={(target) => setView(target)} /> : view === "research" || view === "outreach" ? (
          <>
            <section className="queue" aria-label="Lead queue" data-mobile-hidden={mobileDetail}>
              <div className="queue__header">
                <div>
                  <h1>{view === "research" ? "Evidence queue" : "Approval queue"}</h1>
                  <p>{filtered.length} sourced companies</p>
                </div>
                <label className="search-field">
                  <span className="visually-hidden">Search companies</span>
                  <Search size={17} aria-hidden="true" />
                  <input
                    type="search"
                    name="lead-search"
                    placeholder="Search companies"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
              {view === "research" ? <ResearchStatus /> : null}

              <div className="lead-list" role="list" aria-label="Companies">
                {filtered.length ? filtered.map((lead) => (
                  <a
                    className="lead-row"
                    data-selected={selected?.id === lead.id}
                    href={`#${lead.id}`}
                    key={lead.id}
                    role="listitem"
                    onClick={(event) => { event.preventDefault(); selectLead(lead.id); }}
                  >
                    <span className="lead-row__main">
                      <strong>{lead.company}</strong>
                      <span>{lead.category}, {lead.location}</span>
                    </span>
                    <span className="lead-row__score fig">{lead.score}</span>
                    <span className="lead-row__status" data-status={lead.draft.status}>
                      {lead.draft.status === "pending" ? leadBand(lead) : lead.draft.status}
                    </span>
                  </a>
                )) : (
                  <div className="empty-state">
                    <strong>No companies match that search.</strong>
                    <p>Clear the search to return to the full review queue.</p>
                    <button className="button button--quiet" type="button" onClick={() => setQuery("")}>Clear search</button>
                  </div>
                )}
              </div>
            </section>

            {selected ? (
              <section className="lead-workbench" aria-label={`${selected.company} review`} data-mobile-open={mobileDetail}>
                <header className="lead-heading">
                  <button className="mobile-back" type="button" onClick={() => setMobileDetail(false)}>
                    <ChevronLeft size={17} aria-hidden="true" /> Evidence queue
                  </button>
                  <div>
                    <div className="lead-heading__title">
                      <h2>{selected.company}</h2>
                      <a href={`https://${selected.domain}`} target="_blank" rel="noreferrer" aria-label={`Open ${selected.company} website`}>
                        {selected.domain} <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    </div>
                    <p>{selected.contactRole}, {selected.location}</p>
                  </div>
                  <div className="score-block">
                    <span className="fig">{selected.score}</span>
                    <small>{leadBand(selected)}</small>
                  </div>
                </header>

                <div className="review-grid">
                  <section className="evidence-pane" aria-labelledby="evidence-title">
                    <div className="pane-heading">
                      <h3 id="evidence-title">Why this company</h3>
                      <span>{selected.evidence.length} sources</span>
                    </div>
                    <p className="rationale">{selected.rationale}</p>
                    <div className="evidence-list">
                      {selected.evidence.map((evidence) => (
                        <article className="evidence-item" key={evidence.id}>
                          <div className="evidence-item__heading">
                            <span>{evidence.kind}</span>
                            <a href={evidence.url} target="_blank" rel="noreferrer">
                              View source <ExternalLink size={13} aria-hidden="true" />
                            </a>
                          </div>
                          <strong>{evidence.claim}</strong>
                          <p className="source-note">{evidence.quote}</p>
                          <small>{evidence.sourceTitle}</small>
                        </article>
                      ))}
                    </div>
                    <div className="gaps">
                      <strong>Verify before sending</strong>
                      {selected.gaps.length ? <ul>{selected.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul> : <p>All required qualification gates are verified.</p>}
                    </div>
                    {view === "research" ? (
                      <details className="evidence-review">
                        <summary><Plus size={16} aria-hidden="true" /> Verify public evidence</summary>
                        <form onSubmit={submitReviewedEvidence}>
                          <p>The server re-fetches this page and saves evidence only when the exact excerpt is present.</p>
                          <label className="field">
                            <span>Evidence type</span>
                            <select value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as EvidenceKind)}>
                              {evidenceKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                          </label>
                          <label className="field">
                            <span>Public source URL</span>
                            <input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://company.com/about" required />
                          </label>
                          <label className="field">
                            <span>Supported claim</span>
                            <input value={evidenceClaim} onChange={(event) => setEvidenceClaim(event.target.value)} placeholder="The company is headquartered in Austin, Texas." minLength={5} maxLength={500} required />
                          </label>
                          <label className="field">
                            <span>Exact source excerpt</span>
                            <textarea value={evidenceExcerpt} onChange={(event) => setEvidenceExcerpt(event.target.value)} placeholder="Paste the exact sentence shown on the source page." minLength={20} maxLength={1000} required />
                          </label>
                          {evidenceKind === "contact" ? (
                            <div className="evidence-review__contact">
                              <label className="field">
                                <span>Verified name</span>
                                <input value={contactName} onChange={(event) => setContactName(event.target.value)} minLength={2} maxLength={160} required />
                              </label>
                              <label className="field">
                                <span>Business role</span>
                                <input value={contactRole} onChange={(event) => setContactRole(event.target.value)} placeholder="Chief Financial Officer" minLength={2} maxLength={160} required />
                              </label>
                            </div>
                          ) : null}
                          <button className="button button--primary" type="submit" disabled={verifyingEvidence} aria-busy={verifyingEvidence}>
                            {verifyingEvidence ? "Verifying..." : "Verify and save evidence"}
                          </button>
                          {evidenceNotice ? <p className="notice" role="status">{evidenceNotice}</p> : null}
                        </form>
                      </details>
                    ) : null}
                  </section>

                  <section className="draft-pane" aria-labelledby="draft-title">
                    <div className="pane-heading">
                      <h3 id="draft-title">Grounded email</h3>
                      <span className="draft-state" data-status={selected.draft.status}>{selected.draft.status}</span>
                    </div>
                    <label className="field">
                      <span>Subject</span>
                      <input value={selected.draft.subject} readOnly={!editing} aria-readonly={!editing} onChange={(event) => updateSubject(event.target.value)} />
                    </label>
                    <label className="field field--grow">
                      <span>Message</span>
                      <textarea
                        value={selected.draft.body}
                        readOnly={!editing}
                        aria-readonly={!editing}
                        onChange={(event) => updateBody(event.target.value)}
                      />
                    </label>
                    <div className="grounding-note" data-complete={hasRequiredDraftEvidence}>
                      <ShieldCheck size={17} aria-hidden="true" />
                      <p><strong>{hasRequiredDraftEvidence ? "Grounding check passed." : "Grounding incomplete."}</strong> {hasRequiredDraftEvidence ? "Company-specific claims map to current commerce and trigger evidence." : "Verified commerce and trigger evidence are required before drafting."}</p>
                    </div>
                    {selected.status !== "qualified" ? (
                      <p className="notice">Approval is locked until this lead passes the required qualification gates.</p>
                    ) : null}
                    <button className="button button--quiet" type="button" onClick={runAgent} disabled={generating} aria-busy={generating}>
                      <Bot size={17} aria-hidden="true" /> {generating ? "Running SDR agent..." : "Run SDR agent"}
                    </button>
                    {agentRun ? (
                      <section className="agent-run" data-status={agentRun.status} aria-labelledby="agent-run-title">
                        <div className="agent-run__heading">
                          <div><Bot size={18} aria-hidden="true" /><h4 id="agent-run-title">SDR Agent run</h4></div>
                          <span>{agentRun.status.replaceAll("_", " ")}</span>
                        </div>
                        <ol className="agent-run__steps">
                          {agentRun.steps.map((step) => (
                            <li key={step.id} data-status={step.status}>
                              <span aria-hidden="true" />
                              <div><strong>{step.label}</strong><p>{step.summary}</p></div>
                              <small className="fig">{step.latencyMs} ms</small>
                            </li>
                          ))}
                        </ol>
                        <div className="agent-run__citations">
                          <strong>{agentRun.citations.length} verified citations</strong>
                          <div>{agentRun.citations.map((citation) => <a href={citation.url} target="_blank" rel="noreferrer" key={citation.id}>{citation.kind}</a>)}</div>
                        </div>
                        <p className="agent-run__next"><strong>Next human action:</strong> {agentRun.nextAction}</p>
                        <footer>
                          <span>{agentRun.model}</span>
                          <span className="fig">{agentRun.usage.inputTokens + agentRun.usage.outputTokens} tokens</span>
                          <span className="fig">{agentRun.durationMs} ms</span>
                          <span>${agentRun.cashCostUsd.toFixed(2)} cash cost</span>
                          <span>{agentRun.traceEnabled ? "LangSmith enabled" : "Local trace only"}</span>
                        </footer>
                      </section>
                    ) : null}
                    {selected.draft.status === "approved" ? (
                      <div className="send-panel">
                        <p className="sandbox-label">Demo delivery mode · only the configured test recipient is allowed.</p>
                        <label className="field">
                          <span>Verified recipient email</span>
                          <input
                            type="email"
                            name="recipient-email"
                            autoComplete="off"
                            placeholder="founder@company.com"
                            value={recipient}
                            onChange={(event) => setRecipient(event.target.value)}
                          />
                        </label>
                        <button className="button button--primary" type="button" onClick={sendApproved} disabled={sending || !recipient} aria-busy={sending}>
                          {sending ? "Sending…" : "Send approved email"}
                        </button>
                      </div>
                    ) : null}
                    {notice ? <p className="notice" role="status">{notice}</p> : null}
                    <div className="draft-actions">
                      <button className="button button--danger" type="button" onClick={() => updateDraft("rejected")}>
                        <X size={16} aria-hidden="true" /> Reject
                      </button>
                      <button className="button button--quiet" type="button" onClick={() => setEditing((current) => !current)}>
                        <Pencil size={16} aria-hidden="true" /> {editing ? "Finish editing" : "Edit draft"}
                      </button>
                      {selected.draft.status !== "approved" ? (
                        <button className="button button--primary" type="button" onClick={() => updateDraft("approved")} disabled={!canApprove}>
                          <Check size={16} aria-hidden="true" /> Approve
                        </button>
                      ) : null}
                    </div>
                  </section>
                </div>
              </section>
            ) : null}
          </>
        ) : view === "conversations" ? <ConversationDesk /> : view === "bookings" ? <BookingDesk /> : <ActivityDesk />}
      </main>
    </div>
  );
}
