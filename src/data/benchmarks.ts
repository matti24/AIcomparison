import type { BenchmarkDefinition } from "../lib/types";

/**
 * Benchmark definitions. Results are stored per model with their own source,
 * version, conditions, and reporter. Scores from different benchmarks are never
 * combined into a single "intelligence" number.
 */
export const benchmarkDefinitions: BenchmarkDefinition[] = [
  { id: "mmlu", name: "MMLU", category: "knowledge", unit: "%", higherIsBetter: true, url: "https://arxiv.org/abs/2009.03300", description: "Multiple-choice questions across 57 academic and professional subjects." },
  { id: "mmlu-pro", name: "MMLU-Pro", category: "knowledge", unit: "%", higherIsBetter: true, url: "https://arxiv.org/abs/2406.01574", description: "A harder, ten-option successor to MMLU with more reasoning-focused questions." },
  { id: "mmmlu", name: "MMMLU", category: "knowledge", unit: "%", higherIsBetter: true, url: "https://huggingface.co/datasets/openai/MMMLU", description: "MMLU professionally translated into multiple languages." },
  { id: "gpqa-diamond", name: "GPQA Diamond", category: "reasoning", unit: "%", higherIsBetter: true, url: "https://arxiv.org/abs/2311.12022", description: "Graduate-level, search-resistant science questions (Diamond subset)." },
  { id: "hle", name: "Humanity's Last Exam", category: "reasoning", unit: "%", higherIsBetter: true, url: "https://lastexam.ai", description: "Expert-written questions at the frontier of human knowledge. Results differ with and without tools." },
  { id: "arc-agi-2", name: "ARC-AGI-2", category: "reasoning", unit: "%", higherIsBetter: true, url: "https://arcprize.org/arc-agi/2/", description: "Abstract visual reasoning puzzles designed to resist memorization." },
  { id: "aime-2025", name: "AIME 2025", category: "math", unit: "%", higherIsBetter: true, url: "https://artofproblemsolving.com/wiki/index.php/2025_AIME_I", description: "Problems from the 2025 American Invitational Mathematics Examination." },
  { id: "aime-2026", name: "AIME 2026", category: "math", unit: "%", higherIsBetter: true, url: "https://artofproblemsolving.com/wiki/index.php/2026_AIME_I", description: "Problems from the 2026 American Invitational Mathematics Examination." },
  { id: "math-500", name: "MATH-500", category: "math", unit: "%", higherIsBetter: true, url: "https://github.com/openai/prm800k", description: "A 500-problem subset of the MATH competition benchmark." },
  { id: "humaneval", name: "HumanEval", category: "coding", unit: "%", higherIsBetter: true, url: "https://github.com/openai/human-eval", description: "Python function synthesis problems scored by unit tests (pass@1 unless noted)." },
  { id: "livecodebench", name: "LiveCodeBench", category: "coding", unit: "%", higherIsBetter: true, url: "https://livecodebench.github.io", description: "Continuously collected competitive-programming problems to limit contamination." },
  { id: "swe-bench-verified", name: "SWE-bench Verified", category: "coding", unit: "%", higherIsBetter: true, url: "https://www.swebench.com", description: "Human-validated real GitHub issues resolved by generating repository patches." },
  { id: "swe-bench-pro", name: "SWE-bench Pro", category: "coding", unit: "%", higherIsBetter: true, url: "https://scale.com/leaderboard/swe_bench_pro_public", description: "Long-horizon software engineering tasks from diverse repositories." },
  { id: "terminal-bench", name: "Terminal-Bench", category: "agentic", unit: "%", higherIsBetter: true, url: "https://www.tbench.ai", description: "Agentic tasks completed in a real terminal environment. Version matters (1.0 vs 2.0)." },
  { id: "aider-polyglot", name: "Aider Polyglot", category: "coding", unit: "%", higherIsBetter: true, url: "https://aider.chat/docs/leaderboards/", description: "Code-editing exercises across several programming languages." },
  { id: "tau2-bench", name: "τ²-bench", category: "agentic", unit: "%", higherIsBetter: true, url: "https://github.com/sierra-research/tau2-bench", description: "Tool-using customer-service agents in simulated retail, airline, and telecom domains." },
  { id: "osworld", name: "OSWorld", category: "agentic", unit: "%", higherIsBetter: true, url: "https://os-world.github.io", description: "Computer-use tasks in real desktop operating-system environments." },
  { id: "browsecomp", name: "BrowseComp", category: "agentic", unit: "%", higherIsBetter: true, url: "https://openai.com/index/browsecomp/", description: "Hard-to-find information retrieval by browsing agents." },
  { id: "simpleqa", name: "SimpleQA", category: "knowledge", unit: "%", higherIsBetter: true, url: "https://openai.com/index/introducing-simpleqa/", description: "Short-form factual questions measuring factual accuracy." },
  { id: "mmmu", name: "MMMU", category: "multimodal", unit: "%", higherIsBetter: true, url: "https://mmmu-benchmark.github.io", description: "College-level multimodal understanding across disciplines." },
  { id: "video-mmmu", name: "Video-MMMU", category: "multimodal", unit: "%", higherIsBetter: true, url: "https://videommmu.github.io", description: "Knowledge acquisition from professional educational videos." },
  { id: "mrcr", name: "MRCR", category: "long-context", unit: "%", higherIsBetter: true, url: "https://huggingface.co/datasets/openai/mrcr", description: "Multi-round coreference resolution across long contexts. Context length and needle count matter." },
  { id: "ifeval", name: "IFEval", category: "reasoning", unit: "%", higherIsBetter: true, url: "https://arxiv.org/abs/2311.07911", description: "Verifiable instruction-following constraints." },
  { id: "livebench", name: "LiveBench", category: "reasoning", unit: "score", higherIsBetter: true, url: "https://livebench.ai", description: "Regularly refreshed, objectively scored questions across several categories." },
  { id: "lmarena-text", name: "LMArena Text", category: "preference", unit: "elo", higherIsBetter: true, url: "https://lmarena.ai/leaderboard", description: "Crowd-sourced pairwise human preference rating. A preference signal, not an accuracy score." },
  { id: "gdpval", name: "GDPval", category: "agentic", unit: "%", higherIsBetter: true, url: "https://openai.com/index/gdpval/", description: "Expert-graded, economically valuable knowledge-work tasks (win or tie rate versus professionals)." },
];
