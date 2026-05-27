/**
 * Sistema de materiais PBR sem texturas externas.
 * Define propriedades fisicamente corretas (roughness, metalness, color)
 * para cada material nomeado no schema.
 */

export interface PBRMaterialDef {
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  transparent?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
}

/**
 * Mapa de materiais nomeados → propriedades PBR.
 * Nomes correspondem aos valores de materials.facade, materials.roof, materials.frames, etc.
 */
export const MATERIAL_LIBRARY: Record<string, PBRMaterialDef> = {
  // --- Fachadas ---
  concrete_white: { color: "#f0f0f0", roughness: 0.85, metalness: 0 },
  concrete_gray: { color: "#8a8a8a", roughness: 0.9, metalness: 0 },
  concrete_raw: { color: "#b0a89a", roughness: 0.95, metalness: 0 },
  plaster_beige: { color: "#f2e6d4", roughness: 0.8, metalness: 0 },
  plaster_white: { color: "#f8f6f4", roughness: 0.75, metalness: 0 },
  stucco_white: { color: "#fafafa", roughness: 0.7, metalness: 0 },
  brick_red: { color: "#8b4513", roughness: 0.92, metalness: 0 },
  wood_brown: { color: "#6d4c2a", roughness: 0.7, metalness: 0 },
  wood_dark: { color: "#3e2723", roughness: 0.65, metalness: 0 },
  wood_light: { color: "#a1887f", roughness: 0.6, metalness: 0 },

  // --- Coberturas ---
  clay_tile: { color: "#a0522d", roughness: 0.85, metalness: 0 },
  metal_dark: { color: "#37474f", roughness: 0.4, metalness: 0.7 },
  metal_sheet: { color: "#546e7a", roughness: 0.35, metalness: 0.75 },

  // --- Esquadrias ---
  aluminum_black: { color: "#1a1a1a", roughness: 0.3, metalness: 0.9 },
  aluminum_gray: { color: "#616161", roughness: 0.35, metalness: 0.85 },
  aluminum_white: { color: "#e0e0e0", roughness: 0.3, metalness: 0.85 },

  // --- Pisos ---
  porcelain_gray: { color: "#d4d4d4", roughness: 0.25, metalness: 0 },
  porcelain_white: { color: "#ececec", roughness: 0.2, metalness: 0 },
  porcelain_dark: { color: "#4a4a4a", roughness: 0.2, metalness: 0 },
  wood_floor: { color: "#8d6e53", roughness: 0.55, metalness: 0 },
  wood_floor_light: { color: "#bcaaa4", roughness: 0.5, metalness: 0 },
  ceramic_white: { color: "#fafafa", roughness: 0.3, metalness: 0 },
  cement_burned: { color: "#9e9e9e", roughness: 0.6, metalness: 0 },

  // --- Terreno ---
  grass: { color: "#4a7c3f", roughness: 0.95, metalness: 0 },
  sidewalk: { color: "#c0b8a8", roughness: 0.85, metalness: 0 },
  paver_gray: { color: "#9e9a94", roughness: 0.8, metalness: 0 },
  block_gray: { color: "#7a7a7a", roughness: 0.9, metalness: 0 },

  // --- Agua ---
  water: { color: "#006994", roughness: 0.05, metalness: 0.1, opacity: 0.7, transparent: true },
  pool_tile: { color: "#4fc3f7", roughness: 0.3, metalness: 0 },
  pool_border: { color: "#e0dcd6", roughness: 0.4, metalness: 0 },

  // --- Vidro ---
  glass_clear: { color: "#e3f2fd", roughness: 0.05, metalness: 0.1, opacity: 0.3, transparent: true },
  glass_tinted: { color: "#90a4ae", roughness: 0.05, metalness: 0.1, opacity: 0.5, transparent: true },

  // --- Porta ---
  door_wood: { color: "#5d4037", roughness: 0.6, metalness: 0 },
  door_white: { color: "#f5f5f5", roughness: 0.5, metalness: 0 },

  // --- Fallbacks ---
  default: { color: "#e0e0e0", roughness: 0.7, metalness: 0 },
};

/**
 * Retorna as propriedades PBR para um material nomeado.
 * Se nao encontrar, retorna 'default'.
 */
export function getMaterial(name: string): PBRMaterialDef {
  // Try exact match
  if (MATERIAL_LIBRARY[name]) return MATERIAL_LIBRARY[name];

  // Try lowercase normalized
  const normalized = name.toLowerCase().replace(/[\s-]+/g, "_");
  if (MATERIAL_LIBRARY[normalized]) return MATERIAL_LIBRARY[normalized];

  // Try partial match
  const keys = Object.keys(MATERIAL_LIBRARY);
  const partial = keys.find((k) => normalized.includes(k) || k.includes(normalized));
  if (partial) return MATERIAL_LIBRARY[partial];

  return MATERIAL_LIBRARY.default;
}

/**
 * Retorna cor hexadecimal de um material (atalho).
 */
export function getMaterialColor(name: string): string {
  return getMaterial(name).color;
}
