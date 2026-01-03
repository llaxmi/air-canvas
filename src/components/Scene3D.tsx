import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface DrawingPath {
  x: number;
  y: number;
  z: number;
  color: string;
}

interface Scene3DProps {
  paths: DrawingPath[][];
}

export default function Scene3D({ paths }: Scene3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  const createTubeFromPath = (path: DrawingPath[]) => {
    if (path.length === 0) return null;
    
    // Single point - create a sphere
    if (path.length === 1) {
      const point = path[0];
      const color = new THREE.Color(point.color);
      const geometry = new THREE.SphereGeometry(0.1, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.3,
        roughness: 0.4,
        emissive: color,
        emissiveIntensity: 0.3,
      });
      const sphere = new THREE.Mesh(geometry, material);
      // Position at origin (will be centered by normalization)
      sphere.position.set(0, 0, 0);
      return sphere;
    }

    // Find min/max for normalization
    const xs = path.map(p => p.x);
    const ys = path.map(p => p.y);
    const zs = path.map(p => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const rangeZ = maxZ - minZ || 0.1;

    // Create a 3D curve from the path points
    const points: THREE.Vector3[] = path.map((point) => {
      // Normalize and center coordinates
      const normalizedX = ((point.x - minX) / rangeX - 0.5) * 4;
      const normalizedY = ((point.y - minY) / rangeY - 0.5) * -4; // Flip Y
      const normalizedZ = ((point.z - minZ) / rangeZ) * 0.5; // Scale Z depth
      return new THREE.Vector3(normalizedX, normalizedY, normalizedZ);
    });

    // Create a CatmullRomCurve3 for smooth interpolation
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    
    // Get the color from the first point
    const color = new THREE.Color(path[0].color);

    // Calculate tube radius based on path length
    const tubeRadius = Math.max(0.02, Math.min(0.1, 0.05 + path.length * 0.001));

    // Create tube geometry with smooth segments
    const segments = Math.max(50, path.length * 2);
    const geometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.4,
      emissive: color,
      emissiveIntensity: 0.2,
    });

    return new THREE.Mesh(geometry, material);
  };

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />
      
      {paths.map((path, pathIndex) => {
        const mesh = createTubeFromPath(path);
        if (!mesh) return null;
        return <primitive key={pathIndex} object={mesh} />;
      })}
    </group>
  );
}

