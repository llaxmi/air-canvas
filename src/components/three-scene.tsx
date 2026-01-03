import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { memo, useMemo, useRef } from "react";
import * as THREE from "three";

interface Point {
  x: number;
  y: number;
}

// Chaikin's algorithm for smooth curves
function chaikinSmooth(
  points: { x: number; y: number }[],
  iterations: number = 2
): { x: number; y: number }[] {
  if (points.length < 3) return points;

  let result = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    const smoothed: { x: number; y: number }[] = [];
    smoothed.push(result[0]); // Keep first point

    for (let i = 0; i < result.length - 1; i++) {
      const p0 = result[i];
      const p1 = result[i + 1];

      // Q = 3/4 * P0 + 1/4 * P1
      smoothed.push({
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
      });

      // R = 1/4 * P0 + 3/4 * P1
      smoothed.push({
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
      });
    }

    smoothed.push(result[result.length - 1]); // Keep last point
    result = smoothed;
  }

  return result;
}

// Downsample points while preserving shape
function downsample(
  points: { x: number; y: number }[],
  targetCount: number
): { x: number; y: number }[] {
  if (points.length <= targetCount) return points;

  const step = (points.length - 1) / (targetCount - 1);
  const result: { x: number; y: number }[] = [];

  for (let i = 0; i < targetCount; i++) {
    const idx = Math.round(i * step);
    result.push(points[Math.min(idx, points.length - 1)]);
  }

  return result;
}

interface ClayTubeProps {
  stroke: Point[];
  index: number;
  canvasWidth: number;
  canvasHeight: number;
}

const ClayTube: React.FC<ClayTubeProps> = memo(
  ({ stroke, index, canvasWidth, canvasHeight }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    const geometry = useMemo(() => {
      if (stroke.length < 3) return null;

      // Normalize and center the points
      const normalizedPoints = stroke.map((p) => ({
        x: (p.x / canvasWidth - 0.5) * 5,
        y: -(p.y / canvasHeight - 0.5) * 4,
      }));

      // Downsample first to reduce computation
      const downsampled = downsample(
        normalizedPoints,
        Math.min(normalizedPoints.length, 30)
      );

      // Apply Chaikin smoothing for soft curves
      const smoothedPoints = chaikinSmooth(downsampled, 3);

      // Create 3D curve points with subtle Z variation
      const curve3DPoints = smoothedPoints.map((p, i) => {
        const z = Math.sin(i * 0.15) * 0.15 + index * 0.5;
        return new THREE.Vector3(p.x, p.y, z);
      });

      if (curve3DPoints.length < 2) return null;

      // Create smooth Catmull-Rom curve
      const curve = new THREE.CatmullRomCurve3(
        curve3DPoints,
        false,
        "catmullrom",
        0.5
      );

      // Create tube with optimized segments
      const tubularSegments = Math.min(curve3DPoints.length * 3, 64);
      const radialSegments = 12;
      const radius = 0.12;

      return new THREE.TubeGeometry(
        curve,
        tubularSegments,
        radius,
        radialSegments,
        false
      );
    }, [stroke, canvasWidth, canvasHeight, index]);

    // Gentle floating animation
    useFrame((state) => {
      if (meshRef.current) {
        const time = state.clock.elapsedTime;
        meshRef.current.position.y = Math.sin(time * 0.3 + index * 0.7) * 0.05;
        meshRef.current.rotation.z = Math.sin(time * 0.2 + index) * 0.02;
      }
    });

    if (!geometry) return null;

    // Generate pleasing clay-like colors
    const hues = [186, 210, 280, 330, 45, 150];
    const hue = hues[index % hues.length];

    return (
      <mesh ref={meshRef} geometry={geometry} position={[0, 0, index * 0.3]}>
        <meshStandardMaterial
          ref={materialRef}
          color={`hsl(${hue}, 55%, 55%)`}
          metalness={0.05}
          roughness={0.85}
          emissive={`hsl(${hue}, 70%, 20%)`}
          emissiveIntensity={0.1}
        />
      </mesh>
    );
  }
);

ClayTube.displayName = "ClayTube";

interface ThreeSceneProps {
  strokes: Point[][];
  canvasWidth: number;
  canvasHeight: number;
}

const ThreeScene: React.FC<ThreeSceneProps> = memo(
  ({ strokes, canvasWidth, canvasHeight }) => {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden">
        <Canvas
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true,
          }}
          frameloop="always"
          dpr={[1, 1.5]} // Limit pixel ratio for performance
          onCreated={({ gl }) => {
            gl.setClearColor("#000000", 0);
          }}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={50} />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            minDistance={2}
            maxDistance={15}
            enablePan={false}
          />

          {/* Optimized lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.7} />
          <directionalLight position={[-3, 2, 4]} intensity={0.3} />
          <hemisphereLight args={["#b1e1ff", "#b97a20", 0.3]} />

          {strokes.map((stroke, index) => (
            <ClayTube
              key={`stroke-${index}-${stroke.length}`}
              stroke={stroke}
              index={index}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
            />
          ))}
        </Canvas>
      </div>
    );
  }
);

ThreeScene.displayName = "ThreeScene";

export default ThreeScene;
