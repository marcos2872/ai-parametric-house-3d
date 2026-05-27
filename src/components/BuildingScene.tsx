"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import type { ArchitecturalProject, Room, Opening } from "@/lib/schema";
import { STYLE_DEFAULTS } from "@/lib/defaults";

// --- Constants ---
const WALL_THICKNESS = 0.15;
const SLAB_THICKNESS = 0.15;

// --- Color mapping ---
const MATERIAL_COLORS: Record<string, string> = {
  concrete_white: "#f5f5f5",
  concrete_gray: "#9e9e9e",
  concrete_raw: "#bdbdbd",
  plaster_beige: "#f5e6d3",
  clay_tile: "#c75b39",
  stucco_white: "#fafafa",
  metal_dark: "#424242",
  wood_brown: "#8d6e63",
  aluminum_black: "#212121",
  aluminum_gray: "#757575",
  glass: "#b3e5fc",
  "white plaster": "#f8f8f8",
  concrete: "#a0a0a0",
  "black aluminum": "#1a1a1a",
};

function getColor(material: string): string {
  return MATERIAL_COLORS[material] || "#e0e0e0";
}

// --- Merged walls geometry (single draw call) ---
function MergedWalls({ project, facadeColor }: { project: ArchitecturalProject; facadeColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;

  const geometry = React.useMemo(() => {
    const geometries: THREE.BoxGeometry[] = [];
    const matrices: THREE.Matrix4[] = [];

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
    // Dispose individual geometries
    geometries.forEach((g) => g.dispose());
    return merged;
  }, [project, styleDefaults]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color={facadeColor} />
    </mesh>
  );
}

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

// We need React import for useMemo in MergedWalls
import React from "react";

// --- Openings (doors/windows) as separate simple meshes ---
function Openings({ project }: { project: ArchitecturalProject }) {
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;

  if (project.openings.length === 0) return null;

  return (
    <>
      {project.openings.map((op, i) => {
        const room = project.rooms.find((r) => r.name === op.room);
        if (!room) return null;

        const yBase = room.floor * styleDefaults.floorHeight;
        const isXWall = op.wall === "south" || op.wall === "north";
        const t = WALL_THICKNESS;

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

        const size: [number, number, number] = isXWall
          ? [op.width, op.height, t + 0.02]
          : [t + 0.02, op.height, op.width];

        const color = op.type === "window" ? "#87ceeb" : "#5d4037";
        const opacity = op.type === "window" ? 0.35 : 0.85;

        return (
          <mesh key={`opening-${i}`} position={[px, py, pz]}>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </>
  );
}

// --- Wall segments around openings ---
function WallsWithOpenings({ project, facadeColor }: { project: ArchitecturalProject; facadeColor: string }) {
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
        if (isXWall) {
          segments.push(
            <mesh key={`${room.name}-${op.wall}-above-${op.type}`} position={[wallPx, ay, wallPz]}>
              <boxGeometry args={[wallLength, aboveH, t]} />
              <meshStandardMaterial color={facadeColor} />
            </mesh>
          );
        } else {
          segments.push(
            <mesh key={`${room.name}-${op.wall}-above-${op.type}`} position={[wallPx, ay, wallPz]}>
              <boxGeometry args={[t, aboveH, wallLength]} />
              <meshStandardMaterial color={facadeColor} />
            </mesh>
          );
        }
      }

      // Below opening (peitoril)
      if (opElev > 0.05) {
        const by = yBase + opElev / 2;
        if (isXWall) {
          segments.push(
            <mesh key={`${room.name}-${op.wall}-below-${op.type}`} position={[wallPx, by, wallPz]}>
              <boxGeometry args={[wallLength, opElev, t]} />
              <meshStandardMaterial color={facadeColor} />
            </mesh>
          );
        } else {
          segments.push(
            <mesh key={`${room.name}-${op.wall}-below-${op.type}`} position={[wallPx, by, wallPz]}>
              <boxGeometry args={[t, opElev, wallLength]} />
              <meshStandardMaterial color={facadeColor} />
            </mesh>
          );
        }
      }

      // Left/right sides
      const sideW = (wallLength - op.width) / 2;
      if (sideW > 0.05) {
        const sideY = yBase + opElev + opH / 2;
        if (isXWall) {
          segments.push(
            <mesh key={`${room.name}-${op.wall}-left`} position={[wallPx - wallLength / 2 + sideW / 2, sideY, wallPz]}>
              <boxGeometry args={[sideW, opH, t]} />
              <meshStandardMaterial color={facadeColor} />
            </mesh>
          );
          segments.push(
            <mesh key={`${room.name}-${op.wall}-right`} position={[wallPx + wallLength / 2 - sideW / 2, sideY, wallPz]}>
              <boxGeometry args={[sideW, opH, t]} />
              <meshStandardMaterial color={facadeColor} />
            </mesh>
          );
        } else {
          segments.push(
            <mesh key={`${room.name}-${op.wall}-left`} position={[wallPx, sideY, wallPz - wallLength / 2 + sideW / 2]}>
              <boxGeometry args={[t, opH, sideW]} />
              <meshStandardMaterial color={facadeColor} />
            </mesh>
          );
          segments.push(
            <mesh key={`${room.name}-${op.wall}-right`} position={[wallPx, sideY, wallPz + wallLength / 2 - sideW / 2]}>
              <boxGeometry args={[t, opH, sideW]} />
              <meshStandardMaterial color={facadeColor} />
            </mesh>
          );
        }
      }
    }
  }

  return <>{segments}</>;
}

// --- Floor slabs ---
function FloorSlabs({ project }: { project: ArchitecturalProject }) {
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;
  return (
    <>
      {project.rooms.map((room) => {
        const yBase = room.floor * styleDefaults.floorHeight;
        return (
          <mesh key={`slab-${room.name}-${room.floor}`} position={[room.x + room.width / 2, yBase, room.z + room.depth / 2]}>
            <boxGeometry args={[room.width, SLAB_THICKNESS, room.depth]} />
            <meshStandardMaterial color="#d0d0d0" />
          </mesh>
        );
      })}
    </>
  );
}

// --- Roof ---
function RoofBlock({ project }: { project: ArchitecturalProject }) {
  const { footprint, stories, roof } = project;
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;
  const yPos = stories * styleDefaults.floorHeight + SLAB_THICKNESS;
  const roofColor = getColor(project.materials.roof);
  const overhang = roof.overhang;

  if (roof.type === "flat") {
    return (
      <mesh position={[footprint.width / 2, yPos + 0.1, footprint.depth / 2]}>
        <boxGeometry args={[footprint.width + overhang * 2, 0.2, footprint.depth + overhang * 2]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>
    );
  }

  if (roof.type === "gable") {
    const roofHeight = Math.tan((roof.slope * Math.PI) / 180) * (footprint.depth / 2);
    const roofWidth = footprint.width + overhang * 2;
    const slopeRad = (roof.slope * Math.PI) / 180;
    const panelLength = (footprint.depth / 2) / Math.cos(slopeRad);

    return (
      <group position={[footprint.width / 2, yPos, footprint.depth / 2]}>
        <mesh position={[0, roofHeight / 2, -footprint.depth / 4]} rotation={[slopeRad, 0, 0]}>
          <boxGeometry args={[roofWidth, 0.1, panelLength + overhang]} />
          <meshStandardMaterial color={roofColor} />
        </mesh>
        <mesh position={[0, roofHeight / 2, footprint.depth / 4]} rotation={[-slopeRad, 0, 0]}>
          <boxGeometry args={[roofWidth, 0.1, panelLength + overhang]} />
          <meshStandardMaterial color={roofColor} />
        </mesh>
      </group>
    );
  }

  // Hip
  const roofHeight = Math.tan((roof.slope * Math.PI) / 180) * Math.min(footprint.width, footprint.depth) / 2;
  return (
    <mesh position={[footprint.width / 2, yPos + roofHeight / 2, footprint.depth / 2]}>
      <coneGeometry args={[Math.max(footprint.width, footprint.depth) * 0.7, roofHeight, 4]} />
      <meshStandardMaterial color={roofColor} />
    </mesh>
  );
}

// --- Lot ---
function LotPlane({ project }: { project: ArchitecturalProject }) {
  return (
    <mesh position={[project.footprint.width / 2, -0.05, project.footprint.depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[project.lot.width, project.lot.depth]} />
      <meshStandardMaterial color="#4a7c59" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
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
function BuildingContent({ project }: { project: ArchitecturalProject }) {
  const facadeColor = getColor(project.materials.facade);
  const styleDefaults = STYLE_DEFAULTS[project.style] || STYLE_DEFAULTS.modern;
  const centerX = project.footprint.width / 2;
  const centerZ = project.footprint.depth / 2;

  return (
    <>
      <LotPlane project={project} />
      <FloorSlabs project={project} />
      <MergedWalls project={project} facadeColor={facadeColor} />
      <WallsWithOpenings project={project} facadeColor={facadeColor} />
      <Openings project={project} />
      <RoofBlock project={project} />
      <OrbitControls target={[centerX, styleDefaults.floorHeight, centerZ]} />
    </>
  );
}

// --- Main scene ---
interface BuildingSceneProps {
  project: ArchitecturalProject | null;
}

export default function BuildingScene({ project }: BuildingSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        camera={{ position: [20, 12, 20], fov: 50 }}
        style={{ background: "#1a1a2e" }}
        gl={{ antialias: true, powerPreference: "default", failIfMajorPerformanceCaveat: false }}
        frameloop="demand"
        onCreated={({ gl, invalidate }) => {
          // Switch to continuous after first frame
          setTimeout(() => {
            invalidate();
          }, 100);
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
          });
          canvas.addEventListener("webglcontextrestored", () => {
            invalidate();
          });
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[15, 20, 10]} intensity={0.7} />

        {project ? (
          <DeferredContent>
            <BuildingContent project={project} />
          </DeferredContent>
        ) : (
          <OrbitControls />
        )}

        <Grid
          args={[50, 50]}
          position={[0, -0.1, 0]}
          cellSize={1}
          cellColor="#444444"
          sectionSize={5}
          sectionColor="#666666"
          fadeDistance={50}
        />
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
