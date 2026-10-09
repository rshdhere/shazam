"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./ui.module.css";

function errorMessage(body: { error?: string; retryAfterSeconds?: number }) {
  if (body.error === "unsupported_link" || body.error === "invalid_body")
    return "That link isn't one we can open. Paste a link to a single post from Instagram, X, YouTube, Pinterest or TikTok.";
  if (body.error === "rate_limited") {
    const seconds = body.retryAfterSeconds ?? 60;
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    const at = new Date(Date.now() + seconds * 1000).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `You've looked up a lot of new links this hour. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, around ${at}. Links someone has already looked up still open straight away.`;
  }
  return "We couldn't start the lookup. Check your connection and try again.";
}

export function LookupForm() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!link.trim()) {
      setError("Paste a link first.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/lookups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ link }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(errorMessage(body));
        setSubmitting(false);
        return;
      }
      router.push(`/l/${body.lookupId}`);
    } catch {
      setError(errorMessage({}));
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label htmlFor="link" className="visually-hidden">
        Link to a post
      </label>
      <div className={styles.field}>
        <input
          id="link"
          name="link"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          required
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://www.instagram.com/reel/…"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "link-error" : undefined}
          className={styles.input}
        />
        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? "Starting…" : "Identify"}
        </button>
      </div>
      {error && (
        <p id="link-error" role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
