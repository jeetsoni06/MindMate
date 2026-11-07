"use client";

import dynamic from "next/dynamic";

const Agentation = dynamic(
  () => import("agentation").then((mod) => ({ default: mod.Agentation })),
  { ssr: false }
);

export default function AgentationProvider() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <Agentation />;
}
