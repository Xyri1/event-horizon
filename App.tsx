import React, { useState } from 'react';
import WebGPURenderer from './components/WebGPURenderer';
import ControlPanel from './components/ControlPanel';
import ErrorDisplay from './components/ErrorDisplay';
import { SimulationParams } from './types';

function App() {
  const [params, setParams] = useState<SimulationParams>({
    spin: 0.90, // Default within physical limits
    diskIntensity: 1.0,
    gravitationalLensing: 1,
    zoom: 6.0,
    cameraAngle: 0.0,
    cameraHeight: 1.5,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [performance, setPerformance] = useState({ fps: 0, frameTime: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Mouse Interaction Logic for Orbit Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    
    setParams(prev => ({
      ...prev,
      cameraAngle: prev.cameraAngle + dx * 0.005,
      cameraHeight: Math.max(0.1, Math.min(3.1, prev.cameraHeight + dy * 0.005))
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    setParams(prev => ({
      ...prev,
      zoom: Math.max(2.5, Math.min(20, prev.zoom + e.deltaY * 0.005))
    }));
  };

  if (errorMessage) {
    return <ErrorDisplay message={errorMessage} />;
  }

  return (
    <div 
      className="w-screen h-screen bg-black overflow-hidden relative cursor-move select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h1 className="text-4xl font-black text-white tracking-tighter mix-blend-difference">
          EVENT <span className="text-cyan-400">HORIZON</span>
        </h1>
        <p className="text-sm text-cyan-200/50 tracking-widest mt-1">RAYTRACED SINGULARITY ENGINE</p>
      </div>

      <WebGPURenderer 
        params={params} 
        setErrorMessage={setErrorMessage} 
        onPerformanceUpdate={setPerformance} 
      />
      
      {/* Pass mouse events wrapper to avoid blocking controls, but controls themselves stop propagation */}
      <div className="absolute top-0 right-0 h-full pointer-events-none p-4">
        <div className="pointer-events-auto">
             <ControlPanel 
              params={params} 
              setParams={setParams} 
              errorMessage={errorMessage}
              performance={performance}
            />
        </div>
      </div>
    </div>
  );
}

export default App;