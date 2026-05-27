"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import type { ArchitecturalProject } from "@/lib/schema";
import { getMaterial } from "@/lib/material-system";
import { STYLE_DEFAULTS } from "@/lib/defaults";

interface ProceduralRoofProps {
  project: ArchitecturalProject;
}

const PARAPET_HEIGHT = 0.4;
const PARAPET_THICKNESS = 0.12;
const SLAB_THICKNESS = 0.2;

/**
 * Telhado procedural:
 * - flat: laje com platibanda (muretas perimetrais)
 * - gable: duas águas com cumeeira, usando Shape + ExtrudeGeometry
 * - hip: quatro águas com cone/piramide
 */
export default function ProceduralRoof({ project }: ProceduralRoofProps) {
  const { footprint, stories, roof, materials } = project;
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;
  const yPos = stories * styleDefaults.floorHeight;
  const roofMat = getMaterial(materials.roof);
  const overhang = roof.overhang;
  const w = footprint.width;
  const d = footprint.depth;

  if (roof.type === "flat") {
    return <FlatRoof w={w} d={d} yPos={yPos} overhang={overhang} roofMat={roofMat} />;
  }

  if (roof.type === "gable") {
    return <GableRoof w={w} d={d} yPos={yPos} overhang={overhang} slope={roof.slope} roofMat={roofMat} />;
  }

  return <HipRoof w={w} d={d} yPos={yPos} overhang={overhang} slope={roof.slope} roofMat={roofMat} />;
}

// --- Flat roof with parapet ---
function FlatRoof({ w, d, yPos, overhang, roofMat }: {
  w: number; d: number; yPos: number; overhang: number; roofMat: ReturnType<typeof getMaterial>;
}) {
  const cx = w / 2;
  const cz = d / 2;
  const slabY = yPos + SLAB_THICKNESS / 2;
  const parapetY = yPos + SLAB_THICKNESS + PARAPET_HEIGHT / 2;

  return (
    <group>
      {/* Laje */}
      <mesh position={[cx, slabY, cz]}>
        <boxGeometry args={[w + overhang * 2, SLAB_THICKNESS, d + overhang * 2]} />
        <meshStandardMaterial color={roofMat.color} roughness={roofMat.roughness} metalness={roofMat.metalness} />
      </mesh>

      {/* Platibanda - frente */}
      <mesh position={[cx, parapetY, -overhang]}>
        <boxGeometry args={[w + overhang * 2 + PARAPET_THICKNESS, PARAPET_HEIGHT, PARAPET_THICKNESS]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.8} metalness={0} />
      </mesh>
      {/* Platibanda - fundos */}
      <mesh position={[cx, parapetY, d + overhang]}>
        <boxGeometry args={[w + overhang * 2 + PARAPET_THICKNESS, PARAPET_HEIGHT, PARAPET_THICKNESS]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.8} metalness={0} />
      </mesh>
      {/* Platibanda - esquerda */}
      <mesh position={[-overhang, parapetY, cz]}>
        <boxGeometry args={[PARAPET_THICKNESS, PARAPET_HEIGHT, d + overhang * 2]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.8} metalness={0} />
      </mesh>
      {/* Platibanda - direita */}
      <mesh position={[w + overhang, parapetY, cz]}>
        <boxGeometry args={[PARAPET_THICKNESS, PARAPET_HEIGHT, d + overhang * 2]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.8} metalness={0} />
      </mesh>

      {/* Calha (borda inferior decorativa) */}
      <mesh position={[cx, yPos + SLAB_THICKNESS, -overhang - PARAPET_THICKNESS / 2 - 0.01]}>
        <boxGeometry args={[w + overhang * 2, 0.04, 0.06]} />
        <meshStandardMaterial color="#616161" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

// --- Gable roof (two slopes) ---
// Ridge runs along Z (depth). Slopes descend in X (width).
// Empenas (^ shape) visible from front (Z=0) and back (Z=d).
function GableRoof({ w, d, yPos, overhang, slope, roofMat }: {
  w: number; d: number; yPos: number; overhang: number; slope: number;
  roofMat: ReturnType<typeof getMaterial>;
}) {
  const geo = useMemo(() => {
    const slopeRad = (slope * Math.PI) / 180;
    // Ridge height determined by half-width (slopes descend over w/2)
    const ridgeHeight = Math.tan(slopeRad) * (w / 2);
    // Each slope panel goes from ridge to eave + overhang
    const panelLength = (w / 2) / Math.cos(slopeRad) + overhang;
    // Panel extends along Z with overhang on front/back
    const totalD = d + overhang * 2;
    const halfPanel = panelLength / 2;

    // Position panels so ridge-edge meets at (0, ridgeHeight, 0)
    const panelY = ridgeHeight - Math.sin(slopeRad) * halfPanel;
    const panelXLeft = -Math.cos(slopeRad) * halfPanel;
    const panelXRight = Math.cos(slopeRad) * halfPanel;

    return { slopeRad, ridgeHeight, totalD, panelLength, panelY, panelXLeft, panelXRight };
  }, [w, d, overhang, slope]);

  const { slopeRad, ridgeHeight, totalD, panelLength, panelY, panelXLeft, panelXRight } = geo;
  const cx = w / 2;
  const cz = d / 2;

  return (
    <group position={[cx, yPos + SLAB_THICKNESS * 0.5, cz]}>
      {/* Ceiling plane (laje forro) — hides internal walls from outside */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.9} metalness={0} />
      </mesh>

      {/* Left slope — rotates around Z, +X edge (ridge) goes UP */}
      <mesh position={[panelXLeft, panelY, 0]} rotation={[0, 0, slopeRad]}>
        <boxGeometry args={[panelLength, 0.08, totalD]} />
        <meshStandardMaterial color={roofMat.color} roughness={roofMat.roughness} metalness={roofMat.metalness} />
      </mesh>

      {/* Right slope — rotates around Z, -X edge (ridge) goes UP */}
      <mesh position={[panelXRight, panelY, 0]} rotation={[0, 0, -slopeRad]}>
        <boxGeometry args={[panelLength, 0.08, totalD]} />
        <meshStandardMaterial color={roofMat.color} roughness={roofMat.roughness} metalness={roofMat.metalness} />
      </mesh>

      {/* Ridge beam (cumeeira) — runs along Z */}
      <mesh position={[0, ridgeHeight, 0]}>
        <boxGeometry args={[0.06, 0.06, totalD + 0.1]} />
        <meshStandardMaterial color="#5d4037" roughness={0.7} metalness={0} />
      </mesh>

      {/* Gable end walls (empenas) — front and back, ^ visible from Z direction */}
      <GableTriangle width={w} height={ridgeHeight} z={-d / 2} />
      <GableTriangle width={w} height={ridgeHeight} z={d / 2} />
    </group>
  );
}

// Triângulo da empena
function GableTriangle({ width, height, z }: { width: number; height: number; z: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, height);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    // ShapeGeometry is already in XY plane (vertical), just translate to correct Z
    geo.translate(0, 0, z);
    return geo;
  }, [width, height, z]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#e8e8e8" roughness={0.8} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

// --- Hip roof (four slopes) ---
function HipRoof({ w, d, yPos, overhang, slope, roofMat }: {
  w: number; d: number; yPos: number; overhang: number; slope: number;
  roofMat: ReturnType<typeof getMaterial>;
}) {
  const geometry = useMemo(() => {
    const slopeRad = (slope * Math.PI) / 180;
    const minDim = Math.min(w, d);
    const ridgeHeight = Math.tan(slopeRad) * (minDim / 2);
    const totalW = w + overhang * 2;
    const totalD = d + overhang * 2;

    // Build a proper hip roof shape as a custom geometry
    // Base rectangle + top ridge line (shorter than base for rectangular plans)
    const halfW = totalW / 2;
    const halfD = totalD / 2;

    // Ridge length: if rectangular, ridge runs along the longer axis
    const isWider = totalW > totalD;
    const ridgeLen = Math.abs(totalW - totalD) / 2;

    // Create vertices for the hip roof
    // Base corners
    const vertices = new Float32Array([
      // Base (y = 0)
      -halfW, 0, -halfD,  // 0: front-left
       halfW, 0, -halfD,  // 1: front-right
       halfW, 0,  halfD,  // 2: back-right
      -halfW, 0,  halfD,  // 3: back-left
      // Ridge
      isWider ? -ridgeLen : 0, ridgeHeight, isWider ? 0 : -ridgeLen, // 4: ridge-start
      isWider ?  ridgeLen : 0, ridgeHeight, isWider ? 0 :  ridgeLen, // 5: ridge-end
    ]);

    const indices = new Uint16Array([
      // Front face (triangle: 0, 1, 4 or quad split)
      0, 1, 4,
      1, 5, 4,
      // Right face
      1, 2, 5,
      // Back face
      2, 3, 5,
      3, 4, 5,
      // Left face
      3, 0, 4,
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [w, d, overhang, slope]);

  const cx = w / 2;
  const cz = d / 2;

  return (
    <group position={[cx, yPos + SLAB_THICKNESS * 0.5, cz]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={roofMat.color}
          roughness={roofMat.roughness}
          metalness={roofMat.metalness}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Soffit (forro inferior) */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + overhang * 2, d + overhang * 2]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.8} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
