import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageComposition, pageContent } from "@/components/page-composition";

type Props = { params: Promise<{ path?: string[] }> };

export function generateStaticParams() {
  return Object.keys(pageContent).map((route) => ({ path: route === "/" ? [] : route.slice(1).split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const route = path?.length ? `/${path.join("/")}` : "/";
  const page = pageContent[route];
  return page ? { title: page.title, description: page.description } : { title: "Page not found — ECHOES" };
}

export default async function Page({ params }: Props) {
  const { path } = await params;
  const route = path?.length ? `/${path.join("/")}` : "/";
  if (!pageContent[route] || route === "/404") notFound();
  return <PageComposition route={route} />;
}
