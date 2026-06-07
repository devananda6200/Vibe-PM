"use client";

import { useState } from "react";
import {
  Braces,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Code2,
  ExternalLink,
  FileCode2,
  Github,
  GitPullRequest,
  Layers3,
  ListChecks,
  Rocket,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";

import { FrequencyChart, ImpactCharts } from "@/components/app/impact-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  AnalysisResult,
  EngineeringPlan,
  GithubIssue,
  PipelineStep,
  Priority,
  SprintRecommendation,
  Theme
} from "@/lib/types";

interface ResultsDashboardProps {
  result: AnalysisResult | null;
  isLoading: boolean;
}

export function ResultsDashboard({ result, isLoading }: ResultsDashboardProps) {
  const [githubRepoUrl, setGithubRepoUrl] = useState("");

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!result) {
    return <EmptyDashboard />;
  }

  return (
    <div className="min-w-0 border border-foreground bg-card p-4 shadow-panel">
      <div className="mb-4 flex flex-col gap-3 border-b border-foreground pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg">Decision Board</h2>
            <Badge variant={result.source === "openai" ? "default" : "secondary"}>
              {result.source === "openai" ? "OpenAI" : "Local analysis"}
            </Badge>
            {result.importedReviewCount ? (
              <Badge variant="default">
                {result.importedReviewCount} Play reviews
              </Badge>
            ) : null}
            {result.projectFileCount ? (
              <Badge variant="secondary">
                {result.projectFileCount} files scanned
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {result.items.length} inputs {"->"} {result.themes.length} themes{" "}
            {"->"}{" "}
            {result.githubIssues.length} issues
            {result.reviewSource ? ` for ${result.reviewSource}` : ""}.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatTile label="Tasks" value={result.themes.length} />
          <StatTile
            label="Top score"
            value={`${Math.max(...result.themes.map((theme) => theme.score))}`}
          />
          <StatTile label="Issues" value={result.githubIssues.length} />
        </div>
      </div>

      <Tabs defaultValue="themes">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto p-1">
          <TabsTrigger value="themes">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="priorities">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Priorities
          </TabsTrigger>
          <TabsTrigger value="sprint-plan">
            <Rocket className="h-4 w-4" aria-hidden="true" />
            Sprint Plan
          </TabsTrigger>
          <TabsTrigger value="github-issues">
            <Github className="h-4 w-4" aria-hidden="true" />
            GitHub Issues
          </TabsTrigger>
          <TabsTrigger value="engineering-plan">
            <Code2 className="h-4 w-4" aria-hidden="true" />
            Engineering Plan
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <Braces className="h-4 w-4" aria-hidden="true" />
            AI Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="themes">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="grid gap-3">
              {result.themes.map((theme) => (
                <ThemeCard key={theme.id} theme={theme} />
              ))}
            </div>
            <FrequencyChart themes={result.themes} />
          </div>
        </TabsContent>

        <TabsContent value="priorities">
          <div className="grid gap-4">
            <ImpactCharts themes={result.themes} />
            <PriorityTable themes={result.themes} />
          </div>
        </TabsContent>

        <TabsContent value="sprint-plan">
          <div className="grid gap-4 xl:grid-cols-2">
            <SprintColumn
              title="Sprint 1"
              description="Highest impact opportunities first."
              items={result.sprintPlan.sprint1}
            />
            <SprintColumn
              title="Sprint 2"
              description="Follow-through, hardening, and expansion."
              items={result.sprintPlan.sprint2}
            />
          </div>
        </TabsContent>

        <TabsContent value="github-issues">
          <div className="grid gap-3">
            <GithubDraftConnector
              issueCount={result.githubIssues.length}
              repoUrl={githubRepoUrl}
              onRepoUrlChange={setGithubRepoUrl}
            />
            {result.githubIssues.map((issue) => (
              <IssueCard
                key={`${issue.theme}-${issue.title}`}
                issue={issue}
                repoUrl={githubRepoUrl}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="engineering-plan">
          <div className="grid gap-3">
            {result.engineeringPlans.map((plan) => (
              <EngineeringPlanCard
                key={`${plan.theme}-${plan.estimatedEffort}`}
                plan={plan}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineView steps={result.pipeline} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex min-h-[660px] min-w-0 items-center justify-center border border-foreground bg-card p-6 shadow-panel">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center border border-foreground bg-primary text-primary-foreground shadow-soft">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-3xl leading-none sm:text-5xl">
          Ready For Signal
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          Paste feedback or load the sample dataset. The copilot will organize
          it into themes, priorities, sprints, issues, and implementation work.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {[
            ["Extract", "Complaints, requests, bugs"],
            ["Cluster", "Themes and frequencies"],
            ["Execute", "Sprint plan and issues"]
          ].map(([title, body]) => (
            <div key={title} className="border border-foreground bg-secondary/50 p-3">
              <div className="text-sm font-bold uppercase">{title}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                {body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-[660px] border border-foreground bg-card p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-12 w-20" />
        </div>
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
        <Skeleton className="h-[340px] w-full" />
      </div>
    </div>
  );
}

function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{theme.name}</CardTitle>
              <PriorityBadge priority={theme.priority} />
            </div>
            <CardDescription className="mt-2 line-clamp-2">
              {theme.summary}
            </CardDescription>
          </div>
          <div className="grid min-w-[154px] grid-cols-2 gap-2 text-center">
            <MiniMetric label="Score" value={theme.score} />
            <MiniMetric label="Mentions" value={theme.mentions} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2 md:grid-cols-3">
          <SignalMeter label="Frequency" value={theme.mentions} />
          <SignalMeter label="Sentiment" value={theme.sentiment} />
          <SignalMeter label="Severity" value={theme.severity} />
        </div>
        <DetailsBlock label="Evidence">
            {theme.representativeQuotes.map((quote) => (
              <div
                key={quote}
                className="border border-foreground bg-secondary/45 px-3 py-2 text-sm leading-6 text-muted-foreground"
              >
              {quote}
            </div>
          ))}
        </DetailsBlock>
      </CardContent>
    </Card>
  );
}

function PriorityTable({ themes }: { themes: Theme[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Prioritized Opportunities</CardTitle>
        <CardDescription>
          Impact Score = frequency * 0.5 + sentiment * 0.3 + severity * 0.2.
          Priorities are assigned continuously from the highest score.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 font-medium">Theme</th>
                <th className="py-3 pr-4 font-medium">Mentions</th>
                <th className="py-3 pr-4 font-medium">Sentiment</th>
                <th className="py-3 pr-4 font-medium">Severity</th>
                <th className="py-3 pr-4 font-medium">Score</th>
                <th className="py-3 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((theme) => (
                <tr key={theme.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{theme.name}</td>
                  <td className="py-3 pr-4">{theme.mentions}</td>
                  <td className="py-3 pr-4">{theme.sentiment}</td>
                  <td className="py-3 pr-4">{theme.severity}</td>
                  <td className="py-3 pr-4 font-semibold">{theme.score}</td>
                  <td className="py-3">
                    <PriorityBadge priority={theme.priority} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SprintColumn({
  title,
  description,
  items
}: {
  title: string;
  description: string;
  items: SprintRecommendation[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-4 w-4 text-foreground" aria-hidden="true" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length === 0 ? (
          <div className="border border-foreground bg-secondary/40 px-3 py-4 text-sm text-muted-foreground">
            No unique priority items remain for this sprint.
          </div>
        ) : null}
        {items.map((item) => (
          <div key={`${title}-${item.theme}`} className="border border-foreground p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">{item.theme}</div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={item.priority} />
                <Badge variant="outline">{item.score}</Badge>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.goal}
            </p>
            <DetailsBlock label="Scope and metric">
              <ul className="grid gap-2 text-sm">
                {item.scope.map((scope) => (
                  <li key={scope} className="flex gap-2 leading-6">
                    <CheckCircle2
                      className="mt-1 h-4 w-4 shrink-0 text-foreground"
                      aria-hidden="true"
                    />
                    <span>{scope}</span>
                  </li>
                ))}
              </ul>
              <div className="border border-foreground bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                {item.successMetric}
              </div>
            </DetailsBlock>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GithubDraftConnector({
  issueCount,
  repoUrl,
  onRepoUrlChange
}: {
  issueCount: number;
  repoUrl: string;
  onRepoUrlChange: (value: string) => void;
}) {
  const repo = parseGithubRepo(repoUrl);

  return (
    <Card>
      <CardHeader className="border-b border-foreground pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Github className="h-4 w-4 text-foreground" aria-hidden="true" />
              <CardTitle>GitHub Draft Target</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Add a repository once, then draft any generated issue in GitHub.
            </CardDescription>
          </div>
          <Badge variant={repo ? "default" : "secondary"}>
            {repo ? `${repo.owner}/${repo.name}` : `${issueCount} drafts`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <Input
          value={repoUrl}
          onChange={(event) => onRepoUrlChange(event.target.value)}
          placeholder="https://github.com/acme/app"
          aria-label="GitHub repository URL"
        />
        <div className="border border-foreground bg-secondary px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
          {repo ? "Connected" : "Repo required"}
        </div>
      </CardContent>
    </Card>
  );
}

function IssueCard({
  issue,
  repoUrl
}: {
  issue: GithubIssue;
  repoUrl: string;
}) {
  const markdown = issueToMarkdown(issue);
  const brief = extractMarkdownSummary(issue.description);
  const draftUrl = buildGithubIssueDraftUrl(repoUrl, issue, markdown);

  async function copyIssue() {
    await navigator.clipboard.writeText(markdown);
    toast.success("GitHub issue copied.");
  }

  function openGithubDraft() {
    if (!draftUrl) {
      toast.error("Add a GitHub repository URL first.");
      return;
    }

    window.open(draftUrl, "_blank", "noopener,noreferrer");
    toast.success("Opened GitHub issue draft.");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Github className="h-4 w-4 text-foreground" aria-hidden="true" />
              <CardTitle>{issue.title}</CardTitle>
            </div>
            <CardDescription className="mt-2 line-clamp-2">
              {brief}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={copyIssue}>
            <Clipboard className="h-4 w-4" aria-hidden="true" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <PriorityBadge priority={issue.priority} />
          {issue.labels.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 border border-foreground bg-primary p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-primary-foreground">
              Draft this cluster in GitHub
            </div>
            <div className="mt-1 text-xs leading-5 text-primary-foreground/80">
              Opens a prefilled issue composer for review before publishing.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openGithubDraft}
            disabled={!draftUrl}
            className="bg-card"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open Draft
          </Button>
        </div>
        <DetailsBlock label="Markdown issue">
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap border border-foreground bg-foreground p-3 text-xs leading-6 text-card">
            {markdown}
          </pre>
        </DetailsBlock>
        <DetailsBlock label="Acceptance Criteria">
          <div className="grid gap-2">
            {issue.acceptanceCriteria.map((criterion) => (
              <div key={criterion} className="flex gap-2 text-sm leading-6">
                <ClipboardCheck
                  className="mt-1 h-4 w-4 shrink-0 text-foreground"
                  aria-hidden="true"
                />
                <span>{criterion}</span>
              </div>
            ))}
          </div>
        </DetailsBlock>
      </CardContent>
    </Card>
  );
}

function EngineeringPlanCard({ plan }: { plan: EngineeringPlan }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-foreground" aria-hidden="true" />
              <CardTitle>{plan.theme}</CardTitle>
            </div>
            <CardDescription className="mt-2 line-clamp-2">
              {plan.implementationApproach}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{plan.estimatedEffort}</Badge>
            <Badge
              variant={
                plan.affectedFileSource === "uploaded-structure"
                  ? "default"
                  : "secondary"
              }
            >
              {plan.affectedFileSource === "uploaded-structure"
                ? "Repo-aware"
                : "Suggested"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DetailsBlock label="Possible files and tasks">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
                Possible Affected Files
              </div>
              <div className="grid gap-2">
                {plan.affectedFiles.length ? plan.affectedFiles.map((file) => (
                  <code
                    key={file}
                    className="border border-foreground bg-secondary/50 px-3 py-2 text-xs"
                  >
                    {file}
                  </code>
                )) : (
                  <div className="border border-foreground bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                    No unique file candidates found for this theme.
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Tasks
              </div>
              <div className="grid gap-2">
                {plan.tasks.map((task) => (
                  <div key={task} className="flex gap-2 text-sm leading-6">
                    <ListChecks
                      className="mt-1 h-4 w-4 shrink-0 text-foreground"
                      aria-hidden="true"
                    />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DetailsBlock>
      </CardContent>
    </Card>
  );
}

function PipelineView({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="grid gap-3">
      {steps.map((step, index) => (
        <Card key={`${step.id}-${index}`}>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center border border-foreground bg-secondary text-xs font-bold">
                    {index + 1}
                  </div>
                  <CardTitle>{step.name}</CardTitle>
                </div>
                <CardDescription className="mt-2">
                  {step.outputSummary}
                </CardDescription>
              </div>
              <Badge
                variant={
                  step.status === "complete"
                    ? "default"
                    : step.status === "fallback"
                      ? "secondary"
                      : "destructive"
                }
              >
                {step.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DetailsBlock label="Prompt">
              <div className="border border-foreground bg-foreground px-3 py-2 text-xs leading-6 text-card">
              {step.prompt}
              </div>
            </DetailsBlock>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const variant = priority.toLowerCase() as "p1" | "p2" | "p3" | "p4";
  return <Badge variant={variant}>{priority}</Badge>;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[76px] border border-foreground bg-secondary/55 px-3 py-2">
      <div className="text-[11px] font-bold uppercase text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-foreground bg-secondary/50 px-3 py-2">
      <div className="text-[11px] font-bold uppercase text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function SignalMeter({ label, value }: { label: string; value: number }) {
  const normalized = Math.min(100, Math.max(0, value));

  return (
    <div className="border border-foreground bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-bold uppercase text-muted-foreground">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden border border-foreground bg-secondary">
        <div
          className={cn(
            "h-full",
            label === "Frequency"
              ? "bg-primary"
              : label === "Sentiment"
                ? "bg-foreground"
                : "bg-destructive"
          )}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}

function DetailsBlock({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group mt-3 border border-foreground bg-secondary/25 px-3 py-2">
      <summary className="cursor-pointer list-none text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[10px] transition-transform group-open:rotate-90">
            +
          </span>
          {label}
        </span>
      </summary>
      <div className="mt-3 grid gap-2">{children}</div>
    </details>
  );
}

function extractMarkdownSummary(markdown: string) {
  const summaryMatch = markdown.match(/## Summary\s+([\s\S]*?)(?:\n\n##|$)/);

  if (summaryMatch?.[1]) {
    return summaryMatch[1].trim();
  }

  return markdown.split("\n\n")[0]?.replace(/^#+\s*/, "").trim() || markdown;
}

function issueToMarkdown(issue: GithubIssue) {
  return `# ${issue.title}

${issue.description}

## Acceptance Criteria
${issue.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n")}

## Labels
${issue.labels.join(", ")}`;
}

function parseGithubRepo(value: string) {
  const trimmed = value.trim().replace(/\.git$/i, "");

  if (!trimmed) {
    return null;
  }

  const shorthandMatch = trimmed.match(
    /^([a-z0-9_.-]+)\/([a-z0-9_.-]+)$/i
  );
  const urlMatch = trimmed.match(
    /github\.com[:/]([a-z0-9_.-]+)\/([a-z0-9_.-]+)/i
  );
  const match = shorthandMatch ?? urlMatch;

  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    name: match[2].replace(/\.git$/i, "")
  };
}

function buildGithubIssueDraftUrl(
  repoUrl: string,
  issue: GithubIssue,
  markdown: string
) {
  const repo = parseGithubRepo(repoUrl);

  if (!repo) {
    return null;
  }

  const params = new URLSearchParams({
    title: issue.title,
    body: markdown,
    labels: issue.labels.join(",")
  });

  return `https://github.com/${repo.owner}/${repo.name}/issues/new?${params.toString()}`;
}
