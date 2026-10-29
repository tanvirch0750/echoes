"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function VideoDialog({ src, close }: { src: string; close: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    root.current?.querySelector("button")?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", key); previous?.focus(); };
  }, [close]);
  return createPortal(<div ref={root} className="voxen-video-backdrop" role="dialog" aria-modal="true" aria-label="Podcast video" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <button className="voxen-video-close" onClick={close} aria-label="Close video">×</button>
    <video src={src} controls autoPlay playsInline loop preload="auto" />
  </div>, document.body);
}
