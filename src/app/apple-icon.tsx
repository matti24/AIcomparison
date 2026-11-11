import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111113" }}>
        <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
          <path fillRule="evenodd" d="M6.6 23.6 12.3 8.4h2.7l5.7 15.2h-3.1l-1.3-3.6H11l-1.3 3.6H6.6Zm5.3-6.2h3.6l-1.8-5-1.8 5Z" fill="#ffffff" />
          <rect x="22.2" y="8.4" width="3" height="15.2" rx=".6" fill="#ffffff" />
        </svg>
      </div>
    ),
    size,
  );
}
