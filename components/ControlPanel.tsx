import React, { useState } from 'react';
import { SimulationParams } from '../types';
import { Settings, Info, RotateCw, Eye, Aperture, Video, Activity, ChevronDown } from 'lucide-react';

interface ControlPanelProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  errorMessage: string | null;
  performance: { fps: number; frameTime: number };
}

const ControlPanel: React.FC<ControlPanelProps> = ({ params, setParams, errorMessage, performance }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleChange = (key: keyof SimulationParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-black/90 backdrop-blur-xl border border-gray-800 text-white rounded-xl shadow-2xl z-10 transition-all duration-300">
      {/* Header */}
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors rounded-xl ${!isCollapsed ? 'rounded-b-none bg-white/5' : ''}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <Settings className={`w-4 h-4 transition-colors ${!isCollapsed ? 'text-cyan-400' : 'text-gray-400'}`} />
          <h2 className="text-sm font-bold tracking-widest uppercase text-gray-200">Simulation Core</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-2.5 py-1 rounded select-none whitespace-nowrap">
             <Activity className="w-3 h-3" />
             <span>{performance.fps} FPS</span>
             <span className="text-emerald-800 mx-1">|</span>
             <span>{performance.frameTime.toFixed(1)}ms</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} />
        </div>
      </div>
      
      {/* Content - Collapsible */}
      <div className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}>
        <div className="p-5 border-t border-gray-800">
            
            {errorMessage && (
                <div className="mb-4 p-3 bg-red-950/50 border border-red-900/50 rounded text-xs text-red-200">
                <div className="flex gap-2 items-center font-bold mb-1">
                    <Info className="w-4 h-4" /> Error
                </div>
                {errorMessage}
                </div>
            )}

            <div className="space-y-5">
                {/* Spin Speed */}
                <div className="group">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                    <span className="flex items-center gap-2"><RotateCw className="w-3 h-3"/> Spin (a)</span>
                    <span className="text-cyan-400 font-mono">{params.spin.toFixed(2)}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.01"
                    value={params.spin}
                    onChange={(e) => handleChange('spin', parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer hover:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125"
                />
                </div>

                {/* Disk Intensity */}
                <div className="group">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                    <span className="flex items-center gap-2"><Aperture className="w-3 h-3"/> Luminosity</span>
                    <span className="text-orange-400 font-mono">{(params.diskIntensity * 100).toFixed(0)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="10.0"
                    step="0.1"
                    value={params.diskIntensity}
                    onChange={(e) => handleChange('diskIntensity', parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer hover:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125"
                />
                </div>

                {/* Lensing Toggle */}
                <div className="flex items-center justify-between py-1">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <Eye className="w-3 h-3" /> Gravitational Lensing
                </span>
                <button
                    onClick={() => handleChange('gravitationalLensing', params.gravitationalLensing > 0.5 ? 0 : 1)}
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${
                    params.gravitationalLensing > 0.5 ? 'bg-cyan-900/80 border border-cyan-700' : 'bg-gray-800 border border-gray-700'
                    }`}
                >
                    <div
                    className={`w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm transform transition-transform duration-300 ${
                        params.gravitationalLensing > 0.5 ? 'translate-x-4' : 'translate-x-0'
                    } ${params.gravitationalLensing <= 0.5 ? 'bg-gray-400' : ''}`}
                    />
                </button>
                </div>

                <div className="border-t border-gray-800/50 pt-4 mt-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                    <span className="flex items-center gap-2"><Video className="w-3 h-3"/> Distance (AU)</span>
                    <span className="text-purple-400 font-mono">{params.zoom.toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min="2.5"
                    max="15"
                    step="0.1"
                    value={params.zoom}
                    onChange={(e) => handleChange('zoom', parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer hover:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125"
                />
                </div>
            </div>

            <div className="mt-6 text-[9px] text-gray-600 text-center font-mono">
                WEB GPU RAY MARCHING
            </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;