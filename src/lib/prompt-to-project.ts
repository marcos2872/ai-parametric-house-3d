import OpenAI from "openai";
import { ArchitecturalProjectSchema, type ArchitecturalProject } from "./schema";
import { generateFallbackProject } from "./defaults";
import { normalizeRawProject } from "./normalize-project";
import { findOverlappingRooms } from "./geometry-validation";

function parseRequestedBedroomCount(prompt: string): number | undefined {
  const numeric = prompt.match(/(\d+)\s*(quartos?|bedrooms?|beds?)/i);
  if (numeric) return Number(numeric[1]);

  const wordCounts: Record<string, number> = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
  };

  const word = prompt.match(/\b(um|uma|dois|duas|tres|três|quatro|cinco)\s+quartos?\b/i);
  return word ? wordCounts[word[1].toLowerCase()] : undefined;
}

function findRequirementErrors(prompt: string, project: ArchitecturalProject): string[] {
  const errors: string[] = [];
  const requestedBedrooms = parseRequestedBedroomCount(prompt);
  const requestedSuite = /\bsu[ií]te|\bsuite\b/i.test(prompt);

  if (requestedBedrooms) {
    const regularBedrooms = project.rooms.filter((room) => {
      const name = room.name.toLowerCase();
      return /(quarto|bedroom)/.test(name) && !/(banheiro|bath|suite)/.test(name);
    }).length;

    if (regularBedrooms < requestedBedrooms) {
      errors.push(`quartos comuns insuficientes: solicitado ${requestedBedrooms}, gerado ${regularBedrooms}`);
    }
  }

  if (requestedSuite) {
    const suites = project.rooms.filter((room) => {
      const name = room.name.toLowerCase();
      return /suite|su[ií]te/.test(name) && !/(banheiro|bath)/.test(name);
    }).length;

    if (suites < 1) {
      errors.push("suite solicitada, mas nao gerada");
    }
  }

  return errors;
}

const SYSTEM_PROMPT = `Voce e um assistente de arquitetura parametrica.
Converta a descricao do usuario em JSON valido para um gerador arquitetonico parametrico.

Regras:
- Responda APENAS com JSON valido, sem explicacoes.
- Nao invente elementos fora do schema.
- Se faltar dado, use valores plausíveis para residencias brasileiras e preencha "assumptions".
- Dimensoes em metros.
- SEMPRE gere casas TERREAS (1 pavimento). stories = 1. floor = 0 para todos os comodos.
- Posicoes x e z sao relativas ao canto inferior esquerdo do footprint.
- Nao sobreponha comodos.
- NUNCA permita intersecao de area entre comodos fechados: para cada par, os retangulos x/z nao podem se cruzar em area positiva.
- Comodos podem compartilhar borda, mas nao podem invadir a area interna um do outro.
- Corredores devem encostar nos quartos/banheiros, sem passar por dentro deles.
- Varanda, terraco, patio e deck sao areas abertas: use como piso/area externa, nao como caixa fechada com quatro paredes.
- Largura e profundidade minima de comodo: 0.8m (lavabo). Quartos e salas: minimo 2.5m.
- Pe-direito minimo: 2.2m.
- Quando houver piscina, inclua o campo "pool" com posicao fora do footprint.
- Inclua vegetacao (arvores, arbustos, palmeiras) no jardim quando apropriado.
- Inclua "fence" para muro perimetral (padrao residencial brasileiro).
- PORTAS INTERNAS: entre comodos adjacentes que compartilham parede, adicione aberturas com "internal": true.
  Exemplo: sala e cozinha compartilham parede → adicione porta interna na sala (wall que toca a cozinha).
  O sistema suprime automaticamente a parede do comodo vizinho. Apenas declare a porta no comodo "de origem".
  Toda residencia deve ter portas internas conectando os ambientes (corredor/sala → quartos, sala → cozinha, etc).

Schema:
{
  "buildingType": "house" | "duplex" | "townhouse",
  "stories": 1,
  "style": "modern" | "colonial" | "minimal" | "contemporary",
  "lot": { "width": number (min 5), "depth": number (min 5) },
  "footprint": { "width": number (min 3), "depth": number (min 3) },
  "rooms": [
    {
      "name": string, "floor": 0, "x": number, "z": number,
      "width": number (min 0.8), "depth": number (min 0.8), "height": number (min 2.2, default 2.8),
      "floorMaterial": string (opcional: "porcelain_gray"|"porcelain_white"|"wood_floor"|"cement_burned"|"ceramic_white"),
      "wallColor": string (opcional, hex color)
    }
  ],
  "openings": [
    {
      "type": "door"|"window", "room": string, "wall": "north"|"south"|"east"|"west",
      "width": number (min 0.6), "height": number (min 0.6), "elevation": number,
      "subtype": "fixed"|"sliding"|"pivot"|"double"|"garage" (opcional),
      "internal": boolean (opcional, true para portas entre comodos internos)
    }
  ],
  "features": ["garage"|"balcony"|"pool"|"garden"|"stairs"|"terrace"],
  "roof": { "type": "flat"|"gable"|"hip", "slope": number (0-60), "overhang": number (0-2) },
  "materials": { "facade": string, "roof": string, "frames": string },
  "pool": { "width": number (2-15), "depth": number (3-20), "x": number, "z": number } (opcional, inclua quando "pool" estiver em features),
  "vegetation": [{ "type": "tree"|"bush"|"palm", "x": number, "z": number, "scale": number (0.3-3) }] (posicione no jardim/recuos),
  "fence": { "height": number (0.5-4, padrao 1.8), "material": "block_gray"|"brick_red"|"plaster_white" } (opcional),
  "assumptions": [string],
  "confidence": number (0-1)
}`;

export interface GenerateResult {
  project: ArchitecturalProject;
  source: "ai" | "fallback";
  error?: string;
}

export type SSEEvent =
  | { event: "thinking"; data: { content: string } }
  | { event: "content"; data: { content: string } }
  | { event: "result"; data: GenerateResult }
  | { event: "error"; data: { error: string } };

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

  const client = new OpenAI({ apiKey, baseURL, timeout: 60_000 });

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

    const overlaps = findOverlappingRooms(parsed.data);
    if (overlaps.length > 0) {
      console.error("Room overlap validation failed:", overlaps);
      return {
        project: generateFallbackProject(prompt),
        source: "fallback",
        error: `IA gerou comodos sobrepostos (${overlaps.join(", ")}). Usando fallback.`,
      };
    }

    const requirementErrors = findRequirementErrors(prompt, parsed.data);
    if (requirementErrors.length > 0) {
      console.error("Requirement validation failed:", requirementErrors);
      return {
        project: generateFallbackProject(prompt),
        source: "fallback",
        error: `IA nao cumpriu requisitos (${requirementErrors.join(", ")}). Usando fallback.`,
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

const MAX_RETRIES = 3;

const CORRECTION_PROMPT = (errors: string[], json: string) =>
  `O JSON que voce gerou tem comodos sobrepostos. Corrija APENAS as posicoes (x, z) e dimensoes (width, depth) para eliminar as sobreposicoes sem mudar a lista de comodos.

Erros detectados:
${errors.map((e) => `- ${e}`).join("\n")}

JSON original:
${json}

Responda APENAS com o JSON corrigido, mantendo todos os comodos e a mesma estrutura.`;

interface StreamCallOptions {
  apiKey: string;
  model: string;
  baseURL: string;
  messages: Array<{ role: string; content: string }>;
}

async function* streamCall(
  opts: StreamCallOptions
): AsyncGenerator<{ type: "thinking" | "content"; text: string } | { type: "done"; content: string }> {
  const response = await fetch(`${opts.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (trimmed === "data: [DONE]") continue;

      if (trimmed.startsWith("data: ")) {
        const jsonStr = trimmed.slice(6);
        try {
          const chunk = JSON.parse(jsonStr);
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          // Capture reasoning/thinking fields (various provider naming conventions)
          const thinking = delta.reasoning_content ?? delta.reasoning ?? delta.thinking_content ?? delta.thinking;
          if (thinking) {
            yield { type: "thinking", text: thinking };
          }

          // Standard content field
          if (delta.content) {
            content += delta.content;
            yield { type: "content", text: delta.content };
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }

  yield { type: "done", content };
}

export async function* promptToProjectStream(prompt: string): AsyncGenerator<SSEEvent> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const baseURL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  if (!apiKey) {
    yield {
      event: "result",
      data: {
        project: generateFallbackProject(prompt),
        source: "fallback",
        error: "OPENAI_API_KEY not configured. Using deterministic fallback.",
      },
    };
    return;
  }

  try {
    let messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];
    let lastContent = "";
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      attempt++;
      let content = "";

      if (attempt > 1) {
        yield { event: "thinking", data: { content: `\n--- Tentativa ${attempt}/${MAX_RETRIES + 1}: corrigindo sobreposições ---\n` } };
      }

      for await (const chunk of streamCall({ apiKey, model, baseURL, messages })) {
        if (chunk.type === "thinking") {
          yield { event: "thinking", data: { content: chunk.text } };
        } else if (chunk.type === "content") {
          yield { event: "content", data: { content: chunk.text } };
        } else if (chunk.type === "done") {
          content = chunk.content;
        }
      }

      if (!content) {
        yield {
          event: "result",
          data: {
            project: generateFallbackProject(prompt),
            source: "fallback",
            error: "LLM returned empty response. Using fallback.",
          },
        };
        return;
      }

      lastContent = content;

      const raw = JSON.parse(content);
      const normalized = normalizeRawProject(raw);
      const parsed = ArchitecturalProjectSchema.safeParse(normalized);

      if (!parsed.success) {
        console.error(`[Attempt ${attempt}] Schema validation failed:`, parsed.error);
        if (attempt > MAX_RETRIES) {
          yield {
            event: "result",
            data: {
              project: generateFallbackProject(prompt),
              source: "fallback",
              error: `Schema validation failed after ${attempt} attempts. Using fallback.`,
            },
          };
          return;
        }
        // Retry with correction
        messages = [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
          { role: "assistant", content },
          { role: "user", content: `O JSON gerado e invalido. Corrija e responda apenas com JSON valido.` },
        ];
        continue;
      }

      const overlaps = findOverlappingRooms(parsed.data);
      if (overlaps.length > 0) {
        console.error(`[Attempt ${attempt}] Room overlap:`, overlaps);
        if (attempt > MAX_RETRIES) {
          yield {
            event: "result",
            data: {
              project: generateFallbackProject(prompt),
              source: "fallback",
              error: `IA gerou comodos sobrepostos apos ${attempt} tentativas (${overlaps.join(", ")}). Usando fallback.`,
            },
          };
          return;
        }
        // Retry: send the JSON back with overlap errors
        messages = [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
          { role: "assistant", content },
          { role: "user", content: CORRECTION_PROMPT(overlaps, lastContent) },
        ];
        continue;
      }

      const requirementErrors = findRequirementErrors(prompt, parsed.data);
      if (requirementErrors.length > 0) {
        console.error(`[Attempt ${attempt}] Requirements:`, requirementErrors);
        if (attempt > MAX_RETRIES) {
          yield {
            event: "result",
            data: {
              project: generateFallbackProject(prompt),
              source: "fallback",
              error: `IA nao cumpriu requisitos apos ${attempt} tentativas (${requirementErrors.join(", ")}). Usando fallback.`,
            },
          };
          return;
        }
        messages = [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
          { role: "assistant", content },
          { role: "user", content: `O projeto nao cumpriu estes requisitos: ${requirementErrors.join(", ")}. Corrija e responda apenas com JSON valido.` },
        ];
        continue;
      }

      // Success!
      yield { event: "result", data: { project: parsed.data, source: "ai" } };
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI stream generation failed:", message);
    yield {
      event: "error",
      data: { error: `AI generation failed: ${message}. Using fallback.` },
    };
    yield {
      event: "result",
      data: {
        project: generateFallbackProject(prompt),
        source: "fallback",
        error: `AI generation failed: ${message}. Using fallback.`,
      },
    };
  }
}
