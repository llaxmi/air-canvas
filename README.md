# 🎨 Air Canvas

Draw in thin air using just your hand! Air Canvas is a gesture-based drawing application that tracks your hand movements via webcam and transforms them into beautiful 3D clay-like strokes.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)
![Three.js](https://img.shields.io/badge/Three.js-0.182-black?logo=threedotjs)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-4285f4?logo=google)

## ✨ Features

- **🖐️ Hand Gesture Drawing** — Point with your index finger to draw; lower other fingers to activate drawing mode
- **🎯 Real-time Hand Tracking** — Full hand skeleton visualization with 21 landmark points using MediaPipe
- **🪵 3D Clay Tubes** — Strokes are rendered as smooth, floating 3D tubes with a clay-like aesthetic
- **🌊 Smooth Curves** — Chaikin's algorithm and Bezier curves create buttery-smooth strokes
- **🔄 Interactive 3D View** — Orbit, zoom, and pan around your 3D creation
- **✨ Gentle Animations** — Subtle floating and rotation animations bring your art to life
- **🎨 Pleasing Color Palette** — Each stroke gets a unique color from a curated palette

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- A webcam
- Modern browser with WebGL support

### Installation

```bash
# Clone or navigate to the project
cd air-canvas

# Install dependencies
pnpm install   # or npm install

# Start development server
pnpm dev       # or npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and allow camera access when prompted.

## 🎮 How to Use

1. **Show your hand** to the camera — you'll see a blue skeleton overlay when detected
2. **To draw**: Extend only your **index finger** while keeping other fingers closed
3. **To stop drawing**: Extend more fingers or close your hand
4. **Navigate 3D**: Click and drag to orbit, scroll to zoom
5. **Clear canvas**: Click the trash button in the bottom toolbar

### Drawing Gesture

```
Drawing Mode:      ☝️ Index up, others down
Not Drawing:       ✋ Multiple fingers up or ✊ fist
```

## 🏗️ Architecture

```
air-canvas/
├── src/
│   ├── App.tsx                 # Main app with UI layout
│   └── ...
├── components/
│   ├── drawing-canvas.tsx      # 2D canvas for stroke preview
│   └── three-scene.tsx         # 3D scene with clay tubes
└── hooks/
    └── usehandtracking.ts      # MediaPipe hand tracking logic
```

### Key Components

| Component | Description |
|-----------|-------------|
| `useHandTracking` | Custom hook that handles MediaPipe integration, gesture detection, and coordinate smoothing |
| `DrawingCanvas` | 2D canvas for real-time stroke preview with quadratic Bezier curves |
| `ThreeScene` | React Three Fiber scene that renders strokes as 3D tubes with orbit controls |
| `ClayTube` | Individual 3D tube mesh with floating animation |

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 7](https://vitejs.dev/)
- **Hand Tracking**: [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- **3D Rendering**: [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Three.js](https://threejs.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## ⚡ Performance Optimizations

- **Lightweight smoothing** with exponential moving average for responsive yet stable tracking
- **Downsampling** of stroke points before 3D conversion
- **Cached canvas contexts** with `desynchronized` flag for lower latency
- **Memoized components** to prevent unnecessary re-renders
- **Optimized MediaPipe settings**: lite model, lower resolution for faster processing

## 📜 Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm preview    # Preview production build
pnpm lint       # Run ESLint
```

## 🎨 Customization

### Tube Appearance

Modify `ClayTube` in `components/three-scene.tsx`:

```tsx
// Change color palette
const hues = [186, 210, 280, 330, 45, 150];

// Adjust tube thickness
const radius = 0.12;

// Modify material properties
<meshStandardMaterial
  metalness={0.05}
  roughness={0.85}
/>
```

### Hand Tracking Sensitivity

Adjust in `hooks/usehandtracking.ts`:

```tsx
hands.setOptions({
  minDetectionConfidence: 0.4,  // Lower = faster, less accurate
  minTrackingConfidence: 0.4,
});
```

## 📄 License

MIT

---

<p align="center">
  Made with 🖐️ and ❤️
</p>
