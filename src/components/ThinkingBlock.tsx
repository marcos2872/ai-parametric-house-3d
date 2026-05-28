"use client";

import { useRef, useEffect } from "react";

export type StreamingPhase = "idle" | "thinking" | "generating" | "done";

interface ThinkingBlockProps {
  content: string;
  phase: StreamingPhase;
}

function getLabel(phase: StreamingPhase): string {
  switch (phase) {
    case "thinking":
      return "Pensando...";
    case "generating":
      return "Gerando projeto...";
    case "done":
      return "Raciocínio concluído";
    default:
      return "";
  }
}

export default function ThinkingBlock({ content, phase }: ThinkingBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (preRef.current && (phase === "thinking" || phase === "generating")) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [content, phase]);

  if (phase === "idle" || (!content && phase === "done")) {
    return null;
  }

  const isActive = phase === "thinking" || phase === "generating";

  return (
    <details className="thinking-block" open={isActive}>
      <summary className="thinking-block__summary">
        {isActive && <span className="thinking-block__dot" />}
        {getLabel(phase)}
      </summary>
      {content && (
        <pre ref={preRef} className="thinking-block__content">
          {content}
        </pre>
      )}
    </details>
  );
}
