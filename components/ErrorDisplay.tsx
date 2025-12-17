import React from 'react';
import { AlertTriangle, MonitorX, HelpCircle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-black text-white p-6 relative overflow-hidden select-none">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-900/20 blur-[100px] rounded-full animate-pulse" />
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_100%)]" />
      </div>

      <div className="z-10 max-w-2xl w-full text-center space-y-8 p-12 bg-gray-950/80 backdrop-blur-2xl border border-red-900/30 rounded-3xl shadow-2xl ring-1 ring-white/5">
        <div className="relative inline-flex mb-4">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
            <div className="relative p-6 rounded-full bg-gradient-to-b from-gray-800 to-black border border-gray-700 shadow-xl">
                <MonitorX className="w-16 h-16 text-red-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-gray-900 rounded-full border border-gray-700 text-yellow-500">
                <AlertTriangle className="w-6 h-6" />
            </div>
        </div>
        
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">System Requirements Not Met</h1>
            <p className="text-red-400 font-mono text-sm uppercase tracking-widest">WebGPU Initialization Failed</p>
        </div>
        
        <div className="p-6 bg-red-950/30 border border-red-900/50 rounded-xl text-left">
           <p className="text-lg text-red-200 font-medium mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" /> Diagnosis
           </p>
           <p className="text-gray-300 leading-relaxed font-mono text-sm opacity-90">
             {message}
           </p>
        </div>

        <div className="space-y-4 text-sm text-gray-500">
             <p>
                To run this simulation, you need a browser that supports <span className="text-gray-300 font-bold">WebGPU</span> (Chrome 113+, Edge, Firefox Nightly) and a GPU with updated drivers.
             </p>
             <p>
                If you are on a compatible browser, ensure <span className="text-gray-300 font-bold">Hardware Acceleration</span> is enabled in your browser settings.
             </p>
        </div>

        <div className="pt-6 flex justify-center gap-4">
           <a 
             href="https://webgpu.io" 
             target="_blank" 
             rel="noreferrer"
             className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
           >
             Learn About WebGPU
           </a>
           <button 
             onClick={() => window.location.reload()}
             className="px-8 py-3 rounded-full bg-gray-800 text-white font-bold border border-gray-700 hover:bg-gray-700 transition-all hover:scale-105 active:scale-95"
           >
             Reload Page
           </button>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-center text-xs text-gray-600 font-mono">
        EVENT HORIZON ENGINE • RENDERER STATUS: HALTED
      </div>
    </div>
  );
};

export default ErrorDisplay;