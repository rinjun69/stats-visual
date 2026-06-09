"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; }
}

export default function GAPageTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  useEffect(() => {
    window.gtag?.("config", gaId, { page_path: pathname });
  }, [pathname, gaId]);
  return null;
}
