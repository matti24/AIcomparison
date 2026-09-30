import { ImageResponse } from "next/og";

export const alt = "AI Compare - Less noise. More clarity. Better AI choices.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#f7f5fc", display: "flex", flexDirection: "column", padding: "74px 88px", fontFamily: "sans-serif", color: "#282330" }}>
      <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#7454d6" }}>AI Compare.</div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 67, fontSize: 72, fontWeight: 600, letterSpacing: -3, lineHeight: 1.15 }}>
        <span>Compare the world&apos;s</span><span style={{ color: "#7454d6" }}>leading AI models.</span>
      </div>
      <div style={{ display: "flex", marginTop: 35, color: "#787080", fontSize: 23 }}>Less noise. More clarity. Better AI choices.</div>
      <div style={{ display: "flex", marginTop: 45, fontSize: 17, color: "#787080" }}>Independent by design. Always source-linked.</div>
    </div>, { ...size },
  );
}
