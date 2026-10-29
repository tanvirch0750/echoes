import parse, { attributesToProps, domToReact, Element, type DOMNode, type HTMLReactParserOptions } from "html-react-parser";
import Link from "next/link";
import pages from "@/content/pages.json";
import widgets from "@/content/widgets.json";
import { renderMarkup } from "@/lib/markup";
import { Header } from "./header";
import { Testimonials } from "./testimonials";
import { FaqItem } from "./faq";
import { SiteForm } from "./site-form";
import { BlobReveal } from "./blob-reveal";
import { AnimatedCounter } from "./animated-counter";
import { Experience } from "./experience";

export const pageContent = pages as Record<string, { key: string; html: string; title: string; description: string; video: string | null }>;

export function PageComposition({ route }: { route: string }) {
  const page = pageContent[route];
  let counter = 0;
  const counterSettings = route === "/about" ? [[250, 10], [12, 50]] : route === "/host" ? [[54, 20], [10, 40]] : [[95, 10], [320, 2]];
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element)) return;
      const { name, attribs } = node;
      // Exclude the original template's floating ads and platform badge on every route.
      if (attribs.id === "__framer-badge-container" || attribs.class?.split(" ").includes("framer-9zjJB")) return <></>;
      if (name === "ul" && attribs.style?.includes("opacity:0")) attribs.style = attribs.style.replace(/opacity:0(?:\.001)?(?=;|$)/, "opacity:1");
      if (attribs["data-framer-appear-id"] && !attribs["data-voxen-reveal"]) {
        attribs["data-voxen-reveal"] = "element";
        attribs.style = (attribs.style || "").replace(/(?:^|;)(?:opacity|will-change|transform):[^;]+/g, "").replace(/^;/, "");
      }
      if (attribs.class?.split(" ").includes("framer-zPhSk")) {
        const viewport = attribs["data-framer-name"] === "Desktop" ? "desktop" : attribs["data-framer-name"] === "Variant 3" ? "tablet" : null;
        const hero = viewport && (widgets as typeof widgets & { hero?: Record<string, string> }).hero?.[viewport];
        if (hero) return <>{renderMarkup(hero)}</>;
      }
      if (name === "voxen-header") return <Header />;
      if (name === "voxen-testimonials") return <Testimonials viewport={attribs.viewport as "desktop" | "tablet" | "mobile"} />;
      if (name === "voxen-faq") return <FaqItem index={Number(attribs.index)} />;
      if (name === "voxen-blob") return <BlobReveal />;
      if (attribs.class?.includes("framer-1roq07b-container")) return <div {...attributesToProps(attribs)}><BlobReveal /></div>;
      if (attribs.class?.includes("framer-is3852-container")) {
        const [target, speed] = counterSettings[counter++ % 2];
        return <div {...attributesToProps(attribs)}><AnimatedCounter target={target} speed={speed}>{domToReact(node.children as DOMNode[], options)}</AnimatedCounter></div>;
      }
      if (name === "a" && attribs.href === "https://framerdevs.com/") {
        return <a {...attributesToProps(attribs)} href="https://tanvir.qom.bd/">Tanvir Chowdhury</a>;
      }
      if (name === "a" && attribs.href?.startsWith("/")) {
        const { href, ...props } = attributesToProps(attribs);
        delete props.as;
        return <Link {...props} href={String(href)} prefetch={false}>{domToReact(node.children as DOMNode[], options)}</Link>;
      }
      if (name === "form") {
        const props = attributesToProps(attribs);
        const hasMessage = route === "/contact" && attribs.class === "framer-1ab1ujh";
        return <SiteForm className={props.className as string} style={props.style as React.CSSProperties} kind={hasMessage ? "contact" : "newsletter"}>{domToReact(node.children as DOMNode[], options)}</SiteForm>;
      }
      if (name === "textarea") return <textarea {...attributesToProps(attribs)} name="Message" defaultValue={node.children.map((child) => "data" in child ? child.data : "").join("")} />;
      if (name === "select") return <select {...attributesToProps(attribs)} defaultValue="">{domToReact(node.children as DOMNode[], options)}</select>;
      if (name === "option" && "selected" in attribs) { delete attribs.selected; }
      if (name === "input" && attribs["aria-hidden"] === "true") return <></>;
      if (attribs.class === "framer-sbdicj-container") return <div {...attributesToProps(attribs)}><svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M7 4.5a1 1 0 0 1 1.5-.86l12 7.5a1 1 0 0 1 0 1.72l-12 7.5A1 1 0 0 1 7 19.5z" fill="#101010"/></svg></div>;
      if (attribs.class === "framer-1dps4t7-container" || attribs.class === "framer-167umuz-container") {
        let anchor = node.parent;
        while (anchor instanceof Element && anchor.name !== "a") anchor = anchor.parent;
        const layout = anchor instanceof Element && anchor.attribs.href?.includes("all-access");
        return <div {...attributesToProps(attribs)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{layout ? <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></> : <><path d="m15 3 6 6-6 6M21 9H8a5 5 0 0 0-5 5v6"/></>}</svg></div>;
      }
      // Framer source metadata is not a React DOM property.
      if (name === "script" || name === "iframe") return <></>;
    },
  };

  return <>
    <link rel="stylesheet" href={`/styles/${page.key}.css`} precedence="reference" />
    <Experience key={route} video={page.video}>
      <div id="main">{parse(page.html, options)}</div>
    </Experience>
  </>;
}
