"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import searchIndex from "@/content/search.json";

export function SearchDialog({ close }: { close: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return searchIndex.filter((entry) => entry.path.startsWith("/episodes/")).map((entry) => ({
      ...entry,
      score: words.reduce((score, word) => score + (entry.title.toLocaleLowerCase().includes(word) ? 20 : 0) + (entry.text.toLocaleLowerCase().includes(word) ? 1 : 0), 0),
    })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  }, [query]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>("input, button, a") || []);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [close]);

  return createPortal(<div className="voxen-search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="Search episodes" className="voxen-search-dialog">
      <div role="search" className="voxen-search-input">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <input ref={input} placeholder="Search..." aria-label="Search episodes" value={query} spellCheck={false} onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, results.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
            if (event.key === "Enter" && results[active]) dialog.current?.querySelectorAll<HTMLAnchorElement>("a")[active]?.click();
          }}/>
        {query && <button onClick={() => { setQuery(""); input.current?.focus(); }} aria-label="Clear search">×</button>}
      </div>
      <ul className="voxen-search-results" aria-live="polite">
        {results.map((entry, index) => <li key={entry.path} className={index === active ? "is-active" : ""}>
          <Link href={entry.path} onClick={close} onMouseEnter={() => setActive(index)}><h3>{entry.title}</h3><p>{entry.path}</p></Link>
        </li>)}
        {query.trim() && results.length === 0 && <li className="voxen-search-empty">No episodes found. Try another search.</li>}
      </ul>
    </div>
  </div>, document.body);
}
