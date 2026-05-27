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

  // Normalize stories — always single story
  raw.stories = 1;

  // Normalize rooms
  if (Array.isArray(raw.rooms)) {
    raw.rooms = raw.rooms.map((room: Record<string, unknown>) => ({
      ...room,
      floor: 0,  // always ground floor
      x: Number(room.x) || 0,
      z: Number(room.z) || 0,
      width: clamp(Number(room.width) || 3, 0.8, 20),
      depth: clamp(Number(room.depth) || 3, 0.8, 20),
      height: clamp(Number(room.height) || 2.8, 2.2, 6),
      // Preserve optional fields
      ...(room.floorMaterial && typeof room.floorMaterial === "string" ? { floorMaterial: room.floorMaterial } : {}),
      ...(room.wallColor && typeof room.wallColor === "string" ? { wallColor: room.wallColor } : {}),
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

  // Normalize pool
  if (raw.pool && typeof raw.pool === "object") {
    raw.pool.width = clamp(Number(raw.pool.width) || 4, 2, 15);
    raw.pool.depth = clamp(Number(raw.pool.depth) || 8, 3, 20);
    raw.pool.x = Number(raw.pool.x) || 0;
    raw.pool.z = Number(raw.pool.z) || 0;
  }

  // Normalize vegetation
  if (Array.isArray(raw.vegetation)) {
    raw.vegetation = raw.vegetation.map((v: Record<string, unknown>) => ({
      type: ["tree", "bush", "palm"].includes(v.type as string) ? v.type : "tree",
      x: Number(v.x) || 0,
      z: Number(v.z) || 0,
      scale: clamp(Number(v.scale) || 1, 0.3, 3),
    }));
  } else {
    raw.vegetation = [];
  }

  // Normalize fence
  if (raw.fence && typeof raw.fence === "object") {
    raw.fence.height = clamp(Number(raw.fence.height) || 1.8, 0.5, 4);
    if (!raw.fence.material || typeof raw.fence.material !== "string") {
      raw.fence.material = "block_gray";
    }
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
