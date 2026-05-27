"use client";

import { useState } from "react";
import type { ArchitecturalProject } from "@/lib/schema";

interface ProjectEditorProps {
  project: ArchitecturalProject;
  onUpdate: (project: ArchitecturalProject) => void;
  source: "ai" | "fallback";
  error?: string;
  roofVisible: boolean;
  onToggleRoof: () => void;
}

const FEATURE_LABELS: Record<string, string> = {
  garage: "Garagem",
  balcony: "Varanda",
  pool: "Piscina",
  garden: "Jardim",
  stairs: "Escada",
  terrace: "Terraço",
};

export default function ProjectEditor({ project, onUpdate, source, error, roofVisible, onToggleRoof }: ProjectEditorProps) {
  const [showJson, setShowJson] = useState(false);

  const updateField = <K extends keyof ArchitecturalProject>(key: K, value: ArchitecturalProject[K]) => {
    onUpdate({ ...project, [key]: value });
  };

  const updateFootprint = (field: "width" | "depth", value: number) => {
    onUpdate({ ...project, footprint: { ...project.footprint, [field]: value } });
  };

  const updateLot = (field: "width" | "depth", value: number) => {
    onUpdate({ ...project, lot: { ...project.lot, [field]: value } });
  };

  const updateRoof = (field: string, value: string | number) => {
    onUpdate({ ...project, roof: { ...project.roof, [field]: value } as ArchitecturalProject["roof"] });
  };

  return (
    <div className="project-editor">
      {/* Status */}
      <div className={`status ${source}`}>
        <span>{source === "ai" ? "Gerado por IA" : "Fallback local"}</span>
        {error && <small className="error-msg">{error}</small>}
      </div>

      {/* Geral */}
      <section>
        <h3>Geral</h3>
        <div className="field">
          <label>Tipo</label>
          <select
            value={project.buildingType}
            onChange={(e) => updateField("buildingType", e.target.value as ArchitecturalProject["buildingType"])}
          >
            <option value="house">Casa</option>
            <option value="duplex">Duplex</option>
            <option value="townhouse">Sobrado geminado</option>
          </select>
        </div>
        <div className="field">
          <label>Estilo</label>
          <select
            value={project.style}
            onChange={(e) => updateField("style", e.target.value as ArchitecturalProject["style"])}
          >
            <option value="modern">Moderno</option>
            <option value="colonial">Colonial</option>
            <option value="minimal">Minimalista</option>
            <option value="contemporary">Contemporâneo</option>
          </select>
        </div>
      </section>

      {/* Dimensões */}
      <section>
        <h3>Dimensões</h3>
        <div className="field">
          <label>Lote: {project.lot.width}m x {project.lot.depth}m</label>
          <input
            type="range"
            min={8}
            max={50}
            step={0.5}
            value={project.lot.width}
            onChange={(e) => updateLot("width", parseFloat(e.target.value))}
          />
          <input
            type="range"
            min={15}
            max={80}
            step={0.5}
            value={project.lot.depth}
            onChange={(e) => updateLot("depth", parseFloat(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Projeção: {project.footprint.width}m x {project.footprint.depth}m</label>
          <input
            type="range"
            min={5}
            max={40}
            step={0.5}
            value={project.footprint.width}
            onChange={(e) => updateFootprint("width", parseFloat(e.target.value))}
          />
          <input
            type="range"
            min={5}
            max={40}
            step={0.5}
            value={project.footprint.depth}
            onChange={(e) => updateFootprint("depth", parseFloat(e.target.value))}
          />
        </div>
      </section>

      {/* Cobertura */}
      <section>
        <h3>Cobertura</h3>
        <div className="field">
          <label>Tipo</label>
          <select value={project.roof.type} onChange={(e) => updateRoof("type", e.target.value)}>
            <option value="flat">Plana</option>
            <option value="gable">Duas águas</option>
            <option value="hip">Quatro águas</option>
          </select>
        </div>
        <div className="field">
          <label>Inclinação: {project.roof.slope}°</label>
          <input
            type="range"
            min={0}
            max={45}
            step={1}
            value={project.roof.slope}
            onChange={(e) => updateRoof("slope", parseFloat(e.target.value))}
          />
        </div>
        <button className="toggle-roof-btn" onClick={onToggleRoof}>
          {roofVisible ? "Ocultar Telhado" : "Mostrar Telhado"}
        </button>
      </section>

      {/* Cômodos */}
      <section>
        <h3>Cômodos ({project.rooms.length})</h3>
        <ul className="rooms-list">
          {project.rooms.map((room, i) => (
            <li key={i}>
              <strong>{room.name}</strong> — {room.width}x{room.depth}m
            </li>
          ))}
        </ul>
      </section>

      {/* Características */}
      {project.features.length > 0 && (
        <section>
          <h3>Características</h3>
          <div className="tags">
            {project.features.map((f) => (
              <span key={f} className="tag">{FEATURE_LABELS[f] || f}</span>
            ))}
          </div>
        </section>
      )}

      {/* Premissas */}
      {project.assumptions.length > 0 && (
        <section>
          <h3>Premissas</h3>
          <ul className="assumptions">
            {project.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      {/* JSON viewer */}
      <section>
        <button className="toggle-json" onClick={() => setShowJson(!showJson)}>
          {showJson ? "Ocultar JSON" : "Ver JSON"}
        </button>
        {showJson && (
          <pre className="json-viewer">{JSON.stringify(project, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}
