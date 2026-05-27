"use client";

import React from "react";
import * as THREE from "three";
import type { Opening } from "@/lib/schema";
import { getMaterial } from "@/lib/material-system";

interface WindowMeshProps {
  opening: Opening;
  position: [number, number, number];
  isXWall: boolean;
  frameMaterial: string;
}

const FRAME_DEPTH = 0.06;
const FRAME_WIDTH = 0.04;

/**
 * Janela realista com frame de alumínio e vidro PBR.
 * Frame = 4 boxes em moldura retangular.
 * Glass = plano com material transparente/reflexivo.
 */
export default function WindowMesh({ opening, position, isXWall, frameMaterial }: WindowMeshProps) {
  const w = opening.width;
  const h = opening.height;
  const frame = getMaterial(frameMaterial);

  // Frame dimensions
  const fw = FRAME_WIDTH;
  const fd = FRAME_DEPTH;

  // Rotation for walls along Z axis
  const rotation: [number, number, number] = isXWall ? [0, 0, 0] : [0, Math.PI / 2, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* Top frame */}
      <mesh position={[0, h / 2 - fw / 2, 0]}>
        <boxGeometry args={[w, fw, fd]} />
        <meshStandardMaterial color={frame.color} roughness={frame.roughness} metalness={frame.metalness} />
      </mesh>

      {/* Bottom frame */}
      <mesh position={[0, -h / 2 + fw / 2, 0]}>
        <boxGeometry args={[w, fw, fd]} />
        <meshStandardMaterial color={frame.color} roughness={frame.roughness} metalness={frame.metalness} />
      </mesh>

      {/* Left frame */}
      <mesh position={[-w / 2 + fw / 2, 0, 0]}>
        <boxGeometry args={[fw, h, fd]} />
        <meshStandardMaterial color={frame.color} roughness={frame.roughness} metalness={frame.metalness} />
      </mesh>

      {/* Right frame */}
      <mesh position={[w / 2 - fw / 2, 0, 0]}>
        <boxGeometry args={[fw, h, fd]} />
        <meshStandardMaterial color={frame.color} roughness={frame.roughness} metalness={frame.metalness} />
      </mesh>

      {/* Center divider (mullion) for sliding windows or large windows */}
      {(opening.subtype === "sliding" || w > 1.5) && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[fw * 0.7, h - fw * 2, fd * 0.7]} />
          <meshStandardMaterial color={frame.color} roughness={frame.roughness} metalness={frame.metalness} />
        </mesh>
      )}

      {/* Glass pane */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w - fw * 2, h - fw * 2, 0.006]} />
        <meshStandardMaterial
          color="#b3e5fc"
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sill (peitoril externo) */}
      <mesh position={[0, -h / 2 - 0.015, fd / 2 + 0.02]}>
        <boxGeometry args={[w + 0.04, 0.03, 0.08]} />
        <meshStandardMaterial color="#bdbdbd" roughness={0.6} metalness={0} />
      </mesh>
    </group>
  );
}
