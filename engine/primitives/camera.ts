import {
  type Vec3,
  type Mat4,
  vec3,
  mat4,
  translationMatrix,
  rotationMatrix,
  mult,
  inverse
} from "mv-redux";
import GameObject from "../prototypes/gameObject";

class Camera extends GameObject {
  /** The fov of the camera in radians. */
  public readonly fov: number;
  /** The aspect ratio of the camera, width/height. */
  public readonly aspectRatio: number;
  /** The near clipping plane of the camera. */
  public readonly near: number;
  /** The far clipping plane of the camera. */
  public readonly far: number;

  constructor(
    position: Vec3,
    rotation: Vec3,
    aspectRatio: number,
    // These values are set to reasonable defaults, but can be changed if needed.
    fov: number = Math.PI / 4,
    near: number = 0.1,
    far: number = 1000.0,
  ) {
    // NOTE: We do not allow scaling cameras, as it doesn't really make sense
    super(position, rotation, vec3(1, 1, 1));

    this.fov = fov;
    this.aspectRatio = aspectRatio;
    this.near = near;
    this.far = far;
  }

  // TODO: Provide a good way of updating the aspect ratio

  /** Returns the projection matrix for this camera. */
  public getProjectionMatrix(): Mat4 {
    const f = 1.0 / Math.tan(this.fov / 2);
    const rangeInv = 1 / (this.near - this.far);
    // prettier-ignore
    return mat4(
      f / this.aspectRatio, 0, 0, 0,
      0, f, 0, 0,
      0, 0, this.far * rangeInv, -1,
      0, 0, this.near * this.far * rangeInv, 0
    );
  }
  /** Returns the view matrix for this camera. */
  public getViewMatrix(): Mat4 {
    const translation = translationMatrix(this.position);
    const rotationX = rotationMatrix("x", this.rotation.x);
    const rotationY = rotationMatrix("y", this.rotation.y);
    const rotationZ = rotationMatrix("z", this.rotation.z);
    const cameraMatrix = mult(
      translation,
      mult(rotationZ, mult(rotationY, rotationX)),
    );
    return inverse(cameraMatrix);
  }
}

export default Camera;
