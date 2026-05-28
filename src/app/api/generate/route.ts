import { NextRequest, NextResponse } from "next/server";
import { promptToProjectStream } from "@/lib/prompt-to-project";
import { generateFallbackProject } from "@/lib/defaults";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = body?.prompt;
    const forceFallback = new URL(request.url).searchParams.get("fallback") === "1";

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Campo 'prompt' e obrigatorio e deve ser uma string nao vazia." },
        { status: 400 }
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Prompt muito longo. Maximo de 2000 caracteres." },
        { status: 400 }
      );
    }

    // Fallback: return plain JSON (no streaming)
    if (forceFallback) {
      const result = {
        project: generateFallbackProject(prompt.trim()),
        source: "fallback" as const,
        error: "Fallback forcado por query string.",
      };
      return NextResponse.json(result, { status: 200 });
    }

    // Streaming SSE response
    const encoder = new TextEncoder();
    const trimmedPrompt = prompt.trim();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of promptToProjectStream(trimmedPrompt)) {
            const line = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
            controller.enqueue(encoder.encode(line));
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro interno";
          const errorLine = `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`;
          controller.enqueue(encoder.encode(errorLine));

          // Still send a fallback result so the client has something to render
          const fallbackResult = {
            project: generateFallbackProject(trimmedPrompt),
            source: "fallback" as const,
            error: `Erro no stream: ${message}. Usando fallback.`,
          };
          const resultLine = `event: result\ndata: ${JSON.stringify(fallbackResult)}\n\n`;
          controller.enqueue(encoder.encode(resultLine));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("API /generate error:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
