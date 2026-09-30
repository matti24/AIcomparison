import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Provider } from "@/lib/types";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="10" fill="currentColor" />
      <path d="M9 19.8 16 8l7 11.8h-4.2L16 15l-2.8 4.8H9Z" fill="white" />
      <path d="m12.2 24 2.2-3.8h7.4L24 24H12.2Z" fill="#CBBEFF" />
    </svg>
  );
}

export function ProviderLogo({ provider, className, size = 44 }: { provider: Provider; className?: string; size?: number }) {
  return (
    <span
      className={cn("provider-logo", className)}
      style={{ width: size, height: size, backgroundColor: `color-mix(in srgb, ${provider.color} 9%, var(--card))` }}
    >
      {provider.logo ? (
        <Image
          src={provider.logo}
          alt={`${provider.name} logo`}
          width={size}
          height={size}
          className="size-[58%] object-contain"
          unoptimized
        />
      ) : (
        <span style={{ color: provider.color }}>{provider.name.slice(0, 2)}</span>
      )}
    </span>
  );
}
