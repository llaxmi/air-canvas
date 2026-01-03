import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";

interface Point {
  x: number;
  y: number;
}

// Chaikin's algorithm for smooth curves - optimized with pre-allocated arrays
const chaikinSmooth = (points: Point[], iterations = 2): Point[] => {
  if (points.length < 3) return points;

  let result = points;

  for (let iter = 0; iter < iterations; iter++) {
    const len = result.length;
    // Pre-calculate size: first + (pairs * 2) + last
    const smoothed = new Array<Point>(1 + (len - 1) * 2 + 1);
    let idx = 0;

    smoothed[idx++] = result[0]; // Keep first point

    for (let i = 0; i < len - 1; i++) {
      const p0 = result[i];
      const p1 = result[i + 1];
      smoothed[idx++] = {
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
      };
      smoothed[idx++] = {
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
      };
    }

    smoothed[idx] = result[len - 1]; // Keep last point
    result = smoothed;
  }

  return result;
};

// Downsample points while preserving shape - optimized
const downsample = (points: Point[], targetCount: number): Point[] => {
  const len = points.length;
  if (len <= targetCount) return points;

  const step = (len - 1) / (targetCount - 1);
  const result = new Array<Point>(targetCount);

  for (let i = 0; i < targetCount; i++) {
    result[i] = points[Math.min(Math.round(i * step), len - 1)];
  }

  return result;
};

// Color palette - computed once
const HUES = [186, 210, 280, 330, 45, 150] as const;
const TUBE_RADIUS = 0.12;
const RADIAL_SEGMENTS = 12;

interface ClayTubeProps {
  stroke: Point[];
  index: number;
  canvasWidth: number;
  canvasHeight: number;
}

const ClayTube = memo<ClayTubeProps>(
  ({ stroke, index, canvasWidth, canvasHeight }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Pre-compute scale factors
    const scaleX = 5 / canvasWidth;
    const scaleY = 4 / canvasHeight;
    const zOffset = index * 0.5;

    const geometry = useMemo(() => {
      if (stroke.length < 3) return null;

      // Normalize, center, and downsample in one pass
      const maxPoints = Math.min(stroke.length, 30);
      const step =
        stroke.length > maxPoints ? (stroke.length - 1) / (maxPoints - 1) : 1;
      const normalizedPoints: Point[] = [];

      for (let i = 0; i < maxPoints; i++) {
        const p = stroke[Math.min(Math.round(i * step), stroke.length - 1)];
        normalizedPoints.push({
          x: p.x * scaleX - 2.5,
          y: -(p.y * scaleY - 2),
        });
      }

      // Apply Chaikin smoothing
      const smoothedPoints = chaikinSmooth(normalizedPoints, 3);

      // Create 3D curve points with subtle Z variation
      const curve3DPoints = smoothedPoints.map(
        (p, i) =>
          new THREE.Vector3(p.x, p.y, Math.sin(i * 0.15) * 0.15 + zOffset)
      );

      if (curve3DPoints.length < 2) return null;

      const curve = new THREE.CatmullRomCurve3(
        curve3DPoints,
        false,
        "catmullrom",
        0.5
      );
      const tubularSegments = Math.min(curve3DPoints.length * 3, 64);

      return new THREE.TubeGeometry(
        curve,
        tubularSegments,
        TUBE_RADIUS,
        RADIAL_SEGMENTS,
        false
      );
    }, [stroke, scaleX, scaleY, zOffset]);

    // Gentle floating animation - only update when mesh exists
    useFrame(({ clock }) => {
      const mesh = meshRef.current;
      if (mesh) {
        const t = clock.elapsedTime;
        mesh.position.y = Math.sin(t * 0.3 + index * 0.7) * 0.05;
        mesh.rotation.z = Math.sin(t * 0.2 + index) * 0.02;
      }
    });

    // Memoize color values
    const hue = HUES[index % HUES.length];
    const colors = useMemo(
      () => ({
        main: `hsl(${hue}, 55%, 55%)`,
        emissive: `hsl(${hue}, 70%, 20%)`,
      }),
      [hue]
    );

    if (!geometry) return null;

    return (
      <mesh ref={meshRef} geometry={geometry} position={[0, 0, index * 0.3]}>
        <meshStandardMaterial
          color={colors.main}
          metalness={0.05}
          roughness={0.85}
          emissive={colors.emissive}
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

// GL config - static, defined once
const GL_CONFIG = {
  alpha: true,
  antialias: true,
  powerPreference: "high-performance" as const,
  stencil: false,
  depth: true,
};

const ThreeScene = memo<ThreeSceneProps>(
  ({ strokes, canvasWidth, canvasHeight }) => {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden">
        <Canvas
          gl={GL_CONFIG}
          frameloop="always"
          dpr={[1, 1.5]}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
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
              key={index}
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
