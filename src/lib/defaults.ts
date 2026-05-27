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

  const hasTwoFloors = /sobrado|2.*pav|two.*stor/i.test(prompt);
  const stories = hasTwoFloors ? 2 : 1;

  const hasGarage = /garag/i.test(prompt);
  const hasBalcony = /varand|balcon/i.test(prompt);

  const features: ("garage" | "balcony" | "pool" | "garden" | "stairs" | "terrace")[] = [];
  if (hasGarage) features.push("garage");
  if (hasBalcony) features.push("balcony");
  if (stories > 1) features.push("stairs");

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
      floor: stories > 1 ? 1 : 0,
      x: i * 3.5,
      z: stories > 1 ? 0 : 5,
      width: 3.2,
      depth: 3.5,
      height: defaults.floorHeight,
    });
  }

  if (stories > 1 || numBedrooms > 0) {
    rooms.push({
      name: "bathroom_suite",
      floor: stories > 1 ? 1 : 0,
      x: numBedrooms * 3.5,
      z: stories > 1 ? 0 : 5,
      width: 2.5,
      depth: 2.5,
      height: defaults.floorHeight,
    });
  }

  const footprintWidth = Math.max(8, ...rooms.filter((r) => r.floor === 0).map((r) => r.x + r.width));
  const footprintDepth = Math.max(10, ...rooms.filter((r) => r.floor === 0).map((r) => r.z + r.depth));

  return {
    buildingType: "house",
    stories,
    style,
    lot: { width: footprintWidth + 4, depth: footprintDepth + 8 },
    footprint: { width: footprintWidth, depth: footprintDepth },
    rooms,
    openings: [],
    features,
    roof: defaults.roof,
    materials: defaults.materials,
    assumptions: [
      "Dimensoes inferidas a partir de padroes residenciais brasileiros",
      `Estilo: ${style}`,
      `Pavimentos: ${stories}`,
    ],
    confidence: 0.6,
  };
}
