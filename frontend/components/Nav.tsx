"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Ingestion", href: "/" },
  { label: "Retrieval", href: "/retrieval" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-6 py-3 mb-2"
      style={{ borderBottom: "1px solid var(--border-glass)" }}>
      <span className="text-sm font-semibold" style={{ color: "var(--accent-cyan)" }}>
        Kinetic Pipeline
      </span>
      <div className="flex gap-1">
        {TABS.map(({ label, href }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className="px-4 py-1.5 rounded text-xs font-mono transition-all"
              style={{
                background: active ? "rgba(0,229,255,0.1)" : "transparent",
                color: active ? "var(--accent-cyan)" : "var(--text-muted)",
                border: `1px solid ${active ? "rgba(0,229,255,0.3)" : "transparent"}`,
              }}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
