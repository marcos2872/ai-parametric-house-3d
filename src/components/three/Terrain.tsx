"use client";

import React from "react";
import * as THREE from "three";
import type { ArchitecturalProject } from "@/lib/schema";
import { getMaterial } from "@/lib/material-system";

interface TerrainProps {
  project: ArchitecturalProject;
}

const SIDEWALK_WIDTH = 0.8;
const FENCE_THICKNESS = 0.12;

/**
 * Terreno do lote com:
 * - Plano de grama (todo o lote)
 * - Calçada perimetral ao redor da edificação
 * - Muro perimetral no limite do lote (quando fence definido)
 */
export default function Terrain({ project }: TerrainProps) {
  const { lot, footprint, fence } = project;
  const cx = footprint.width / 2;
  const cz = footprint.depth / 2;

  const grassMat = getMaterial("grass");
  const sidewalkMat = getMaterial("sidewalk");
  const fenceMat = fence ? getMaterial(fence.material) : getMaterial("block_gray");
  const fenceHeight = fence?.height ?? 1.8;

  // Offset to center the building in the lot
  const lotOffsetX = (lot.width - footprint.width) / 2;
  const lotOffsetZ = (lot.depth - footprint.depth) / 2;
  const lotCenterX = cx;
  const lotCenterZ = cz;

  return (
    <group>
      {/* Grass plane (full lot) */}
      <mesh
        position={[lotCenterX, -0.02, lotCenterZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[lot.width, lot.depth]} />
        <meshStandardMaterial
          color={grassMat.color}
          roughness={grassMat.roughness}
          metalness={grassMat.metalness}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sidewalk around building */}
      <Sidewalk footprint={footprint} mat={sidewalkMat} />

      {/* Perimeter fence/wall */}
      {fence && (
        <PerimeterFence
          lot={lot}
          centerX={lotCenterX}
          centerZ={lotCenterZ}
          height={fenceHeight}
          mat={fenceMat}
        />
      )}

      {/* Driveway (calçada de acesso - frente) */}
      <mesh position={[cx, -0.005, -lotOffsetZ / 2]}>
        <boxGeometry args={[3, 0.03, lotOffsetZ]} />
        <meshStandardMaterial color={sidewalkMat.color} roughness={sidewalkMat.roughness} metalness={0} />
      </mesh>
    </group>
  );
}

function Sidewalk({ footprint, mat }: {
  footprint: { width: number; depth: number };
  mat: ReturnType<typeof getMaterial>;
}) {
  const w = footprint.width;
  const d = footprint.depth;
  const sw = SIDEWALK_WIDTH;

  return (
    <group>
      {/* Front */}
      <mesh position={[w / 2, -0.005, -sw / 2]}>
        <boxGeometry args={[w + sw * 2, 0.04, sw]} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
      {/* Back */}
      <mesh position={[w / 2, -0.005, d + sw / 2]}>
        <boxGeometry args={[w + sw * 2, 0.04, sw]} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
      {/* Left */}
      <mesh position={[-sw / 2, -0.005, d / 2]}>
        <boxGeometry args={[sw, 0.04, d]} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
      {/* Right */}
      <mesh position={[w + sw / 2, -0.005, d / 2]}>
        <boxGeometry args={[sw, 0.04, d]} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
    </group>
  );
}

function PerimeterFence({ lot, centerX, centerZ, height, mat }: {
  lot: { width: number; depth: number };
  centerX: number;
  centerZ: number;
  height: number;
  mat: ReturnType<typeof getMaterial>;
}) {
  const halfW = lot.width / 2;
  const halfD = lot.depth / 2;
  const t = FENCE_THICKNESS;
  const y = height / 2;

  return (
    <group>
      {/* Front wall */}
      <mesh position={[centerX, y, centerZ - halfD]}>
        <boxGeometry args={[lot.width, height, t]} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
      {/* Back wall */}
      <mesh position={[centerX, y, centerZ + halfD]}>
        <boxGeometry args={[lot.width, height, t]} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
      {/* Left wall */}
      <mesh position={[centerX - halfW, y, centerZ]}>
        <boxGeometry args={[t, height, lot.depth]} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
      {/* Right wall */}
      <mesh position={[centerX + halfW, y, centerZ]}>
        <boxGeometry args={[t, height, lot.depth]} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>

      {/* Top cap (rufo) */}
      <mesh position={[centerX, height + 0.02, centerZ - halfD]}>
        <boxGeometry args={[lot.width + 0.04, 0.04, t + 0.06]} />
        <meshStandardMaterial color="#9e9e9e" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[centerX, height + 0.02, centerZ + halfD]}>
        <boxGeometry args={[lot.width + 0.04, 0.04, t + 0.06]} />
        <meshStandardMaterial color="#9e9e9e" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[centerX - halfW, height + 0.02, centerZ]}>
        <boxGeometry args={[t + 0.06, 0.04, lot.depth + 0.04]} />
        <meshStandardMaterial color="#9e9e9e" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[centerX + halfW, height + 0.02, centerZ]}>
        <boxGeometry args={[t + 0.06, 0.04, lot.depth + 0.04]} />
        <meshStandardMaterial color="#9e9e9e" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}
