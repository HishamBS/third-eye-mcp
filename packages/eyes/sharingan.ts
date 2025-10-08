import {
  AMBIGUITY_SCORE_THRESHOLD,
  AMBIGUITY_LENGTH_THRESHOLD,
  AMBIGUITY_VAGUE_WORDS,
  AMBIGUITY_UNSPECIFIED_WORDS,
  CLARIFICATION_MIN_COUNT,
  CLARIFICATION_MAX_COUNT,
  CLARIFICATION_MULTIPLIER,
  CLARIFYING_QUESTION_BANK,
  SHARINGAN_CODE_ACTION_KEYWORDS,
  SHARINGAN_STRONG_CODE_ACTION_KEYWORDS,
  SHARINGAN_CODE_TOOLING_KEYWORDS,
  SHARINGAN_CODE_ARTIFACT_KEYWORDS,
  SHARINGAN_CODE_TECH_KEYWORDS,
  SHARINGAN_CODE_EXTENSIONS,
  SHARINGAN_CODE_FENCE_PREFIXES,
  SHARINGAN_AMBIGUITY_SUFFIX,
  SHARINGAN_POLICY_TEMPLATE,
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "./constants";
import { buildResponse } from "./shared";
import type { EyeResponse } from "./constants";
import { MarkdownBuilder } from "./utils/markdown-builder";

const TOKEN_PATTERN = /[a-z0-9_./+-]+/gi;
const IMPERATIVE_HINTS = new Set([
  "write", "summarize", "explain", "create", "draft", "analyze",
  "plan", "design", "fix", "build", "generate", "compare",
  "investigate", "update", "improve"
]);

function normalizeTokens(text: string): Set<string> {
  const matches = text.toLowerCase().match(TOKEN_PATTERN);
  return new Set(matches?.filter(Boolean) || []);
}

function ambiguityScore(
  prompt: string,
  threshold: number = AMBIGUITY_SCORE_THRESHOLD
): { score: number; ambiguous: boolean; x: number } {
  const stripped = prompt.trim();
  const rawTokens = stripped.split(/\s+/);
  const tokens = rawTokens
    .map(t => t.replace(/[.,:;?!]+$/g, ""))
    .filter(Boolean);
  const tokenCount = tokens.length;

  let base = 0.0;
  if (tokenCount < 8) {
    base += 0.4;
  } else if (tokenCount < 15) {
    base += 0.25;
  } else if (tokenCount < AMBIGUITY_LENGTH_THRESHOLD) {
    base += 0.1;
  }

  const questionMarks = (stripped.match(/\?/g) || []).length;
  if (questionMarks === 0) {
    base += 0.05;
  } else if (questionMarks === 1) {
    base += 0.02;
  }

  const vagueHits = tokens.filter(t =>
    AMBIGUITY_VAGUE_WORDS.has(t.toLowerCase())
  ).length;
  const unspecifiedHits = tokens.filter(t =>
    AMBIGUITY_UNSPECIFIED_WORDS.has(t.toLowerCase())
  ).length;

  base += 0.12 * vagueHits;
  base += 0.1 * unspecifiedHits;

  const verbCount = tokens.filter(t =>
    IMPERATIVE_HINTS.has(t.toLowerCase())
  ).length;

  if (verbCount === 0) {
    base += 0.1;
  }

  const score = Math.max(0.0, Math.min(1.0, base));
  const normalizedThreshold = Math.max(0.0, Math.min(1.0, threshold));
  const ambiguous = score >= normalizedThreshold;
  const clarificationTarget = Math.ceil(score * CLARIFICATION_MULTIPLIER);
  const x = Math.max(
    CLARIFICATION_MIN_COUNT,
    Math.min(CLARIFICATION_MAX_COUNT, clarificationTarget)
  );

  return { score: Math.round(score * 100) / 100, ambiguous, x };
}

function keywordMatches(
  promptLower: string,
  tokens: Set<string>,
  keywords: string[]
): string[] {
  const hits: string[] = [];
  for (const keyword of keywords) {
    const needle = keyword.toLowerCase();
    if (needle.includes(" ") || needle.includes(".")) {
      if (promptLower.includes(needle)) {
        hits.push(keyword);
      }
    } else if (tokens.has(needle)) {
      hits.push(keyword);
    }
  }
  return hits;
}

function codeExtensionMatches(promptLower: string, extensions: string[]): string[] {
  const hits: string[] = [];
  for (const ext of extensions) {
    if (promptLower.includes(ext.toLowerCase())) {
      hits.push(ext);
    }
  }
  return hits;
}

function codeFencePresent(prompt: string): boolean {
  return SHARINGAN_CODE_FENCE_PREFIXES.some(fence => prompt.includes(fence));
}

function detectCodeFeatures(prompt: string): { isCodeRelated: boolean; codeFeatures: string[] } {
  const promptLower = prompt.toLowerCase();
  const tokens = normalizeTokens(prompt);
  const features: string[] = [];

  const toolingHits = keywordMatches(promptLower, tokens, SHARINGAN_CODE_TOOLING_KEYWORDS);
  const artifactHits = keywordMatches(promptLower, tokens, SHARINGAN_CODE_ARTIFACT_KEYWORDS);
  const techHits = keywordMatches(promptLower, tokens, SHARINGAN_CODE_TECH_KEYWORDS);
  const extensionHits = codeExtensionMatches(promptLower, SHARINGAN_CODE_EXTENSIONS);

  toolingHits.forEach(kw => features.push(`Tooling reference '${kw}'`));
  artifactHits.forEach(kw => features.push(`Implementation artifact '${kw}'`));
  techHits.forEach(kw => features.push(`Tech keyword '${kw}'`));
  extensionHits.forEach(ext => features.push(`File extension '${ext}'`));

  if (codeFencePresent(prompt)) {
    features.push("Code fence detected");
  }

  const actionHits = keywordMatches(promptLower, tokens, SHARINGAN_CODE_ACTION_KEYWORDS);
  const strongActions = actionHits.filter(kw =>
    SHARINGAN_STRONG_CODE_ACTION_KEYWORDS.has(kw.toLowerCase())
  );
  const weakActions = actionHits.filter(kw =>
    !SHARINGAN_STRONG_CODE_ACTION_KEYWORDS.has(kw.toLowerCase())
  );

  strongActions.forEach(kw => features.push(`Action keyword '${kw}'`));

  const codeWordPresent = ["code", "codes", "coding"].some(w => tokens.has(w));
  const otherIndicators = features.length > 0 || codeWordPresent;

  if (otherIndicators) {
    weakActions.forEach(kw => features.push(`Action keyword '${kw}'`));
  }

  // Deduplicate
  const unique = Array.from(new Set(features));
  return { isCodeRelated: unique.length > 0, codeFeatures: unique };
}

function buildQuestionsMarkdown(x: number): string {
  const questions = CLARIFYING_QUESTION_BANK.slice(0, x);
  const builder = MarkdownBuilder.create().heading(Heading.CLARIFYING_QUESTIONS);

  if (questions.length > 0) {
    builder.bullets(questions);
  } else {
    builder.blank();
  }

  return builder.build();
}

function buildReasoningMarkdown(params: {
  score: number;
  ambiguous: boolean;
  isCodeRelated: boolean;
  codeFeatures: string[];
}): string {
  const builder = MarkdownBuilder.create()
    .heading(Heading.REASONING)
    .bullet(`Ambiguity score ${params.score.toFixed(2)} (threshold ${AMBIGUITY_SCORE_THRESHOLD.toFixed(2)}).`);

  if (params.ambiguous) {
    builder.bullet('Prompt remains underspecified; clarification required before drafting.');
  }

  if (params.isCodeRelated) {
    params.codeFeatures.forEach(feature => {
      builder.bullet(`Detected ${feature}.`);
    });
  } else {
    builder.bullet('No explicit code indicators detected; treating as text/analysis request.');
  }

  return builder.build();
}

function summaryMarkdown(params: { ambiguous: boolean; isCodeRelated: boolean }): string {
  if (params.ambiguous) {
    return MarkdownBuilder.create()
      .heading(Heading.AMBIGUITY)
      .text(SHARINGAN_AMBIGUITY_SUFFIX)
      .build();
  }
  const classification = params.isCodeRelated
    ? "Code-related task detected."
    : "Non-code request detected.";
  return MarkdownBuilder.create()
    .heading(Heading.CLASSIFICATION)
    .text(classification)
    .build();
}

function nextAction(params: { ambiguous: boolean; isCodeRelated: boolean }): string {
  if (params.ambiguous) {
    return NextAction.ASK_CLARIFICATIONS;
  }
  return params.isCodeRelated
    ? NextAction.FOLLOW_CODE_BRANCH
    : NextAction.FOLLOW_TEXT_BRANCH;
}

function statusCode(ambiguous: boolean): StatusCode {
  return ambiguous
    ? StatusCode.E_NEEDS_CLARIFICATION
    : StatusCode.OK_NO_CLARIFICATION_NEEDED;
}

export interface SharinganRequest {
  payload: {
    prompt: string;
  };
  context?: {
    settings?: {
      ambiguity_threshold?: number;
    };
  };
}

export function clarify(request: SharinganRequest): EyeResponse {
  const prompt = request.payload.prompt;
  const threshold = request.context?.settings?.ambiguity_threshold ?? AMBIGUITY_SCORE_THRESHOLD;

  const { score, ambiguous, x } = ambiguityScore(prompt, threshold);
  const { isCodeRelated, codeFeatures } = detectCodeFeatures(prompt);

  const questionsMarkdown = buildQuestionsMarkdown(x);
  const reasoningMarkdown = buildReasoningMarkdown({
    score,
    ambiguous,
    isCodeRelated,
    codeFeatures
  });

  const data = {
    [DataKey.SCORE]: score,
    [DataKey.AMBIGUOUS]: ambiguous,
    [DataKey.X]: x,
    [DataKey.IS_CODE_RELATED]: isCodeRelated,
    [DataKey.REASONING_MD]: reasoningMarkdown,
    [DataKey.QUESTIONS_MD]: questionsMarkdown,
    [DataKey.POLICY_MD]: SHARINGAN_POLICY_TEMPLATE
  };

  return buildResponse({
    tag: EyeTag.SHARINGAN,
    ok: !ambiguous,
    code: statusCode(ambiguous),
    md: summaryMarkdown({ ambiguous, isCodeRelated }),
    data,
    next_action: nextAction({ ambiguous, isCodeRelated })
  });
}
