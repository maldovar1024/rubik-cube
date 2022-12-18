import frag from './shaders/frag.wgsl?raw';
import vert from './shaders/vert.wgsl?raw';

import { mat4, vec3 } from 'gl-matrix';

import { Camera } from './camera';
import {
  indices,
  instanceCount,
  instanceTransform,
  matrixF32Count,
  vertexBufferLayout,
  vertices,
} from './cube';
import { Operation } from './operation';

import './style.css';

const { gpu } = navigator;

if (!gpu) {
  throw new Error('WebGPU is not enabled.');
}

const canvas = document.querySelector('canvas')!;

const modalRotationTransform = mat4.identity(mat4.create());

const origin = vec3.fromValues(0, 0, 0);

const camera = new Camera(canvas, [4, 4, 9], [0, 1, 0]);

const operation = new Operation(document.body);

const OPENGL_TO_WGPU_MATRIX = mat4.fromValues(
  1.0,
  0.0,
  0.0,
  0.0,
  0.0,
  1.0,
  0.0,
  0.0,
  0.0,
  0.0,
  0.5,
  0.0,
  0.0,
  0.0,
  0.5,
  1.0
);

const instanceTransformMatrices = new Float32Array(
  instanceCount * matrixF32Count
);

const view = mat4.create();
const projectionMatrix = mat4.create();

const aspect = canvas.width / canvas.height;
const fov = Math.PI * 0.4;

function updateTransformationMatrix() {
  camera.lookAt(view, origin);
  mat4.perspective(projectionMatrix, fov, aspect, 1, 1000.0);

  mat4.multiply(projectionMatrix, projectionMatrix, view);
  mat4.multiply(projectionMatrix, OPENGL_TO_WGPU_MATRIX, projectionMatrix);

  let transformMatricesOffset = 0;

  const opMatrix = operation.getOpMatrix();

  for (let i = 0; i < instanceCount; i++) {
    const modelViewProjectionMatrix = mat4.create();
    mat4.fromTranslation(modelViewProjectionMatrix, instanceTransform[i]);

    mat4.multiply(
      modelViewProjectionMatrix,
      opMatrix[i],
      modelViewProjectionMatrix
    );

    mat4.multiply(
      modelViewProjectionMatrix,
      modalRotationTransform,
      modelViewProjectionMatrix
    );
    mat4.multiply(
      modelViewProjectionMatrix,
      projectionMatrix,
      modelViewProjectionMatrix
    );

    instanceTransformMatrices.set(
      modelViewProjectionMatrix,
      transformMatricesOffset
    );
    transformMatricesOffset += matrixF32Count;
  }
}

export interface Texture {
  texture: GPUTexture;
  view: GPUTextureView;
}

export class GPUHelper {
  static async create(ctx: GPUCanvasContext) {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw Error("Couldn't request WebGPU adapter.");

    const device = await adapter.requestDevice();

    return new this(ctx, device);
  }

  createDepthTexture() {
    const texture = this.device.createTexture({
      size: this.presentationSize,
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    return {
      texture,
      view: texture.createView(),
    };
  }

  constructor(public ctx: GPUCanvasContext, public device: GPUDevice) {
    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    ctx.configure({
      device,
      format: this.presentationFormat,
      alphaMode: 'premultiplied',
    });

    this.depthTexture = this.createDepthTexture();

    this.createTransformBindGroup();
    this.createRenderPipeline();

    this.vertexBuffer = this.createBufferInit(
      {
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX,
      },
      vertices.buffer
    );
    this.indexBuffer = this.createBufferInit(
      {
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX,
      },
      indices.buffer
    );

    requestAnimationFrame(this.frame);
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

  createBufferInit(descriptor: GPUBufferDescriptor, content: ArrayBuffer) {
    const buffer = this.device.createBuffer({
      ...descriptor,
      mappedAtCreation: true,
    });
    new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(content));
    buffer.unmap();
    return buffer;
  }

  get presentationSize(): [number, number] {
    const { width, height } = this.ctx.canvas;
    return [width, height];
  }

  presentationFormat: GPUTextureFormat;

  depthTexture: Texture;

  transformationMatricesBuffer!: GPUBuffer;
  transformationMatricesBindGroupLayout!: GPUBindGroupLayout;
  transformationMatricesBindGroup!: GPUBindGroup;

  createTransformBindGroup() {
    this.transformationMatricesBuffer = this.device.createBuffer({
      size: instanceTransformMatrices.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.transformationMatricesBindGroupLayout =
      this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: 'uniform' },
          },
        ],
      });
    this.transformationMatricesBindGroup = this.device.createBindGroup({
      layout: this.transformationMatricesBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.transformationMatricesBuffer },
        },
      ],
    });
  }

  renderPipeline!: GPURenderPipeline;

  createRenderPipeline() {
    const {
      device,
      transformationMatricesBindGroupLayout: transformBindGroupLayout,
    } = this;

    this.renderPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [transformBindGroupLayout],
      }),
      vertex: {
        module: device.createShaderModule({ code: vert }),
        entryPoint: 'main',
        buffers: [vertexBufferLayout],
      },
      fragment: {
        module: device.createShaderModule({ code: frag }),
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

  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;

  frame = () => {
    this.render();
    requestAnimationFrame(this.frame);
  }

  render() {
    const { transformationMatricesBuffer, vertexBuffer, indexBuffer } = this;
    const { ctx, device, renderPipeline, transformationMatricesBindGroup } =
      this;

    updateTransformationMatrix();
    device.queue.writeBuffer(
      transformationMatricesBuffer,
      0,
      instanceTransformMatrices.buffer,
      instanceTransformMatrices.byteOffset,
      instanceTransformMatrices.byteLength
    );

    const commandEncoder = device.createCommandEncoder();
    const textureView = ctx.getCurrentTexture().createView();

    const passEncoder = commandEncoder.beginRenderPass(
      this.getRenderPassDescriptor(textureView)
    );

    passEncoder.setPipeline(renderPipeline);
    passEncoder.setBindGroup(0, transformationMatricesBindGroup);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setIndexBuffer(indexBuffer, 'uint16');
    passEncoder.drawIndexed(indices.length, instanceCount);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  }
}

GPUHelper.create(canvas.getContext('webgpu')!);
