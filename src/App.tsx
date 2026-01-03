import { Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHandTracking } from "../hooks/usehandtracking";
import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "./components/drawing-canvas";
import ThreeScene from "./components/three-scene";

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingCanvasRef = useRef<DrawingCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [strokes, setStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDrawingPoint = useCallback((point: { x: number; y: number }) => {
    drawingCanvasRef.current?.addPoint(point);
  }, []);

  const handleDrawingEnd = useCallback(() => {
    drawingCanvasRef.current?.endStroke();
    const newStrokes = drawingCanvasRef.current?.getStrokes() || [];
    if (newStrokes.length > 0) {
      setStrokes((prevStrokes) => [...prevStrokes, ...newStrokes]);
    }
    drawingCanvasRef.current?.clear();
  }, []);

  const { isTracking, isDrawing, startTracking, stopTracking } =
    useHandTracking(
      videoRef as unknown as React.RefObject<HTMLVideoElement>,
      canvasRef as unknown as React.RefObject<HTMLCanvasElement>,
      handleDrawingPoint,
      handleDrawingEnd
    );

  // Update canvas size to match container size
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        setCanvasSize((prev) => {
          const widthDiff = Math.abs(prev.width - width);
          const heightDiff = Math.abs(prev.height - height);
          if (widthDiff > 5 || heightDiff > 5) {
            return { width, height };
          }
          return prev;
        });
      }
    };

    const debouncedResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateSize, 100);
    };

    // Initial size
    updateSize();

    // Use ResizeObserver for more accurate container size tracking
    const resizeObserver = new ResizeObserver(debouncedResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", debouncedResize);
    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener("resize", debouncedResize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current && canvasRef.current) {
        startTracking().catch((error) => {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to access camera. Please allow camera permissions."
          );
        });
      } else {
        setError("Video or canvas element not found");
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  const handleClear = () => {
    drawingCanvasRef.current?.clear();
    setStrokes([]);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-white flex items-center justify-center p-6 md:p-10">
      {/* Retro Window Frame */}
      <div
        className="relative w-full h-full max-w-6xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.15)]"
        style={{ border: "4px solid #F5D89A" }}
      >
        {/* Title Bar */}
        <div
          className="flex items-center justify-end px-4 py-2 shrink-0"
          style={{
            backgroundColor: "#F5D89A",
            borderBottom: "2px solid #132440",
          }}
        >
          {/* Window Controls */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-light" style={{ color: "#5D4037" }}>
              —
            </span>
            <span className="text-lg" style={{ color: "#5D4037" }}>
              □
            </span>
            <span className="text-xl" style={{ color: "#5D4037" }}>
              ×
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden"
          style={{ backgroundColor: "#F5F0E1" }}
        >
          {/* Video element - camera feed (hidden, used only for hand tracking) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: "scaleX(-1)",
              zIndex: 1,
              opacity: 0,
            }}
          />

          {/* Canvas for hand landmarks overlay */}
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: "scaleX(-1)",
              zIndex: 2,
            }}
          />

          {/* Drawing canvas - for current stroke preview */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: "scaleX(-1)",
              zIndex: 3,
            }}
          >
            <DrawingCanvas
              ref={drawingCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              isDrawing={isDrawing}
            />
          </div>

          {/* 3D Scene overlay */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ zIndex: 4 }}
          >
            <ThreeScene
              strokes={strokes}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
            />
          </div>

          {/* Status indicator */}
          <div
            className="absolute top-4 right-4 flex flex-col gap-1 items-end"
            style={{ zIndex: 10 }}
          >
            {/* Tracking status */}
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  isTracking ? "bg-green-500" : "bg-white"
                }`}
              />
              <span className="text-xs text-white bg-black/60 px-2 py-0.5 rounded">
                {isTracking ? "Hand detected" : "No hand"}
              </span>
            </div>
            {/* Drawing status */}
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  isDrawing ? "bg-blue-500" : "bg-white"
                }`}
              />
              <span className="text-xs text-white bg-black/60 px-2 py-0.5 rounded">
                {isDrawing ? "Drawing" : "Not drawing"}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2"
              style={{ zIndex: 10 }}
            >
              <div
                className="rounded-lg px-3 py-2"
                style={{ backgroundColor: "#D32F2F" }}
              >
                <p className="text-white text-xs">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Toolbar */}
        <div
          className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{
            backgroundColor: "#F5F0E1",
            borderTop: "2px solid #5D4037",
          }}
        >
          {/* Settings Icon */}
          <button
            className="p-2 transition-opacity hover:opacity-70"
            title="Settings"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5D4037"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <circle cx="8" cy="6" r="2" fill="#5D4037" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <circle cx="16" cy="12" r="2" fill="#5D4037" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="10" cy="18" r="2" fill="#5D4037" />
            </svg>
          </button>

          {/* Camera/Clear Button */}
          <button
            onClick={handleClear}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: "transparent",
              border: "3px solid #E07A5F",
            }}
            title="Clear Canvas"
          >
            <Trash2Icon className="w-6 h-6 text-red-500" />
          </button>

          {/* Fullscreen Icon */}
          <button
            className="p-2 transition-opacity hover:opacity-70"
            title="Fullscreen"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5D4037"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 14v6h6" />
              <path d="M20 10V4h-6" />
              <path d="M4 14l6-6" />
              <path d="M14 4l6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
