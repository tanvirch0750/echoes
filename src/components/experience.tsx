"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SearchDialog } from "./search-dialog";
import { VideoDialog } from "./video-dialog";
import { FaqProvider } from "./faq";

export function Experience({ children, video }: { children: ReactNode; video?: string | null }) {
  const [search, setSearch] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const closeSearch = useCallback(() => setSearch(false), []);
  const closeVideo = useCallback(() => setPlaying(null), []);

  useEffect(() => { setSearch(false); setPlaying(null); }, [pathname]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = element.querySelectorAll<HTMLElement>("[data-voxen-reveal]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add("voxen-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05 });
    reveals.forEach((target, index) => {
      if (reducedMotion) return;
      target.classList.add("voxen-reveal-ready");
      if (target.dataset.voxenReveal === "word") target.style.setProperty("--reveal-delay", `${(index % 9) * 55}ms`);
      observer.observe(target);
    });
    const videos = element.querySelectorAll<HTMLVideoElement>("video");
    const mediaObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const media = entry.target as HTMLVideoElement;
        if (entry.isIntersecting && media.muted && !reducedMotion) void media.play().catch(() => {});
        else media.pause();
      });
    }, { rootMargin: "120px" });
    videos.forEach((media) => { media.muted = true; mediaObserver.observe(media); });

    const tickerAnimations: Animation[] = [];
    const tickerClones: HTMLElement[] = [];
    const tickerObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      const animation = tickerAnimations.find((item) => (item.effect as KeyframeEffect | null)?.target === entry.target);
      if (entry.isIntersecting) animation?.play(); else animation?.pause();
    }));
    element.querySelectorAll<HTMLUListElement>("ul:has(> .ticker-item)").forEach((list) => {
      list.style.opacity = "1";
      if (reducedMotion) { list.style.transform = "none"; return; }
      const items = Array.from(list.children) as HTMLElement[];
      const gap = parseFloat(getComputedStyle(list).gap) || 30;
      const period = items.reduce((sum, item) => sum + item.getBoundingClientRect().width + gap, 0);
      if (!period) return;
      items.forEach((item) => {
        item.style.width = `${item.getBoundingClientRect().width}px`;
        const clone = item.cloneNode(true) as HTMLElement;
        clone.setAttribute("aria-hidden", "true"); clone.inert = true;
        list.appendChild(clone); tickerClones.push(clone);
      });
      const animation = list.animate([{ transform: "translateX(-30px)" }, { transform: `translateX(${-period - 30}px)` }], { duration: period / 50 * 1000, iterations: Infinity, easing: "linear" });
      tickerAnimations.push(animation); tickerObserver.observe(list);
    });

    // Preserve the original long, pinned, three-phase type sequence on desktop.
    const podcast = element.querySelector<HTMLElement>('[data-framer-name="Podcast Section"]');
    let frame = 0;
    function updateScroll() {
      frame = 0;
      if (!podcast || innerWidth < 768) return;
      function progress(selector: string) {
        const helper = podcast!.querySelector<HTMLElement>(selector);
        if (!helper) return 0;
        const rect = helper.getBoundingClientRect();
        const value = Math.max(0, Math.min(1, (innerHeight - rect.top) / rect.height));
        return reducedMotion ? Number(value >= .5) : value;
      }
      const phases = [
        { wrapper: ".framer-1ibz7gf", enter: null, exit: ".framer-1xzo4i2" },
        { wrapper: ".framer-1gc7aqg", enter: ".framer-dr77az", exit: ".framer-bhveae" },
        { wrapper: ".framer-83itvf", enter: ".framer-4w8env", exit: ".framer-ibi1is" },
      ];
      phases.forEach(({ wrapper, enter, exit }) => {
        const target = podcast.querySelector<HTMLElement>(wrapper);
        if (!target) return;
        const entering = enter ? progress(enter) : 1, exiting = progress(exit);
        const child = target.firstElementChild as HTMLElement | null;
        target.style.opacity = String(1 - exiting);
        target.style.transform = reducedMotion ? "none" : `scale(${1 + exiting * 4})`;
        if (child) { child.style.opacity = String(entering); child.style.transform = reducedMotion ? "none" : `scale(${entering})`; }
      });
      const videoProgress = progress(".framer-yl889y");
      podcast.querySelectorAll<HTMLElement>(".framer-pa2t80").forEach((wrapper) => {
        wrapper.style.opacity = String(videoProgress);
        wrapper.style.transform = reducedMotion ? "none" : `scale(${videoProgress})`;
      });
    }
    const scroll = () => { if (!frame) frame = requestAnimationFrame(updateScroll); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    updateScroll();

    // Descriptive names for the reference's visually icon-only play buttons.
    element.querySelectorAll<HTMLButtonElement>('button[data-framer-name="Play button"]').forEach((button) => button.setAttribute("aria-label", "Play podcast video"));
    function hover(event: MouseEvent, entering: boolean) {
      const target = (event.target as HTMLElement).closest<HTMLElement>('a[class*="framer-v-"], button[class*="framer-v-"]');
      if (target && !(event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) target.classList.toggle("hover", entering);
    }
    const hoverIn = (event: MouseEvent) => hover(event, true), hoverOut = (event: MouseEvent) => hover(event, false);
    element.addEventListener("mouseover", hoverIn); element.addEventListener("mouseout", hoverOut);
    return () => { observer.disconnect(); mediaObserver.disconnect(); tickerObserver.disconnect(); tickerAnimations.forEach((animation) => animation.cancel()); tickerClones.forEach((clone) => clone.remove()); cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); element.removeEventListener("mouseover", hoverIn); element.removeEventListener("mouseout", hoverOut); };
  }, [pathname]);

  return <FaqProvider><div ref={root} className="voxen-experience" onClick={(event) => {
    const target = event.target as HTMLElement;
    if (target.closest('button[aria-label="Search Icon"], [data-framer-name="Search Button"]')) { setSearch(true); return; }
    if (target.closest('button[data-framer-name="Play button"]')) setPlaying(video || "/assets/1OWSi6OPkSnrXRIu4GsFHMMNo0.mp4");
  }}>
    {children}
  </div>{search && <SearchDialog close={closeSearch} />}{playing && <VideoDialog src={playing} close={closeVideo} />}</FaqProvider>;
}
