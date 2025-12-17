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
  const containerRef = useRef<HTMLDivElement>(null);
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
      if (!navigator.gpu) {
        if (active) setErrorMessage("WebGPU is not supported in this browser. Please use Chrome 113+, Edge, or Firefox Nightly.");
        return;
      }

      try {
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: "high-performance"
        });
        
        if (!adapter) {
          if (active) setErrorMessage("No WebGPU adapter found. Ensure hardware acceleration is enabled.");
          return;
        }

        const device = await adapter.requestDevice();
        if (!active) return;
        deviceRef.current = device;
        
        device.lost.then((info) => {
            console.error("WebGPU Device Lost:", info);
            if (active) setErrorMessage(`WebGPU device lost: ${info.message || 'Unknown reason'}`);
        });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;
        if (!context) {
          if (active) setErrorMessage("Could not acquire WebGPU context.");
          return;
        }
        contextRef.current = context;

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
          device,
          format: presentationFormat,
          alphaMode: 'premultiplied',
        });

        const shaderModule = device.createShaderModule({
          label: 'Black Hole Shaders',
          code: BLACK_HOLE_SHADER,
        });
        
        if (shaderModule.getCompilationInfo) {
             shaderModule.getCompilationInfo().then((info) => {
                 for (const message of info.messages) {
                     if (message.type === 'error') {
                         console.error('Shader Compilation Error:', message);
                         if (active) setErrorMessage(`Shader compilation failed: ${message.message}`);
                     }
                 }
             });
        }

        const uniformBufferSize = 80; // 20 floats * 4 bytes
        const uniformBuffer = device.createBuffer({
          size: uniformBufferSize,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        uniformBufferRef.current = uniformBuffer;

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

    return () => { active = false; };
  }, [setErrorMessage]);

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

      const now = performance.now();
      frameCountRef.current++;
      if (now - lastFpsTimeRef.current >= 500) {
        const duration = now - lastFpsTimeRef.current;
        const fps = Math.round((frameCountRef.current * 1000) / duration);
        const frameTime = duration / frameCountRef.current;
        onPerformanceUpdate({ fps, frameTime });
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      const time = (Date.now() - startTimeRef.current) / 1000.0;
      const { zoom, cameraAngle, cameraHeight } = params;
      const r = zoom;
      const theta = cameraAngle; 
      const phi = Math.max(0.01, Math.min(Math.PI - 0.01, cameraHeight));

      const cx = r * Math.sin(phi) * Math.cos(theta);
      const cy = r * Math.cos(phi);
      const cz = r * Math.sin(phi) * Math.sin(theta);
      const camPos = [cx, cy, cz];
      
      const len = Math.sqrt(cx*cx + cy*cy + cz*cz);
      const camDir = [-cx/len, -cy/len, -cz/len];

      const resolution = [canvas.width, canvas.height];

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
      passEncoder.draw(6); 
      passEncoder.end();

      device.queue.submit([commandEncoder.finish()]);
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [params, onPerformanceUpdate]);

  // Use ResizeObserver for more robust viewport handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const canvas = canvasRef.current;
        if (canvas) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          // Important: Explicitly set CSS width/height to match container
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-black relative overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="block touch-none"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default WebGPURenderer;