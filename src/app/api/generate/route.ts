import { NextRequest, NextResponse } from "next/server";
import { promptToProject } from "@/lib/prompt-to-project";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = body?.prompt;

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

    const result = await promptToProject(prompt.trim());

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("API /generate error:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
