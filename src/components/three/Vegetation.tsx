"use client";

import React from "react";
import type { VegetationItem } from "@/lib/schema";

interface VegetationProps {
  items: VegetationItem[];
}

/**
 * Vegetação procedural estilo maquete arquitetônica.
 * - tree: tronco cilíndrico + copa esférica
 * - bush: esfera achatada verde
 * - palm: tronco fino + copa em cone alongado
 */
export default function Vegetation({ items }: VegetationProps) {
  if (!items || items.length === 0) return null;

  return (
    <group>
      {items.map((item, i) => {
        switch (item.type) {
          case "tree":
            return <Tree key={`veg-${i}`} x={item.x} z={item.z} scale={item.scale ?? 1} />;
          case "bush":
            return <Bush key={`veg-${i}`} x={item.x} z={item.z} scale={item.scale ?? 1} />;
          case "palm":
            return <Palm key={`veg-${i}`} x={item.x} z={item.z} scale={item.scale ?? 1} />;
          default:
            return <Tree key={`veg-${i}`} x={item.x} z={item.z} scale={item.scale ?? 1} />;
        }
      })}
    </group>
  );
}

function Tree({ x, z, scale }: { x: number; z: number; scale: number }) {
  const trunkH = 2.0 * scale;
  const crownR = 1.2 * scale;

  return (
    <group position={[x, 0, z]}>
      {/* Trunk */}
      <mesh position={[0, trunkH / 2, 0]}>
        <cylinderGeometry args={[0.08 * scale, 0.12 * scale, trunkH, 8]} />
        <meshStandardMaterial color="#5d4037" roughness={0.85} metalness={0} />
      </mesh>
      {/* Crown */}
      <mesh position={[0, trunkH + crownR * 0.7, 0]}>
        <sphereGeometry args={[crownR, 12, 10]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.9} metalness={0} />
      </mesh>
      {/* Secondary smaller crown for depth */}
      <mesh position={[crownR * 0.4, trunkH + crownR * 0.4, crownR * 0.3]}>
        <sphereGeometry args={[crownR * 0.6, 10, 8]} />
        <meshStandardMaterial color="#388e3c" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

function Bush({ x, z, scale }: { x: number; z: number; scale: number }) {
  const r = 0.6 * scale;

  return (
    <group position={[x, r * 0.6, z]}>
      <mesh>
        <sphereGeometry args={[r, 10, 8]} />
        <meshStandardMaterial color="#43a047" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[r * 0.5, -r * 0.1, r * 0.3]}>
        <sphereGeometry args={[r * 0.7, 8, 6]} />
        <meshStandardMaterial color="#388e3c" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

function Palm({ x, z, scale }: { x: number; z: number; scale: number }) {
  const trunkH = 3.5 * scale;

  return (
    <group position={[x, 0, z]}>
      {/* Trunk (slightly curved look with slight lean) */}
      <mesh position={[0, trunkH / 2, 0]} rotation={[0, 0, 0.05]}>
        <cylinderGeometry args={[0.06 * scale, 0.1 * scale, trunkH, 8]} />
        <meshStandardMaterial color="#8d6e63" roughness={0.8} metalness={0} />
      </mesh>
      {/* Crown leaves (multiple cones radiating out) */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const leafLen = 1.5 * scale;
        return (
          <mesh
            key={`leaf-${i}`}
            position={[
              Math.cos(rad) * leafLen * 0.3,
              trunkH - 0.1,
              Math.sin(rad) * leafLen * 0.3,
            ]}
            rotation={[
              Math.sin(rad) * 0.8,
              0,
              -Math.cos(rad) * 0.8,
            ]}
          >
            <coneGeometry args={[0.15 * scale, leafLen, 4]} />
            <meshStandardMaterial color="#1b5e20" roughness={0.85} metalness={0} />
          </mesh>
        );
      })}
    </group>
  );
}
