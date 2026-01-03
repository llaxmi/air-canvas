import { Hands, type Results } from "@mediapipe/hands";
import { useCallback, useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface HandTrackingState {
  isTracking: boolean;
  indexFingerTip: Point | null;
  isDrawing: boolean;
  handDetected: boolean;
}

// Hand landmark indices
const FINGERTIPS = [4, 8, 12, 16, 20] as const;

// Hand connections for skeleton drawing - defined once
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
] as const;

// Canvas context options
const CTX_OPTIONS = { alpha: true, desynchronized: true } as const;

// Video constraints
const VIDEO_CONSTRAINTS = {
  width: { ideal: 480, max: 640 },
  height: { ideal: 360, max: 480 },
  facingMode: "user",
  frameRate: { ideal: 30, max: 30 },
} as const;

// MediaPipe options
const HANDS_OPTIONS = {
  maxNumHands: 1,
  modelComplexity: 0,
  minDetectionConfidence: 0.4,
  minTrackingConfidence: 0.4,
} as const;

// Lightweight exponential smoothing
class LightSmoother {
  private lastX = 0;
  private lastY = 0;
  private hasLast = false;
  private readonly factor: number;

  constructor(factor = 0.6) {
    this.factor = factor;
  }

  smooth(x: number, y: number): Point {
    if (!this.hasLast) {
      this.lastX = x;
      this.lastY = y;
      this.hasLast = true;
      return { x, y };
    }

    this.lastX += (x - this.lastX) * this.factor;
    this.lastY += (y - this.lastY) * this.factor;
    return { x: this.lastX, y: this.lastY };
  }

  reset() {
    this.hasLast = false;
  }
}

export const useHandTracking = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onDrawingPoint: (point: Point) => void,
  onDrawingEnd: () => void
) => {
  const [state, setState] = useState<HandTrackingState>({
    isTracking: false,
    indexFingerTip: null,
    isDrawing: false,
    handDetected: false,
  });

  const handsRef = useRef<Hands | null>(null);
  const animationFrameRef = useRef<number>(0);
  const prevDrawingState = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const pointSmootherRef = useRef(new LightSmoother(0.8));
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Stable callback refs
  const onDrawingPointRef = useRef(onDrawingPoint);
  const onDrawingEndRef = useRef(onDrawingEnd);
  onDrawingPointRef.current = onDrawingPoint;
  onDrawingEndRef.current = onDrawingEnd;

  // Check if finger is extended (tip above PIP above MCP)
  const isFingerExtended = (landmarks: Results["multiHandLandmarks"][0], tipIdx: number, pipIdx: number, mcpIdx: number) =>
    landmarks[tipIdx].y < landmarks[pipIdx].y && landmarks[pipIdx].y < landmarks[mcpIdx].y;

  const processResults = useCallback(
    (results: Results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Get or cache context
      let ctx = ctxRef.current;
      if (!ctx) {
        ctx = canvas.getContext("2d", CTX_OPTIONS);
        if (!ctx) return;
        ctxRef.current = ctx;
      }

      // Handle canvas resize
      if (canvas.width === 0 || canvas.height === 0) {
        const video = videoRef.current;
        if (video && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctxRef.current = null;
        }
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const handLandmarks = results.multiHandLandmarks?.[0];
      
      if (handLandmarks) {
        // Detect drawing gesture: only index finger extended
        const isDrawingNow =
          isFingerExtended(handLandmarks, 8, 6, 5) &&
          !isFingerExtended(handLandmarks, 12, 10, 9) &&
          !isFingerExtended(handLandmarks, 16, 14, 13) &&
          !isFingerExtended(handLandmarks, 20, 18, 17);

        // Smooth the index fingertip position
        const point = pointSmootherRef.current.smooth(
          handLandmarks[8].x * w,
          handLandmarks[8].y * h
        );

        // Draw skeleton - batch all lines in one path
        ctx.strokeStyle = "rgba(30, 58, 138, 0.8)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        
        for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
          const [start, end] = HAND_CONNECTIONS[i];
          ctx.moveTo(handLandmarks[start].x * w, handLandmarks[start].y * h);
          ctx.lineTo(handLandmarks[end].x * w, handLandmarks[end].y * h);
        }
        ctx.stroke();

        // Draw joints - batch all circles
        ctx.fillStyle = "rgba(30, 64, 175, 0.9)";
        ctx.beginPath();
        for (let i = 0; i < 21; i++) {
          const lm = handLandmarks[i];
          ctx.moveTo(lm.x * w + 4, lm.y * h);
          ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
        }
        ctx.fill();

        // Draw fingertips with highlights
        for (let i = 0; i < FINGERTIPS.length; i++) {
          const tip = FINGERTIPS[i];
          const lm = handLandmarks[tip];
          ctx.fillStyle = tip === 8 && isDrawingNow ? "#00ff66" : "#1e40af";
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Drawing mode indicator and callback
        if (isDrawingNow) {
          const tipX = handLandmarks[8].x * w;
          const tipY = handLandmarks[8].y * h;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 14, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(30, 64, 175, 0.6)";
          ctx.lineWidth = 3;
          ctx.stroke();

          onDrawingPointRef.current(point);
        } else if (prevDrawingState.current) {
          pointSmootherRef.current.reset();
          onDrawingEndRef.current();
        }

        prevDrawingState.current = isDrawingNow;

        // Update state only when changed
        setState((prev) => 
          prev.isDrawing !== isDrawingNow || !prev.handDetected
            ? { isTracking: true, indexFingerTip: point, isDrawing: isDrawingNow, handDetected: true }
            : prev
        );
      } else {
        if (prevDrawingState.current) {
          pointSmootherRef.current.reset();
          onDrawingEndRef.current();
          prevDrawingState.current = false;
        }

        setState((prev) =>
          prev.handDetected || prev.isDrawing
            ? { isTracking: true, indexFingerTip: null, isDrawing: false, handDetected: false }
            : prev
        );
      }
    },
    [canvasRef, videoRef]
  );

  const startTracking = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions(HANDS_OPTIONS);
      hands.onResults(processResults);
      handsRef.current = hands;

      setState((prev) => ({ ...prev, isTracking: true }));

      // Process frames without throttling
      let isProcessing = false;

      const processFrame = async () => {
        if (!isProcessing && handsRef.current && video.readyState >= 2) {
          isProcessing = true;
          try {
            await handsRef.current.send({ image: video });
          } catch {
            // Ignore errors during cleanup
          }
          isProcessing = false;
        }
        animationFrameRef.current = requestAnimationFrame(processFrame);
      };

      animationFrameRef.current = requestAnimationFrame(processFrame);
    } catch (error) {
      console.error("Error starting hand tracking:", error);
      setState((prev) => ({ ...prev, isTracking: false }));
      throw error;
    }
  }, [videoRef, processResults]);

  const stopTracking = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    handsRef.current = null;
    pointSmootherRef.current.reset();

    setState({
      isTracking: false,
      indexFingerTip: null,
      isDrawing: false,
      handDetected: false,
    });
  }, [videoRef]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { ...state, startTracking, stopTracking };
};
