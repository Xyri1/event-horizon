// Minimal WebGPU types to satisfy TypeScript if the environment lacks them
// In a real project, one would include @webgpu/types
export interface SimulationParams {
  spin: number;
  diskIntensity: number;
  gravitationalLensing: number; // 0 or 1
  zoom: number;
  cameraAngle: number;
  cameraHeight: number;
}

// WebGPU Type Definitions
declare global {
  interface Navigator {
    gpu: GPU;
  }

  interface GPU {
    requestAdapter(options?: any): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat(): GPUTextureFormat;
  }

  interface GPUAdapter {
    requestDevice(descriptor?: any): Promise<GPUDevice>;
  }

  interface GPUDevice {
    createShaderModule(descriptor: { code: string; label?: string }): GPUShaderModule;
    createBuffer(descriptor: { size: number; usage: number }): GPUBuffer;
    createBindGroupLayout(descriptor: { entries: any[] }): GPUBindGroupLayout;
    createPipelineLayout(descriptor: { bindGroupLayouts: GPUBindGroupLayout[] }): GPUPipelineLayout;
    createRenderPipeline(descriptor: any): GPURenderPipeline;
    createBindGroup(descriptor: { layout: GPUBindGroupLayout; entries: any[] }): GPUBindGroup;
    createCommandEncoder(descriptor?: any): GPUCommandEncoder;
    queue: GPUQueue;
    lost: Promise<GPUDeviceLostInfo>;
  }

  interface GPUDeviceLostInfo {
    readonly message: string;
    readonly reason: 'destroyed' | 'unknown';
  }

  interface GPUQueue {
    writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: BufferSource, dataOffset?: number, size?: number): void;
    submit(commandBuffers: GPUCommandBuffer[]): void;
  }

  interface GPUCanvasContext {
    configure(configuration: { device: GPUDevice; format: GPUTextureFormat; alphaMode?: string }): void;
    getCurrentTexture(): GPUTexture;
  }

  interface GPUBuffer {}
  
  interface GPUShaderModule {
    getCompilationInfo(): Promise<GPUCompilationInfo>;
  }

  interface GPUCompilationInfo {
    readonly messages: ReadonlyArray<GPUCompilationMessage>;
  }

  interface GPUCompilationMessage {
    readonly message: string;
    readonly type: 'error' | 'warning' | 'info';
    readonly lineNum: number;
    readonly linePos: number;
    readonly offset: number;
    readonly length: number;
  }

  interface GPUBindGroupLayout {}
  interface GPUPipelineLayout {}
  interface GPURenderPipeline {}
  interface GPUBindGroup {}
  interface GPUCommandBuffer {}
  
  interface GPUTexture {
    createView(descriptor?: any): GPUTextureView;
  }
  interface GPUTextureView {}

  interface GPUCommandEncoder {
    beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder;
    finish(): GPUCommandBuffer;
  }

  interface GPURenderPassEncoder {
    setPipeline(pipeline: GPURenderPipeline): void;
    setBindGroup(index: number, bindGroup: GPUBindGroup): void;
    draw(vertexCount: number): void;
    end(): void;
  }

  interface GPURenderPassDescriptor {
    colorAttachments: Array<{
      view: GPUTextureView;
      clearValue?: { r: number; g: number; b: number; a: number };
      loadOp: string;
      storeOp: string;
    }>;
  }

  type GPUTextureFormat = string;

  // Global Constants
  var GPUBufferUsage: {
    MAP_READ: number;
    MAP_WRITE: number;
    COPY_SRC: number;
    COPY_DST: number;
    INDEX: number;
    VERTEX: number;
    UNIFORM: number;
    STORAGE: number;
    INDIRECT: number;
    QUERY_RESOLVE: number;
  };

  var GPUShaderStage: {
    VERTEX: number;
    FRAGMENT: number;
    COMPUTE: number;
  };
}