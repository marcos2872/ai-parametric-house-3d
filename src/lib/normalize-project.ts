/**
 * Normaliza o JSON cru vindo da IA antes de validar com Zod.
 * Ajusta valores fora de range para os limites aceitaveis,
 * garantindo que pequenas imprecisoes do modelo nao quebrem a validacao.
 */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeRawProject(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  // Normalize lot
  if (raw.lot) {
    raw.lot.width = clamp(Number(raw.lot.width) || 10, 5, 100);
    raw.lot.depth = clamp(Number(raw.lot.depth) || 25, 5, 200);
  }

  // Normalize footprint
  if (raw.footprint) {
    raw.footprint.width = clamp(Number(raw.footprint.width) || 8, 3, 80);
    raw.footprint.depth = clamp(Number(raw.footprint.depth) || 12, 3, 80);
  }

  // Normalize stories
  if (raw.stories != null) {
    raw.stories = clamp(Math.round(Number(raw.stories) || 1), 1, 4);
  }

  // Normalize rooms
  if (Array.isArray(raw.rooms)) {
    raw.rooms = raw.rooms.map((room: Record<string, unknown>) => ({
      ...room,
      floor: Math.max(0, Math.round(Number(room.floor) || 0)),
      x: Number(room.x) || 0,
      z: Number(room.z) || 0,
      width: clamp(Number(room.width) || 3, 0.8, 20),
      depth: clamp(Number(room.depth) || 3, 0.8, 20),
      height: clamp(Number(room.height) || 2.8, 2.2, 6),
    }));
  }

  // Normalize openings
  if (Array.isArray(raw.openings)) {
    raw.openings = raw.openings.map((op: Record<string, unknown>) => ({
      ...op,
      width: clamp(Number(op.width) || 1, 0.6, 6),
      height: clamp(Number(op.height) || 1.2, 0.6, 4),
      elevation: Math.max(0, Number(op.elevation) || 0),
    }));
  }

  // Normalize roof
  if (raw.roof) {
    raw.roof.slope = clamp(Number(raw.roof.slope) || 0, 0, 60);
    raw.roof.overhang = clamp(Number(raw.roof.overhang) || 0.3, 0, 2);
  }

  // Normalize confidence
  if (raw.confidence != null) {
    raw.confidence = clamp(Number(raw.confidence) || 0.8, 0, 1);
  }

  // Ensure arrays
  if (!Array.isArray(raw.features)) raw.features = [];
  if (!Array.isArray(raw.openings)) raw.openings = [];
  if (!Array.isArray(raw.assumptions)) raw.assumptions = [];

  return raw;
}
