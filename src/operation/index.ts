import { mat4 } from 'gl-matrix';
import transformMatrices from './matrices';
import positionMap from './position-map';
import { AllTransformKeys } from './types';

export type { AllTransformKeys } from './types';

interface TransformState {
  position: number;
  matrix: mat4;
}

export function transform(ops: AllTransformKeys[]) {
  const initialStates = Array.from({ length: 27 }).map<TransformState>(
    (_, idx) => ({
      position: idx,
      matrix: mat4.identity(mat4.create()),
    })
  );

  return ops
    .reduce(
      (prevStates, op) =>
        prevStates.map(({ position, matrix }) => {
          const nextPosition = positionMap[op][position];
          return {
            position: nextPosition ?? position,
            matrix:
              nextPosition === undefined
                ? matrix
                : mat4.multiply(matrix, transformMatrices[op], matrix),
          };
        }),
      initialStates
    )
    .map(({ matrix }) => matrix);
}

export function identity() {
  return Array.from({ length: 27 }).map(() => mat4.create());
}

const ops = new Set([
  'F',
  'B',
  'L',
  'R',
  'U',
  'D',
  'f',
  'b',
  'l',
  'r',
  'u',
  'd',
]);

export class Operation {
  constructor(target: HTMLElement) {
    target.addEventListener('keypress', this.handleKeyPress);
  }

  private operations: AllTransformKeys[] = [];

  private handleKeyPress = (e: KeyboardEvent) => {
    const { key } = e;

    if (!ops.has(key)) {
      return;
    }

    const { operations } = this;

    if (key < 'Z') {
      operations.push(`${key.toUpperCase()}'` as AllTransformKeys);
    } else if (e.ctrlKey) {
      operations.push(`${key.toUpperCase()}2` as AllTransformKeys);
    } else {
      operations.push(key.toUpperCase() as AllTransformKeys);
    }
  };

  getOpMatrix() {
    return transform(this.operations);
  }
}
