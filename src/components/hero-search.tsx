"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useApp } from "@/components/app-provider";

export function HeroSearch() {
  const router = useRouter();
  const { rememberSearch, openPalette } = useApp();
  const [query, setQuery] = useState("");
  return (
    <form
      className="hero-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = query.trim();
        if (!q) { openPalette("search"); return; }
        rememberSearch(q);
        router.push(`/models?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search size={19} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="hero-search" className="sr-only">Search AI models</label>
      <input
        id="hero-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search GPT, Claude, Gemini, Grok, DeepSeek…"
        autoComplete="off"
        enterKeyHint="search"
      />
      <kbd className="desktop-only mr-1" aria-hidden="true">/</kbd>
      <button type="submit" className="grid size-10 shrink-0 place-items-center rounded-lg bg-foreground text-background hover:opacity-90" aria-label="Search">
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
