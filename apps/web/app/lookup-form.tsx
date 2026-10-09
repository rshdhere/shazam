"use client";

import type { LookupStatus, Match } from "@shazam/types";
import { useState } from "react";
import styles from "./page.module.css";

interface LookupView {
  status: LookupStatus;
  matches: Match[];
  failureReason: string | null;
}

const POLL_MS = 1500;

export function LookupForm() {
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupView | null>(null);

  async function poll(id: string) {
    const res = await fetch(`/api/lookups/${id}`);
    const view = (await res.json()) as LookupView;
    setLookup(view);
    if (view.status !== "completed" && view.status !== "failed") {
      setTimeout(() => poll(id), POLL_MS);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLookup(null);
    const res = await fetch("/api/lookups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ link }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(
        body.error === "unsupported_link"
          ? "That link isn't supported. Paste an Instagram, X, YouTube, Pinterest or TikTok link."
          : "Something went wrong.",
      );
      return;
    }
    setLookup({ status: body.status, matches: [], failureReason: null });
    poll(body.lookupId);
  }

  return (
    <div className={styles.main}>
      <form onSubmit={submit}>
        <label htmlFor="link">Paste a link</label>
        <input
          id="link"
          type="url"
          required
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://www.instagram.com/reel/…"
        />
        <button type="submit">Identify</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {lookup && <p aria-live="polite">Status: {lookup.status}</p>}
      {lookup?.status === "failed" && (
        <p role="alert">Lookup failed ({lookup.failureReason}).</p>
      )}
      {lookup?.status === "completed" && lookup.matches.length === 0 && (
        <p>No song recognised.</p>
      )}
      <ul>
        {lookup?.matches.map((m) => (
          <li key={`${m.title}-${m.timestampSeconds}`}>
            <strong>{m.title}</strong> by {m.artist} at{" "}
            {Math.floor(m.timestampSeconds)}s
          </li>
        ))}
      </ul>
    </div>
  );
}
