"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function AnimatedCounter({ children, target, speed }: { children: ReactNode; target: number; speed: number }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current?.querySelectorAll("span")[1];
    if (!node || !root.current) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = String(target); return; }
      let value = 0;
      timer = setInterval(() => {
        value = Math.min(target, value + 1); node.textContent = String(value);
        if (value === target) clearInterval(timer);
      }, speed);
    });
    observer.observe(root.current.parentElement!);
    return () => { observer.disconnect(); clearInterval(timer); };
  }, [target, speed]);
  return <div ref={root} className="voxen-counter">{children}</div>;
}
