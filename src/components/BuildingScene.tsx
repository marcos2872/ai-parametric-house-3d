"use client";

import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import type { ArchitecturalProject, Room, Opening } from "@/lib/schema";
import { STYLE_DEFAULTS } from "@/lib/defaults";
import { getMaterial, type PBRMaterialDef } from "@/lib/material-system";

// Sub-components
import WindowMesh from "./three/WindowMesh";
import DoorMesh from "./three/DoorMesh";
import ProceduralRoof from "./three/ProceduralRoof";
import Terrain from "./three/Terrain";
import Pool from "./three/Pool";
import Vegetation from "./three/Vegetation";

// --- Constants ---
const WALL_THICKNESS = 0.15;
const SLAB_THICKNESS = 0.15;

// --- Simple merge geometries utility ---
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIdx = 0;

  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIdx += g.index ? g.index.count : 0;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIdx);

  let vertOffset = 0;
  let idxOffset = 0;

  for (const g of geos) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const idx = g.index;

    for (let i = 0; i < pos.count * 3; i++) {
      positions[vertOffset * 3 + i] = (pos.array as Float32Array)[i];
    }
    if (norm) {
      for (let i = 0; i < norm.count * 3; i++) {
        normals[vertOffset * 3 + i] = (norm.array as Float32Array)[i];
      }
    }
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[idxOffset + i] = (idx.array as Uint16Array | Uint32Array)[i] + vertOffset;
      }
      idxOffset += idx.count;
    }

    vertOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  if (totalIdx > 0) {
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
  }

  return merged;
}

// --- Merged walls geometry (single draw call) ---
function MergedWalls({ project, facadeMat }: { project: ArchitecturalProject; facadeMat: PBRMaterialDef }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;

  const geometry = useMemo(() => {
    const geometries: THREE.BoxGeometry[] = [];

    for (const room of project.rooms) {
      const yBase = room.floor * styleDefaults.floorHeight;
      const h = room.height;
      const w = room.width;
      const d = room.depth;
      const t = WALL_THICKNESS;

      const roomOpenings = project.openings.filter((o) => o.room === room.name);

      const wallDefs = [
        { dir: "south" as const, px: room.x + w / 2, py: yBase + h / 2, pz: room.z, sx: w, sy: h, sz: t },
        { dir: "north" as const, px: room.x + w / 2, py: yBase + h / 2, pz: room.z + d, sx: w, sy: h, sz: t },
        { dir: "west" as const, px: room.x, py: yBase + h / 2, pz: room.z + d / 2, sx: t, sy: h, sz: d },
        { dir: "east" as const, px: room.x + w, py: yBase + h / 2, pz: room.z + d / 2, sx: t, sy: h, sz: d },
      ];

      for (const wall of wallDefs) {
        const hasOpening = roomOpenings.some((o) => o.wall === wall.dir);
        if (!hasOpening) {
          const geo = new THREE.BoxGeometry(wall.sx, wall.sy, wall.sz);
          const mat = new THREE.Matrix4().makeTranslation(wall.px, wall.py, wall.pz);
          geo.applyMatrix4(mat);
          geometries.push(geo);
        }
      }
    }

    if (geometries.length === 0) return new THREE.BufferGeometry();

    const merged = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    return merged;
  }, [project, styleDefaults]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={facadeMat.color}
        roughness={facadeMat.roughness}
        metalness={facadeMat.metalness}
        envMapIntensity={0.8}
      />
    </mesh>
  );
}

// --- Openings (windows & doors) using proper geometry ---
function OpeningsGroup({ project }: { project: ArchitecturalProject }) {
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;

  if (project.openings.length === 0) return null;

  return (
    <>
      {project.openings.map((op, i) => {
        const room = project.rooms.find((r) => r.name === op.room);
        if (!room) return null;

        const yBase = room.floor * styleDefaults.floorHeight;
        const isXWall = op.wall === "south" || op.wall === "north";

        let px: number, py: number, pz: number;
        py = yBase + op.elevation + op.height / 2;

        if (op.wall === "south") {
          px = room.x + room.width / 2;
          pz = room.z;
        } else if (op.wall === "north") {
          px = room.x + room.width / 2;
          pz = room.z + room.depth;
        } else if (op.wall === "west") {
          px = room.x;
          pz = room.z + room.depth / 2;
        } else {
          px = room.x + room.width;
          pz = room.z + room.depth / 2;
        }

        if (op.type === "window") {
          return (
            <WindowMesh
              key={`opening-${i}`}
              opening={op}
              position={[px, py, pz]}
              isXWall={isXWall}
              frameMaterial={project.materials.frames}
            />
          );
        }

        return (
          <DoorMesh
            key={`opening-${i}`}
            opening={op}
            position={[px, py, pz]}
            isXWall={isXWall}
            frameMaterial={project.materials.frames}
          />
        );
      })}
    </>
  );
}

// --- Wall segments around openings ---
function WallsWithOpenings({ project, facadeMat }: { project: ArchitecturalProject; facadeMat: PBRMaterialDef }) {
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;
  const segments: React.ReactNode[] = [];

  for (const room of project.rooms) {
    const roomOpenings = project.openings.filter((o) => o.room === room.name);
    if (roomOpenings.length === 0) continue;

    const yBase = room.floor * styleDefaults.floorHeight;
    const h = room.height;
    const w = room.width;
    const d = room.depth;
    const t = WALL_THICKNESS;

    for (const op of roomOpenings) {
      const isXWall = op.wall === "south" || op.wall === "north";
      const wallLength = isXWall ? w : d;

      let wallPx: number, wallPz: number;
      if (op.wall === "south") { wallPx = room.x + w / 2; wallPz = room.z; }
      else if (op.wall === "north") { wallPx = room.x + w / 2; wallPz = room.z + d; }
      else if (op.wall === "west") { wallPx = room.x; wallPz = room.z + d / 2; }
      else { wallPx = room.x + w; wallPz = room.z + d / 2; }

      const opH = op.height;
      const opElev = op.elevation;

      // Above opening
      const aboveH = h - (opElev + opH);
      if (aboveH > 0.05) {
        const ay = yBase + opElev + opH + aboveH / 2;
        const args: [number, number, number] = isXWall
          ? [wallLength, aboveH, t]
          : [t, aboveH, wallLength];
        segments.push(
          <mesh key={`${room.name}-${op.wall}-above-${op.type}`} position={[wallPx, ay, wallPz]}>
            <boxGeometry args={args} />
            <meshStandardMaterial color={facadeMat.color} roughness={facadeMat.roughness} metalness={facadeMat.metalness} />
          </mesh>
        );
      }

      // Below opening (peitoril)
      if (opElev > 0.05) {
        const by = yBase + opElev / 2;
        const args: [number, number, number] = isXWall
          ? [wallLength, opElev, t]
          : [t, opElev, wallLength];
        segments.push(
          <mesh key={`${room.name}-${op.wall}-below-${op.type}`} position={[wallPx, by, wallPz]}>
            <boxGeometry args={args} />
            <meshStandardMaterial color={facadeMat.color} roughness={facadeMat.roughness} metalness={facadeMat.metalness} />
          </mesh>
        );
      }

      // Left/right sides
      const sideW = (wallLength - op.width) / 2;
      if (sideW > 0.05) {
        const sideY = yBase + opElev + opH / 2;
        if (isXWall) {
          segments.push(
            <mesh key={`${room.name}-${op.wall}-left`} position={[wallPx - wallLength / 2 + sideW / 2, sideY, wallPz]}>
              <boxGeometry args={[sideW, opH, t]} />
              <meshStandardMaterial color={facadeMat.color} roughness={facadeMat.roughness} metalness={facadeMat.metalness} />
            </mesh>
          );
          segments.push(
            <mesh key={`${room.name}-${op.wall}-right`} position={[wallPx + wallLength / 2 - sideW / 2, sideY, wallPz]}>
              <boxGeometry args={[sideW, opH, t]} />
              <meshStandardMaterial color={facadeMat.color} roughness={facadeMat.roughness} metalness={facadeMat.metalness} />
            </mesh>
          );
        } else {
          segments.push(
            <mesh key={`${room.name}-${op.wall}-left`} position={[wallPx, sideY, wallPz - wallLength / 2 + sideW / 2]}>
              <boxGeometry args={[t, opH, sideW]} />
              <meshStandardMaterial color={facadeMat.color} roughness={facadeMat.roughness} metalness={facadeMat.metalness} />
            </mesh>
          );
          segments.push(
            <mesh key={`${room.name}-${op.wall}-right`} position={[wallPx, sideY, wallPz + wallLength / 2 - sideW / 2]}>
              <boxGeometry args={[t, opH, sideW]} />
              <meshStandardMaterial color={facadeMat.color} roughness={facadeMat.roughness} metalness={facadeMat.metalness} />
            </mesh>
          );
        }
      }
    }
  }

  return <>{segments}</>;
}

// --- Floor slabs with PBR materials ---
function FloorSlabs({ project }: { project: ArchitecturalProject }) {
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;
  return (
    <>
      {project.rooms.map((room) => {
        const yBase = room.floor * styleDefaults.floorHeight;
        const floorMatName = room.floorMaterial || "porcelain_gray";
        const floorMat = getMaterial(floorMatName);
        return (
          <mesh
            key={`slab-${room.name}-${room.floor}`}
            position={[room.x + room.width / 2, yBase, room.z + room.depth / 2]}
            receiveShadow
          >
            <boxGeometry args={[room.width, SLAB_THICKNESS, room.depth]} />
            <meshStandardMaterial
              color={floorMat.color}
              roughness={floorMat.roughness}
              metalness={floorMat.metalness}
              envMapIntensity={0.5}
            />
          </mesh>
        );
      })}
    </>
  );
}

// --- Deferred content loader (waits 1 frame before rendering heavy content) ---
function DeferredContent({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useFrame(() => {
    if (!ready) setReady(true);
  });
  if (!ready) return null;
  return <>{children}</>;
}

// --- Building content ---
function BuildingContent({ project, roofVisible }: { project: ArchitecturalProject; roofVisible: boolean }) {
  const facadeMat = getMaterial(project.materials.facade);
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;
  const centerX = project.footprint.width / 2;
  const centerZ = project.footprint.depth / 2;

  return (
    <>
      <Terrain project={project} />
      <FloorSlabs project={project} />
      <MergedWalls project={project} facadeMat={facadeMat} />
      <WallsWithOpenings project={project} facadeMat={facadeMat} />
      <OpeningsGroup project={project} />
      {roofVisible && <ProceduralRoof project={project} />}

      {/* Pool */}
      {project.pool && <Pool pool={project.pool} />}

      {/* Vegetation */}
      {project.vegetation && project.vegetation.length > 0 && (
        <Vegetation items={project.vegetation} />
      )}

      <OrbitControls target={[centerX, styleDefaults.floorHeight, centerZ]} />
    </>
  );
}

// --- Main scene ---
interface BuildingSceneProps {
  project: ArchitecturalProject | null;
  roofVisible?: boolean;
}

export default function BuildingScene({ project, roofVisible = true }: BuildingSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: [20, 12, 20], fov: 50 }}
        style={{ background: "#0d1117" }}
        gl={{
          antialias: true,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
        }}
        frameloop="demand"
        onCreated={({ gl, invalidate }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          setTimeout(() => invalidate(), 100);
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
          });
          canvas.addEventListener("webglcontextrestored", () => {
            invalidate();
          });
        }}
      >
        {/* Lighting — multi-directional for soft look without env map */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[15, 25, 10]} intensity={0.9} color="#fff5e6" />
        <directionalLight position={[-10, 15, -10]} intensity={0.3} color="#e6f0ff" />
        <directionalLight position={[0, 10, 20]} intensity={0.2} color="#ffffff" />
        <hemisphereLight args={["#87ceeb", "#4a7c3f", 0.3]} />

        {/* Fog */}
        <fog attach="fog" args={["#0d1117", 45, 100]} />

        {project ? (
          <DeferredContent>
            <BuildingContent project={project} roofVisible={roofVisible} />
          </DeferredContent>
        ) : (
          <OrbitControls />
        )}

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport />
        </GizmoHelper>
      </Canvas>

      {!project && (
        <div className="scene-empty-overlay">
          <p>Digite um prompt para gerar a volumetria 3D</p>
        </div>
      )}
    </div>
  );
}
