import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function docTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 680;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f7f9fc";
  g.fillRect(0, 0, 512, 680);
  g.fillStyle = "#1e3a8a";
  g.fillRect(40, 48, 160, 22);
  g.fillStyle = "#94a3b8";
  g.font = "bold 28px sans-serif";
  g.fillStyle = "#0f1b3d";
  g.fillText("OFFER LETTER", 40, 130);
  const lines = [180, 210, 240, 300, 330, 360, 390, 450, 480, 510];
  lines.forEach((y, i) => {
    g.fillStyle = i === 4 ? "#ef4444" : i === 7 ? "#f59e0b" : "#cbd5e1";
    g.fillRect(40, y, i % 3 === 2 ? 280 : 430, 10);
  });
  g.fillStyle = "#cbd5e1";
  g.fillRect(40, 590, 140, 10);
  g.fillRect(40, 610, 100, 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Doc({ reduced }: { reduced: boolean }) {
  const tex = useMemo(docTexture, []);
  const scan = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (scan.current && !reduced) scan.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 1.5;
  });
  return (
    <group rotation={[-0.12, -0.38, 0.06]} position={[-0.4, 0, 0]}>
      <RoundedBox args={[2.6, 3.4, 0.05]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, 0.027]}>
        <planeGeometry args={[2.5, 3.3]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
      <mesh ref={scan} position={[0, 0, 0.05]}>
        <planeGeometry args={[2.7, 0.05]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Shield() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 1);
    s.bezierCurveTo(0.45, 0.85, 0.8, 0.8, 0.8, 0.8);
    s.lineTo(0.8, 0.1);
    s.bezierCurveTo(0.8, -0.5, 0.35, -0.85, 0, -1);
    s.bezierCurveTo(-0.35, -0.85, -0.8, -0.5, -0.8, 0.1);
    s.lineTo(-0.8, 0.8);
    s.bezierCurveTo(-0.8, 0.8, -0.45, 0.85, 0, 1);
    return s;
  }, []);
  return (
    <group position={[1.35, -0.75, 0.9]} scale={0.75} rotation={[0, -0.5, 0]}>
      <mesh>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.25,
              bevelEnabled: true,
              bevelThickness: 0.08,
              bevelSize: 0.06,
              bevelSegments: 4,
            },
          ]}
        />
        <meshStandardMaterial color="#2c4fb8" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.02, 0.36]} rotation={[0, 0, -0.78]}>
        <boxGeometry args={[0.16, 0.7, 0.08]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.2, -0.1, 0.36]} rotation={[0, 0, 0.78]}>
        <boxGeometry args={[0.16, 0.38, 0.08]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Marker({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <Float speed={2} floatIntensity={0.6} rotationIntensity={0.4}>
      <mesh position={position}>
        <octahedronGeometry args={[0.13]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.3} />
      </mesh>
    </Float>
  );
}

export default function HeroScene({ dark, reduced }: { dark: boolean; reduced: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={reduced ? "demand" : "always"}
      onCreated={({ gl }) =>
        gl.domElement.parentElement?.parentElement?.setAttribute("data-scene-ready", "true")
      }
    >
      <ambientLight intensity={dark ? 0.5 : 0.8} />
      <directionalLight position={[3, 4, 5]} intensity={dark ? 1.4 : 1.8} />
      <pointLight position={[-3, -1, 2]} intensity={dark ? 6 : 2} color="#60a5fa" />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer
          intensity={1.2}
          color="#9ec5ff"
          position={[-5, 1, -1]}
          rotation-y={Math.PI / 2}
          scale={[20, 1, 1]}
        />
        <Lightformer
          intensity={1}
          position={[5, 0, 2]}
          rotation-y={-Math.PI / 2}
          scale={[10, 2, 1]}
        />
      </Environment>
      <Float speed={reduced ? 0 : 1.2} rotationIntensity={0.25} floatIntensity={0.5}>
        <Doc reduced={reduced} />
        <Shield />
      </Float>
      <Marker position={[-2.1, 1.3, 0.6]} color="#ef4444" />
      <Marker position={[1.8, 1.5, 0.2]} color="#f59e0b" />
      <Marker position={[-1.9, -1.4, 0.8]} color="#22c55e" />
    </Canvas>
  );
}
