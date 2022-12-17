export const colors = [
  [1.0, 1.0, 1.0, 1.0], // Front face: white
  [1.0, 0.0, 117 / 255, 1.0], // Back face: red
  [0.0, 1.0, 0.0, 1.0], // Top face: green
  [0.0, 145 / 255, 230 / 255, 1.0], // Bottom face: blue
  [1.0, 1.0, 0.0, 1.0], // Right face: yellow
  [1.0, 0.0, 1.0, 1.0], // Left face: purple
];

export const vertices = [
  // Front face
  [-1.0, -1.0, 1.0],
  [1.0, -1.0, 1.0],
  [1.0, 1.0, 1.0],
  [-1.0, 1.0, 1.0],

  // Back face
  [-1.0, -1.0, -1.0],
  [-1.0, 1.0, -1.0],
  [1.0, 1.0, -1.0],
  [1.0, -1.0, -1.0],

  // Top face
  [-1.0, 1.0, -1.0],
  [-1.0, 1.0, 1.0],
  [1.0, 1.0, 1.0],
  [1.0, 1.0, -1.0],

  // Bottom face
  [-1.0, -1.0, -1.0],
  [1.0, -1.0, -1.0],
  [1.0, -1.0, 1.0],
  [-1.0, -1.0, 1.0],

  // Right face
  [1.0, -1.0, -1.0],
  [1.0, 1.0, -1.0],
  [1.0, 1.0, 1.0],
  [1.0, -1.0, 1.0],

  // Left face
  [-1.0, -1.0, -1.0],
  [-1.0, -1.0, 1.0],
  [-1.0, 1.0, 1.0],
  [-1.0, 1.0, -1.0],
].flatMap((pos, idx) => pos.concat(colors[Math.floor(idx / 4)]));

export const vertexSize = Float32Array.BYTES_PER_ELEMENT * 7;
export const colorOffset = Float32Array.BYTES_PER_ELEMENT * 3;

export const indices = [
  // front
  [0, 1, 2],
  [0, 2, 3],
  // back
  [4, 5, 6],
  [4, 6, 7],
  // top
  [8, 9, 10],
  [8, 10, 11],
  // bottom
  [12, 13, 14],
  [12, 14, 15],
  // right
  [16, 17, 18],
  [16, 18, 19],
  // left
  [20, 21, 22],
  [20, 22, 23],
].flat();
