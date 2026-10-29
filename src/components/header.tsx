"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import widgets from "@/content/widgets.json";
import { renderMarkup } from "@/lib/markup";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const previouslyOpen = useRef(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (open && event.key === "Tab") {
        const focusable = Array.from(ref.current?.querySelectorAll<HTMLElement>('a[href], [role="button"]') || []).filter((node) => node.getBoundingClientRect().width > 0);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    if (open) document.body.style.overflow = "hidden";
    ref.current?.querySelectorAll('[data-highlight="true"][tabindex="0"]').forEach((node) => node.setAttribute("tabindex", "-1"));
    const toggles = ref.current?.querySelectorAll<HTMLElement>(".framer-AjWWc, .framer-pblrpj, .framer-ywixic");
    toggles?.forEach((toggle) => {
      const inactive = open ? toggle.classList.contains("framer-AjWWc") : toggle.classList.contains("framer-ywixic");
      if (inactive) {
        toggle.removeAttribute("role"); toggle.removeAttribute("aria-label"); toggle.setAttribute("aria-hidden", "true");
        return;
      }
      toggle.removeAttribute("aria-hidden");
      toggle.setAttribute("tabindex", "0");
      toggle.setAttribute("role", "button");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      toggle.setAttribute("aria-expanded", String(open));
    });
    ref.current?.querySelectorAll<HTMLElement>(".framer-ebgxpq").forEach((panel) => { panel.inert = !open; panel.setAttribute("aria-hidden", String(!open)); });
    if (open || previouslyOpen.current) Array.from(toggles || []).find((node) => node.getAttribute("role") === "button" && node.getBoundingClientRect().width > 0)?.focus({ preventScroll: true });
    previouslyOpen.current = open;
    if (open && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ref.current?.querySelectorAll("nav").forEach((nav) => {
        nav.animate([{ opacity: 0, transform: "translateY(-18px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" });
      });
    }
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header ref={ref} className={`framer-ngh1jg voxen-header${open ? " is-open" : ""}`} data-framer-name="Header" style={{ transform: "translateX(-50%)" }}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("a")) { setOpen(false); return; }
        if (target.closest(".framer-AjWWc, .framer-pblrpj, .framer-ywixic") || open) setOpen((value) => !value);
      }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && (event.target as HTMLElement).closest(".framer-AjWWc, .framer-pblrpj, .framer-ywixic")) {
          event.preventDefault(); setOpen((value) => !value);
        }
      }}>
      {(["desktop", "tablet", "mobile"] as const).map((viewport) => (
        <div key={viewport} className={`voxen-nav-${viewport}`}>
          {renderMarkup(widgets.navigation[viewport][open ? "open" : "closed"])}
        </div>
      ))}
    </header>
  );
}
