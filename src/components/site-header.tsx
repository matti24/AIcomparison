"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { DropdownMenu } from "radix-ui";
import {
  ChevronDown, Compass, Calculator, Code2, Heart, Image as ImageIcon, Info, Menu, Moon, Search, Sun, Unlock, Video, Bell, LogIn,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { BrandMark } from "@/components/brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/models", label: "Models" },
  { href: "/compare", label: "Compare" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/providers", label: "Providers" },
  { href: "/releases", label: "Releases" },
];

export const moreNav = [
  { href: "/ai-finder", label: "AI Finder", description: "Answer four questions, get explained matches", icon: Compass },
  { href: "/pricing-calculator", label: "API Pricing", description: "Estimate monthly cost across models", icon: Calculator },
  { href: "/models/open-source", label: "Open Source", description: "Downloadable and open-weight models", icon: Unlock },
  { href: "/models/image-generation", label: "Image Models", description: "Text-to-image and editing", icon: ImageIcon },
  { href: "/models/video-generation", label: "Video Models", description: "Text- and image-to-video", icon: Video },
  { href: "/models/coding", label: "Coding Models", description: "Models documented for software work", icon: Code2 },
  { href: "/about", label: "About", description: "Who we are and how we work", icon: Info },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button type="button" className={cn("icon-btn", className)} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Toggle color theme">
      <Sun className="hidden dark:block" size={17} />
      <Moon className="dark:hidden" size={17} />
    </button>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { openPalette, favorites, watchlist } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette("search");
      } else if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        openPalette("search");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette]);

  const moreActive = moreNav.some((item) => isActive(pathname, item.href));

  return (
    <header className="site-header">
      <div className="container-page site-header-inner">
        <button type="button" className="icon-btn mobile-only -ml-2" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu">
          <Menu size={19} />
        </button>
        <Link href="/" className="brand" aria-label="AI Compare home">
          <BrandMark className="text-foreground" />
          <span>AI Compare</span>
        </Link>
        <nav className="nav desktop-only" aria-label="Main">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link" aria-current={isActive(pathname, item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger className="nav-link" aria-current={moreActive ? "page" : undefined}>
              More <ChevronDown size={14} aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="menu w-[320px]" sideOffset={8} align="start">
                {moreNav.map(({ href, label, description, icon: Icon }) => (
                  <DropdownMenu.Item key={href} asChild>
                    <Link href={href} className="menu-item">
                      <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span>{label}<small>{description}</small></span>
                    </Link>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </nav>
        <div className="ml-auto flex flex-1 items-center justify-end gap-1">
          <button type="button" className="nav-search desktop-only" onClick={() => openPalette("search")} aria-label="Search models, providers, and comparisons" aria-keyshortcuts="Control+K Meta+K /">
            <Search size={15} aria-hidden="true" />
            <span className="flex-1 text-left">Search models…</span>
            <kbd aria-hidden="true">⌘K</kbd>
          </button>
          <button type="button" className="icon-btn mobile-only" onClick={() => openPalette("search")} aria-label="Search">
            <Search size={18} />
          </button>
          <Link href="/favorites" className="icon-btn" aria-label={`Favorites (${favorites.length})`}>
            <Heart size={17} />
            {favorites.length > 0 && <span className="count-dot" aria-hidden="true">{favorites.length}</span>}
          </Link>
          <Link href="/watchlist" className="icon-btn desktop-grid" aria-label={`Watchlist (${watchlist.length} followed)`}>
            <Bell size={17} />
            {watchlist.length > 0 && <span className="count-dot" aria-hidden="true">{watchlist.length}</span>}
          </Link>
          <ThemeToggle className="desktop-grid" />
          <Link href="/sign-in" className="ml-1 hidden h-8 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[13.5px] font-medium shadow-[var(--shadow-sm)] hover:bg-surface-2 sm:inline-flex">
            <LogIn size={14} aria-hidden="true" /> Sign in
          </Link>
        </div>
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="mobile-drawer" showCloseButton>
          <DialogTitle className="flex items-center gap-2 text-base"><BrandMark /> AI Compare</DialogTitle>
          <DialogDescription className="sr-only">Site navigation</DialogDescription>
          <nav className="mt-2 grid gap-1" aria-label="Mobile">
            {[...primaryNav, ...moreNav, { href: "/favorites", label: "Favorites" }, { href: "/watchlist", label: "Watchlist" }, { href: "/pricing", label: "AI Compare Pro" }, { href: "/sign-in", label: "Sign in" }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className="flex min-h-11 items-center rounded-md px-3 text-[15px] hover:bg-surface-2 aria-[current=page]:bg-surface-2 aria-[current=page]:font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
            Theme <ThemeToggle />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
