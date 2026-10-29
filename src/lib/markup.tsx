import parse, { attributesToProps, domToReact, Element, type DOMNode, type HTMLReactParserOptions } from "html-react-parser";
import Link from "next/link";

/** Reuse the authorized visual markup, with native Next.js navigation. */
export function renderMarkup(html: string) {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (node instanceof Element && node.name === "a" && node.attribs.href?.startsWith("/")) {
        const { href, ...props } = attributesToProps(node.attribs);
        // Framer emits `as="a"` as a DOM attribute. On Next Link, `as` is a URL mask.
        delete props.as;
        return <Link {...props} href={String(href)} prefetch={false}>{domToReact(node.children as DOMNode[], options)}</Link>;
      }
    },
  };
  return parse(html, options);
}
