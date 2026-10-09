"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

export function LookupForm() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
        setError(
          body.error === "unsupported_link"
            ? "That link isn't supported. Paste an Instagram, X, YouTube, Pinterest or TikTok link."
            : "Something went wrong.",
        );
        return;
      }
      router.push(`/l/${body.lookupId}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
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
        <button type="submit" disabled={submitting}>
          Identify
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
