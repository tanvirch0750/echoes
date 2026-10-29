"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import widgets from "@/content/widgets.json";
import { renderMarkup } from "@/lib/markup";

const FaqContext = createContext({ selected: [0, 4], toggle: (_index: number) => {} });

export function FaqProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState([0, 4]);
  return <FaqContext.Provider value={{ selected, toggle: (index) => setSelected((previous) => {
    const next = [...previous], column = Math.floor(index / 4);
    next[column] = previous[column] === index ? -1 : index;
    return next;
  }) }}>{children}</FaqContext.Provider>;
}

export function FaqItem({ index }: { index: number }) {
  const { selected, toggle } = useContext(FaqContext);
  const open = selected.includes(index);
  const item = widgets.faqs[index];
  if (!item) return null;
  return <div className={`voxen-faq${open ? " is-expanded" : ""}`} role="button" tabIndex={0} aria-label={item.question || undefined} aria-expanded={open}
    onClick={() => toggle(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(index); } }}>
    {renderMarkup((open ? item.open : item.closed).replaceAll('tabindex="0"', 'tabindex="-1"'))}
  </div>;
}
