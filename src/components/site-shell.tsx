"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeftRight, ArrowRight, Check, ChevronRight, Command, Heart, Menu, Moon,
  Search, Sparkles, Sun, X, ExternalLink,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { BrandMark, ProviderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { comparisonPath, getProvider, matchesSearch, sortModels } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/models", label: "Models" },
  { href: "/compare", label: "Compare" },
  { href: "/companies", label: "Companies" },
  { href: "/trending", label: "Trending" },
  { href: "/finder", label: "AI Finder" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { setSearchOpen, favorites } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" aria-label="AI Compare home" className="brand">
          <BrandMark className="text-primary" />
          <span>AI<span className="font-normal">Compare</span><span className="brand-dot">.</span></span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-link", pathname.startsWith(item.href) && "active")}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              {item.label}
              {item.href === "/finder" && <Sparkles size={12} />}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button className="nav-search" onClick={() => setSearchOpen(true)} aria-label="Search models and companies">
            <Search size={16} /><span>Search anything</span><kbd><Command size={10} /> K</kbd>
          </button>
          <span className="nav-divider" />
          <Button size="icon" variant="ghost" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Toggle color theme">
            <Sun className="hidden dark:block" size={18} /><Moon className="dark:hidden" size={18} />
          </Button>
          <Button size="icon" variant="ghost" asChild className="relative">
            <Link href="/watchlist" aria-label={`Watchlist, ${favorites.length} saved models`}>
              <Heart size={18} />
              {favorites.length > 0 && <span className="favorite-count">{favorites.length}</span>}
            </Link>
          </Button>
          <Button size="icon" variant="ghost" className="mobile-menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu">
            <Menu />
          </Button>
        </div>
      </div>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="rounded-2xl">
          <DialogTitle className="flex items-center gap-2"><BrandMark className="text-primary" /> AI Compare</DialogTitle>
          <DialogDescription>Your shortcut to the right AI.</DialogDescription>
          <nav className="grid gap-2" aria-label="Mobile navigation">
            {[...navigation, { href: "/watchlist", label: "My watchlist" }].map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center justify-between rounded-xl p-3 hover:bg-secondary">
                {item.label}<ArrowRight size={16} />
              </Link>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </header>
  );
}

export function GlobalSearch() {
  const { catalog, searchOpen, setSearchOpen } = useApp();
  const [query, setQuery] = useState("");
  const router = useRouter();
  const models = sortModels(catalog.models.filter((model) => matchesSearch(model, getProvider(catalog, model.providerId), query)), "featured").slice(0, 6);
  const providers = query.trim()
    ? catalog.providers.filter((provider) => provider.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  function openResult(path: string) {
    setSearchOpen(false);
    router.push(path);
  }

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="search-dialog gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Search AI Compare</DialogTitle>
        <DialogDescription className="sr-only">Search model names, companies, or capabilities. Tab to a result and press Enter to open it.</DialogDescription>
        <form onSubmit={(event) => { event.preventDefault(); openResult(`/models?q=${encodeURIComponent(query)}`); }} className="flex items-center gap-3 border-b px-5 py-4">
          <Search className="text-primary" size={21} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models, companies, or capabilities..." aria-label="Search models, companies, or capabilities" className="w-full bg-transparent text-base outline-none" />
          <button type="button" onClick={() => setSearchOpen(false)} className="text-muted-foreground" aria-label="Close search"><X size={18} /></button>
        </form>
        <div className="max-h-[65vh] overflow-y-auto p-3">
          <p className="px-3 py-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{query ? "Matching models" : "A few places to start"}</p>
          {models.length ? models.map((model) => (
            <button key={model.id} onClick={() => openResult(`/models/${model.slug}`)} className="search-result">
              <ProviderLogo provider={getProvider(catalog, model.providerId)} size={38} />
              <span className="flex-1 text-left"><span className="block text-sm font-semibold">{model.name}</span><span className="text-xs text-muted-foreground">{getProvider(catalog, model.providerId).name}</span></span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          )) : <p className="px-3 py-6 text-sm text-muted-foreground">No matching models. Try a provider, &ldquo;coding&rdquo;, or &ldquo;large context&rdquo;.</p>}
          {providers.length > 0 && <p className="px-3 pt-4 pb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Companies</p>}
          {providers.map((provider) => (
            <button key={provider.id} onClick={() => openResult(`/companies/${provider.slug}`)} className="search-result">
              <ProviderLogo provider={provider} size={32} /><span className="flex-1 text-left text-sm font-medium">{provider.name}</span><ArrowRight size={16} />
            </button>
          ))}
        </div>
        <button onClick={() => openResult(`/models?q=${encodeURIComponent(query)}`)} className="flex items-center justify-between border-t bg-secondary/40 px-6 py-3.5 text-xs text-muted-foreground hover:text-primary">
          <span>Explore all results & filters</span><span className="flex items-center gap-2">Enter <ArrowRight size={14} /></span>
        </button>
      </DialogContent>
    </Dialog>
  );
}

export function CompareBar() {
  const { catalog, selected, toggleSelected, clearSelected } = useApp();
  const pathname = usePathname();
  if (!selected.length || pathname.startsWith("/compare/")) return null;
  const models = selected.flatMap((slug) => catalog.models.filter((model) => model.slug === slug));
  return (
    <aside className="compare-bar" aria-label="Selected models for comparison">
      <div className="compare-bar-label"><ArrowLeftRight size={19} /><span>Compare models <span className="text-muted-foreground">({selected.length}/4)</span></span></div>
      <div className="compare-bar-models">
        {models.map((model) => (
          <div className="compare-bar-chip" key={model.slug}>
            <ProviderLogo provider={getProvider(catalog, model.providerId)} size={25} />
            <span>{model.name}</span>
            <button onClick={() => toggleSelected(model.slug)} aria-label={`Remove ${model.name} from comparison`}><X size={13} /></button>
          </div>
        ))}
        {models.length === 1 && <span className="text-xs text-muted-foreground">Add at least one more</span>}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={clearSelected} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
        {models.length >= 2 ? (
          <Button asChild><Link href={comparisonPath(selected)}>Compare <ArrowRight size={15} /></Link></Button>
        ) : <Button disabled>Compare <ArrowRight size={15} /></Button>}
      </div>
    </aside>
  );
}

export function SiteFooter() {
  const { catalog } = useApp();
  return (
    <footer className="site-footer">
      <div className="content-width">
        <div className="footer-top">
          <div>
            <Link href="/" className="brand text-lg"><BrandMark className="size-7 text-primary" /><span>AI<span className="font-normal">Compare</span><span className="brand-dot">.</span></span></Link>
            <p className="mt-3 text-sm text-muted-foreground">Less noise. More clarity. Better AI choices.</p>
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
            <Link href="/models">Explore models</Link><Link href="/compare">Compare</Link><Link href="/finder">Find your AI</Link><Link href="/methodology">Our methodology <ExternalLink className="inline-block" size={11} /></Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} AI Compare. Independent by design.</p>
          <p className="flex items-center gap-1.5"><span className="status-dot" />{catalog.models.length} models. Source-linked facts. Editorial picks.</p>
          <Link href="/admin">Catalog admin <ChevronRight className="inline-block" size={11} /></Link>
        </div>
        <p className="footer-disclaimer">Specifications and pricing can change. Check the linked provider source before making a decision. Provider names and marks belong to their respective owners.</p>
      </div>
    </footer>
  );
}

export function EmptyState({ title, description, icon = "search", children }: { title: string; description: string; icon?: "search" | "heart" | "check"; children?: React.ReactNode }) {
  const Icon = icon === "heart" ? Heart : icon === "check" ? Check : Search;
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={28} /></span>
      <h2>{title}</h2><p>{description}</p>{children}
    </div>
  );
}
