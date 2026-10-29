"use client";

import { useState, type FormEvent, type ReactNode } from "react";

export function SiteForm({ children, className, style, kind }: { children: ReactNode; className?: string; style?: React.CSSProperties; kind: "contact" | "newsletter" }) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, kind }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setState("success");
      setMessage(kind === "contact" ? "Thank you! Your message has been received." : "Thank you! You’re on the list.");
      form.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }
  return <form className={className} style={style} onSubmit={submit} aria-busy={state === "sending"}>
    {children}
    <label className="voxen-honeypot" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {state === "sending" && <p className="voxen-form-status" role="status">Sending…</p>}
    {message && <p className={`voxen-form-status ${state}`} role={state === "error" ? "alert" : "status"}>{message}</p>}
  </form>;
}
