import type { ProviderFile } from "../define";
import * as anthropicXai from "./anthropic-xai";
import * as asiaLabs from "./asia-labs";
import * as deepseekQwen from "./deepseek-qwen";
import * as enterprisePlatforms from "./enterprise-platforms";
import * as google from "./google";
import * as media from "./media";
import * as openai from "./openai";
import * as westernLabs from "./western-labs";

// Each file is authored from verified official sources; see src/data/define.ts.
export const providerFiles: ProviderFile[] = [
  openai, anthropicXai, google, deepseekQwen, westernLabs, enterprisePlatforms, asiaLabs, media,
].map((file) => ({
  providers: file.providers,
  models: file.models,
  extraBenchmarks: "extraBenchmarks" in file ? (file.extraBenchmarks as ProviderFile["extraBenchmarks"]) : undefined,
}));
