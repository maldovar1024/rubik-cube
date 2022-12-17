export interface BufferDescriptorBase<Name extends string> {
  bufferName: Name;
  bufferDescriptor: GPUBufferDescriptor;
}

export interface BufferInitDescriptor<Name extends string>
  extends BufferDescriptorBase<Name> {
  contents: ArrayBufferLike;
}

interface BufferAndBindGroupDescriptor<Name extends string>
  extends BufferDescriptorBase<Name> {
  layout: Omit<GPUBindGroupLayoutEntry, 'binding'>;
}

interface PipelineDescriptor {
  vertex: {
    code: string;
    buffers: Iterable<GPUVertexBufferLayout | null>;
  };
  fragment: {
    code: string;
  };
}

interface GPUInitiator<
  BufferInitName extends string,
  BufferName extends string
> {
  canvas: HTMLCanvasElement;
  bufferInitDescriptors: BufferInitDescriptor<BufferInitName>[];
  bufferAndBindGroupDescriptor: BufferAndBindGroupDescriptor<BufferName>[][];
  pipelineDescriptor: PipelineDescriptor;
  frame: (
    this: GPUHelper<BufferInitName, BufferName>,
    time: DOMHighResTimeStamp
  ) => void;
}

export class GPUHelper<
  BufferInitName extends string,
  BufferName extends string
> {
  static async create<BufferInitName extends string, BufferName extends string>(
    initiator: GPUInitiator<BufferInitName, BufferName>
  ) {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error("Couldn't request WebGPU adapter.");

    const device = await adapter.requestDevice();

    return new this(device, initiator);
  }

  canvas: HTMLCanvasElement;
  ctx: GPUCanvasContext;

  presentationFormat: GPUTextureFormat;

  buffers = {} as {
    [name in BufferInitName | BufferName]: GPUBuffer;
  };

  bindGroupLayouts!: GPUBindGroupLayout[];
  bindGroups!: GPUBindGroup[];

  pipeline!: GPURenderPipeline;

  depthTexture!: { texture: GPUTexture; view: GPUTextureView };

  get presentationSize(): [number, number] {
    const { clientWidth, clientHeight } = this.canvas;
    return [clientWidth, clientHeight];
  }

  private frame: FrameRequestCallback;

  constructor(
    public device: GPUDevice,
    initiator: GPUInitiator<BufferInitName, BufferName>
  ) {
    const { canvas, frame } = initiator;
    this.canvas = canvas;
    this.ctx = canvas.getContext('webgpu')!;

    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    this.ctx.configure({
      device,
      format: this.presentationFormat,
      alphaMode: 'premultiplied',
    });

    this.createDepthTexture();

    this.createBufferInit(initiator.bufferInitDescriptors);
    this.createBufferAndBindGroup(initiator.bufferAndBindGroupDescriptor);

    this.createPipeline(initiator.pipelineDescriptor);

    this.frame = frame;
  }

  start() {
    requestAnimationFrame(this.draw);
  }

  getRenderPassDescriptor(
    currentTextureView: GPUTextureView
  ): GPURenderPassDescriptor {
    return {
      colorAttachments: [
        {
          view: currentTextureView,
          clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.view,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };
  }

  draw: FrameRequestCallback = (time) => {
    this.frame(time);
    requestAnimationFrame(this.draw);
  };

  private createDepthTexture() {
    const texture = this.device.createTexture({
      size: this.presentationSize,
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthTexture = {
      texture,
      view: texture.createView(),
    };
  }

  private createBufferInit(
    descriptors: BufferInitDescriptor<BufferInitName>[]
  ) {
    Object.assign(
      this.buffers,
      Object.fromEntries(
        descriptors.map(({ bufferName, bufferDescriptor, contents }) => {
          const buffer = this.device.createBuffer({
            ...bufferDescriptor,
            mappedAtCreation: true,
          });
          new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(contents));
          buffer.unmap();

          return [bufferName, buffer] as [BufferInitName, GPUBuffer];
        })
      )
    );
  }

  private createBufferAndBindGroup(
    descriptors: BufferAndBindGroupDescriptor<BufferName>[][]
  ) {
    const { device } = this;

    Object.assign(
      this.buffers,
      Object.fromEntries(
        descriptors
          .flat()
          .map(
            ({ bufferName, bufferDescriptor }) =>
              [bufferName, device.createBuffer(bufferDescriptor)] as [
                BufferName,
                GPUBuffer
              ]
          )
      )
    );

    this.bindGroupLayouts = descriptors.map((groupDescriptor) =>
      device.createBindGroupLayout({
        entries: groupDescriptor.map(({ layout }, idx) => ({
          binding: idx,
          ...layout,
        })),
      })
    );

    this.bindGroups = descriptors.map((groupDescriptor, groupIdx) =>
      device.createBindGroup({
        layout: this.bindGroupLayouts[groupIdx],
        entries: groupDescriptor.map(({ bufferName }, bindingIdx) => ({
          binding: bindingIdx,
          resource: { buffer: this.buffers[bufferName] },
        })),
      })
    );
  }

  private createPipeline(descriptor: PipelineDescriptor) {
    const { vertex, fragment } = descriptor;

    const { device, bindGroupLayouts } = this;

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: bindGroupLayouts,
      }),
      vertex: {
        module: device.createShaderModule({ code: vertex.code }),
        entryPoint: 'main',
        buffers: vertex.buffers,
      },
      fragment: {
        module: device.createShaderModule({ code: fragment.code }),
        entryPoint: 'main',
        targets: [{ format: this.presentationFormat }],
      },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });
  }
}
