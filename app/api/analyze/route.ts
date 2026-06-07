import { NextResponse } from "next/server";

import { runFeedbackAnalysis } from "@/lib/analysis";
import { scrapePlayStoreAction } from "@/lib/play-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      input?: unknown;
      codeStructure?: unknown;
      packageNameOrUrl?: unknown;
    };
    const input = typeof body.input === "string" ? body.input : "";
    const codeStructure =
      typeof body.codeStructure === "string" ? body.codeStructure : "";
    const packageNameOrUrl =
      typeof body.packageNameOrUrl === "string" ? body.packageNameOrUrl : "";
    let importedReviewCount = 0;
    let reviewSource: string | undefined;
    let analysisInput = input;

    if (packageNameOrUrl.trim()) {
      const importResult = await scrapePlayStoreAction(packageNameOrUrl);

      if (importResult.error) {
        return NextResponse.json(
          { error: importResult.error },
          { status: importResult.status ?? 400 }
        );
      }

      if (!importResult.reviews?.length) {
        return NextResponse.json(
          {
            error:
              "No public Play Store review snippets were found for that app link."
          },
          { status: 400 }
        );
      }

      importedReviewCount = importResult.reviews.length;
      reviewSource = importResult.name ?? importResult.packageName;
      analysisInput = [input, importResult.reviews.join("\n")]
        .filter((value) => value.trim())
        .join("\n");
    }

    if (!analysisInput.trim()) {
      return NextResponse.json(
        { error: "Feedback input or a Play Store app link is required." },
        { status: 400 }
      );
    }

    const result = await runFeedbackAnalysis(analysisInput, codeStructure, {
      importedReviewCount,
      reviewSource
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze feedback."
      },
      { status: 500 }
    );
  }
}
