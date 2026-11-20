"use client";

import { LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";

export function LoginScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Login failed.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={submit}>
        <div className="login-mark"><LockKeyhole size={20} aria-hidden="true" /></div>
        <div><h1>Ledgerwise Sales Desk</h1><p>Enter the reviewer password to open the supervised sales workspace.</p></div>
        <label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <button className="button button--primary" type="submit" disabled={loading}>{loading ? "Opening…" : "Open workspace"}</button>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <small>Demo environment · no live outreach is sent without explicit approval.</small>
      </form>
    </main>
  );
}
