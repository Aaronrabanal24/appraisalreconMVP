"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const map: Record<string, string> = {
  "g i": "/intake",
  "g c": "/capture",
  "g a": "/appraisal",
  "g h": "/",
};

export default function GlobalShortcuts() {
  const router = useRouter();
  const buf = useRef<string[]>([]);
  const lastAt = useRef<number>(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

      const now = performance.now();
      if (now - lastAt.current > 1200) buf.current = [];
      lastAt.current = now;

      const k = e.key.toLowerCase();
      if (k.length === 1) {
        buf.current.push(k);
        if (buf.current.length > 2) buf.current.shift();
        const seq = buf.current.join(" ");
        const dest = map[seq];
        if (dest) {
          e.preventDefault();
          router.push(dest);
          buf.current = [];
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
