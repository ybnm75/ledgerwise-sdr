"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }
  return <button className="account-status account-status--button" type="button" onClick={logout}>Sign out</button>;
}
