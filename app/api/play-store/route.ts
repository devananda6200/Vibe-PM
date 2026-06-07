import { NextResponse } from "next/server";

import { scrapePlayStoreAction } from "@/lib/play-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      packageNameOrUrl?: unknown;
      hl?: unknown;
      gl?: unknown;
    };

    const packageNameOrUrl =
      typeof body.packageNameOrUrl === "string" ? body.packageNameOrUrl : "";
    const hl = typeof body.hl === "string" ? body.hl : "en";
    const gl = typeof body.gl === "string" ? body.gl : "US";
    const result = await scrapePlayStoreAction(packageNameOrUrl, hl, gl);

    if (result.error) {
      return NextResponse.json(result, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to scrape Play Store app."
      },
      { status: 500 }
    );
  }
}
