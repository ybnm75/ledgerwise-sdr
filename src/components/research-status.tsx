"use client";

import { useEffect, useState } from "react";

type Run = { id: string; status: string; candidate_count: number; succeeded_count: number; failed_count: number; started_at: string };

export function ResearchStatus() {
  const [run, setRun] = useState<Run | null>(null);
  useEffect(() => { void fetch("/api/research/status").then((response) => response.json()).then((body) => setRun(body.data?.[0] ?? null)).catch(() => undefined); }, []);
  return <div className="research-status"><strong>Scheduled research</strong>{run ? <span data-state={run.status}>{run.status} · {run.succeeded_count}/{run.candidate_count} completed · {new Date(run.started_at).toLocaleDateString()}</span> : <span>Awaiting first free-tier run</span>}</div>;
}
