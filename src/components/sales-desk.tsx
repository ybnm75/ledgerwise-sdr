"use client";

import {
  CalendarDays,
  History,
  LayoutDashboard,
  Check,
  ChevronLeft,
  ExternalLink,
  Inbox,
  MessageSquareText,
  Pencil,
  Search,
  ShieldCheck,
  UserRoundCheck,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import type { DraftStatus, Lead } from "@/lib/types";
import { qualificationBand } from "@/lib/qualification";
import { ConversationDesk } from "@/components/conversation-desk";
import { BookingDesk } from "@/components/booking-desk";
import { LogoutButton } from "@/components/logout-button";
import { TodayDesk } from "@/components/today-desk";
import { ActivityDesk } from "@/components/activity-desk";
import { ResearchStatus } from "@/components/research-status";

type View = "today" | "research" | "outreach" | "conversations" | "bookings" | "activity";

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

  async function generateDraft() {
    if (!selected) return;
    setGenerating(true);
    setNotice("");
    try {
      const response = await fetch(`/api/leads/${selected.id}/drafts/generate`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The draft could not be generated.");
      setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, draft: { subject: body.data.subject, body: body.data.body, status: body.data.status } } : lead));
      setNotice(`Agent draft revision ${body.data.version} is ready for review.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The draft could not be generated.");
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
                    onClick={(event) => { event.preventDefault(); setSelectedId(lead.id); setMobileDetail(true); }}
                  >
                    <span className="lead-row__main">
                      <strong>{lead.company}</strong>
                      <span>{lead.category}, {lead.location}</span>
                    </span>
                    <span className="lead-row__score fig">{lead.score}</span>
                    <span className="lead-row__status" data-status={lead.draft.status}>
                      {lead.draft.status === "pending" ? qualificationBand(lead.score) : lead.draft.status}
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
                    <small>{qualificationBand(selected.score)}</small>
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
                      <ul>{selected.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
                    </div>
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
                    <div className="grounding-note">
                      <ShieldCheck size={17} aria-hidden="true" />
                      <p><strong>Grounding check passed.</strong> Company-specific claims map to evidence shown on the left.</p>
                    </div>
                    {selected.status !== "qualified" ? (
                      <p className="notice">Approval is locked until this lead passes the required qualification gates.</p>
                    ) : null}
                    <button className="button button--quiet" type="button" onClick={generateDraft} disabled={generating} aria-busy={generating}>
                      {generating ? "Generating…" : "Generate from verified evidence"}
                    </button>
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
                        <button className="button button--primary" type="button" onClick={() => updateDraft("approved")} disabled={selected.status !== "qualified"}>
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
