# 🎨 Air Canvas

Draw in thin air using just your hand! Air Canvas is a gesture-based drawing application that tracks your hand movements via webcam and transforms them into beautiful 3D clay-like strokes.

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
git clone "https://github.com/llaxmi/air-canvas.git"
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

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 7](https://vitejs.dev/)
- **Hand Tracking**: [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- **3D Rendering**: [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Three.js](https://threejs.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)


<p align="center">
  Made with 🖐️ and ❤️
</p>
