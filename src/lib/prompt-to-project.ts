import OpenAI from "openai";
import { ArchitecturalProjectSchema, type ArchitecturalProject } from "./schema";
import { generateFallbackProject } from "./defaults";
import { normalizeRawProject } from "./normalize-project";

const SYSTEM_PROMPT = `Voce e um assistente de arquitetura parametrica.
Converta a descricao do usuario em JSON valido para um gerador arquitetonico parametrico.

Regras:
- Responda APENAS com JSON valido, sem explicacoes.
- Nao invente elementos fora do schema.
- Se faltar dado, use valores plausíveis para residencias brasileiras e preencha "assumptions".
- Dimensoes em metros.
- Pavimento terreo = floor 0.
- Posicoes x e z sao relativas ao canto inferior esquerdo do footprint.
- Nao sobreponha comodos.
- Largura e profundidade minima de comodo: 0.8m (lavabo). Quartos e salas: minimo 2.5m.
- Pe-direito minimo: 2.2m.

Schema:
{
  "buildingType": "house" | "duplex" | "townhouse",
  "stories": number (1-4),
  "style": "modern" | "colonial" | "minimal" | "contemporary",
  "lot": { "width": number (min 5), "depth": number (min 5) },
  "footprint": { "width": number (min 3), "depth": number (min 3) },
  "rooms": [
    { "name": string, "floor": number, "x": number, "z": number, "width": number (min 0.8), "depth": number (min 0.8), "height": number (min 2.2, default 2.8) }
  ],
  "openings": [
    { "type": "door"|"window", "room": string, "wall": "north"|"south"|"east"|"west", "width": number (min 0.6), "height": number (min 0.6), "elevation": number }
  ],
  "features": ["garage"|"balcony"|"pool"|"garden"|"stairs"|"terrace"],
  "roof": { "type": "flat"|"gable"|"hip", "slope": number (0-60), "overhang": number (0-2) },
  "materials": { "facade": string, "roof": string, "frames": string },
  "assumptions": [string],
  "confidence": number (0-1)
}`;

export interface GenerateResult {
  project: ArchitecturalProject;
  source: "ai" | "fallback";
  error?: string;
}

export async function promptToProject(prompt: string): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  // Fallback when no API key is configured
  if (!apiKey) {
    return {
      project: generateFallbackProject(prompt),
      source: "fallback",
      error: "OPENAI_API_KEY not configured. Using deterministic fallback.",
    };
  }

  const client = new OpenAI({ apiKey, baseURL });

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return {
        project: generateFallbackProject(prompt),
        source: "fallback",
        error: "LLM returned empty response. Using fallback.",
      };
    }

    const raw = JSON.parse(content);
    const normalized = normalizeRawProject(raw);
    const parsed = ArchitecturalProjectSchema.safeParse(normalized);

    if (!parsed.success) {
      console.error("Schema validation failed:", parsed.error);
      return {
        project: generateFallbackProject(prompt),
        source: "fallback",
        error: `Schema validation failed: ${parsed.error.message}. Using fallback.`,
      };
    }

    return { project: parsed.data, source: "ai" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI generation failed:", message);
    return {
      project: generateFallbackProject(prompt),
      source: "fallback",
      error: `AI generation failed: ${message}. Using fallback.`,
    };
  }
}
