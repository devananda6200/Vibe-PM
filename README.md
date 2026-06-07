# Vibe PM

Production-quality MVP for turning raw customer feedback into a prioritized
engineering sprint plan.

Users can paste App Store reviews, support tickets, customer complaints,
feature requests, or upload a CSV. The app extracts feedback items, clusters
themes, scores impact, recommends two sprints, generates GitHub-ready issues,
and produces engineering implementation plans for a React + Next.js codebase.
Android teams can paste a Google Play Store URL or package name to import
public review snippets. Engineers can also paste or upload a project structure
so implementation plans can suggest possible affected files from the actual
repo shape.

## Tech Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- OpenAI API with local demo fallback
- Recharts

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## OpenAI Setup

The app works without an API key using the built-in local analysis engine. To
enable OpenAI-backed extraction, clustering, sprint planning, issue generation,
and engineering guidance, create `.env.local`:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

Never commit `.env.local` or a real API key. Keep `.env.example` as placeholders
only.

## Deploy

For Vercel or another host, add these environment variables in the provider's
dashboard before deploying:

```bash
OPENAI_API_KEY=your_real_key_in_the_host_dashboard
OPENAI_MODEL=gpt-4o-mini
```

Then deploy from GitHub normally. The repo is safe to publish as long as real
secret files stay ignored.

## GitHub Publish Checklist

```bash
git status --short
git add .
git commit -m "Prepare Vibe PM for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

If `git remote add origin` says the remote already exists, run:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

## Demo Flow

1. Click `Sample` to load 100 realistic SaaS customer reviews.
2. Optionally expand `Play Store import` and import public review snippets from
   a Google Play URL.
3. Optionally expand `Project structure` and paste a repo tree.
4. Click `Analyze Feedback`.
5. Review the generated themes, priority scores, sprint plan, GitHub issues,
   engineering plan, and AI pipeline.

The interface uses a bold monochrome and neon-lime visual direction inspired by
editorial product tools: heavy display headlines, mono body text, sharp borders,
and responsive panels with no image dependencies.

In the GitHub Issues tab, paste a repository URL such as
`https://github.com/acme/app`. Each generated issue can then open a prefilled
GitHub issue draft with markdown title, body, acceptance criteria, and labels.

The sample dataset includes dark mode requests, offline mode requests,
performance complaints, sync issues, and mobile app feature requests.

Play Store imports use the public app page plus a public review batch endpoint.
The app attempts to import up to 80 usable review snippets before analysis.

## Impact Scoring

```text
Impact Score = frequency * 0.5 + sentiment * 0.3 + severity * 0.2
```

Scores are normalized to 0-100:

Priorities are assigned continuously from the highest score:

- Highest impact theme: P1
- Next theme: P2
- Next theme: P3
- Remaining lower-impact themes: P4

Sprint entries are deduped, and GitHub issues plus engineering plans are
created for every priority theme. Engineering plans use uploaded project
structure when available and avoid repeating the same affected file candidate
across themes.

## Project Structure

```text
app/
  api/analyze/route.ts       API route for the AI pipeline
  api/play-store/route.ts    API route for Play Store imports
  globals.css                Tailwind theme tokens
  layout.tsx                 Root layout and toaster
  page.tsx                   Single-page app entry
components/
  app/                       Product UI and charts
  ui/                        shadcn/ui-style primitives
lib/
  analysis.ts                OpenAI integration and local fallback
  play-store.ts              Play Store app metadata and review scraping
  sample-data.ts             100-review demo dataset
  types.ts                   Shared TypeScript types
  utils.ts                   Utility helpers
```
