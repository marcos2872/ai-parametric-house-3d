"use client";

import React from "react";
import type { Opening } from "@/lib/schema";
import { getMaterial } from "@/lib/material-system";

interface DoorMeshProps {
  opening: Opening;
  position: [number, number, number];
  isXWall: boolean;
  frameMaterial: string;
}

const FRAME_DEPTH = 0.08;
const FRAME_WIDTH = 0.05;
const LEAF_THICKNESS = 0.04;

/**
 * Porta com batente (frame em U) + folha de madeira + maçaneta.
 */
export default function DoorMesh({ opening, position, isXWall, frameMaterial }: DoorMeshProps) {
  const w = opening.width;
  const h = opening.height;
  const frame = getMaterial(frameMaterial);
  const leaf = getMaterial("door_wood");

  const fw = FRAME_WIDTH;
  const fd = FRAME_DEPTH;

  const rotation: [number, number, number] = isXWall ? [0, 0, 0] : [0, Math.PI / 2, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* Top frame (verga) */}
      <mesh position={[0, h / 2 - fw / 2, 0]}>
        <boxGeometry args={[w + fw * 2, fw, fd]} />
        <meshStandardMaterial color={frame.color} roughness={frame.roughness} metalness={frame.metalness} />
      </mesh>

      {/* Left frame (batente esquerdo) */}
      <mesh position={[-w / 2 - fw / 2, 0, 0]}>
        <boxGeometry args={[fw, h, fd]} />
        <meshStandardMaterial color={frame.color} roughness={frame.roughness} metalness={frame.metalness} />
      </mesh>

      {/* Right frame (batente direito) */}
      <mesh position={[w / 2 + fw / 2, 0, 0]}>
        <boxGeometry args={[fw, h, fd]} />
        <meshStandardMaterial color={frame.color} roughness={frame.roughness} metalness={frame.metalness} />
      </mesh>

      {/* Door leaf (folha) */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[w - 0.01, h - fw - 0.01, LEAF_THICKNESS]} />
        <meshStandardMaterial color={leaf.color} roughness={leaf.roughness} metalness={leaf.metalness} />
      </mesh>

      {/* Door panels (almofadas decorativas) */}
      <mesh position={[0, h * 0.15, LEAF_THICKNESS / 2 + 0.003]}>
        <boxGeometry args={[w * 0.7, h * 0.35, 0.008]} />
        <meshStandardMaterial color={leaf.color} roughness={leaf.roughness * 0.9} metalness={leaf.metalness} />
      </mesh>
      <mesh position={[0, -h * 0.2, LEAF_THICKNESS / 2 + 0.003]}>
        <boxGeometry args={[w * 0.7, h * 0.3, 0.008]} />
        <meshStandardMaterial color={leaf.color} roughness={leaf.roughness * 0.9} metalness={leaf.metalness} />
      </mesh>

      {/* Handle (maçaneta) */}
      <mesh position={[w / 2 - 0.1, 0, LEAF_THICKNESS / 2 + 0.02]}>
        <boxGeometry args={[0.02, 0.12, 0.04]} />
        <meshStandardMaterial color="#9e9e9e" roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Threshold (soleira) */}
      <mesh position={[0, -h / 2 + 0.01, fd / 2]}>
        <boxGeometry args={[w + fw * 2, 0.02, fd + 0.02]} />
        <meshStandardMaterial color="#8d8d8d" roughness={0.6} metalness={0} />
      </mesh>
    </group>
  );
}
