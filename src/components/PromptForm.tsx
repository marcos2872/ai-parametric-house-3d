"use client";

import { useState } from "react";

interface PromptFormProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

export default function PromptForm({ onGenerate, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  const examples = [
    "Casa moderna com garagem, 3 quartos e varanda",
    "Casa térrea minimalista com 2 quartos e jardim",
    "Casa colonial com 4 quartos e piscina",
  ];

  return (
    <form onSubmit={handleSubmit} className="prompt-form">
      <label htmlFor="prompt-input">Descreva a edificação:</label>
      <textarea
        id="prompt-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ex: casa moderna com garagem, 3 quartos e varanda"
        rows={3}
        maxLength={2000}
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading || !prompt.trim()}>
        {isLoading ? "Gerando..." : "Gerar Projeto"}
      </button>

      <div className="examples">
        <span>Exemplos:</span>
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            className="example-btn"
            onClick={() => setPrompt(ex)}
            disabled={isLoading}
          >
            {ex}
          </button>
        ))}
      </div>
    </form>
  );
}
