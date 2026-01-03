import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

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
      if (canvasRef.current) {
        ctxRef.current = canvasRef.current.getContext("2d", { 
          alpha: true,
          desynchronized: true,
        });
        if (ctxRef.current) {
          ctxRef.current.lineCap = "round";
          ctxRef.current.lineJoin = "round";
          ctxRef.current.imageSmoothingEnabled = true;
          ctxRef.current.imageSmoothingQuality = "low"; // Lower quality = faster rendering
        }
      }
    }, []);

    // Draw smooth curve using quadratic bezier for continuous smooth lines
    const drawSmoothCurve = (prev: Point | null, from: Point, to: Point) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.beginPath();
      
      if (prev) {
        // Use quadratic curve: start from midpoint of prev->from, control at 'from', end at midpoint of from->to
        // This creates smooth, continuous curves
        const startX = (prev.x + from.x) / 2;
        const startY = (prev.y + from.y) / 2;
        const endX = (from.x + to.x) / 2;
        const endY = (from.y + to.y) / 2;
        
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(from.x, from.y, endX, endY);
      } else {
        // First segment - just draw a line
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
      
      ctx.strokeStyle = "#00ff55";
      ctx.lineWidth = 4;
      ctx.stroke();
    };

    // Draw smooth stroke using quadratic curves for continuous smooth paths
    const drawSmoothStroke = (ctx: CanvasRenderingContext2D, stroke: Point[]) => {
      if (stroke.length < 2) return;
      
      ctx.beginPath();
      
      if (stroke.length === 2) {
        // Just two points - draw a line
        ctx.moveTo(stroke[0].x, stroke[0].y);
        ctx.lineTo(stroke[1].x, stroke[1].y);
      } else {
        // Start from first point
        ctx.moveTo(stroke[0].x, stroke[0].y);
        
        // Use quadratic curves: draw from midpoint to midpoint with control point at actual point
        // This creates smooth, continuous curves
        for (let i = 0; i < stroke.length - 2; i++) {
          const curr = stroke[i];
          const next = stroke[i + 1];
          const afterNext = stroke[i + 2];
          
          // Control point is 'next', end point is midpoint between next and afterNext
          const endX = (next.x + afterNext.x) / 2;
          const endY = (next.y + afterNext.y) / 2;
          
          ctx.quadraticCurveTo(next.x, next.y, endX, endY);
        }
        
        // Draw final curve to the last point
        const lastIndex = stroke.length - 1;
        ctx.quadraticCurveTo(
          stroke[lastIndex - 1].x,
          stroke[lastIndex - 1].y,
          stroke[lastIndex].x,
          stroke[lastIndex].y
        );
      }
      
      ctx.stroke();
    };

    // Full redraw for completed strokes only
    const redrawAll = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      // Draw completed strokes with smooth curves (no shadows for performance)
      strokesRef.current.forEach((stroke) => {
        if (stroke.length < 2) return;
        
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 3;
        
        drawSmoothStroke(ctx, stroke);
      });
    };

    useImperativeHandle(ref, () => ({
      addPoint: (point: Point) => {
        const lastPoint = lastPointRef.current;
        
        // Always add first point
        if (!lastPoint) {
          currentStrokeRef.current.push(point);
          lastPointRef.current = point;
          previousPointRef.current = null;
          return;
        }

        // Skip if too close (reduces data but keeps smoothness)
        const dx = point.x - lastPoint.x;
        const dy = point.y - lastPoint.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 4) return; // ~2px minimum distance

        // Draw smooth curve immediately
        drawSmoothCurve(previousPointRef.current, lastPoint, point);
        
        currentStrokeRef.current.push(point);
        previousPointRef.current = lastPoint;
        lastPointRef.current = point;
      },

      endStroke: () => {
        if (currentStrokeRef.current.length > 1) {
          strokesRef.current.push([...currentStrokeRef.current]);
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
        const ctx = ctxRef.current;
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
        }
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
