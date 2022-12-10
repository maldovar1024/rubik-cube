import { mat4, ReadonlyVec3, vec3 } from 'gl-matrix';

export class Camera {
  private originCameraPos: vec3;
  private originUpDirection: vec3;

  private cameraPos: vec3;
  private upDirection: vec3;

  private clicked = false;

  constructor(
    private canvas: HTMLCanvasElement,
    cameraPos: ReadonlyVec3,
    upDirection: ReadonlyVec3
  ) {
    this.originCameraPos = vec3.clone(cameraPos);
    this.originUpDirection = vec3.clone(upDirection);

    this.cameraPos = vec3.clone(cameraPos);
    this.upDirection = vec3.clone(upDirection);

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.clicked = true;
      }
    });

    canvas.addEventListener('mouseup', () => (this.clicked = false));
    canvas.addEventListener('mouseleave', () => (this.clicked = false));

    canvas.addEventListener('contextmenu', (e) => {
      vec3.copy(this.cameraPos, this.originCameraPos);
      vec3.copy(this.upDirection, this.originUpDirection);

      e.preventDefault();
    });

    canvas.addEventListener('mousemove', this.updateCameraPosition);
  }

  lookAt(out: mat4, center: ReadonlyVec3) {
    return mat4.lookAt(out, this.cameraPos, center, this.upDirection);
  }

  private updateCameraPosition = (e: MouseEvent) => {
    const { clicked, canvas, cameraPos, upDirection } = this;

    if (!clicked) {
      return;
    }

    const dx = e.movementX;
    const dy = -e.movementY;

    const { hypot, PI } = Math;
    const eyeTransformation = mat4.create();
    const angle = (hypot(dx, dy) * PI) / canvas.width;

    const leftDirection = vec3.cross(vec3.create(), cameraPos, upDirection);
    vec3.normalize(leftDirection, leftDirection);

    const axis = vec3.create();
    vec3.add(
      axis,
      vec3.scale(leftDirection, leftDirection, dy),
      vec3.scale(axis, upDirection, dx)
    );

    mat4.rotate(eyeTransformation, eyeTransformation, -angle, axis);

    vec3.transformMat4(cameraPos, cameraPos, eyeTransformation);
    vec3.transformMat4(upDirection, upDirection, eyeTransformation);
  };
}
