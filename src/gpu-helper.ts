export interface BufferInitiator {
  bufferDescriptor: GPUBufferDescriptor;
  init?: {
    ctor: Float32ArrayConstructor | Uint16ArrayConstructor;
    value: ArrayLike<number>;
  };
}

interface BufferAndBindGroupDescriptor<T extends string> {
  bufferName: T;
  bufferInitiator: BufferInitiator;
  layout?: Omit<GPUBindGroupLayoutEntry, 'binding'>;
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

interface GPUInitiator<T extends string> {
  canvas: HTMLCanvasElement;
  bufferAndBindGroupDescriptor: BufferAndBindGroupDescriptor<T>[];
  pipelineDescriptor: PipelineDescriptor;
  frame: (this: GPUHelper<T>, time: DOMHighResTimeStamp) => void;
}

export class GPUHelper<T extends string> {
  static async create<T extends string>(initiator: GPUInitiator<T>) {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error("Couldn't request WebGPU adapter.");

    const device = await adapter.requestDevice();

    return new this(adapter, device, initiator);
  }

  canvas: HTMLCanvasElement;
  ctx: GPUCanvasContext;

  presentationFormat: GPUTextureFormat;

  buffers!: {
    [name in T]: GPUBuffer;
  };

  bindGroupLayout!: GPUBindGroupLayout;
  bindGroup!: GPUBindGroup;

  pipeline!: GPURenderPipeline;

  renderPassDescriptor;

  get presentationSize(): [number, number] {
    const { clientWidth, clientHeight } = this.canvas;
    return [clientWidth * devicePixelRatio, clientHeight * devicePixelRatio];
  }

  private frame: FrameRequestCallback;

  constructor(
    adapter: GPUAdapter,
    public device: GPUDevice,
    initiator: GPUInitiator<T>
  ) {
    const { canvas, frame } = initiator;
    this.canvas = canvas;
    this.ctx = canvas.getContext('webgpu')!;

    const presentationSize = [
      canvas.clientWidth * devicePixelRatio,
      canvas.clientHeight * devicePixelRatio,
    ];

    this.presentationFormat = this.ctx.getPreferredFormat(adapter);

    this.ctx.configure({
      device,
      format: this.presentationFormat,
      size: presentationSize,
      compositingAlphaMode: 'premultiplied',
    });

    this.createBufferAndBindGroup(initiator.bufferAndBindGroupDescriptor);

    this.createPipeline(initiator.pipelineDescriptor);

    this.renderPassDescriptor = {
      colorAttachments: [
        {
          clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.createDepthStencilView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    } as const;

    this.frame = frame;
  }

  start() {
    requestAnimationFrame(this.draw);
  }

  draw: FrameRequestCallback = (time) => {
    this.frame(time);
    requestAnimationFrame(this.draw);
  };

  private createBuffer(initiator: BufferInitiator) {
    const { bufferDescriptor, init } = initiator;

    bufferDescriptor.mappedAtCreation = init !== undefined;

    const buffer = this.device.createBuffer(bufferDescriptor);

    if (init) {
      new init.ctor(buffer.getMappedRange()).set(init.value);
      buffer.unmap();
    }

    return buffer;
  }

  private createBufferAndBindGroup(
    descriptors: BufferAndBindGroupDescriptor<T>[]
  ) {
    const { device } = this;

    this.buffers = Object.fromEntries(
      descriptors.map(({ bufferName, bufferInitiator }) => [
        bufferName,
        this.createBuffer(bufferInitiator),
      ])
    ) as { [name in T]: GPUBuffer };

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: descriptors.flatMap(({ layout }, idx) =>
        layout ? { binding: idx, ...layout } : []
      ),
    });

    this.bindGroup = device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: descriptors.flatMap(({ layout, bufferName }, idx) =>
        layout
          ? { binding: idx, resource: { buffer: this.buffers[bufferName] } }
          : []
      ),
    });
  }

  private createPipeline(descriptor: PipelineDescriptor) {
    const { vertex, fragment } = descriptor;

    const { device, bindGroupLayout } = this;

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
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

  private createDepthStencilView() {
    const texture = this.device.createTexture({
      size: this.presentationSize,
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    return texture.createView();
  }
}
