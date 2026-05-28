"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import PromptForm from "@/components/PromptForm";
import ProjectEditor from "@/components/ProjectEditor";
import ToastContainer, { useToast } from "@/components/Toast";
import type { ArchitecturalProject } from "@/lib/schema";
import { findOverlappingRooms } from "@/lib/geometry-validation";

type StreamingPhase = "idle" | "thinking" | "generating" | "done";

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

function getGeometryError(project: ArchitecturalProject): string | undefined {
  const overlaps = findOverlappingRooms(project);
  if (overlaps.length === 0) return undefined;
  return `Projeto com comodos sobrepostos: ${overlaps.join(", ")}`;
}

function getInitialState(): SavedState | null {
  const saved = loadFromStorage();
  if (!saved) return null;

  if (getGeometryError(saved.project)) {
    clearStorage();
    return null;
  }

  return saved;
}

export default function Home() {
  const [project, setProject] = useState<ArchitecturalProject | null>(null);
  const [source, setSource] = useState<"ai" | "fallback">("fallback");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [roofVisible, setRoofVisible] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<StreamingPhase>("idle");
  const [retryCount, setRetryCount] = useState(0);
  const toast = useToast();

  // Load from localStorage after hydration (client-only)
  useEffect(() => {
    const saved = getInitialState();
    if (saved) {
      setProject(saved.project);
      setSource(saved.source);
      setError(saved.error);
    }
    setHydrated(true);
  }, []);

  // Save to localStorage whenever project changes (skip first render)
  useEffect(() => {
    if (!hydrated) return;
    if (project) {
      saveToStorage(project, source, error);
    }
  }, [project, source, error, hydrated]);

  const handleGenerate = async (prompt: string) => {
    setIsLoading(true);
    setError(undefined);
    setStreamingPhase("idle");
    setRetryCount(0);

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

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // SSE streaming response
        setStreamingPhase("thinking");
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse complete SSE events from buffer
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // keep incomplete chunk

          for (const block of lines) {
            if (!block.trim()) continue;
            const eventMatch = block.match(/^event:\s*(.+)$/m);
            const dataMatch = block.match(/^data:\s*(.+)$/m);
            if (!eventMatch || !dataMatch) continue;

            const eventType = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            switch (eventType) {
              case "thinking":
                setStreamingPhase("thinking");
                // Detect retry messages from server
                if (data.content.includes("Tentativa")) {
                  setRetryCount((prev) => prev + 1);
                }
                break;
              case "content":
                setStreamingPhase("generating");
                break;
              case "result": {
                const geometryError = getGeometryError(data.project);
                if (geometryError) {
                  throw new Error(geometryError);
                }
                setProject(data.project);
                setSource(data.source);
                if (data.error) {
                  toast.show(data.error, "warning");
                }
                setError(data.error);
                setStreamingPhase("done");
                break;
              }
              case "error":
                toast.show(data.error, "error");
                setError(data.error);
                break;
            }
          }
        }
      } else {
        // Plain JSON response (fallback mode)
        const data: GenerateResult = await res.json();
        const geometryError = getGeometryError(data.project);
        if (geometryError) {
          throw new Error(geometryError);
        }
        setProject(data.project);
        setSource(data.source);
        setError(data.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.show(msg, "error");
      setError(msg);
      setStreamingPhase("done");
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
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Sidebar */}
      <aside className="sidebar">
        <h1 className="app-title">Civil 3D</h1>
        <p className="app-subtitle">Gerador Paramétrico de Edificações</p>

        <PromptForm onGenerate={handleGenerate} isLoading={isLoading} />

        {isLoading && (
          <div className="generation-status">
            <span className="generation-status__dot" />
            <span className="generation-status__text">
              {streamingPhase === "thinking" && "Analisando prompt..."}
              {streamingPhase === "generating" && (
                retryCount > 0
                  ? `Corrigindo layout (tentativa ${retryCount + 1})...`
                  : "Gerando projeto..."
              )}
              {streamingPhase === "idle" && "Conectando..."}
            </span>
          </div>
        )}

        {project && (
          <>
            <ProjectEditor
              project={project}
              onUpdate={handleUpdate}
              source={source}
              error={error}
              roofVisible={roofVisible}
              onToggleRoof={() => setRoofVisible((v) => !v)}
            />
            <button className="delete-btn" onClick={handleDelete}>
              Excluir Projeto
            </button>
          </>
        )}
      </aside>

      {/* 3D Viewport */}
      <main className="viewport">
        <BuildingScene project={project} roofVisible={roofVisible} />
      </main>
    </div>
  );
}
