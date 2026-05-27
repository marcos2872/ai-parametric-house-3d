"use client";

import React from "react";
import * as THREE from "three";
import type { Pool as PoolType } from "@/lib/schema";
import { getMaterial } from "@/lib/material-system";

interface PoolProps {
  pool: PoolType;
}

const POOL_DEPTH = 1.5;
const BORDER_WIDTH = 0.3;
const BORDER_HEIGHT = 0.05;

/**
 * Piscina com:
 * - Paredes internas azul-claro (pool_tile)
 * - Superfície de água com material PBR semi-transparente
 * - Borda de porcelanato/pedra
 */
export default function Pool({ pool }: PoolProps) {
  const tileMat = getMaterial("pool_tile");
  const borderMat = getMaterial("pool_border");
  const waterMat = getMaterial("water");

  const w = pool.width;
  const d = pool.depth;
  const px = pool.x + w / 2;
  const pz = pool.z + d / 2;
  const wallThickness = 0.1;

  return (
    <group position={[px, 0, pz]}>
      {/* Pool floor */}
      <mesh position={[0, -POOL_DEPTH, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={tileMat.color} roughness={tileMat.roughness} metalness={tileMat.metalness} />
      </mesh>

      {/* Pool walls - internal */}
      {/* Front */}
      <mesh position={[0, -POOL_DEPTH / 2, -d / 2]}>
        <boxGeometry args={[w, POOL_DEPTH, wallThickness]} />
        <meshStandardMaterial color={tileMat.color} roughness={tileMat.roughness} metalness={tileMat.metalness} />
      </mesh>
      {/* Back */}
      <mesh position={[0, -POOL_DEPTH / 2, d / 2]}>
        <boxGeometry args={[w, POOL_DEPTH, wallThickness]} />
        <meshStandardMaterial color={tileMat.color} roughness={tileMat.roughness} metalness={tileMat.metalness} />
      </mesh>
      {/* Left */}
      <mesh position={[-w / 2, -POOL_DEPTH / 2, 0]}>
        <boxGeometry args={[wallThickness, POOL_DEPTH, d]} />
        <meshStandardMaterial color={tileMat.color} roughness={tileMat.roughness} metalness={tileMat.metalness} />
      </mesh>
      {/* Right */}
      <mesh position={[w / 2, -POOL_DEPTH / 2, 0]}>
        <boxGeometry args={[wallThickness, POOL_DEPTH, d]} />
        <meshStandardMaterial color={tileMat.color} roughness={tileMat.roughness} metalness={tileMat.metalness} />
      </mesh>

      {/* Water surface */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - wallThickness * 2, d - wallThickness * 2]} />
        <meshStandardMaterial
          color={waterMat.color}
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border (borda da piscina) */}
      {/* Front border */}
      <mesh position={[0, BORDER_HEIGHT / 2, -(d / 2 + BORDER_WIDTH / 2)]}>
        <boxGeometry args={[w + BORDER_WIDTH * 2, BORDER_HEIGHT, BORDER_WIDTH]} />
        <meshStandardMaterial color={borderMat.color} roughness={borderMat.roughness} metalness={borderMat.metalness} />
      </mesh>
      {/* Back border */}
      <mesh position={[0, BORDER_HEIGHT / 2, d / 2 + BORDER_WIDTH / 2]}>
        <boxGeometry args={[w + BORDER_WIDTH * 2, BORDER_HEIGHT, BORDER_WIDTH]} />
        <meshStandardMaterial color={borderMat.color} roughness={borderMat.roughness} metalness={borderMat.metalness} />
      </mesh>
      {/* Left border */}
      <mesh position={[-(w / 2 + BORDER_WIDTH / 2), BORDER_HEIGHT / 2, 0]}>
        <boxGeometry args={[BORDER_WIDTH, BORDER_HEIGHT, d]} />
        <meshStandardMaterial color={borderMat.color} roughness={borderMat.roughness} metalness={borderMat.metalness} />
      </mesh>
      {/* Right border */}
      <mesh position={[w / 2 + BORDER_WIDTH / 2, BORDER_HEIGHT / 2, 0]}>
        <boxGeometry args={[BORDER_WIDTH, BORDER_HEIGHT, d]} />
        <meshStandardMaterial color={borderMat.color} roughness={borderMat.roughness} metalness={borderMat.metalness} />
      </mesh>
    </group>
  );
}
