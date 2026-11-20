"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type Event = { id: string; entity_type: string; entity_id: string; action: string; actor_type?: string; actor_id?: string; created_at: string };

export function ActivityDesk() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      const response = await fetch("/api/activity");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Activity could not be loaded.");
      setEvents(body.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Activity could not be loaded."); }
  }
  useEffect(() => { void load(); }, []);
  return <section className="activity-view"><header className="booking-view__header"><div><h1>Activity</h1><p>Consequential actions from people, agents, and providers.</p></div><button className="button button--quiet" type="button" onClick={load}><RefreshCw size={16} aria-hidden="true" /> Refresh</button></header>{error ? <p className="form-error">{error}</p> : null}<div className="activity-list">{events.length ? events.map((event) => <article className="activity-event" key={event.id}><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time><div><strong>{event.action.replaceAll(".", " ")}</strong><p>{event.actor_type || "system"} · {event.actor_id || "system"} · {event.entity_type} {event.entity_id}</p></div></article>) : <div className="empty-state"><strong>No recorded activity yet.</strong><p>Approvals, sends, decisions, ownership changes, and bookings appear here.</p></div>}</div></section>;
}
