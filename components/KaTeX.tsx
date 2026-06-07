"use client";

import { useEffect, useRef } from "react";
import katex from "katex";

interface KaTeXProps {
  math: string;
  display?: boolean;
  className?: string;
}

export default function KaTeX({ math, display = false, className }: KaTeXProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      katex.render(math, ref.current, {
        displayMode: display,
        throwOnError: false,
      });
    }
  }, [math, display]);

  return <span ref={ref} className={className} />;
}
