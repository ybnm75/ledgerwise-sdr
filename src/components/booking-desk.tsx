"use client";

import { CalendarCheck, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Booking = {
  id: string;
  company: string;
  attendee_name: string;
  attendee_email: string;
  starts_at: string;
  attendee_time_zone?: string;
  event_url?: string;
};

export function BookingDesk() {
  const [slots, setSlots] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadBookings() {
    try {
      const response = await fetch("/api/calendar/bookings");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Bookings could not be loaded.");
      setBookings(body.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bookings could not be loaded.");
    }
  }

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    void loadBookings();
  }, []);

  async function refreshSlots() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/calendar/slots");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Availability could not be loaded.");
      setSlots(body.data);
      setSelectedSlot(body.data[0] ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Availability could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/calendar/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: selectedSlot, attendee: { name, email, timeZone }, company })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The booking could not be confirmed.");
      setNotice(body.duplicate ? "This booking was already confirmed." : "Google Calendar confirmed the booking and sent the invitation.");
      setSlots((current) => current.filter((slot) => slot !== selectedSlot));
      setSelectedSlot("");
      await loadBookings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The booking could not be confirmed.");
    } finally {
      setLoading(false);
    }
  }

  const formatter = (zone: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: zone });

  return (
    <section className="booking-view">
      <header className="booking-view__header">
        <div><h1>Booked calls</h1><p>Google Calendar-confirmed meetings and live availability.</p></div>
        <button className="button button--primary" type="button" onClick={refreshSlots} disabled={loading} aria-busy={loading}>
          <RefreshCw size={16} aria-hidden="true" /> {loading ? "Checking…" : "Check live slots"}
        </button>
      </header>
      <div className="booking-grid">
        <section className="booking-ledger" aria-labelledby="bookings-title">
          <div className="pane-heading"><h2 id="bookings-title">Confirmed</h2><span>Calendar is the source of truth</span></div>
          {bookings.length ? (
            <div className="booking-records">
              {bookings.map((booking) => (
                <article className="booking-record" key={booking.id}>
                  <CalendarCheck size={19} aria-hidden="true" />
                  <div><strong>{booking.company}</strong><p>{booking.attendee_name} · {booking.attendee_email}</p><time dateTime={booking.starts_at}>{formatter(booking.attendee_time_zone || "UTC").format(new Date(booking.starts_at))} {booking.attendee_time_zone || "UTC"}</time></div>
                  {booking.event_url ? <a href={booking.event_url} target="_blank" rel="noreferrer">Open event</a> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state--large"><CalendarCheck size={24} aria-hidden="true" /><strong>No confirmed calls yet.</strong><p>A booking appears only after Google Calendar accepts it.</p></div>
          )}
        </section>
        <aside className="availability-panel" aria-labelledby="availability-title">
          <div className="pane-heading"><h2 id="availability-title">Live availability</h2><span>America/New_York host</span></div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {notice ? <p className="notice" role="status">{notice}</p> : null}
          {slots.length ? (
            <>
              <div className="slot-list" role="radiogroup" aria-label="Available times">
                {slots.map((slot) => (
                  <button className="slot-choice" data-selected={slot === selectedSlot} key={slot} type="button" role="radio" aria-checked={slot === selectedSlot} onClick={() => setSelectedSlot(slot)}>
                    <time dateTime={slot}>{formatter(timeZone).format(new Date(slot))}</time>
                  </button>
                ))}
              </div>
              <form className="booking-form" onSubmit={book}>
                <label className="field"><span>Company</span><input value={company} onChange={(event) => setCompany(event.target.value)} required /></label>
                <label className="field"><span>Attendee name</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
                <label className="field"><span>Attendee email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                <label className="field"><span>Attendee timezone</span><input value={timeZone} onChange={(event) => setTimeZone(event.target.value)} required /></label>
                <button className="button button--primary" type="submit" disabled={loading || !selectedSlot} aria-busy={loading}>{loading ? "Confirming…" : "Confirm selected time"}</button>
              </form>
            </>
          ) : (
            <div className="empty-state"><strong>Availability is not loaded.</strong><p>Connect the free Google Calendar integration, then check live slots.</p></div>
          )}
        </aside>
      </div>
    </section>
  );
}
