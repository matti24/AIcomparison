import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { Provider } from "@/lib/types";

export const ogSize = { width: 1200, height: 630 };

async function logoData(provider: Provider) {
  if (!provider.logo) return null;
  try {
    const file = await readFile(path.join(process.cwd(), "public", provider.logo.replace(/^\//, "")));
    const ext = path.extname(provider.logo).slice(1);
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
    return `data:${mime};base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

function Logo({ provider, src, size }: { provider: Provider; src: string | null; size: number }) {
  return (
        <div style={{ display: "flex", width: size, height: size, borderRadius: size / 4, border: "2px solid #e4e4e7", background: "#ffffff", alignItems: "center", justifyContent: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> elements. */}
      {src ? <img src={src} width={size * 0.6} height={size * 0.6} alt="" /> : <span style={{ color: provider.color, fontSize: size * 0.4, fontWeight: 700 }}>{provider.name.slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

function Frame({ children, footer }: { children: React.ReactNode; footer: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fafafa", padding: "64px 72px", fontFamily: "sans-serif", color: "#0a0a0b" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 700 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0a0a0b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>AI</div>
        AI Compare
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", fontSize: 24, color: "#65656f" }}>{footer}</div>
    </div>
  );
}

export async function comparisonImage(entries: { name: string; provider: Provider }[]) {
  const logos = await Promise.all(entries.map((entry) => logoData(entry.provider)));
  const fontSize = entries.length > 2 ? 46 : 60;
  return new ImageResponse(
    <Frame footer="Pricing • Context • Capabilities • Benchmarks">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {entries.map((entry, index) => (
          <div key={entry.name} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {index > 0 && <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: "#8b8b94", letterSpacing: 4 }}>VS</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <Logo provider={entry.provider} src={logos[index]} size={entries.length > 2 ? 56 : 72} />
              <div style={{ display: "flex", fontSize, fontWeight: 700, letterSpacing: -1.5 }}>{entry.name}</div>
            </div>
          </div>
        ))}
      </div>
    </Frame>,
    ogSize,
  );
}

export async function modelImage(name: string, provider: Provider, facts: string[]) {
  const logo = await logoData(provider);
  return new ImageResponse(
    <Frame footer="Pricing • Context • Capabilities • Benchmarks • Sources">
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Logo provider={provider} src={logo} size={104} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#65656f" }}>by {provider.name}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
        {facts.map((fact) => (
          <div key={fact} style={{ display: "flex", padding: "12px 22px", borderRadius: 12, border: "2px solid #e4e4e7", background: "#fff", fontSize: 26, fontWeight: 600 }}>{fact}</div>
        ))}
      </div>
    </Frame>,
    ogSize,
  );
}

export function siteImage(headline: string, sub: string) {
  return new ImageResponse(
    <Frame footer={sub}>
      <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.05, maxWidth: 980 }}>{headline}</div>
    </Frame>,
    ogSize,
  );
}
