"use client";

import { useRef, useState } from "react";
import {
  Code2,
  Database,
  FileUp,
  Link,
  Loader2,
  Play,
  RotateCcw,
  Smartphone,
  WandSparkles
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackInputPanelProps {
  value: string;
  onChange: (value: string) => void;
  playStoreInput: string;
  onPlayStoreInputChange: (value: string) => void;
  codeStructure: string;
  onCodeStructureChange: (value: string) => void;
  onAnalyze: () => void;
  onLoadSample: () => void;
  isLoading: boolean;
  feedbackCount: number;
}

export function FeedbackInputPanel({
  value,
  onChange,
  playStoreInput,
  onPlayStoreInputChange,
  codeStructure,
  onCodeStructureChange,
  onAnalyze,
  onLoadSample,
  isLoading,
  feedbackCount
}: FeedbackInputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const structureInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportingPlayStore, setIsImportingPlayStore] = useState(false);

  async function handleCsvUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    const text = await file.text();
    const rows = parseCsvFeedback(text);

    if (!rows.length) {
      toast.error("No feedback rows found in that CSV.");
      return;
    }

    onChange(rows.join("\n"));
    toast.success(`Loaded ${rows.length} rows from ${file.name}.`);
  }

  async function handleStructureUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    const text = await file.text();

    if (!text.trim()) {
      toast.error("That structure file is empty.");
      return;
    }

    onCodeStructureChange(text);
    toast.success(`Loaded project structure from ${file.name}.`);
  }

  async function importPlayStoreReviews() {
    if (!playStoreInput.trim()) {
      toast.error("Add a Play Store URL or package name.");
      return;
    }

    setIsImportingPlayStore(true);

    try {
      const response = await fetch("/api/play-store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ packageNameOrUrl: playStoreInput })
      });
      const payload = (await response.json()) as {
        error?: string;
        name?: string;
        packageName?: string;
        reviews?: string[];
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Unable to import Play Store app.");
      }

      if (!payload.reviews?.length) {
        toast.warning(
          `Imported ${payload.name ?? payload.packageName}, but no review snippets were visible on the public app page.`
        );
        return;
      }

      onChange(payload.reviews.join("\n"));
      toast.success(
        `Imported ${payload.reviews.length} Play Store reviews from ${payload.name ?? payload.packageName}.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to import Play Store reviews."
      );
    } finally {
      setIsImportingPlayStore(false);
    }
  }

  return (
    <Card className="xl:sticky xl:top-5">
      <CardHeader className="border-b border-foreground pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Signal Input</CardTitle>
            <CardDescription>
              Paste reviews, tickets, complaints, or feature requests.
            </CardDescription>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-foreground bg-primary text-primary-foreground shadow-soft">
            <WandSparkles className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-[280px] min-h-[240px] resize-none text-[13px] leading-6 xl:h-[300px] 2xl:h-[390px]"
          placeholder={`Need dark mode
Dark mode missing
Offline support needed
Sync is very slow
Please add dark theme
Offline mode for travel`}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            void handleCsvUpload(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={structureInputRef}
          type="file"
          accept=".txt,.md,.json,.ts,.tsx,.js,.jsx"
          className="hidden"
          onChange={(event) => {
            void handleStructureUpload(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />

        <details className="border border-foreground bg-secondary/40 px-3 py-2">
          <summary className="cursor-pointer list-none text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              Play Store import
            </span>
          </summary>
          <div className="mt-3 grid gap-2">
            <Input
              value={playStoreInput}
              onChange={(event) => onPlayStoreInputChange(event.target.value)}
              placeholder="https://play.google.com/store/apps/details?id=com.example.app"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={importPlayStoreReviews}
              disabled={isImportingPlayStore}
            >
              {isImportingPlayStore ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Link className="h-4 w-4" aria-hidden="true" />
              )}
              {isImportingPlayStore ? "Importing" : "Import Reviews"}
            </Button>
          </div>
        </details>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-4 w-4" aria-hidden="true" />
            CSV
          </Button>
          <Button type="button" variant="outline" onClick={onLoadSample}>
            <Database className="h-4 w-4" aria-hidden="true" />
            Sample
          </Button>
        </div>

        <details className="border border-foreground bg-secondary/40 px-3 py-2">
          <summary className="cursor-pointer list-none text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              Project structure
              {codeStructure.trim() ? (
                <span className="border border-foreground bg-card px-1.5 py-0.5 text-[10px] normal-case text-foreground">
                  attached
                </span>
              ) : null}
            </span>
          </summary>
          <div className="mt-3 grid gap-2">
            <Textarea
              value={codeStructure}
              onChange={(event) => onCodeStructureChange(event.target.value)}
              className="h-28 min-h-24 resize-none text-xs leading-5"
              placeholder={`app/
  api/
    sync/route.ts
components/
  dashboard/results-dashboard.tsx
lib/
  sync/client.ts`}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => structureInputRef.current?.click()}
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Upload Tree
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onCodeStructureChange("")}
                disabled={!codeStructure.trim()}
              >
                Clear
              </Button>
            </div>
          </div>
        </details>

        <div className="flex items-center justify-between gap-2 border-y border-foreground py-2 text-xs font-bold uppercase text-muted-foreground">
          <span>{feedbackCount} feedback items detected</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-1.5 py-1 font-bold text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            onClick={() => onChange("")}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={onAnalyze}
          disabled={isLoading || (!value.trim() && !playStoreInput.trim())}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {isLoading ? "Analyzing" : "Analyze Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}

function parseCsvFeedback(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows
    .map((cells, index) => {
      const cleaned = cells.map((value) => value.trim()).filter(Boolean);
      if (!cleaned.length) {
        return "";
      }

      if (
        index === 0 &&
        cleaned.some((value) => /review|feedback|ticket|comment/i.test(value)) &&
        cleaned.every((value) => value.length < 40)
      ) {
        return "";
      }

      return cleaned.sort((a, b) => b.length - a.length)[0];
    })
    .filter((value) => value.length > 2);
}
