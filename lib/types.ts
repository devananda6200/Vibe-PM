export type FeedbackKind = "complaint" | "request" | "bug" | "feature";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type AnalysisSource = "openai" | "local";

export interface FeedbackItem {
  id: string;
  text: string;
  kind: FeedbackKind;
  sentiment: number;
  severity: number;
  theme: string;
}

export interface ThemeScore {
  theme: string;
  score: number;
  priority: Priority;
}

export interface Theme {
  id: string;
  name: string;
  mentions: number;
  summary: string;
  sentiment: number;
  severity: number;
  score: number;
  priority: Priority;
  representativeQuotes: string[];
}

export interface SprintRecommendation {
  theme: string;
  priority: Priority;
  score: number;
  goal: string;
  scope: string[];
  successMetric: string;
}

export interface SprintPlan {
  sprint1: SprintRecommendation[];
  sprint2: SprintRecommendation[];
}

export interface GithubIssue {
  title: string;
  description: string;
  priority: Priority;
  theme: string;
  acceptanceCriteria: string[];
  labels: string[];
}

export interface EngineeringPlan {
  theme: string;
  implementationApproach: string;
  affectedFiles: string[];
  affectedFileSource: "uploaded-structure" | "suggested";
  tasks: string[];
  estimatedEffort: string;
}

export interface PipelineStep {
  id: string;
  name: string;
  prompt: string;
  outputSummary: string;
  status: "complete" | "fallback" | "error";
}

export interface AnalysisResult {
  items: FeedbackItem[];
  themes: Theme[];
  scores: ThemeScore[];
  sprintPlan: SprintPlan;
  githubIssues: GithubIssue[];
  engineeringPlans: EngineeringPlan[];
  pipeline: PipelineStep[];
  generatedAt: string;
  source: AnalysisSource;
  projectFileCount: number;
  projectFiles: string[];
  importedReviewCount: number;
  reviewSource?: string;
}
