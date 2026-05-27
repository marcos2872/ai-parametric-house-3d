import { z } from "zod/v4";

// --- Sub-schemas ---

export const LotSchema = z.object({
  width: z.number().min(5).max(100).describe("Largura do lote em metros"),
  depth: z.number().min(5).max(200).describe("Profundidade do lote em metros"),
});

export const FootprintSchema = z.object({
  width: z.number().min(3).max(80).describe("Largura da edificacao em metros"),
  depth: z.number().min(3).max(80).describe("Profundidade da edificacao em metros"),
});

export const RoomSchema = z.object({
  name: z.string().describe("Nome do comodo (ex: living, kitchen, bedroom_1)"),
  floor: z.number().int().min(0).describe("Pavimento (0 = terreo)"),
  x: z.number().default(0).describe("Posicao X relativa ao footprint"),
  z: z.number().default(0).describe("Posicao Z relativa ao footprint"),
  width: z.number().min(0.8).max(20).describe("Largura do comodo em metros"),
  depth: z.number().min(0.8).max(20).describe("Profundidade do comodo em metros"),
  height: z.number().min(2.2).max(6).default(2.8).describe("Pe-direito em metros"),
  floorMaterial: z.string().default("porcelain_gray").describe("Material do piso").optional(),
  wallColor: z.string().default("#ffffff").describe("Cor das paredes internas").optional(),
});

export const OpeningSchema = z.object({
  type: z.enum(["door", "window"]).describe("Tipo da abertura"),
  room: z.string().describe("Nome do comodo onde esta a abertura"),
  wall: z.enum(["north", "south", "east", "west"]).describe("Parede"),
  width: z.number().min(0.6).max(6).describe("Largura da abertura em metros"),
  height: z.number().min(0.6).max(4).describe("Altura da abertura em metros"),
  elevation: z.number().min(0).default(0).describe("Altura do peitoril"),
  subtype: z.enum(["fixed", "sliding", "pivot", "double", "garage"]).optional().describe("Subtipo da esquadria"),
});

export const RoofSchema = z.object({
  type: z.enum(["flat", "gable", "hip"]).describe("Tipo de cobertura"),
  slope: z.number().min(0).max(60).default(0).describe("Inclinacao em graus"),
  overhang: z.number().min(0).max(2).default(0.3).describe("Beiral em metros"),
});

export const MaterialsSchema = z.object({
  facade: z.string().default("concrete_white").describe("Material da fachada"),
  roof: z.string().default("concrete_gray").describe("Material da cobertura"),
  frames: z.string().default("aluminum_black").describe("Material das esquadrias"),
});

export const PoolSchema = z.object({
  width: z.number().min(2).max(15).describe("Largura da piscina"),
  depth: z.number().min(3).max(20).describe("Comprimento da piscina"),
  x: z.number().describe("Posicao X da piscina"),
  z: z.number().describe("Posicao Z da piscina"),
});

export const VegetationItemSchema = z.object({
  type: z.enum(["tree", "bush", "palm"]).describe("Tipo de vegetacao"),
  x: z.number().describe("Posicao X"),
  z: z.number().describe("Posicao Z"),
  scale: z.number().min(0.3).max(3).default(1).describe("Escala"),
});

export const FenceSchema = z.object({
  height: z.number().min(0.5).max(4).default(1.8).describe("Altura do muro"),
  material: z.string().default("block_gray").describe("Material do muro"),
});

export const BuildingStyle = z.enum(["modern", "colonial", "minimal", "contemporary"]);
export const BuildingType = z.enum(["house", "duplex", "townhouse"]);
export const Feature = z.enum(["garage", "balcony", "pool", "garden", "stairs", "terrace"]);

// --- Main schema ---

export const ArchitecturalProjectSchema = z.object({
  buildingType: BuildingType.default("house"),
  stories: z.number().int().min(1).max(1).default(1),
  style: BuildingStyle.default("modern"),
  lot: LotSchema,
  footprint: FootprintSchema,
  rooms: z.array(RoomSchema).min(1),
  openings: z.array(OpeningSchema).default([]),
  features: z.array(Feature).default([]),
  roof: RoofSchema.default({ type: "flat", slope: 0, overhang: 0.3 }),
  materials: MaterialsSchema.default({
    facade: "concrete_white",
    roof: "concrete_gray",
    frames: "aluminum_black",
  }),
  pool: PoolSchema.optional().describe("Piscina (quando feature 'pool' estiver presente)"),
  vegetation: z.array(VegetationItemSchema).default([]).describe("Vegetacao no lote"),
  fence: FenceSchema.optional().describe("Muro perimetral"),
  assumptions: z.array(z.string()).default([]).describe("Premissas inferidas pela IA"),
  confidence: z.number().min(0).max(1).default(0.8).describe("Confianca geral da geracao"),
});

// --- Inferred types ---

export type Lot = z.infer<typeof LotSchema>;
export type Footprint = z.infer<typeof FootprintSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type Roof = z.infer<typeof RoofSchema>;
export type Materials = z.infer<typeof MaterialsSchema>;
export type Pool = z.infer<typeof PoolSchema>;
export type VegetationItem = z.infer<typeof VegetationItemSchema>;
export type Fence = z.infer<typeof FenceSchema>;
export type ArchitecturalProject = z.infer<typeof ArchitecturalProjectSchema>;
