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
import { GPUHelper } from './gpu-helper';
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

const timeBuffer = new Float32Array(1);

const start = performance.now() / 1000;

const instance = await GPUHelper.create({
  canvas,
  bufferAndBindGroupDescriptor: [
    {
      bufferName: 'timeUniformBuffer',
      bufferInitiator: {
        bufferDescriptor: {
          size: Float32Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        },
      },
      layout: {
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      },
    },
    {
      bufferName: 'transformationMatricesBuffer',
      bufferInitiator: {
        bufferDescriptor: {
          size: instanceTransformMatrices.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        },
      },
      layout: {
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      },
    },
    {
      bufferName: 'vertexBuffer',
      bufferInitiator: {
        bufferDescriptor: {
          size: Float32Array.BYTES_PER_ELEMENT * vertices.length,
          usage: GPUBufferUsage.VERTEX,
        },
        init: {
          ctor: Float32Array,
          value: vertices,
        },
      },
    },
    {
      bufferName: 'indexBuffer',
      bufferInitiator: {
        bufferDescriptor: {
          size: Uint16Array.BYTES_PER_ELEMENT * indices.length,
          usage: GPUBufferUsage.INDEX,
        },
        init: {
          ctor: Uint16Array,
          value: indices,
        },
      },
    },
  ],
  pipelineDescriptor: {
    vertex: {
      code: vert,
      buffers: [vertexBufferLayout],
    },
    fragment: {
      code: frag,
    },
  },

  frame(time) {
    const {
      timeUniformBuffer,
      transformationMatricesBuffer,
      vertexBuffer,
      indexBuffer,
    } = this.buffers;
    const { ctx, device, pipeline, bindGroup } = this;

    timeBuffer[0] = time / 1000 - start;

    device.queue.writeBuffer(timeUniformBuffer, 0, timeBuffer);

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

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: this.renderPassDescriptor.depthStencilAttachment,
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setIndexBuffer(indexBuffer, 'uint16');
    passEncoder.drawIndexed(indices.length, instanceCount);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  },
});

instance.start();
