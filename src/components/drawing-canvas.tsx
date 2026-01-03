import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface Point {
  x: number;
  y: number;
}

interface DrawingCanvasProps {
  width: number;
  height: number;
  isDrawing: boolean;
}

export interface DrawingCanvasHandle {
  addPoint: (point: Point) => void;
  endStroke: () => void;
  clear: () => void;
  getStrokes: () => Point[][];
}

// Canvas context options - static
const CTX_OPTIONS = { alpha: true, desynchronized: true } as const;

// Drawing styles - static
const STROKE_COLOR_ACTIVE = "#00ff55";
const STROKE_COLOR_COMPLETED = "#00d4ff";
const LINE_WIDTH_ACTIVE = 4;
const LINE_WIDTH_COMPLETED = 3;
const MIN_DISTANCE_SQ = 4; // ~2px minimum distance squared

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  ({ width, height }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const strokesRef = useRef<Point[][]>([]);
    const currentStrokeRef = useRef<Point[]>([]);
    const lastPointRef = useRef<Point | null>(null);
    const previousPointRef = useRef<Point | null>(null);

    // Initialize context once
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d", CTX_OPTIONS);
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "low";
        ctxRef.current = ctx;
      }
    }, []);

    // Draw smooth curve using quadratic bezier for continuous smooth lines
    const drawSmoothCurve = (prev: Point | null, from: Point, to: Point) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.beginPath();

      if (prev) {
        // Quadratic curve: midpoint -> control -> midpoint for smooth joins
        ctx.moveTo((prev.x + from.x) * 0.5, (prev.y + from.y) * 0.5);
        ctx.quadraticCurveTo(from.x, from.y, (from.x + to.x) * 0.5, (from.y + to.y) * 0.5);
      } else {
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }

      ctx.strokeStyle = STROKE_COLOR_ACTIVE;
      ctx.lineWidth = LINE_WIDTH_ACTIVE;
      ctx.stroke();
    };

    // Draw smooth stroke using quadratic curves
    const drawSmoothStroke = (ctx: CanvasRenderingContext2D, stroke: Point[]) => {
      const len = stroke.length;
      if (len < 2) return;

      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);

      if (len === 2) {
        ctx.lineTo(stroke[1].x, stroke[1].y);
      } else {
        // Draw quadratic curves through midpoints
        for (let i = 0; i < len - 2; i++) {
          const next = stroke[i + 1];
          const afterNext = stroke[i + 2];
          ctx.quadraticCurveTo(next.x, next.y, (next.x + afterNext.x) * 0.5, (next.y + afterNext.y) * 0.5);
        }
        // Final segment
        const last = stroke[len - 1];
        const prev = stroke[len - 2];
        ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
      }

      ctx.stroke();
    };

    // Full redraw for completed strokes only
    const redrawAll = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = STROKE_COLOR_COMPLETED;
      ctx.lineWidth = LINE_WIDTH_COMPLETED;

      const strokes = strokesRef.current;
      for (let i = 0; i < strokes.length; i++) {
        if (strokes[i].length >= 2) {
          drawSmoothStroke(ctx, strokes[i]);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      addPoint: (point: Point) => {
        const lastPoint = lastPointRef.current;

        // First point of stroke
        if (!lastPoint) {
          currentStrokeRef.current.push(point);
          lastPointRef.current = point;
          previousPointRef.current = null;
          return;
        }

        // Skip if too close
        const dx = point.x - lastPoint.x;
        const dy = point.y - lastPoint.y;
        if (dx * dx + dy * dy < MIN_DISTANCE_SQ) return;

        // Draw and store
        drawSmoothCurve(previousPointRef.current, lastPoint, point);
        currentStrokeRef.current.push(point);
        previousPointRef.current = lastPoint;
        lastPointRef.current = point;
      },

      endStroke: () => {
        if (currentStrokeRef.current.length > 1) {
          strokesRef.current.push(currentStrokeRef.current);
        }
        currentStrokeRef.current = [];
        lastPointRef.current = null;
        previousPointRef.current = null;
        redrawAll();
      },

      clear: () => {
        strokesRef.current = [];
        currentStrokeRef.current = [];
        lastPointRef.current = null;
        previousPointRef.current = null;
        ctxRef.current?.clearRect(0, 0, width, height);
      },

      getStrokes: () => strokesRef.current,
    }));

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 20 }}
      />
    );
  }
);

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;
