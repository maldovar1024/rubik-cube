import './style.css';

const { gpu } = navigator;

if (!gpu) {
  throw new Error('WebGPU is not enabled.');
}

const canvas = document.querySelector('canvas')!;
