const distance = 2.01;

export const instanceTransform: [number, number, number][] = [
  [-distance, -distance, -distance],
  [-distance, -distance, 0],
  [-distance, -distance, distance],
  [-distance, 0, -distance],
  [-distance, 0, 0],
  [-distance, 0, distance],
  [-distance, distance, -distance],
  [-distance, distance, 0],
  [-distance, distance, distance],
  [0, -distance, -distance],
  [0, -distance, 0],
  [0, -distance, distance],
  [0, 0, distance],
  [0, 0, 0],
  [0, 0, -distance],
  [0, distance, -distance],
  [0, distance, 0],
  [0, distance, distance],
  [distance, -distance, -distance],
  [distance, -distance, 0],
  [distance, -distance, distance],
  [distance, 0, -distance],
  [distance, 0, 0],
  [distance, 0, distance],
  [distance, distance, -distance],
  [distance, distance, 0],
  [distance, distance, distance],
];

export const instanceCount = instanceTransform.length;
export const matrixF32Count = 16; // 4x4 matrix
