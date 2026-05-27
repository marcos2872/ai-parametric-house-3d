import type { ArchitecturalProject } from "./schema";

/**
 * Heuristicas por estilo de construcao.
 * Quando a IA nao especifica um valor, o sistema preenche
 * com defaults coerentes baseados no estilo.
 */

export interface StyleDefaults {
  roof: { type: "flat" | "gable" | "hip"; slope: number; overhang: number };
  materials: { facade: string; roof: string; frames: string };
  floorHeight: number;
  glassRatio: number;
}

export const STYLE_DEFAULTS: Record<string, StyleDefaults> = {
  modern: {
    roof: { type: "flat", slope: 0, overhang: 0.3 },
    materials: {
      facade: "concrete_white",
      roof: "concrete_gray",
      frames: "aluminum_black",
    },
    floorHeight: 2.8,
    glassRatio: 0.35,
  },
  colonial: {
    roof: { type: "gable", slope: 30, overhang: 0.6 },
    materials: {
      facade: "plaster_beige",
      roof: "clay_tile",
      frames: "wood_brown",
    },
    floorHeight: 3.0,
    glassRatio: 0.2,
  },
  minimal: {
    roof: { type: "flat", slope: 0, overhang: 0.2 },
    materials: {
      facade: "concrete_raw",
      roof: "concrete_gray",
      frames: "aluminum_black",
    },
    floorHeight: 2.7,
    glassRatio: 0.4,
  },
  contemporary: {
    roof: { type: "flat", slope: 5, overhang: 0.4 },
    materials: {
      facade: "stucco_white",
      roof: "metal_dark",
      frames: "aluminum_gray",
    },
    floorHeight: 2.8,
    glassRatio: 0.3,
  },
};

/**
 * Gera um projeto fallback deterministico para testes sem IA.
 * Produz um sobrado moderno simples.
 */
export function generateFallbackProject(prompt: string): ArchitecturalProject {
  const isModern = /modern|moderno/i.test(prompt);
  const isColonial = /colonial/i.test(prompt);
  const style = isColonial ? "colonial" : isModern ? "modern" : "modern";
  const defaults = STYLE_DEFAULTS[style];

  const stories = 1;

  const hasGarage = /garag/i.test(prompt);
  const hasBalcony = /varand|balcon/i.test(prompt);
  const hasPool = /piscin|pool/i.test(prompt);
  const hasGarden = /jardi|garden/i.test(prompt);

  const features: ("garage" | "balcony" | "pool" | "garden" | "stairs" | "terrace")[] = [];
  if (hasGarage) features.push("garage");
  if (hasBalcony) features.push("balcony");
  if (hasPool) features.push("pool");
  if (hasGarden) features.push("garden");

  const bedroomCount = prompt.match(/(\d+)\s*(quarto|bedroom|bed)/i);
  const numBedrooms = bedroomCount ? parseInt(bedroomCount[1], 10) : 2;

  const rooms: ArchitecturalProject["rooms"] = [
    { name: "living", floor: 0, x: 0, z: 0, width: 4.5, depth: 5, height: defaults.floorHeight },
    { name: "kitchen", floor: 0, x: 4.5, z: 0, width: 3.5, depth: 4, height: defaults.floorHeight },
    { name: "bathroom_social", floor: 0, x: 4.5, z: 4, width: 2, depth: 2.5, height: defaults.floorHeight },
  ];

  if (hasGarage) {
    rooms.push({ name: "garage", floor: 0, x: -3.5, z: 0, width: 3, depth: 6, height: defaults.floorHeight });
  }

  for (let i = 0; i < numBedrooms; i++) {
    rooms.push({
      name: `bedroom_${i + 1}`,
      floor: 0,
      x: i * 3.5,
      z: 5,
      width: 3.2,
      depth: 3.5,
      height: defaults.floorHeight,
    });
  }

  if (numBedrooms > 0) {
    rooms.push({
      name: "bathroom_suite",
      floor: 0,
      x: numBedrooms * 3.5,
      z: 5,
      width: 2.5,
      depth: 2.5,
      height: defaults.floorHeight,
    });
  }

  const footprintWidth = Math.max(8, ...rooms.filter((r) => r.floor === 0).map((r) => r.x + r.width));
  const footprintDepth = Math.max(10, ...rooms.filter((r) => r.floor === 0).map((r) => r.z + r.depth));

  // Pool (when requested)
  const pool = hasPool
    ? { width: 4, depth: 8, x: footprintWidth + 2, z: 2 }
    : undefined;

  // Vegetation (always add a few trees for realism)
  const vegetation: { type: "tree" | "bush" | "palm"; x: number; z: number; scale: number }[] = [
    { type: "tree", x: -2, z: footprintDepth + 2, scale: 1.2 },
    { type: "bush", x: footprintWidth + 1, z: 0, scale: 0.8 },
    { type: "tree", x: footprintWidth + 1, z: footprintDepth + 2, scale: 1 },
  ];
  if (hasGarden) {
    vegetation.push(
      { type: "bush", x: -1.5, z: 2, scale: 0.7 },
      { type: "palm", x: footprintWidth + 3, z: footprintDepth / 2, scale: 1.1 },
    );
  }

  // Fence
  const fence = { height: 1.8, material: "block_gray" };

  return {
    buildingType: "house",
    stories,
    style,
    lot: { width: footprintWidth + 6, depth: footprintDepth + 10 },
    footprint: { width: footprintWidth, depth: footprintDepth },
    rooms,
    openings: [
      { type: "window" as const, room: "living", wall: "south" as const, width: 2.5, height: 1.5, elevation: 0.9 },
      { type: "window" as const, room: "kitchen", wall: "east" as const, width: 1.5, height: 1.2, elevation: 1.0 },
      { type: "door" as const, room: "living", wall: "west" as const, width: 0.9, height: 2.1, elevation: 0 },
    ],
    features,
    roof: defaults.roof,
    materials: defaults.materials,
    pool,
    vegetation,
    fence,
    assumptions: [
      "Dimensoes inferidas a partir de padroes residenciais brasileiros",
      `Estilo: ${style}`,
      `Pavimentos: ${stories}`,
    ],
    confidence: 0.6,
  };
}
