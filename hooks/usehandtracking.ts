import { Hands, type Results } from "@mediapipe/hands";
import { useCallback, useEffect, useRef, useState } from "react";

// Hand tracking hook for MediaPipe integration
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

// Lightweight smoothing - just enough to remove jitter without adding lag
class LightSmoother {
  private lastPoint: Point | null = null;
  private readonly factor: number;

  constructor(factor = 0.6) {
    // Higher factor = more responsive, lower = smoother
    this.factor = factor;
  }

  smooth(point: Point): Point {
    if (!this.lastPoint) {
      this.lastPoint = { ...point };
      return point;
    }

    // Simple exponential smoothing - very fast
    const smoothed = {
      x: this.lastPoint.x + (point.x - this.lastPoint.x) * this.factor,
      y: this.lastPoint.y + (point.y - this.lastPoint.y) * this.factor,
    };

    this.lastPoint = smoothed;
    return smoothed;
  }

  reset() {
    this.lastPoint = null;
  }
}

export const useHandTracking = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
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
  const animationFrameRef = useRef<number | null>(null);
  const prevDrawingState = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const pointSmootherRef = useRef(new LightSmoother(0.8)); // 0.85 = more responsive, less smoothing = faster

  // Use refs to avoid stale closures
  const onDrawingPointRef = useRef(onDrawingPoint);
  const onDrawingEndRef = useRef(onDrawingEnd);

  useEffect(() => {
    onDrawingPointRef.current = onDrawingPoint;
    onDrawingEndRef.current = onDrawingEnd;
  }, [onDrawingPoint, onDrawingEnd]);

  const isFingerExtended = useCallback(
    (landmarks: any[], tipIdx: number, pipIdx: number, mcpIdx: number) => {
      return (
        landmarks[tipIdx].y < landmarks[pipIdx].y &&
        landmarks[pipIdx].y < landmarks[mcpIdx].y
      );
    },
    []
  );

  // Cache canvas context
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const processResults = useCallback(
    (results: Results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Cache context for better performance
      if (!ctxRef.current) {
        ctxRef.current = canvas.getContext("2d", {
          alpha: true,
          desynchronized: true,
        });
      }
      const ctx = ctxRef.current;
      if (!ctx) return;

      if (canvas.width === 0 || canvas.height === 0) {
        const video = videoRef.current;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctxRef.current = null; // Reset context when canvas resizes
        }
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // Clear with a single operation
      ctx.clearRect(0, 0, w, h);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        const indexExtended = isFingerExtended(landmarks, 8, 6, 5);
        const middleExtended = isFingerExtended(landmarks, 12, 10, 9);
        const ringExtended = isFingerExtended(landmarks, 16, 14, 13);
        const pinkyExtended = isFingerExtended(landmarks, 20, 18, 17);

        const isDrawingNow =
          indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

        // Raw point from hand tracking
        const rawPoint: Point = {
          x: landmarks[8].x * w,
          y: landmarks[8].y * h,
        };

        // Lightweight smoothing - responsive with minimal jitter
        const point = pointSmootherRef.current.smooth(rawPoint);

        // Draw full hand skeleton with all fingers
        // Hand connections - each finger and palm
        const connections = [
          // Thumb
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          // Index finger
          [0, 5],
          [5, 6],
          [6, 7],
          [7, 8],
          // Middle finger
          [0, 9],
          [9, 10],
          [10, 11],
          [11, 12],
          // Ring finger
          [0, 13],
          [13, 14],
          [14, 15],
          [15, 16],
          // Pinky
          [0, 17],
          [17, 18],
          [18, 19],
          [19, 20],
          // Palm connections
          [5, 9],
          [9, 13],
          [13, 17],
        ];

        // Draw skeleton lines for full hand
        ctx.strokeStyle = "rgba(30, 58, 138, 0.8)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";

        ctx.beginPath();
        for (const [start, end] of connections) {
          ctx.moveTo(landmarks[start].x * w, landmarks[start].y * h);
          ctx.lineTo(landmarks[end].x * w, landmarks[end].y * h);
        }
        ctx.stroke();

        // Draw all joints as small circles
        ctx.fillStyle = "rgba(30, 64, 175, 0.9)";
        for (let i = 0; i < 21; i++) {
          ctx.beginPath();
          ctx.arc(landmarks[i].x * w, landmarks[i].y * h, 4, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Highlight fingertips with larger circles
        const fingertips = [4, 8, 12, 16, 20];
        for (const tip of fingertips) {
          ctx.beginPath();
          ctx.arc(
            landmarks[tip].x * w,
            landmarks[tip].y * h,
            6,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = tip === 8 && isDrawingNow ? "#00ff66" : "#1e40af";
          ctx.fill();
        }

        // Special highlight for index finger when drawing and call drawing callback
        if (isDrawingNow) {
          const tipX = landmarks[8].x * w;
          const tipY = landmarks[8].y * h;

          ctx.beginPath();
          ctx.arc(tipX, tipY, 14, 0, 2 * Math.PI);
          ctx.strokeStyle = "rgba(30, 64, 175, 0.6)";
          ctx.lineWidth = 3;
          ctx.stroke();

          onDrawingPointRef.current(point);
        } else if (prevDrawingState.current && !isDrawingNow) {
          pointSmootherRef.current.reset();
          onDrawingEndRef.current();
        }

        prevDrawingState.current = isDrawingNow;

        // Only update state when values actually change to prevent re-renders
        setState((prev) => {
          if (prev.isDrawing !== isDrawingNow || !prev.handDetected) {
            return {
              isTracking: true,
              indexFingerTip: point,
              isDrawing: isDrawingNow,
              handDetected: true,
            };
          }
          return prev;
        });
      } else {
        if (prevDrawingState.current) {
          pointSmootherRef.current.reset();
          onDrawingEndRef.current();
          prevDrawingState.current = false;
        }

        // Only update state when values actually change
        setState((prev) => {
          if (prev.handDetected || prev.isDrawing) {
            return {
              isTracking: true,
              indexFingerTip: null,
              isDrawing: false,
              handDetected: false,
            };
          }
          return prev;
        });
      }
    },
    [canvasRef, videoRef, isFingerExtended]
  );

  const startTracking = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 480, max: 640 }, // Lower resolution = much faster processing
          height: { ideal: 360, max: 480 },
          facingMode: "user",
          frameRate: { ideal: 30, max: 30 }, // 30fps is sufficient and much faster
        },
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      const hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Use lite model for better performance
        minDetectionConfidence: 0.4, // Lower = faster tracking
        minTrackingConfidence: 0.4,
      });

      hands.onResults(processResults);
      handsRef.current = hands;

      setState((prev) => ({ ...prev, isTracking: true }));

      // Run as fast as MediaPipe can handle - no artificial throttling
      let isProcessing = false;

      const processFrame = async () => {
        // Prevent overlapping calls but don't throttle
        if (!isProcessing && handsRef.current && video.readyState >= 2) {
          isProcessing = true;
          try {
            await handsRef.current.send({ image: video });
          } catch (e) {
            // Ignore send errors during cleanup
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
