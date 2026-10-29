import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
const requests = new Map<string, { count: number; until: number }>();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin && new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now(), limit = requests.get(ip);
  if (limit && limit.until > now && limit.count >= 10) return NextResponse.json({ error: "Please wait a few minutes before trying again." }, { status: 429 });
  if (!limit || limit.until <= now) requests.set(ip, { count: 1, until: now + 600_000 });
  else limit.count++;
  if (requests.size > 1000) for (const [key, value] of requests) if (value.until < now) requests.delete(key);
  try {
    const text = await request.text();
    if (text.length > 16_000) return NextResponse.json({ error: "Message is too long." }, { status: 413 });
    const input = JSON.parse(text) as Record<string, unknown>;
    if (input.website) return NextResponse.json({ accepted: true });
    const kind = input.kind === "contact" ? "contact" : "newsletter";
    const email = String(input.Email || input.email || "").trim();
    const name = String(input.Name || input.name || "").trim().slice(0, 200);
    const message = String(input.Message || input.message || "").trim().slice(0, 6000);
    const subject = String(input.Subject || input.Location || input.subject || "").trim().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (kind === "contact" && (!name || !message)) return NextResponse.json({ error: "Please include your name and message." }, { status: 400 });
    const submission = { id: randomUUID(), receivedAt: new Date().toISOString(), kind, email, ...(kind === "contact" ? { name, subject, message } : {}) };
    if (process.env.FORMS_WEBHOOK_URL) {
      const delivered = await fetch(process.env.FORMS_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json", ...(process.env.FORMS_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.FORMS_WEBHOOK_SECRET}` } : {}) }, body: JSON.stringify(submission), signal: AbortSignal.timeout(10_000) });
      if (!delivered.ok) throw new Error("Delivery failed");
    } else {
      const directory = process.env.SUBMISSIONS_DIRECTORY || path.join(process.cwd(), ".data");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await appendFile(path.join(directory, "submissions.jsonl"), `${JSON.stringify(submission)}\n`, { mode: 0o600 });
    }
    return NextResponse.json({ accepted: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "We couldn’t save your message. Please try again shortly." }, { status: 503 });
  }
}
