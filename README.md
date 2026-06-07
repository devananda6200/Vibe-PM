# Vibe PM

## Overview
Vibe PM is a production-quality AI-powered product management assistant that transforms raw customer feedback from play store or app store into prioritized engineering sprint plans. Users can paste Play Store reviews, support tickets, customer complaints, feature requests, or upload CSV files. The platform automatically extracts feedback items, clusters similar requests into themes, prioritizes opportunities, generates sprint recommendations, creates GitHub-ready issues, and produces engineering implementation plans tailored to a React + Next.js codebase.

---

## Problem Statement

Product teams receive customer feedback from multiple sources such as app reviews, support tickets, emails, and feature requests. Manually analyzing large volumes of feedback, identifying recurring themes, prioritizing improvements, and converting insights into actionable engineering tasks is time-consuming and inefficient.

---

## Solution

Vibe PM automates the entire feedback-to-development workflow. Using AI-powered analysis, the platform:

* Extracts actionable feedback from raw customer inputs as csv files, direct text, app link and project tree structure
* Groups similar requests into meaningful themes.
* Calculates impact scores based on frequency, sentiment, and severity.
* Prioritizes opportunities automatically.
* Generates sprint plans for engineering teams.
* Creates GitHub-ready issues with acceptance criteria.
* drafts on github issues page of the repository.
* Produces implementation guidance based on the uploaded project structure.

This enables teams to move from customer feedback to execution-ready engineering plans within minutes.

---

## Features

* AI-powered feedback extraction and analysis
* Theme clustering and opportunity identification
* Impact scoring and prioritization engine
* Automated sprint planning
* GitHub-ready issue generation
* Engineering implementation recommendations
* Google Play Store review import support
* Project structure-aware codebase analysis
* Interactive analytics and visualizations
* Built-in local AI fallback when OpenAI API is unavailable

---

## Tech Stack

### Frontend

* Next.js 15 (App Router)
* TypeScript
* Tailwind CSS
* shadcn/ui Components
* Recharts

### Backend

* Next.js API Routes
* TypeScript

### Database

* No dedicated database required for MVP

### APIs

* OpenAI API
* Google Play Store Public Data Sources

### Hosting

* Vercel
* Any Node.js-compatible hosting platform

---

## Codex / OpenAI Usage

Codex tools were heavily utilized throughout development and OpenAI api key for calling llm.

### Ideation
- Used ChatGPT and Codex to brainstorm the product concept and define the end-to-end workflow from customer feedback collection to sprint planning.
- Explored different approaches for feedback clustering, prioritization, and engineering recommendation generation.
- Refined feature requirements and user experience flows through AI-assisted discussions.

### Architecture Planning
- Leveraged ChatGPT to design the system architecture, including frontend, backend APIs, AI processing pipeline, and data flow.
- Planned the Next.js App Router structure, component hierarchy, and modular code organization.
- Designed the feedback analysis pipeline consisting of extraction, clustering, scoring, sprint generation, and issue creation stages.

### Code Generation
- Used Codex and ChatGPT to accelerate development of React components, TypeScript interfaces, API routes, utility functions, and data processing logic.
- Generated boilerplate code for UI layouts, charts, forms, and reusable components.
- Assisted in implementing feedback analysis and sprint planning workflows.

### Debugging
- Used AI assistance to identify runtime errors, resolve TypeScript issues, fix API integration problems, and optimize application behavior.
- Troubleshot component rendering issues, data flow inconsistencies, and state management challenges.
- Improved overall code quality through AI-guided refactoring suggestions.

### Documentation
- Used ChatGPT to create technical documentation, README files, deployment guides, setup instructions, and feature descriptions.
- Generated developer-friendly explanations for project structure, environment configuration, and workflow processes.
- Improved clarity and consistency across project documentation.

### API Integration
- Integrated OpenAI APIs to power feedback extraction, theme clustering, impact scoring, sprint recommendation generation, GitHub issue creation, and engineering implementation planning.
- Connected AI capabilities through secure Next.js API routes and environment variable configuration.
---

## Demo

Live Demo: https://vibe-pm-dev.vercel.app/

Demo video: https://drive.google.com/file/d/11F6s_rrXdMRHEVJ9h9SZ_LpjemjGbHiI/view?usp=sharing
---

## Screenshots

Add screenshots of:

* Dashboard: <img width="989" height="746" alt="{9D8D750E-2CBE-4D18-B124-556821A33309}" src="https://github.com/user-attachments/assets/51baa14b-ba72-44a3-9563-973d43f6ab1d" />



* Feedback Analysis View: <img width="947" height="868" alt="{9C91DE8B-54C3-499A-A05A-09B1613B3349}" src="https://github.com/user-attachments/assets/28e9597f-2344-4ec3-870f-f7b04addd2f8" />

* Theme Clustering Results: <img width="946" height="873" alt="{5072576A-BE6C-45FD-955D-AFD25DCC5E27}" src="https://github.com/user-attachments/assets/3f846a66-98e9-4996-a851-11b85d7cd63c" />

<img width="946" height="868" alt="{4398E3F1-9D09-4AAD-909A-2C71CBFCC721}" src="https://github.com/user-attachments/assets/13670f94-6da9-4913-8f72-1b70e5d23ce3" />


* Sprint Planning Board: <img width="944" height="870" alt="{4B09225B-4B75-4F34-BF98-5BA4529B6B4A}" src="https://github.com/user-attachments/assets/dd7057ae-2af2-4fd6-82e7-77cc320a08f4" />


* GitHub Issue Generator: <img width="949" height="793" alt="{9461AC29-1994-47E4-9E34-48F94EBC9E0C}" src="https://github.com/user-attachments/assets/31041903-d613-4369-b845-24f696fa09fe" />

* Engineering Plan Output: <img width="942" height="868" alt="{D2CD60B5-45DE-40A4-9F2C-076F464B6AF3}" src="https://github.com/user-attachments/assets/ae66ea22-dda3-4934-8abb-e5d7ff124096" />


---

## Impact Scoring

Impact Score Formula:

Frequency × 0.5 + Sentiment × 0.3 + Severity × 0.2

Scores are normalized to a scale of 0–100.

Priority Assignment:

* P1 → Highest Impact Theme
* P2 → Second Highest Impact Theme
* P3 → Third Highest Impact Theme
* P4 → Remaining Lower Impact Themes

---

## Project Structure

```text
app/
├── api/
│   ├── analyze/
│   │   └── route.ts
│   └── play-store/
│       └── route.ts
├── globals.css
├── layout.tsx
└── page.tsx

components/
├── app/
└── ui/

lib/
├── analysis.ts
├── play-store.ts
├── sample-data.ts
├── types.ts
└── utils.ts
```

---

## Environment Variables

Create a `.env.local` file:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

Do not commit real API keys to GitHub.

---

## How to Run Locally

```bash
git clone <repo-url>
cd <project-folder>

npm install

npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Deployment

Add the following environment variables to your hosting provider:

```env
OPENAI_API_KEY=your_real_api_key
OPENAI_MODEL=gpt-4o-mini
```

Deploy directly from GitHub using Vercel or any compatible hosting service.

---

## Sample Workflow

1. Load the sample dataset or upload customer feedback.
2. Import Google Play Store reviews (optional).
3. Upload or paste project structure (optional).
4. Click **Analyze Feedback**.
5. Review:

   * Themes
   * Impact Scores
   * Priority Rankings
   * Sprint Plans
   * GitHub Issues
   * Engineering Recommendations

The platform converts raw customer sentiment into actionable engineering roadmaps within minutes.
