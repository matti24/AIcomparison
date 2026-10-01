import Image from "next/image";
import { cn } from "@/lib/utils";

/** Upstream single-color marks; they are inverted in dark mode to stay visible. */
const MONOCHROME = new Set([
  "/logos/openai.svg", "/logos/anthropic.svg", "/logos/xai.svg", "/logos/runway.svg", "/logos/black-forest-labs.svg",
  "/logos/zai.svg", "/logos/midjourney.svg", "/logos/elevenlabs.svg", "/logos/suno.svg", "/logos/ideogram.svg",
  "/logos/recraft.svg", "/logos/groq.svg", "/logos/openrouter.svg", "/logos/ai21.svg",
]);

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("size-6", className)}>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path d="M6.5 16.5 10 7.5h1.6l3.5 9h-1.9l-.8-2.2H9.2l-.8 2.2H6.5Zm3.3-3.8h2.4L11 9.6l-1.2 3.1Z" fill="var(--background)" />
      <rect x="15.6" y="7.5" width="1.8" height="9" rx=".4" fill="var(--background)" />
    </svg>
  );
}

export interface LogoProvider {
  name: string;
  color: string;
  logo: string;
}

export function ProviderLogo({ provider, className, size = 32 }: { provider: LogoProvider; className?: string; size?: number }) {
  const initials = provider.name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return (
    <span aria-hidden="true" className={cn("provider-logo", className)} style={{ width: size, height: size, borderRadius: Math.max(6, Math.round(size / 4)) }}>
      {provider.logo ? (
        <Image
          src={provider.logo}
          alt=""
          width={Math.round(size * 0.6)}
          height={Math.round(size * 0.6)}
          data-mono={MONOCHROME.has(provider.logo) ? "true" : undefined}
          unoptimized
        />
      ) : (
        <span aria-hidden="true" style={{ color: provider.color, fontSize: Math.round(size * 0.38) }}>{initials}</span>
      )}
    </span>
  );
}
