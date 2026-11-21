"use client";

import { AlertTriangle, CalendarCheck, FileCheck2, MessageSquareText, SearchCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { Lead } from "@/lib/types";

type Props = { leads: Lead[]; onNavigate: (view: "research" | "outreach" | "conversations" | "bookings" | "activity") => void };

export function TodayDesk({ leads, onNavigate }: Props) {
  const [threadCounts, setThreadCounts] = useState({ handoff: 0, booking: 0 });
  const [bookings, setBookings] = useState(0);
  const [researchFailure, setResearchFailure] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch("/api/threads").then((response) => response.json()),
      fetch("/api/calendar/bookings").then((response) => response.json()),
      fetch("/api/research/status").then((response) => response.json())
    ]).then(([threads, calls, research]) => {
      const items = Array.isArray(threads.data) ? threads.data : [];
      setThreadCounts({ handoff: items.filter((item: { state: string }) => item.state === "handoff").length, booking: items.filter((item: { state: string }) => item.state === "booking").length });
      setBookings(Array.isArray(calls.data) ? calls.data.filter((item: { starts_at?: string }) => Date.parse(item.starts_at || "") >= Date.now()).length : 0);
      setResearchFailure(Array.isArray(research.data) && research.data[0]?.status === "failed");
    }).catch(() => undefined);
  }, []);

  const pendingDrafts = leads.filter((lead) => lead.status === "qualified" && lead.draft.status === "pending").length;
  const researchNeeded = leads.filter((lead) => lead.status !== "qualified").length;
  const tasks = [
    { label: "Review research gaps", detail: `${researchNeeded} leads still need verified evidence`, icon: SearchCheck, view: "research" as const },
    { label: "Approve qualified outreach", detail: `${pendingDrafts} qualified drafts are waiting for a decision`, icon: FileCheck2, view: "outreach" as const },
    { label: "Handle human conversations", detail: `${threadCounts.handoff} threads need a salesperson`, icon: MessageSquareText, view: "conversations" as const },
    { label: "Finish scheduling", detail: `${threadCounts.booking} threads requested calendar times`, icon: CalendarCheck, view: "bookings" as const }
  ];

  return (
    <section className="today-view">
      <header className="today-heading"><div><h1>Today</h1><p>Work that needs a human decision, in priority order.</p></div><span className="policy-state">{bookings} confirmed calls</span></header>
      {researchFailure ? <button className="operations-warning" type="button" onClick={() => onNavigate("activity")}><AlertTriangle size={18} aria-hidden="true" /><span><strong>The latest research run failed.</strong><small>Open activity to inspect the recorded failure.</small></span></button> : null}
      <div className="task-queue">
        {tasks.map((task) => {
          const Icon = task.icon;
          return <button className="task-card" type="button" key={task.label} onClick={() => onNavigate(task.view)}><Icon size={20} aria-hidden="true" /><span><strong>{task.label}</strong><small>{task.detail}</small></span></button>;
        })}
      </div>
      <aside className="demo-boundary"><strong>Demonstration boundary</strong><p>Conversation messages are simulated, email delivery is sandbox-only, and provider failures remain visible. No live cold outreach is performed.</p></aside>
    </section>
  );
}
