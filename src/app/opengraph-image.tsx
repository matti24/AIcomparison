import { ogSize, siteImage } from "@/lib/og";

export const alt = "AI Compare — Compare the world's leading AI models";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return siteImage("Compare the world’s leading AI models", "Pricing • Context • Capabilities • Benchmarks — every fact source-linked");
}
