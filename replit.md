# Academic Writing Evaluator

## Overview

This is an AI-powered academic writing evaluation tool that helps researchers, PhD students, and graduate students improve their scholarly writing. Users paste text from their academic papers, select the section type (title, abstract, introduction, methodology, etc.), and receive scored evaluations against section-specific criteria along with actionable suggestions for improvement.

## Key Features

- **AI-Powered Evaluation**: Scores text against section-specific criteria with weighted scoring (1-10 scale) using GPT-5.2
- **Publication Grouping**: Create named publications (e.g., "Digital Twins Paper") to organize evaluations; AI maintains full memory of ALL text submitted for each publication (sends past TEXT only, not past AI feedback to avoid bias loops)
- **Inline Rewriting**: Automatic suggestions with visual diff display and before/after score comparison
- **Criteria Score Comparison**: After rewriting, shows per-criterion score improvements like "Clarity: 5.2 → 7.8 (+2.6)" alongside readability comparison
- **Deterministic Readability Analysis**: Flesch score with detailed interpretation (color-coded for accessibility levels), sentence length, passive voice detection, and long sentence flagging with critical/warning severity
- **Emphasis Suggestions**: Toggle-controlled feature for AI to generate ways to amplify importance of existing claims
- **Research History**: All evaluations are automatically saved for authenticated users, grouped by publication
- **Context-Aware Feedback**: AI references past text submissions to identify patterns and improvements
- **History Dashboard**: View stats, trends, and browse past evaluations grouped by publication at `/history`

## Technical Notes

- **Model Consistency**: Both evaluation and rewrite use GPT-5.2 for consistent "taste"
- **Readability-Grounded Scoring**: Objective readability metrics are passed into AI evaluation prompts with explicit targets (Flesch 40-60, sentence length ≤18 words, passive ≤20%)
- **Content Integrity**: AI rewriting is constrained to NEVER add citations, numbers, data, or claims not in original text
- **Flesch Score Calculation**: Uses the `syllable` npm library for accurate syllable counting
- **Flesch Score Interpretation**: >50 = Accessible to broader audience, 30-50 = Standard academic, 20-30 = Dense/specialist only, <20 = Very difficult (note: dense academic text with multi-syllable words can legitimately score 0-20)
- **Sentence Flagging**: >35 words = critical severity (red), >25 words = warning severity (yellow)
- **Few-Shot Examples**: AI prompts include high-quality writing examples from the `writing_examples` database table, selected by discipline and section type

## Granular Section Types

### Conclusion Variants
- **Conclusion (General)**: Evaluates all aspects including limitations and future research
- **Conclusion (with Limitations & Future Research)**: Emphasizes evaluation of limitations and future directions
- **Conclusion (without Limitations/Future Research)**: Does NOT penalize for missing limitations/future work - use when these are in a separate section
- **Limitations & Future Research (Standalone)**: Standalone section evaluated specifically on limitation specificity, honesty, and future research concreteness

### Disciplines Supported for Examples
- Engineering, Medicine, Social Sciences, Business & Management, Information Systems, Natural Sciences, Humanities, Law, Education

## User Preferences

Preferred communication style: Simple, everyday language.

## Future Vision

- Transition to "Agentic Director" model with specialized sub-agents (Literature Review, Tone/Style, Data Visualization)
- Build research memory system that can cross-reference across papers
- Create proprietary research history data that acts as a long-term thinking partner

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens defined in CSS variables
- **Design System**: Productivity-focused design inspired by Grammarly/Notion with Inter for UI elements and Source Serif Pro for content

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Pattern**: REST API with JSON request/response format
- **Build Process**: esbuild for server bundling, Vite for client bundling
- **Development**: tsx for TypeScript execution in development mode

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for shared type definitions between client and server
- **Database Models**: Located in `shared/models/` directory (e.g., chat.ts for conversations/messages)
- **Validation**: Zod schemas for runtime validation, drizzle-zod for schema-to-validation integration

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations)
- **Evaluation Flow**: Text is sent to OpenAI with section-specific prompts, returns JSON with criterion scores and suggestions
- **Scoring System**: 1-10 scale with weighted criteria per section type

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── pages/           # Route pages
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities and query client
├── server/              # Express backend
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Data storage abstraction
│   └── replit_integrations/  # AI integration utilities
├── shared/              # Shared types and schemas
│   ├── schema.ts        # Main schema definitions
│   └── models/          # Database models
└── migrations/          # Drizzle database migrations
```

## External Dependencies

### AI Services
- **OpenAI API**: Primary AI provider for text evaluation, accessed via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage for Express (available but may not be actively used)

### Key NPM Packages
- **@tanstack/react-query**: Data fetching and caching
- **drizzle-orm / drizzle-kit**: Database ORM and migrations
- **zod**: Runtime type validation
- **openai**: OpenAI API client
- **wouter**: Client-side routing
- **Radix UI**: Accessible UI primitives (extensive set of components)
- **tailwindcss**: Utility-first CSS framework