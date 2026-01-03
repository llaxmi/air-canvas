import { Camera, Hand, Pencil } from "lucide-react";
import React from "react";

interface StatusIndicatorProps {
  isTracking: boolean;
  handDetected: boolean;
  isDrawing: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isTracking,
  handDetected,
  isDrawing,
}) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              isTracking
                ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.6)] animate-pulse"
                : "bg-slate-500"
            }`}
          />
          <Camera className="w-5 h-5 text-slate-400" />
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Camera</span>
            <span className={`text-sm font-medium ${isTracking ? 'text-green-400' : 'text-slate-400'}`}>
              {isTracking ? "Active" : "Off"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              handDetected
                ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
                : "bg-slate-500"
            }`}
          />
          <Hand className="w-5 h-5 text-slate-400" />
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Hand</span>
            <span className={`text-sm font-medium ${handDetected ? 'text-cyan-400' : 'text-slate-400'}`}>
              {handDetected ? "Detected" : "Not Found"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              isDrawing
                ? "bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.6)] animate-pulse"
                : "bg-slate-500"
            }`}
          />
          <Pencil className="w-5 h-5 text-slate-400" />
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Status</span>
            <span className={`text-sm font-medium ${isDrawing ? 'text-purple-400' : 'text-slate-400'}`}>
              {isDrawing ? "Drawing" : "Ready"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusIndicator;
