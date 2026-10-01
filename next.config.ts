import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/companies", destination: "/providers", permanent: true },
      { source: "/companies/:slug", destination: "/providers/:slug", permanent: true },
      { source: "/finder", destination: "/ai-finder", permanent: true },
      { source: "/trending", destination: "/models?sort=trending", permanent: false },
      { source: "/open-source", destination: "/models/open-source", permanent: true },
      { source: "/image-models", destination: "/models/image-generation", permanent: true },
      { source: "/video-models", destination: "/models/video-generation", permanent: true },
      // Model URLs before provider-scoped paths (/models/<provider>/<model>).
      ...[
        ["claude-sonnet-5-5", "anthropic"], ["gpt-6-1-sol", "openai"], ["gemini-3-8-flash", "google"], ["claude-opus-5-5", "anthropic"],
        ["grok-4-7", "xai"], ["gpt-5-4-mini", "openai"], ["deepseek-v3-2", "deepseek"], ["qwen3-coder-next", "qwen"],
        ["command-a-plus-05-2026", "cohere"], ["mistral-small-3-2-2506", "mistral"], ["phi-4-multimodal-instruct", "microsoft"],
        ["llama-4-scout", "meta"], ["gemini-3-1-pro-preview", "google"], ["qwen3-235b-a22b-instruct-2507", "qwen"], ["flux-2-pro", "black-forest-labs"],
        ["gpt-image-1-5", "openai"], ["veo-3-1", "google"], ["runway-gen-4-5", "runway"], ["gpt-4o-mini-tts", "openai"],
        ["embed-v5-0-pro", "cohere"], ["sonar-pro", "perplexity"],
      ].map(([slug, provider]) => ({ source: `/models/${slug}`, destination: `/models/${provider}/${slug}`, permanent: true })),
    ];
  },
};

export default nextConfig;
