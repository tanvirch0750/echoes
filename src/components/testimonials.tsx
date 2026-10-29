"use client";

import { useEffect, useRef, useState } from "react";
import widgets from "@/content/widgets.json";
import { renderMarkup } from "@/lib/markup";

export function Testimonials({ viewport }: { viewport: "desktop" | "tablet" | "mobile" }) {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const templates = widgets.testimonials[viewport];
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>('[data-highlight="true"][tabindex="0"]').forEach((control, i) => {
      control.setAttribute("role", "button");
      control.setAttribute("aria-label", `Show testimonial ${i + 1}`);
      control.setAttribute("aria-pressed", String(index === i));
    });
  }, [index]);

  function select(target: HTMLElement) {
    const button = target.closest('[data-highlight="true"][tabindex="0"]');
    const controls = Array.from(root.current?.querySelectorAll('[data-highlight="true"][tabindex="0"]') || []);
    const next = controls.indexOf(button as Element);
    if (next >= 0 && next < templates.length) setIndex(next);
  }
  return <div ref={root} className="voxen-testimonials" onClick={(event) => select(event.target as HTMLElement)}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(event.target as HTMLElement); } }}>
    {renderMarkup(templates[index])}
  </div>;
}
