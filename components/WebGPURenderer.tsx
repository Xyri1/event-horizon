import React, { useEffect, useRef } from 'react';
import { BLACK_HOLE_SHADER } from '../constants';
import { SimulationParams } from '../types';

interface WebGPURendererProps {
  params: SimulationParams;
  setErrorMessage: (msg: string | null) => void;
  onPerformanceUpdate: (stats: { fps: number; frameTime: number }) => void;
}

const WebGPURenderer: React.FC<WebGPURendererProps> = ({ params, setErrorMessage, onPerformanceUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const deviceRef = useRef<GPUDevice | null>(null);
  const pipelineRef = useRef<GPURenderPipeline | null>(null);
  const uniformBufferRef = useRef<GPUBuffer | null>(null);
  const bindGroupRef = useRef<GPUBindGroup | null>(null);
  const contextRef = useRef<GPUCanvasContext | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  // FPS Counting Refs
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());

  // Initialize WebGPU
  useEffect(() => {
    let active = true;

    const init = async () => {
      // 1. Check for Navigator Support
      if (!navigator.gpu) {
        if (active) setErrorMessage("WebGPU is not supported in this browser. Please use Chrome 113+, Edge, or Firefox Nightly.");
        return;
      }

      try {
        // 2. Request Adapter (Hardware Check)
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: "high-performance"
        });
        
        if (!adapter) {
          if (active) setErrorMessage("No WebGPU adapter found. Ensure hardware acceleration is enabled in your browser settings and your graphics drivers are up to date.");
          return;
        }

        // 3. Request Device
        const device = await adapter.requestDevice();
        if (!active) return;
        deviceRef.current = device;
        
        // Add Device Lost Listener
        device.lost.then((info) => {
            console.error("WebGPU Device Lost:", info);
            if (active) setErrorMessage(`WebGPU device lost: ${info.message || 'Unknown reason'}. The driver may have crashed.`);
        });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;
        if (!context) {
          if (active) setErrorMessage("Could not acquire WebGPU context from canvas.");
          return;
        }
        contextRef.current = context;

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
          device,
          format: presentationFormat,
          alphaMode: 'premultiplied',
        });

        // Create Shader Module
        const shaderModule = device.createShaderModule({
          label: 'Black Hole Shaders',
          code: BLACK_HOLE_SHADER,
        });
        
        // Check for compilation info messages if supported
        if (shaderModule.getCompilationInfo) {
             shaderModule.getCompilationInfo().then((info) => {
                 for (const message of info.messages) {
                     if (message.type === 'error') {
                         console.error('Shader Compilation Error:', message);
                         if (active) setErrorMessage(`Shader compilation failed: ${message.message} at line ${message.lineNum}`);
                     }
                 }
             });
        }

        // Uniform Buffer Setup
        const uniformBufferSize = 80; // 20 floats * 4 bytes
        const uniformBuffer = device.createBuffer({
          size: uniformBufferSize,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        uniformBufferRef.current = uniformBuffer;

        // Pipeline Layout
        const bindGroupLayout = device.createBindGroupLayout({
          entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          }],
        });

        const pipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [bindGroupLayout],
        });

        const pipeline = device.createRenderPipeline({
          layout: pipelineLayout,
          vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
          },
          fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            targets: [{ format: presentationFormat }],
          },
          primitive: {
            topology: 'triangle-list',
          },
        });
        pipelineRef.current = pipeline;

        const bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer },
          }],
        });
        bindGroupRef.current = bindGroup;

      } catch (err: any) {
        console.error(err);
        if (active) setErrorMessage(`Initialization Failed: ${err.message || 'Unknown error'}`);
      }
    };

    init();

    return () => {
      active = false;
      // Cleanup
      // WebGPU objects are garbage collected, but we can destroy/unconfigure if needed
      // Currently, we just let them go
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Render Loop
  useEffect(() => {
    const render = () => {
      const device = deviceRef.current;
      const context = contextRef.current;
      const pipeline = pipelineRef.current;
      const uniformBuffer = uniformBufferRef.current;
      const bindGroup = bindGroupRef.current;
      const canvas = canvasRef.current;

      if (!device || !context || !pipeline || !uniformBuffer || !bindGroup || !canvas) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      // --- FPS Calculation ---
      const now = performance.now();
      frameCountRef.current++;
      if (now - lastFpsTimeRef.current >= 500) { // Update every 500ms
        const duration = now - lastFpsTimeRef.current;
        const fps = Math.round((frameCountRef.current * 1000) / duration);
        const frameTime = duration / frameCountRef.current;
        onPerformanceUpdate({ fps, frameTime });
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      // 1. Update Uniforms
      const time = (Date.now() - startTimeRef.current) / 1000.0;
      
      // Calculate Camera Vectors based on angles
      const { zoom, cameraAngle, cameraHeight } = params;
      const r = zoom;
      const theta = cameraAngle; 
      const phi = Math.max(0.01, Math.min(Math.PI - 0.01, cameraHeight)); // Avoid gimbal lock poles

      // Spherical to Cartesian
      const cx = r * Math.sin(phi) * Math.cos(theta);
      const cy = r * Math.cos(phi);
      const cz = r * Math.sin(phi) * Math.sin(theta);
      const camPos = [cx, cy, cz];
      
      const len = Math.sqrt(cx*cx + cy*cy + cz*cz);
      const camDir = [-cx/len, -cy/len, -cz/len];

      const resolution = [canvas.width, canvas.height];

      // Pack data
      const uniformData = new Float32Array(20); 
      uniformData[0] = time;
      uniformData[1] = params.spin;
      uniformData[2] = params.diskIntensity;
      uniformData[3] = params.gravitationalLensing;
      
      uniformData[4] = resolution[0];
      uniformData[5] = resolution[1];
      
      uniformData[8] = camPos[0];
      uniformData[9] = camPos[1];
      uniformData[10] = camPos[2];
      
      uniformData[12] = camDir[0];
      uniformData[13] = camDir[1];
      uniformData[14] = camDir[2];
      
      uniformData[16] = 0;
      uniformData[17] = 1;
      uniformData[18] = 0;

      device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      // 2. Encode Commands
      const commandEncoder = device.createCommandEncoder();
      const textureView = context.getCurrentTexture().createView();
      
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      };

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.draw(6); // 2 triangles
      passEncoder.end();

      device.queue.submit([commandEncoder.finish()]);

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [params, onPerformanceUpdate]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          canvasRef.current.width = parent.clientWidth * window.devicePixelRatio;
          canvasRef.current.height = parent.clientHeight * window.devicePixelRatio;
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-full bg-black relative">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </div>
  );
};

export default WebGPURenderer;