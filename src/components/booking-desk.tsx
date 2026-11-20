"use client";

import { CalendarCheck, RefreshCw } from "lucide-react";
import { useState } from "react";

export function BookingDesk() {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refreshSlots() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/calendar/slots");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Availability could not be loaded.");
      setSlots(body.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Availability could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="booking-view">
      <header className="booking-view__header">
        <div><h1>Booked calls</h1><p>Calendar-confirmed meetings and live availability.</p></div>
        <button className="button button--primary" type="button" onClick={refreshSlots} disabled={loading} aria-busy={loading}>
          <RefreshCw size={16} aria-hidden="true" /> {loading ? "Checking…" : "Check live slots"}
        </button>
      </header>
      <div className="booking-grid">
        <section className="booking-ledger" aria-labelledby="bookings-title">
          <div className="pane-heading"><h2 id="bookings-title">Upcoming</h2><span>Calendar is the source of truth</span></div>
          <div className="empty-state empty-state--large">
            <CalendarCheck size={24} aria-hidden="true" />
            <strong>No confirmed calls yet.</strong>
            <p>A booking appears only after Cal.com accepts it and returns a confirmation.</p>
          </div>
        </section>
        <aside className="availability-panel" aria-labelledby="availability-title">
          <div className="pane-heading"><h2 id="availability-title">Live availability</h2><span>America/New_York</span></div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {slots.length ? (
            <ul className="slot-list">
              {slots.map((slot) => (
                <li key={slot}><time dateTime={slot}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(slot))}</time></li>
              ))}
            </ul>
          ) : (
            <div className="empty-state"><strong>Availability is not loaded.</strong><p>Connect the Cal.com event type, then check live slots.</p></div>
          )}
        </aside>
      </div>
    </section>
  );
}
