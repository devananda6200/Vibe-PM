"use client";

import { useMemo, useState } from "react";
import { Activity, Boxes, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { FeedbackInputPanel } from "@/components/app/feedback-input-panel";
import { ResultsDashboard } from "@/components/app/results-dashboard";
import { Badge } from "@/components/ui/badge";
import { getSampleFeedbackText, sampleFeedback } from "@/lib/sample-data";
import type { AnalysisResult } from "@/lib/types";

export function FeedbackCopilot() {
  const [input, setInput] = useState("");
  const [codeStructure, setCodeStructure] = useState("");
  const [playStoreInput, setPlayStoreInput] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const feedbackCount = useMemo(
    () => input.split(/\n+/).filter((line) => line.trim().length > 2).length,
    [input]
  );
  const projectPathCount = useMemo(
    () =>
      codeStructure
        .split(/\n+/)
        .filter((line) => /\.[a-z0-9]+/i.test(line))
        .length,
    [codeStructure]
  );

  async function analyzeFeedback() {
    if (!input.trim() && !playStoreInput.trim()) {
      toast.error("Add feedback or a Play Store app link first.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input,
          codeStructure,
          packageNameOrUrl: playStoreInput
        })
      });

      const payload = (await response.json()) as AnalysisResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Analysis failed.");
      }

      setResult(payload);
      toast.success(
        payload.importedReviewCount
          ? `Imported ${payload.importedReviewCount} reviews and found ${payload.themes.length} themes.`
          : `Analyzed ${payload.items.length} items into ${payload.themes.length} themes.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to analyze feedback."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function loadSampleDataset() {
    setInput(getSampleFeedbackText());
    setPlayStoreInput("");
    setResult(null);
    toast.success(`Loaded ${sampleFeedback.length} realistic SaaS reviews.`);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="overflow-hidden border-b border-foreground bg-primary py-2 text-foreground">
        <div className="vibe-marquee gap-8 text-sm font-bold uppercase sm:text-base">
          {Array.from({ length: 2 }).map((_, groupIndex) => (
            <div key={groupIndex} className="flex shrink-0 gap-8 px-4">
              {[
                "Vibe PM",
                "Customer signal",
                "Sprint plan",
                "GitHub issues",
                "Engineering copilot"
              ].map((item) => (
                <span key={`${groupIndex}-${item}`} className="shrink-0">
                  {item} *
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-5 border border-foreground bg-card px-4 py-5 shadow-panel sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-end">
          <div>
            <div className="mb-8 flex flex-wrap items-center gap-3 text-sm font-bold uppercase text-muted-foreground">
              <span>Product decisions</span>
              <span>/</span>
              <span>Engineering execution</span>
              <Badge variant="secondary">MVP</Badge>
            </div>
            <h1 className="font-display max-w-4xl text-[clamp(3rem,11vw,9rem)] leading-[0.82] text-foreground">
              Vibe PM
            </h1>
            <p className="mt-5 max-w-3xl text-sm font-bold uppercase leading-6 text-foreground sm:text-base">
              Customer feedback into prioritized sprint work, markdown issues,
              and repo-aware implementation plans.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricChip
              icon={<Activity className="h-4 w-4" aria-hidden="true" />}
              label="Input"
            value={`${feedbackCount} items`}
            />
            <MetricChip
              icon={<Boxes className="h-4 w-4" aria-hidden="true" />}
              label="Project"
              value={
                result?.projectFileCount
                  ? `${result.projectFileCount} files`
                  : projectPathCount
                    ? `${projectPathCount} paths`
                    : "Optional"
              }
            />
            <div className="col-span-2 border border-foreground bg-foreground px-4 py-3 text-card">
              <div className="flex items-center gap-2 text-xs font-bold uppercase">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Live workflow
              </div>
              <p className="mt-2 text-sm leading-6 text-card/80">
                Paste, import, or upload feedback. Vibe PM clusters signal and
                turns it into sprint-ready execution.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
          <FeedbackInputPanel
            value={input}
            onChange={setInput}
            playStoreInput={playStoreInput}
            onPlayStoreInputChange={setPlayStoreInput}
            codeStructure={codeStructure}
            onCodeStructureChange={setCodeStructure}
            onAnalyze={analyzeFeedback}
            onLoadSample={loadSampleDataset}
            isLoading={isLoading}
            feedbackCount={feedbackCount}
          />
          <ResultsDashboard result={result} isLoading={isLoading} />
        </section>
      </div>
    </main>
  );
}

function MetricChip({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border border-foreground bg-card px-3 py-3">
      <span className="text-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase leading-4 text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-sm font-bold text-foreground">
          {value}
        </span>
      </span>
    </div>
  );
}
