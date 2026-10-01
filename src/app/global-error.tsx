"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en"><body style={{ margin: 0, padding: "15vh 24px", background: "#fafafa", color: "#0a0a0b", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <h1 style={{ fontSize: 28, letterSpacing: -0.5 }}>Model data couldn&apos;t be loaded.</h1>
      <p style={{ maxWidth: 480, margin: "16px auto 28px", color: "#65656f", lineHeight: 1.6 }}>AI Compare is temporarily unavailable. Your saved favorites and comparisons in this browser are unaffected.</p>
      <button onClick={reset} style={{ border: 0, borderRadius: 8, padding: "11px 20px", background: "#111113", color: "white", cursor: "pointer", fontSize: 15 }}>Retry</button>
    </body></html>
  );
}
