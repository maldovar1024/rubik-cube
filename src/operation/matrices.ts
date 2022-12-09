import { mat4 } from 'gl-matrix';
import { ClockwiseKeys, CounterClockwiseKeys, HalfTurnKeys } from './types';

const { PI } = Math;
const PI_2 = PI / 2;

function rotate(axis: 'X' | 'Y' | 'Z', rad: number) {
  const out = mat4.create();
  return mat4[`rotate${axis}`](out, out, rad);
}

const clockwiseMatrix: Record<ClockwiseKeys, mat4> = {
  F: rotate('Z', -PI_2),
  B: rotate('Z', PI_2),
  L: rotate('X', PI_2),
  R: rotate('X', -PI_2),
  U: rotate('Y', -PI_2),
  D: rotate('Y', PI_2),
};

const counterClockwiseMatrix: Record<CounterClockwiseKeys, mat4> = {
  "F'": rotate('Z', PI_2),
  "B'": rotate('Z', -PI_2),
  "L'": rotate('X', -PI_2),
  "R'": rotate('X', PI_2),
  "U'": rotate('Y', PI_2),
  "D'": rotate('Y', -PI_2),
};

const halfTurnMatrix: Record<HalfTurnKeys, mat4> = {
  F2: rotate('Z', PI),
  B2: rotate('Z', PI),
  L2: rotate('X', PI),
  R2: rotate('X', PI),
  U2: rotate('Y', PI),
  D2: rotate('Y', PI),
};

export default {
  ...clockwiseMatrix,
  ...counterClockwiseMatrix,
  ...halfTurnMatrix,
};
