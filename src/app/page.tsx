"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import PromptForm from "@/components/PromptForm";
import ProjectEditor from "@/components/ProjectEditor";
import type { ArchitecturalProject } from "@/lib/schema";

const STORAGE_KEY = "civil3d_project";

// Dynamic import to avoid SSR issues with Three.js
const BuildingScene = dynamic(() => import("@/components/BuildingScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Carregando cena 3D...</div>,
});

interface GenerateResult {
  project: ArchitecturalProject;
  source: "ai" | "fallback";
  error?: string;
}

interface SavedState {
  project: ArchitecturalProject;
  source: "ai" | "fallback";
  error?: string;
  savedAt: string;
}

function loadFromStorage(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch {
    return null;
  }
}

function saveToStorage(project: ArchitecturalProject, source: "ai" | "fallback", error?: string) {
  if (typeof window === "undefined") return;
  const state: SavedState = { project, source, error, savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export default function Home() {
  const [project, setProject] = useState<ArchitecturalProject | null>(null);
  const [source, setSource] = useState<"ai" | "fallback">("fallback");
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setProject(saved.project);
      setSource(saved.source);
      setError(saved.error);
    }
  }, []);

  // Save to localStorage whenever project changes
  useEffect(() => {
    if (project) {
      saveToStorage(project, source, error);
    }
  }, [project, source, error]);

  const handleGenerate = async (prompt: string) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data: GenerateResult = await res.json();
      setProject(data.project);
      setSource(data.source);
      setError(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = useCallback((updated: ArchitecturalProject) => {
    setProject(updated);
  }, []);

  const handleDelete = () => {
    setProject(null);
    setSource("fallback");
    setError(undefined);
    clearStorage();
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h1 className="app-title">Civil 3D</h1>
        <p className="app-subtitle">Gerador Parametrico de Edificacoes</p>

        <PromptForm onGenerate={handleGenerate} isLoading={isLoading} />

        {project && (
          <>
            <ProjectEditor
              project={project}
              onUpdate={handleUpdate}
              source={source}
              error={error}
            />
            <button className="delete-btn" onClick={handleDelete}>
              Excluir Projeto
            </button>
          </>
        )}
      </aside>

      {/* 3D Viewport */}
      <main className="viewport">
        <BuildingScene project={project} />
      </main>
    </div>
  );
}
