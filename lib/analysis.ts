import OpenAI from "openai";

import type {
  AnalysisResult,
  FeedbackItem,
  FeedbackKind,
  GithubIssue,
  EngineeringPlan,
  PipelineStep,
  Priority,
  SprintPlan,
  SprintRecommendation,
  Theme,
  ThemeScore
} from "@/lib/types";

const EXTRACT_PROMPT = "Extract complaints, requests, bugs and feature ideas.";
const CLUSTER_PROMPT = "Group similar feedback into themes.";
const SPRINT_PROMPT =
  "Generate a 2-sprint roadmap. Sprint 1 should contain highest impact items.";
const ISSUE_PROMPT =
  "For every priority theme generate a GitHub-ready markdown issue with actionable, developer-friendly acceptance criteria.";
const ENGINEERING_PROMPT =
  "Generate realistic implementation guidance for a React + Next.js codebase.";
const PRIORITY_SEQUENCE: Priority[] = ["P1", "P2", "P3", "P4"];
const STOPWORDS = new Set([
  "about",
  "again",
  "always",
  "app",
  "because",
  "could",
  "does",
  "doesnt",
  "every",
  "feature",
  "from",
  "have",
  "keeps",
  "make",
  "missing",
  "need",
  "needs",
  "please",
  "really",
  "request",
  "should",
  "still",
  "that",
  "there",
  "this",
  "very",
  "when",
  "with",
  "without",
  "work",
  "works",
  "would"
]);

type AnalysisMetadata = Pick<
  AnalysisResult,
  "importedReviewCount" | "reviewSource"
>;

type AiTheme = {
  name?: string;
  mentions?: number;
  summary?: string;
  representativeQuotes?: string[];
  sentiment?: number;
  severity?: number;
};

type ThemeDefinition = {
  name: string;
  keywords: string[];
  summary: string;
};

const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    name: "Dark Mode",
    keywords: [
      "dark",
      "theme",
      "night",
      "bright",
      "contrast",
      "eye strain",
      "low-light"
    ],
    summary:
      "Customers want a polished low-light experience across dashboards, charts, settings, and mobile surfaces."
  },
  {
    name: "Offline Mode",
    keywords: [
      "offline",
      "flight",
      "travel",
      "wifi",
      "wi-fi",
      "connection",
      "reconnect",
      "cache",
      "locally"
    ],
    summary:
      "Users need to keep reading and drafting work without internet access, then sync safely after reconnecting."
  },
  {
    name: "Sync Reliability",
    keywords: [
      "sync",
      "real-time",
      "real time",
      "refresh",
      "duplicate",
      "conflict",
      "overwrite",
      "collaboration",
      "teammate"
    ],
    summary:
      "Teams are losing trust when updates lag, duplicate, or conflict during collaborative planning."
  },
  {
    name: "Performance",
    keywords: [
      "slow",
      "sluggish",
      "lag",
      "load",
      "loading",
      "freeze",
      "hang",
      "memory",
      "stutter",
      "unresponsive",
      "performance"
    ],
    summary:
      "Large feedback sets and core workflows need faster loading, smoother filtering, and non-blocking analysis."
  },
  {
    name: "Mobile Experience",
    keywords: [
      "mobile",
      "phone",
      "ios",
      "android",
      "push",
      "notification",
      "swipe",
      "keyboard",
      "smaller screen"
    ],
    summary:
      "Customers want a more complete mobile workflow for reviewing, approving, searching, and collaborating."
  },
  {
    name: "App Stability",
    keywords: [
      "crash",
      "crashes",
      "freezes",
      "stuck",
      "bug",
      "broken",
      "error",
      "fails",
      "failure"
    ],
    summary:
      "Customers are reporting crashes, broken states, or reliability failures that interrupt the core app experience."
  },
  {
    name: "Account Access",
    keywords: [
      "login",
      "log in",
      "signin",
      "sign in",
      "account",
      "password",
      "otp",
      "verification",
      "authentication"
    ],
    summary:
      "Users are blocked or slowed down by sign-in, account recovery, or authentication problems."
  },
  {
    name: "Billing and Subscriptions",
    keywords: [
      "subscription",
      "billing",
      "charged",
      "payment",
      "refund",
      "premium",
      "trial",
      "cancel",
      "invoice"
    ],
    summary:
      "Customers need clearer billing, subscription, trial, refund, or payment behavior."
  },
  {
    name: "Ads and Monetization",
    keywords: [
      "ads",
      "advertisement",
      "adverts",
      "sponsored",
      "pop up",
      "popup",
      "monetization"
    ],
    summary:
      "Users are frustrated by ad frequency, placement, or monetization experiences that interrupt the product."
  },
  {
    name: "Search and Discovery",
    keywords: [
      "search",
      "filter",
      "find",
      "discover",
      "recommendation",
      "recommendations",
      "results",
      "browse"
    ],
    summary:
      "Customers are struggling to find the right content, data, or actions quickly."
  },
  {
    name: "Notifications",
    keywords: [
      "notification",
      "notifications",
      "alert",
      "reminder",
      "push",
      "email",
      "mute"
    ],
    summary:
      "Customers want notification controls that are timely, useful, and not noisy."
  },
  {
    name: "Content Quality",
    keywords: [
      "content",
      "lesson",
      "lessons",
      "course",
      "video",
      "audio",
      "translation",
      "answers",
      "quality"
    ],
    summary:
      "Users are pointing to quality gaps in the content, media, answers, or learning materials."
  },
  {
    name: "UX Clarity",
    keywords: [
      "confusing",
      "hard to use",
      "cluttered",
      "navigation",
      "button",
      "menu",
      "layout",
      "onboarding",
      "settings"
    ],
    summary:
      "Customers are struggling with unclear navigation, dense screens, or confusing product flows."
  },
  {
    name: "Privacy and Trust",
    keywords: [
      "privacy",
      "security",
      "permission",
      "permissions",
      "data",
      "tracking",
      "trust",
      "safe"
    ],
    summary:
      "Customers need stronger trust signals around privacy, permissions, security, or data handling."
  }
];

const FALLBACK_THEME: ThemeDefinition = {
  name: "Workflow Improvements",
  keywords: [],
  summary:
    "Customers are describing friction in the current workflow. Review the repeated complaints, remove the most common blocker, and make the path easier to complete."
};

export async function runFeedbackAnalysis(
  input: string,
  codeStructure = "",
  metadata: Partial<AnalysisMetadata> = {}
): Promise<AnalysisResult> {
  const normalizedItems = normalizeFeedbackLines(input);
  const actionableItems = selectActionableFeedback(normalizedItems);
  const projectFiles = parseProjectStructure(codeStructure);

  if (!actionableItems.length) {
    throw new Error("Add at least one feedback item before analyzing.");
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await runOpenAIBackedAnalysis(
        input,
        actionableItems,
        projectFiles,
        metadata
      );
    } catch (error) {
      const fallback = buildLocalAnalysis(
        actionableItems,
        "local",
        [],
        projectFiles,
        metadata
      );
      return {
        ...fallback,
        pipeline: [
          {
            id: "openai-fallback",
            name: "OpenAI fallback",
            prompt: "Use deterministic scoring when the OpenAI call fails.",
            outputSummary:
              error instanceof Error
                ? `OpenAI call failed: ${error.message}`
                : "OpenAI call failed. Used local analysis instead.",
            status: "fallback"
          },
          ...fallback.pipeline
        ]
      };
    }
  }

  return buildLocalAnalysis(actionableItems, "local", [], projectFiles, metadata);
}

function normalizeFeedbackLines(input: string) {
  return input
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^\s*[-*][\s]+/, "")
        .replace(/^\s*\d+[.)]\s+/, "")
        .trim()
    )
    .filter((line) => line.length > 2);
}

function selectActionableFeedback(lines: string[]) {
  const actionable = lines.filter(isActionableFeedback);

  if (actionable.length >= Math.min(3, lines.length)) {
    return actionable;
  }

  return lines;
}

function isActionableFeedback(text: string) {
  return /(need|please|should|missing|request|bug|crash|broken|error|fail|failed|failure|slow|lag|freeze|stuck|cannot|can't|wont|won't|doesn't|doesnt|not working|problem|issue|complaint|bad|horrible|annoying|frustrating|hard|confusing|ads|advertisement|subscription|billing|charged|refund|payment|login|password|verification|offline|sync|lost|stopped|expensive|privacy|permission|search|filter)/i.test(
    text
  );
}

async function runOpenAIBackedAnalysis(
  rawInput: string,
  normalizedItems: string[],
  projectFiles: string[],
  metadata: Partial<AnalysisMetadata>
): Promise<AnalysisResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const pipeline: PipelineStep[] = [];

  const extracted = await callJson<{ items?: unknown[] }>(
    client,
    model,
    `${EXTRACT_PROMPT}

Return JSON:
{
  "items":[]
}`,
    rawInput
  );

  const extractedItems = coerceExtractedItems(extracted.items);
  const analysisInput = extractedItems.length ? extractedItems : normalizedItems;

  pipeline.push({
    id: "extract",
    name: "Extract feedback items",
    prompt: EXTRACT_PROMPT,
    outputSummary: `${analysisInput.length} complaints, requests, bugs, and feature ideas extracted.`,
    status: "complete"
  });

  const clustered = await callJson<{
    themes?: AiTheme[];
  }>(
    client,
      model,
      `${CLUSTER_PROMPT}

Use the actual words in the feedback. Do not force standard SaaS buckets if the app-specific feedback is about login, billing, ads, search, content, audio, lessons, crashes, checkout, or another domain-specific concern.

Return:
{
  "themes":[
    {
      "name":"",
      "mentions":0,
      "summary":"",
      "representativeQuotes":[],
      "sentiment":0,
      "severity":0
    }
  ]
}`,
    JSON.stringify({ items: analysisInput }, null, 2)
  );

  pipeline.push({
    id: "cluster",
    name: "Cluster themes",
    prompt: CLUSTER_PROMPT,
    outputSummary: `${
      clustered.themes?.length ?? 0
    } candidate themes identified by AI clustering.`,
    status: "complete"
  });

  const aiThemes = coerceAiThemes(clustered.themes, analysisInput);
  const localBase = buildLocalAnalysis(
    analysisInput,
    "openai",
    pipeline,
    projectFiles,
    metadata
  );
  const themes = normalizeContinuousPriorities(
    aiThemes.length ? aiThemes : localBase.themes
  );
  const items = buildFeedbackItems(analysisInput, themes);
  const scores = themes.map((theme) => ({
    theme: theme.name,
    score: theme.score,
    priority: theme.priority
  }));
  const deterministic = assembleAnalysis(
    items,
    themes,
    "openai",
    [...pipeline, buildScoringPipelineStep(themes)],
    projectFiles,
    metadata
  );

  const sprintPlan =
    (await generateSprintPlanWithAI(client, model, themes)) ??
    deterministic.sprintPlan;
  const githubIssues =
    (await generateIssuesWithAI(client, model, themes)) ??
    deterministic.githubIssues;
  const engineeringPlans =
    (await generateEngineeringPlansWithAI(client, model, themes, projectFiles)) ??
    deterministic.engineeringPlans;

  return {
    ...deterministic,
    scores,
    sprintPlan,
    githubIssues,
    engineeringPlans,
    pipeline: [
      ...deterministic.pipeline,
      {
        id: "sprint-plan",
        name: "Generate sprint recommendations",
        prompt: SPRINT_PROMPT,
        outputSummary: `${sprintPlan.sprint1.length} Sprint 1 items and ${sprintPlan.sprint2.length} Sprint 2 items generated.`,
        status: "complete"
      },
      {
        id: "github-issues",
        name: "Generate GitHub issues",
        prompt: ISSUE_PROMPT,
        outputSummary: `${githubIssues.length} GitHub-ready issues generated across priority themes.`,
        status: "complete"
      },
      {
        id: "engineering-plan",
        name: "Generate engineering implementation plans",
        prompt: ENGINEERING_PROMPT,
        outputSummary: `${engineeringPlans.length} implementation plans generated for a React + Next.js codebase.`,
        status: "complete"
      }
    ]
  };
}

async function callJson<T>(
  client: OpenAI,
  model: string,
  prompt: string,
  input: string
): Promise<T> {
  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a senior product operations AI. Return valid JSON only, with no prose or markdown."
      },
      {
        role: "user",
        content: `${prompt}

Input:
${input}`
      }
    ]
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}

function coerceExtractedItems(items: unknown[] | undefined) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object" && "text" in item) {
        return String((item as { text: unknown }).text);
      }
      return "";
    })
    .map((item) => item.trim())
    .filter((item) => item.length > 2);
}

function buildLocalAnalysis(
  feedbackLines: string[],
  source: AnalysisResult["source"],
  existingPipeline: PipelineStep[] = [],
  projectFiles: string[] = [],
  metadata: Partial<AnalysisMetadata> = {}
): AnalysisResult {
  const items = buildFeedbackItems(feedbackLines);

  const themes = buildThemes(items);
  const prioritizedThemes = normalizeContinuousPriorities(themes);
  const pipeline: PipelineStep[] =
    existingPipeline.length > 0
      ? existingPipeline
      : [
          {
            id: "extract",
            name: "Extract feedback items",
            prompt: EXTRACT_PROMPT,
            outputSummary: `${items.length} feedback items extracted locally.`,
            status: "complete"
          },
          {
            id: "cluster",
            name: "Cluster themes",
            prompt: CLUSTER_PROMPT,
            outputSummary: `${prioritizedThemes.length} themes clustered with adaptive keyword and phrase analysis.`,
            status: "complete"
          }
        ];

  return assembleAnalysis(items, prioritizedThemes, source, [
    ...pipeline,
    buildScoringPipelineStep(prioritizedThemes)
  ], projectFiles, metadata);
}

function assembleAnalysis(
  items: FeedbackItem[],
  themes: Theme[],
  source: AnalysisResult["source"],
  pipeline: PipelineStep[],
  projectFiles: string[],
  metadata: Partial<AnalysisMetadata> = {}
): AnalysisResult {
  const sortedThemes = normalizeContinuousPriorities(themes);
  const scores: ThemeScore[] = sortedThemes.map((theme) => ({
    theme: theme.name,
    score: theme.score,
    priority: theme.priority
  }));

  return {
    items,
    themes: sortedThemes,
    scores,
    sprintPlan: buildSprintPlan(sortedThemes),
    githubIssues: buildGithubIssues(sortedThemes),
    engineeringPlans: buildEngineeringPlans(sortedThemes, projectFiles),
    pipeline: [
      ...pipeline,
      {
        id: "sprint-plan",
        name: "Generate sprint recommendations",
        prompt: SPRINT_PROMPT,
        outputSummary: "2-sprint roadmap generated from highest impact themes.",
        status: "complete"
      },
      {
        id: "github-issues",
        name: "Generate GitHub issues",
        prompt: ISSUE_PROMPT,
        outputSummary: "GitHub-ready issues generated across priority themes.",
        status: "complete"
      },
      {
        id: "engineering-plan",
        name: "Generate engineering implementation plans",
        prompt: ENGINEERING_PROMPT,
        outputSummary: projectFiles.length
          ? `Implementation plans generated with ${projectFiles.length} uploaded project paths.`
          : "Implementation plans generated for React + Next.js.",
        status: "complete"
      }
    ],
    generatedAt: new Date().toISOString(),
    source,
    projectFileCount: projectFiles.length,
    projectFiles,
    importedReviewCount: metadata.importedReviewCount ?? 0,
    reviewSource: metadata.reviewSource
  };
}

function buildFeedbackItems(feedbackLines: string[], themes: Theme[] = []) {
  return feedbackLines.map((text, index) => {
    const matchedTheme = themes.length
      ? findBestThemeForText(text, themes)?.name ?? themes[0].name
      : detectTheme(text).name;

    return {
      id: `item-${index + 1}`,
      text,
      kind: detectKind(text),
      sentiment: estimateSentiment(text),
      severity: estimateSeverity(text),
      theme: matchedTheme
    };
  });
}

function coerceAiThemes(themes: AiTheme[] | undefined, feedbackLines: string[]) {
  if (!Array.isArray(themes)) {
    return [];
  }

  const candidates = themes
    .map((theme, index) => {
      const name = normalizeThemeName(theme.name ?? "");

      if (!name) {
        return null;
      }

      const representativeQuotes = safeStringArray(
        theme.representativeQuotes,
        findRepresentativeQuotes(name, theme.summary ?? "", feedbackLines)
      ).slice(0, 4);
      const mentions =
        typeof theme.mentions === "number" && theme.mentions > 0
          ? Math.round(theme.mentions)
          : countThemeMentions(name, theme.summary ?? "", feedbackLines);
      const sentiment =
        typeof theme.sentiment === "number"
          ? clampScore(theme.sentiment)
          : Math.round(average(representativeQuotes.map(estimateSentiment)));
      const severity =
        typeof theme.severity === "number"
          ? clampScore(theme.severity)
          : Math.round(average(representativeQuotes.map(estimateSeverity)));

      return {
        id: slugify(`${name}-${index}`),
        name,
        mentions: Math.max(mentions, representativeQuotes.length, 1),
        summary: safeString(
          theme.summary,
          summarizeDynamicTheme(name, representativeQuotes)
        ),
        sentiment,
        severity,
        score: 0,
        priority: "P4" as Priority,
        representativeQuotes
      };
    })
    .filter((theme): theme is Theme => Boolean(theme));

  const maxMentions = Math.max(...candidates.map((theme) => theme.mentions), 1);

  return candidates.map((theme) => ({
    ...theme,
    score: scoreTheme(theme.mentions, maxMentions, theme.sentiment, theme.severity)
  }));
}

function detectTheme(text: string) {
  const normalized = text.toLowerCase();
  const scored = THEME_DEFINITIONS.map((definition) => ({
    definition,
    matches: definition.keywords.filter((keyword) =>
      normalized.includes(keyword)
    ).length
  })).sort((a, b) => b.matches - a.matches);

  return scored[0]?.matches > 0
    ? scored[0].definition
    : buildAdaptiveThemeDefinition(text);
}

function buildAdaptiveThemeDefinition(text: string): ThemeDefinition {
  const phrase = extractThemePhrase(text);

  if (!phrase) {
    return FALLBACK_THEME;
  }

  return {
    name: phrase,
    keywords: importantTokens(phrase),
    summary: `Customers are describing repeated friction around ${phrase.toLowerCase()}. Use the review evidence to isolate the exact product behavior and ship the smallest fix.`
  };
}

function findBestThemeForText(text: string, themes: Theme[]) {
  const textTokens = importantTokens(text);

  return themes
    .map((theme) => {
      const themeTokens = importantTokens(
        `${theme.name} ${theme.summary} ${theme.representativeQuotes.join(" ")}`
      );
      const overlap = textTokens.filter((token) =>
        themeTokens.includes(token)
      ).length;

      return { theme, score: overlap };
    })
    .sort((a, b) => b.score - a.score)[0]?.theme;
}

function normalizeThemeName(value: string) {
  const cleaned = value
    .replace(/^(theme|cluster|issue|problem)\s*[:#-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || /^general feedback$/i.test(cleaned)) {
    return "";
  }

  return toTitleCase(cleaned);
}

function findRepresentativeQuotes(
  name: string,
  summary: string,
  feedbackLines: string[]
) {
  const themeTokens = importantTokens(`${name} ${summary}`);
  const ranked = feedbackLines
    .map((line) => ({
      line,
      score: importantTokens(line).filter((token) =>
        themeTokens.includes(token)
      ).length
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.line.length - a.line.length)
    .map((item) => item.line);

  return ranked.slice(0, 4);
}

function countThemeMentions(name: string, summary: string, feedbackLines: string[]) {
  const themeTokens = importantTokens(`${name} ${summary}`);

  return feedbackLines.filter((line) =>
    importantTokens(line).some((token) => themeTokens.includes(token))
  ).length;
}

function summarizeDynamicTheme(name: string, quotes: string[]) {
  const quote = quotes[0];

  if (!quote) {
    return `Customers are repeatedly mentioning ${name.toLowerCase()} and need a focused product decision.`;
  }

  return `Customers are repeatedly mentioning ${name.toLowerCase()}, with evidence like "${shorten(quote, 130)}".`;
}

function scoreTheme(
  mentions: number,
  maxMentions: number,
  sentiment: number,
  severity: number
) {
  const frequency = (mentions / Math.max(maxMentions, 1)) * 100;
  return clampScore(frequency * 0.5 + sentiment * 0.3 + severity * 0.2);
}

function extractThemePhrase(text: string) {
  const tokens = importantTokens(text)
    .filter((token) => !/^\d+$/.test(token))
    .slice(0, 4);

  if (!tokens.length) {
    return "";
  }

  return toTitleCase(tokens.slice(0, Math.min(tokens.length, 3)).join(" "));
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function detectKind(text: string): FeedbackKind {
  const normalized = text.toLowerCase();

  if (/(bug|crash|error|broken|fails|failure|overwrite|lost)/.test(normalized)) {
    return "bug";
  }
  if (/(please add|need|request|should|would like|can you add)/.test(normalized)) {
    return "request";
  }
  if (/(feature|support|mode|theme|notification|upload)/.test(normalized)) {
    return "feature";
  }
  return "complaint";
}

function estimateSentiment(text: string) {
  const normalized = text.toLowerCase();
  let score = 48;

  const strongSignals = [
    "useless",
    "blocker",
    "lost trust",
    "frustrating",
    "too slow",
    "hurts",
    "cannot",
    "hard",
    "unresponsive"
  ];
  const moderateSignals = [
    "missing",
    "need",
    "please",
    "slow",
    "confusing",
    "lag",
    "drops",
    "dated",
    "cramped"
  ];

  score += strongSignals.filter((signal) => normalized.includes(signal)).length * 18;
  score +=
    moderateSignals.filter((signal) => normalized.includes(signal)).length * 9;

  return clampScore(score);
}

function estimateSeverity(text: string) {
  const normalized = text.toLowerCase();
  let score = 44;

  if (/(lost|overwrite|duplicate|blocker|useless|crash|cannot)/.test(normalized)) {
    score += 38;
  }
  if (/(sync|offline|slow|freeze|hang|unresponsive|required)/.test(normalized)) {
    score += 24;
  }
  if (/(need|please|missing|should|hard|confusing)/.test(normalized)) {
    score += 14;
  }

  return clampScore(score);
}

function buildThemes(items: FeedbackItem[]) {
  const grouped = new Map<string, FeedbackItem[]>();

  for (const item of items) {
    const group = grouped.get(item.theme) ?? [];
    group.push(item);
    grouped.set(item.theme, group);
  }

  const maxMentions = Math.max(...Array.from(grouped.values()).map((group) => group.length));

  return Array.from(grouped.entries()).map(([name, group], index) => {
    const definition =
      THEME_DEFINITIONS.find((theme) => theme.name === name);
    const mentions = group.length;
    const sentiment = average(group.map((item) => item.sentiment));
    const severity = average(group.map((item) => item.severity));
    const score = scoreTheme(mentions, maxMentions, sentiment, severity);
    const representativeQuotes = group.slice(0, 3).map((item) => item.text);

    return {
      id: slugify(`${name}-${index}`),
      name,
      mentions,
      summary: definition?.summary ?? summarizeDynamicTheme(name, representativeQuotes),
      sentiment: Math.round(sentiment),
      severity: Math.round(severity),
      score: clampScore(score),
      priority: priorityForScore(score),
      representativeQuotes
    };
  });
}

function mergeThemeSummaries(
  themes: Theme[],
  aiThemes: Array<{ name?: string; mentions?: number; summary?: string }>
) {
  return themes.map((theme) => {
    const match = aiThemes.find((candidate) =>
      candidate.name
        ? shareImportantToken(candidate.name, theme.name)
        : false
    );

    if (!match?.summary) {
      return theme;
    }

    return {
      ...theme,
      summary: match.summary,
      mentions:
        typeof match.mentions === "number" && match.mentions > 0
          ? Math.max(theme.mentions, match.mentions)
          : theme.mentions
    };
  });
}

function shareImportantToken(a: string, b: string) {
  const left = importantTokens(a);
  const right = importantTokens(b);
  return left.some((token) => right.includes(token));
}

function importantTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function buildScoringPipelineStep(themes: Theme[]): PipelineStep {
  return {
    id: "impact-scoring",
    name: "Calculate impact scores",
    prompt:
      "Impact Score = frequency * 0.5 + sentiment * 0.3 + severity * 0.2. Normalize to 0-100, then assign continuous priorities from highest score: P1, P2, P3, P4.",
    outputSummary: themes
      .map((theme) => `${theme.name}: ${theme.score} (${theme.priority})`)
      .join(", "),
    status: "complete"
  };
}

function buildSprintPlan(themes: Theme[]): SprintPlan {
  const sprintItems = uniqueThemes(themes).map((theme) =>
    toEvidenceSprintRecommendation(theme)
  );
  const sprint1 = sprintItems.slice(0, 3);
  const sprint2 = sprintItems.slice(3, 6);

  return {
    sprint1,
    sprint2
  };
}

function dedupeSprintPlan(plan: SprintPlan): SprintPlan {
  const seen = new Set<string>();
  const sprint1: SprintRecommendation[] = [];
  const sprint2: SprintRecommendation[] = [];

  for (const item of plan.sprint1) {
    if (seen.has(item.theme)) {
      continue;
    }

    seen.add(item.theme);
    sprint1.push(item);
  }

  for (const item of plan.sprint2) {
    if (seen.has(item.theme)) {
      continue;
    }

    seen.add(item.theme);
    sprint2.push(item);
  }

  return { sprint1, sprint2 };
}

function sprintGoalForTheme(themeName: string) {
  const goals: Record<string, string> = {
    "Dark Mode": "Make the product comfortable to use in low-light sessions.",
    "Offline Mode": "Let users keep working when the network drops.",
    "Sync Reliability": "Make shared work update predictably without duplicates.",
    Performance: "Make large feedback workflows feel fast.",
    "Mobile Experience": "Make review and approval flows usable on phones.",
    "Workflow Improvements": "Remove the most repeated blocker from the user flow."
  };

  return goals[themeName] ?? "Fix the clearest repeated customer pain point.";
}

function sprintGoalForThemeEvidence(theme: Theme) {
  return sprintGoalForTheme(theme.name).replace(
    "Fix the clearest repeated customer pain point.",
    `Resolve the repeated ${theme.name.toLowerCase()} complaints shown in customer reviews.`
  );
}

function toSprintRecommendation(theme: Theme): SprintRecommendation {
  const scopeByTheme: Record<string, string[]> = {
    "Dark Mode": [
      "Add light/dark theme tokens",
      "Persist user theme preference",
      "Verify core screens meet contrast standards"
    ],
    "Offline Mode": [
      "Cache the last active workspace",
      "Queue edits while offline",
      "Sync queued edits after reconnect"
    ],
    "Sync Reliability": [
      "Measure sync failures and latency",
      "Prevent duplicate writes on retry",
      "Show clear conflict states"
    ],
    Performance: [
      "Profile slow screens",
      "Virtualize long lists",
      "Move heavy work out of urgent renders"
    ],
    "Mobile Experience": [
      "Fix cramped mobile layouts",
      "Make priority review touch-friendly",
      "Preserve tab state on small screens"
    ],
    "Workflow Improvements": [
      "Identify the repeated workflow blocker",
      "Remove one unnecessary step from the path",
      "Add a clear success or error state"
    ]
  };

  return {
    theme: theme.name,
    priority: theme.priority,
    score: theme.score,
    goal: sprintGoalForTheme(theme.name),
    scope: scopeByTheme[theme.name] ?? [
      "Review top customer quotes",
      "Define narrow MVP workflow",
      "Ship behind a guarded release path"
    ],
    successMetric: successMetricForTheme(theme.name)
  };
}

function toEvidenceSprintRecommendation(theme: Theme): SprintRecommendation {
  const known = toSprintRecommendation(theme);

  if (THEME_DEFINITIONS.some((definition) => definition.name === theme.name)) {
    return known;
  }

  return {
    ...known,
    goal: sprintGoalForThemeEvidence(theme),
    scope: [
      `Review the top ${theme.mentions} ${theme.name.toLowerCase()} feedback mentions`,
      `Fix the specific behavior described in: "${shorten(theme.representativeQuotes[0] ?? theme.summary, 110)}"`,
      "Add a visible success, failure, or recovery state for this workflow"
    ],
    successMetric: successMetricForThemeEvidence(theme)
  };
}

function buildGithubIssues(themes: Theme[]): GithubIssue[] {
  return uniqueThemes(themes)
    .map((theme) => ({
      title: `[${theme.priority}] ${theme.name}: ${issueTitleForTheme(theme)}`,
      description: issueDescriptionForTheme(theme),
      priority: theme.priority,
      theme: theme.name,
      acceptanceCriteria: acceptanceCriteriaForTheme(theme),
      labels: ["customer-feedback", theme.priority.toLowerCase(), slugify(theme.name)]
    }));
}

function buildEngineeringPlans(
  themes: Theme[],
  projectFiles: string[] = []
): EngineeringPlan[] {
  const usedFiles = new Set<string>();

  return uniqueThemes(themes)
    .map((theme) => {
      const affectedFiles = affectedFilesForTheme(
        theme,
        projectFiles,
        usedFiles
      );

      return {
        theme: theme.name,
        implementationApproach: implementationApproachForTheme(theme),
        affectedFiles: affectedFiles.affectedFiles,
        affectedFileSource: affectedFiles.affectedFileSource,
        tasks: engineeringTasksForTheme(theme),
        estimatedEffort: effortForTheme(theme.name, theme.priority)
      };
    });
}

async function generateSprintPlanWithAI(
  client: OpenAI,
  model: string,
  themes: Theme[]
) {
  try {
    const json = await callJson<{
      sprint1?: Partial<SprintRecommendation>[];
      sprint2?: Partial<SprintRecommendation>[];
    }>(
      client,
      model,
      `${SPRINT_PROMPT}

Use theme summaries and representative quotes. Do not repeat the same goal or scope across themes.

Return JSON:
{
  "sprint1":[],
  "sprint2":[]
}`,
      JSON.stringify({ themes }, null, 2)
    );

    const fallback = buildSprintPlan(themes);
    return dedupeSprintPlan({
      sprint1: normalizeSprintItems(json.sprint1, fallback.sprint1, themes),
      sprint2: normalizeSprintItems(json.sprint2, fallback.sprint2, themes)
    });
  } catch {
    return null;
  }
}

async function generateIssuesWithAI(
  client: OpenAI,
  model: string,
  themes: Theme[]
) {
  try {
    const priorityThemes = uniqueThemes(themes);
    const json = await callJson<{ issues?: Partial<GithubIssue>[] }>(
      client,
      model,
      `${ISSUE_PROMPT}

Each issue must be specific to the theme evidence. The description must be markdown with Summary, Customer Evidence, Proposed Scope, and Metrics sections. Acceptance criteria must be concrete and different for every theme.

Return JSON:
{
  "issues":[
    {
      "title":"",
      "description":"",
      "acceptanceCriteria":[]
    }
  ]
}`,
      JSON.stringify({ themes: priorityThemes }, null, 2)
    );
    const fallback = buildGithubIssues(themes);

    if (!Array.isArray(json.issues) || json.issues.length === 0) {
      return fallback;
    }

    return fallback.map((fallbackIssue, index) => {
      const issue =
        json.issues?.find((candidate) =>
          matchTheme(candidate.theme ?? candidate.title ?? "", themes)?.name ===
          fallbackIssue.theme
        ) ?? json.issues?.[index];
      const theme =
        matchTheme(issue?.theme ?? issue?.title ?? fallbackIssue.theme, themes) ??
        themes[index];

      return {
        title: safeString(issue?.title, fallbackIssue.title),
        description: safeString(issue?.description, fallbackIssue.description),
        priority: theme?.priority ?? fallbackIssue.priority,
        theme: theme?.name ?? fallbackIssue.theme,
        acceptanceCriteria: safeStringArray(
          issue?.acceptanceCriteria,
          fallbackIssue.acceptanceCriteria
        ),
        labels: safeStringArray(issue?.labels, fallbackIssue.labels)
      };
    });
  } catch {
    return null;
  }
}

async function generateEngineeringPlansWithAI(
  client: OpenAI,
  model: string,
  themes: Theme[],
  projectFiles: string[]
) {
  try {
    const priorityThemes = uniqueThemes(themes);
    const json = await callJson<{ plans?: Partial<EngineeringPlan>[] }>(
      client,
      model,
      `${ENGINEERING_PROMPT}

If projectFiles are provided, affectedFiles must be selected from projectFiles or be close matches to projectFiles. Do not return the same affectedFiles for every theme. Explain why the selected files are likely relevant based on names, routes, components, or APIs.

Return JSON:
{
  "plans":[
    {
      "implementationApproach":"",
      "affectedFiles":[],
      "tasks":[],
      "estimatedEffort":""
    }
  ]
}`,
      JSON.stringify(
        {
          themes: priorityThemes,
          projectFiles: projectFiles.slice(0, 150)
        },
        null,
        2
      )
    );
    const fallback = buildEngineeringPlans(themes, projectFiles);

    if (!Array.isArray(json.plans) || json.plans.length === 0) {
      return fallback;
    }

    const usedFiles = new Set<string>();

    return fallback.map((fallbackPlan, index) => {
      const plan =
        json.plans?.find((candidate) =>
          matchTheme(candidate.theme ?? "", themes)?.name === fallbackPlan.theme
        ) ?? json.plans?.[index];
      const theme = matchTheme(plan?.theme ?? fallbackPlan.theme, themes) ?? themes[index];
      const affectedFiles = normalizeAffectedFiles(
        theme ?? fallbackPlan.theme,
        projectFiles,
        safeStringArray(plan?.affectedFiles, fallbackPlan.affectedFiles),
        usedFiles
      );

      return {
        theme: theme?.name ?? fallbackPlan.theme,
        implementationApproach: safeString(
          plan?.implementationApproach,
          fallbackPlan.implementationApproach
        ),
        affectedFiles: affectedFiles.affectedFiles,
        affectedFileSource: affectedFiles.affectedFileSource,
        tasks: safeStringArray(plan?.tasks, fallbackPlan.tasks),
        estimatedEffort: safeString(plan?.estimatedEffort, fallbackPlan.estimatedEffort)
      };
    });
  } catch {
    return null;
  }
}

function normalizeSprintItems(
  items: Partial<SprintRecommendation>[] | undefined,
  fallback: SprintRecommendation[],
  themes: Theme[]
) {
  if (!Array.isArray(items) || items.length === 0) {
    return fallback;
  }

  const seen = new Set<string>();

  return items.flatMap((item, index) => {
    const theme = matchTheme(item.theme ?? item.goal ?? "", themes) ?? themes[index];
    const fallbackItem = fallback[index] ?? fallback[0];
    const themeName = theme?.name ?? fallbackItem.theme;

    if (seen.has(themeName)) {
      return [];
    }

    seen.add(themeName);

    return [{
      theme: themeName,
      priority: theme?.priority ?? fallbackItem.priority,
      score: theme?.score ?? fallbackItem.score,
      goal: safeString(item.goal, fallbackItem.goal),
      scope: safeStringArray(item.scope, fallbackItem.scope),
      successMetric: safeString(item.successMetric, fallbackItem.successMetric)
    }];
  });
}

function matchTheme(value: string, themes: Theme[]) {
  return themes.find((theme) => shareImportantToken(value, theme.name));
}

function normalizeContinuousPriorities(themes: Theme[]) {
  return uniqueThemes(themes)
    .sort((a, b) => b.score - a.score || b.mentions - a.mentions)
    .slice(0, 6)
    .map((theme, index) => ({
      ...theme,
      priority: PRIORITY_SEQUENCE[Math.min(index, PRIORITY_SEQUENCE.length - 1)]
    }));
}

function uniqueThemes(themes: Theme[]) {
  const seen = new Set<string>();
  const unique: Theme[] = [];

  for (const theme of themes) {
    if (seen.has(theme.name)) {
      continue;
    }

    seen.add(theme.name);
    unique.push(theme);
  }

  return unique;
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const strings = value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);

  return strings.length ? strings : fallback;
}

function issueTitleForTheme(theme: Theme) {
  const titles: Record<string, string> = {
    "Dark Mode": "ship accessible dark theme support",
    "Offline Mode": "enable offline reading and draft queue",
    "Sync Reliability": "reduce sync lag and prevent duplicate updates",
    Performance: "speed up large feedback workflows",
    "Mobile Experience": "polish mobile review and approval flows",
    "Workflow Improvements": "remove the most repeated workflow blocker"
  };
  const knownTitle = titles[theme.name];

  return knownTitle ?? `fix ${theme.name.toLowerCase()} friction from reviews`;
}

function issueDescriptionForTheme(theme: Theme) {
  return `## Summary
${theme.summary}

## Customer Signal
- Mentions: ${theme.mentions}
- Impact score: ${theme.score}/100
- Priority: ${theme.priority}
${theme.representativeQuotes.map((quote) => `- Evidence: "${shorten(quote, 160)}"`).join("\n")}

## Why This Matters
This theme appeared often enough in customer feedback to deserve an explicit product decision and engineering owner.

## Proposed Scope
${toEvidenceSprintRecommendation(theme).scope.map((scope) => `- ${scope}`).join("\n")}`;
}

function acceptanceCriteriaForTheme(theme: Theme) {
  const criteria: Record<string, string[]> = {
    "Dark Mode": [
      "Users can switch between light, dark, and system theme preferences.",
      "Dashboard cards, charts, dialogs, forms, and navigation meet WCAG AA contrast in dark mode.",
      "The selected preference persists across refreshes and new sessions."
    ],
    "Offline Mode": [
      "Users can open the most recent workspace without a network connection.",
      "Draft edits are queued locally and visibly marked as pending sync.",
      "Queued changes sync automatically after reconnect without data loss."
    ],
    "Sync Reliability": [
      "Collaborative edits appear for other active users within five seconds in normal network conditions.",
      "Conflicting edits show a clear resolution state instead of silently overwriting data.",
      "Duplicate comments or tasks are prevented during reconnect retries."
    ],
    Performance: [
      "The dashboard remains responsive while importing or analyzing at least 1,000 feedback items.",
      "Large feedback lists use virtualization or pagination to avoid scroll jank.",
      "Chart rendering and priority calculations do not block typing in the input panel."
    ],
    "Mobile Experience": [
      "All result tabs are usable on screens 375px wide without horizontal overflow.",
      "Priority review actions are reachable with thumb-friendly controls.",
      "Mobile navigation preserves the selected tab and analysis state."
    ],
    "Workflow Improvements": [
      "The repeated workflow blocker is named and visible in the issue summary.",
      "The target flow has one fewer confusing or unnecessary step.",
      "Users see a clear success, empty, or error state at the end of the flow."
    ]
  };

  return (
    criteria[theme.name] ?? [
      `The ${theme.name.toLowerCase()} workflow addresses the customer complaint: "${shorten(theme.representativeQuotes[0] ?? theme.summary, 130)}".`,
      `Users receive a clear success, failure, or recovery state when the ${theme.name.toLowerCase()} scenario occurs.`,
      `Telemetry or logs capture the ${theme.name.toLowerCase()} outcome so the team can verify the impact score improves after release.`
    ]
  );
}

function implementationApproachForTheme(theme: Theme) {
  const approaches: Record<string, string> = {
    "Dark Mode":
      "Introduce a token-based theme layer in Tailwind, persist the selected preference in local storage, and audit every high-traffic component with semantic color variables instead of hard-coded colors.",
    "Offline Mode":
      "Add a client-side cache for recent workspace reads, a local draft queue for mutations, and a reconnect worker that replays queued changes with idempotency keys.",
    "Sync Reliability":
      "Instrument the sync lifecycle, use optimistic UI updates with server acknowledgements, and add conflict metadata so reconnect flows can recover without duplicate writes.",
    Performance:
      "Profile the largest render paths, memoize derived analysis results, virtualize long lists, and move CPU-heavy transforms out of urgent React render work.",
    "Mobile Experience":
      "Refactor dense desktop-first views into responsive tab panels, tighten touch targets, and add mobile-specific actions for reviewing priorities and issue output.",
    "Workflow Improvements":
      "Map the current user path, find the repeated point of friction, remove the smallest blocking step, and add clear feedback so users know what happened."
  };

  return (
    approaches[theme.name] ??
    `Use the review evidence for ${theme.name.toLowerCase()} to identify the affected workflow, isolate the smallest shippable fix, add visible recovery states, and instrument the before/after outcome.`
  );
}

function affectedFilesForTheme(
  theme: Theme,
  projectFiles: string[] = [],
  usedFiles = new Set<string>()
) {
  const files: Record<string, string[]> = {
    "Dark Mode": [
      "app/globals.css",
      "tailwind.config.ts",
      "components/theme-provider.tsx",
      "components/settings/theme-toggle.tsx"
    ],
    "Offline Mode": [
      "lib/offline/cache.ts",
      "lib/offline/draft-queue.ts",
      "components/sync/sync-status.tsx",
      "app/api/sync/route.ts"
    ],
    "Sync Reliability": [
      "lib/sync/client.ts",
      "lib/sync/conflicts.ts",
      "components/sync/sync-status.tsx",
      "app/api/sync/route.ts"
    ],
    Performance: [
      "components/dashboard/results-dashboard.tsx",
      "components/feedback/feedback-list.tsx",
      "lib/analysis/prioritization.ts",
      "app/api/analyze/route.ts"
    ],
    "Mobile Experience": [
      "components/layout/app-shell.tsx",
      "components/dashboard/results-tabs.tsx",
      "components/issues/issue-card.tsx",
      "app/globals.css"
    ],
    "App Stability": [
      "app/api/health/route.ts",
      "lib/errors/reporting.ts",
      "lib/analytics/review-events.ts",
      "app/error.tsx"
    ],
    "Account Access": [
      "components/auth/login-form.tsx",
      "app/api/auth/route.ts",
      "lib/auth/session.ts"
    ],
    "Billing and Subscriptions": [
      "components/billing/subscription-panel.tsx",
      "lib/billing/subscription.ts",
      "app/api/billing/route.ts"
    ],
    "Ads and Monetization": [
      "components/ads/ad-slot.tsx",
      "lib/ads/placement.ts",
      "app/api/ads/route.ts"
    ],
    "Content Quality": [
      "components/lessons/lesson-player.tsx",
      "lib/speech/recognition.ts",
      "components/practice/speaking-exercise.tsx",
      "lib/content/quality.ts"
    ],
    "Workflow Improvements": [
      "app/page.tsx",
      "components/product/workflow.tsx",
      "components/feedback/feedback-list.tsx",
      "lib/workflow/state.ts"
    ]
  };

  return normalizeAffectedFiles(
    theme,
    projectFiles,
    files[theme.name] ?? ["app/page.tsx", "components/product/workflow.tsx"],
    usedFiles
  );
}

function normalizeAffectedFiles(
  theme: Theme | string,
  projectFiles: string[],
  fallbackFiles: string[],
  usedFiles = new Set<string>()
): Pick<EngineeringPlan, "affectedFiles" | "affectedFileSource"> {
  const themeName = typeof theme === "string" ? theme : theme.name;

  if (!projectFiles.length) {
    const affectedFiles = reserveUniqueFiles(fallbackFiles, usedFiles);

    return {
      affectedFiles,
      affectedFileSource: "suggested"
    };
  }

  const candidateMatches = matchProjectFiles(fallbackFiles, projectFiles);
  const ranked = [
    ...candidateMatches,
    ...rankProjectFilesForTheme(theme, projectFiles)
  ];
  const uniqueRanked = reserveUniqueFiles(ranked.slice(0, 4), usedFiles);

  if (uniqueRanked.length) {
    return {
      affectedFiles: uniqueRanked.slice(0, 6),
      affectedFileSource: "uploaded-structure"
    };
  }

  const affectedFiles = reserveUniqueFiles(
    projectFiles.filter(isLikelyProductFile).slice(0, 6),
    usedFiles
  );

  return {
    affectedFiles,
    affectedFileSource: "uploaded-structure"
  };
}

function parseProjectStructure(input: string) {
  const paths = new Set<string>();
  const treeStack: string[] = [];
  const indentStack: Array<{ indent: number; name: string }> = [];

  for (const rawLine of input.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      continue;
    }

    if (!/^\s/.test(rawLine)) {
      for (const directPath of extractDirectPaths(line)) {
        addProjectPath(paths, directPath);
      }
    }

    const treeMatch = line.match(
      /^([\u2502|\s]*)(?:\u251c\u2500\u2500|\u2514\u2500\u2500|\+--|`--|\|--)\s*(.+)$/
    );

    if (treeMatch) {
      const depth = Math.floor(treeMatch[1].length / 4);
      const name = cleanPathSegment(treeMatch[2]);

      if (!name) {
        continue;
      }

      treeStack[depth] = name;
      treeStack.length = depth + 1;
      addProjectPath(paths, treeStack.join("/"));
      continue;
    }

    const isDirectoryLine = /\/\s*$/.test(line);
    const cleaned = cleanPathSegment(line);
    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;

    while (
      indentStack.length &&
      indent <= indentStack[indentStack.length - 1].indent
    ) {
      indentStack.pop();
    }

    if (isDirectoryLine) {
      if (cleaned && !cleaned.includes("/")) {
        indentStack.push({ indent, name: cleaned });
        continue;
      }
    }

    if (isFileLike(cleaned) && !cleaned.includes("/")) {
      addProjectPath(
        paths,
        [...indentStack.map((item) => item.name), cleaned].join("/")
      );
      continue;
    }

    if (/^\s/.test(rawLine) && cleaned.includes("/") && isFileLike(cleaned)) {
      addProjectPath(
        paths,
        [...indentStack.map((item) => item.name), cleaned].join("/")
      );
      continue;
    }

    if (cleaned.includes("/") || isFileLike(cleaned)) {
      addProjectPath(paths, cleaned);
    }
  }

  return Array.from(paths).slice(0, 300);
}

function extractDirectPaths(line: string) {
  const matches =
    line.match(/[A-Za-z0-9_.@()[\]-]+(?:[\\/][A-Za-z0-9_.@()[\]-]+)+/g) ??
    [];

  return matches.map((match) => match.replace(/\\/g, "/"));
}

function addProjectPath(paths: Set<string>, candidate: string) {
  const path = candidate
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/\s+\(.*\)$/, "")
    .trim();

  if (!path || !isFileLike(path) || isIgnoredProjectPath(path)) {
    return;
  }

  paths.add(path);
}

function cleanPathSegment(value: string) {
  return value
    .replace(/[\u2502\u251c\u2514\u2500`+|]/g, "")
    .replace(/^\s*-+\s*/, "")
    .replace(/\s+#.*$/, "")
    .trim()
    .replace(/\/$/, "");
}

function isFileLike(path: string) {
  return /\.[a-z0-9]+$/i.test(path);
}

function isIgnoredProjectPath(path: string) {
  return /(^|\/)(node_modules|\.next|\.git|dist|build|coverage|\.turbo)(\/|$)/.test(
    path
  );
}

function reserveUniqueFiles(files: string[], usedFiles: Set<string>) {
  const reserved: string[] = [];

  for (const file of files) {
    if (usedFiles.has(file)) {
      continue;
    }

    usedFiles.add(file);
    reserved.push(file);
  }

  return reserved;
}

function rankProjectFilesForTheme(theme: Theme | string, projectFiles: string[]) {
  const themeName = typeof theme === "string" ? theme : theme.name;
  const themeText =
    typeof theme === "string"
      ? theme
      : `${theme.name} ${theme.summary} ${theme.representativeQuotes.join(" ")}`;
  const keywordsByTheme: Record<string, string[]> = {
    "Dark Mode": [
      "theme",
      "dark",
      "globals.css",
      "tailwind",
      "layout",
      "provider",
      "settings",
      "styles",
      "css"
    ],
    "Offline Mode": [
      "offline",
      "cache",
      "draft",
      "queue",
      "sync",
      "storage",
      "worker",
      "local",
      "api"
    ],
    "Sync Reliability": [
      "sync",
      "realtime",
      "real-time",
      "websocket",
      "conflict",
      "collaboration",
      "events",
      "client",
      "api"
    ],
    Performance: [
      "dashboard",
      "list",
      "virtual",
      "import",
      "analysis",
      "chart",
      "results",
      "feedback",
      "api/analyze"
    ],
    "Mobile Experience": [
      "mobile",
      "layout",
      "responsive",
      "tabs",
      "navigation",
      "app-shell",
      "globals.css",
      "styles"
    ]
  };
  const keywords = keywordsByTheme[themeName] ?? importantTokens(themeText);

  return projectFiles
    .map((file) => {
      const normalized = file.toLowerCase();
      const keywordScore = keywords.reduce(
        (total, keyword) =>
          total + (normalized.includes(keyword.toLowerCase()) ? 3 : 0),
        0
      );
      const routeBoost =
        keywordScore > 0 && normalized.includes("app/api") ? 1 : 0;
      const componentBoost =
        keywordScore > 0 && normalized.includes("component") ? 1 : 0;

      return {
        file,
        score: keywordScore + routeBoost + componentBoost
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.file.length - b.file.length)
    .map((item) => item.file);
}

function matchProjectFiles(candidates: string[], projectFiles: string[]) {
  const normalizedProjectFiles = projectFiles.map((file) => ({
    file,
    normalized: file.toLowerCase()
  }));

  return candidates.flatMap((candidate) => {
    const normalizedCandidate = candidate.toLowerCase();
    const exact = normalizedProjectFiles.find(
      (item) => item.normalized === normalizedCandidate
    );

    if (exact) {
      return [exact.file];
    }

    const basename = normalizedCandidate.split("/").pop() ?? normalizedCandidate;
    const loose = normalizedProjectFiles.find(
      (item) =>
        item.normalized.endsWith(`/${basename}`) ||
        item.normalized.includes(normalizedCandidate)
    );

    return loose ? [loose.file] : [];
  });
}

function isLikelyProductFile(file: string) {
  return /(^|\/)(app|pages|components|features|lib|src|hooks|stores|services|api)(\/|$)/i.test(
    file
  );
}

function engineeringTasksForTheme(theme: Theme) {
  const tasks: Record<string, string[]> = {
    "Dark Mode": [
      "Inventory hard-coded color classes and replace them with semantic tokens.",
      "Create a theme preference control and hydrate it without visual flicker.",
      "Add visual QA cases for charts, modals, and form states."
    ],
    "Offline Mode": [
      "Design cached workspace payload shape and expiration policy.",
      "Implement draft queue writes with idempotency keys.",
      "Add reconnect replay and user-visible sync status states."
    ],
    "Sync Reliability": [
      "Add timing instrumentation around write, acknowledgement, and broadcast events.",
      "Implement conflict detection for simultaneous item edits.",
      "Add retry deduplication and regression tests for reconnect flows."
    ],
    Performance: [
      "Profile import, clustering, tab switching, and chart rendering paths.",
      "Virtualize large feedback and issue lists.",
      "Memoize priority calculations and defer non-critical rendering."
    ],
    "Mobile Experience": [
      "Audit every dashboard tab at 375px and 768px widths.",
      "Replace cramped table interactions with stacked mobile rows.",
      "Add mobile QA coverage for keyboard and tab navigation states."
    ],
    "Workflow Improvements": [
      "Write down the current flow and the exact step users complain about.",
      "Remove or simplify that step in the smallest shippable path.",
      "Add a clear state for success, failure, and empty data."
    ]
  };

  return (
    tasks[theme.name] ?? [
      `Map the ${theme.name.toLowerCase()} review evidence to one end-to-end product path.`,
      `Implement the smallest fix that addresses "${shorten(theme.representativeQuotes[0] ?? theme.summary, 110)}".`,
      `Add instrumentation and focused regression coverage for the ${theme.name.toLowerCase()} scenario.`
    ]
  );
}

function successMetricForTheme(themeName: string) {
  const metrics: Record<string, string> = {
    "Dark Mode": "At least 80% of dark mode beta users keep the setting enabled after one week.",
    "Offline Mode": "Offline users can reopen and draft in a recent workspace with zero data-loss reports.",
    "Sync Reliability": "P95 collaborative update visibility drops below five seconds.",
    Performance: "P95 dashboard interaction latency stays under 200ms for 1,000 feedback items.",
    "Mobile Experience": "Mobile task completion rate improves by 25% in the priority review workflow.",
    "Workflow Improvements": "Target workflow completion rate improves by 15%."
  };

  return metrics[themeName] ?? "Customer-reported workflow friction decreases in follow-up feedback.";
}

function successMetricForThemeEvidence(theme: Theme) {
  return `Customer complaints tagged ${theme.name} decrease in the next review import or support-ticket sample.`;
}

function effortForTheme(themeName: string, priority: Priority) {
  const effort: Record<string, string> = {
    "Dark Mode": "4-6 engineer-days",
    "Offline Mode": "8-12 engineer-days",
    "Sync Reliability": "7-10 engineer-days",
    Performance: "5-8 engineer-days",
    "Mobile Experience": "4-7 engineer-days"
  };

  return effort[themeName] ?? (priority === "P1" ? "5-8 engineer-days" : "3-5 engineer-days");
}

function priorityForScore(score: number): Priority {
  if (score >= 80) {
    return "P1";
  }
  if (score >= 60) {
    return "P2";
  }
  if (score >= 40) {
    return "P3";
  }
  return "P4";
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function shorten(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, " ").trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}
