# AGENTS.md

## Stack

Next.js 16 (App Router) + React Three Fiber + OpenAI SDK. Package manager: **pnpm**. No test framework configured.

## Commands

```bash
pnpm dev          # dev server
pnpm build        # production build (only real verification available)
pnpm lint         # eslint (flat config, next/core-web-vitals + typescript)
```

No tests, no formatter, no CI. `pnpm build` is the gate.

## Environment

Copy `.env.example` → `.env.local`. Required: `OPENAI_API_KEY`. Optional: `OPENAI_MODEL` (default `gpt-4.1-mini`), `OPENAI_BASE_URL`.

## Architecture

Single-page app: AI generates a parametric house from a Portuguese natural-language prompt, rendered in 3D.

- `src/app/page.tsx` — client page (sidebar + Three.js viewport)
- `src/app/api/generate/route.ts` — POST endpoint, calls OpenAI, returns `ArchitecturalProject`
- `src/lib/schema.ts` — Zod v4 schema (`ArchitecturalProjectSchema`), the canonical data model
- `src/lib/prompt-to-project.ts` — OpenAI call + validation + deterministic fallback
- `src/lib/normalize-project.ts` — clamps AI output to valid ranges
- `src/lib/geometry-validation.ts` — room overlap detection
- `src/lib/material-system.ts` — procedural PBR material library
- `src/lib/defaults.ts` — style defaults + fallback generator
- `src/components/BuildingScene.tsx` — main Three.js scene
- `src/components/three/` — mesh primitives (doors, windows, roof, pool, terrain, vegetation)

Path alias: `@/*` → `./src/*`.

## Key constraints

- Single-story houses only (`stories: 1`, `floor: 0`)
- Rooms are axis-aligned rectangles; overlaps are validated and rejected
- "Open rooms" (varanda, deck, terrace) skip wall/overlap logic
- Internal doors suppress shared walls between adjacent rooms
- All materials are procedural PBR — no external textures
- Canvas uses `frameloop="demand"` — invalidate manually after state changes
- Wall geometry is merged for performance (single draw call)
- UI language is pt-BR
