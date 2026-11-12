import { type Vec3, type Mat4, vec3, mult, mat4 } from "mv-redux";
import { WebGpuUnavailableError } from "./internal/errors";
import type GameObject from "./prototypes/gameObject";
import RenderableGameObject from "./prototypes/renderableGameObject";
import Camera from "./primitives/camera";

import Light from "./primitives/light";

/** The context for the renderer. */
export type RendererContext = {
  /** The WebGPU canvas context. */
  context: GPUCanvasContext;
  /** The WebGPU device. */
  device: GPUDevice;
  /** The WebGPU texture format. */
  format: GPUTextureFormat;
  /** The shared WebGPU depth texture. */
  depthTexture: GPUTexture;
};
/** The internal context for the renderer. */
type InternalRendererContext =
  // Lock based on initialization state
  { initialized: false } | { initialized: true; context: RendererContext };

/** A custom event for engine updates. */
export class RendererUpdateEvent extends Event {
  /** The deltaTime between the last update and the current update. */
  public readonly deltaTime: number;
  /** The timestamp of the current update. */
  public readonly timeStamp: number;
  constructor(deltaTime: number, timeStamp: number) {
    super("engineUpdate");
    this.deltaTime = deltaTime;
    this.timeStamp = timeStamp;
  }
}

/**
 * The main WebGPU renderer class.
 *
 * This is the main controller / orchestrator of our rendering.
 */
class Renderer extends EventTarget {
  /** The context for the renderer. */
  private context: InternalRendererContext = { initialized: false };
  /** The canvas element to render to. */
  private canvas: HTMLCanvasElement;
  /** The camera we are rendering from. */
  private camera: Camera | undefined = undefined;
  /** The world we are rendering. */
  private scene: GameObject | null = null;
  /** The last timestamp we rendered at. */
  private lastTimeStamp: number = 0;
  /** The sky color for the renderer. */
  private skyColor: Vec3;

  constructor(canvas: HTMLCanvasElement, skyColor: Vec3 = vec3(0.5, 0.7, 1.0)) {
    super();
    // Check if WebGPU is available in the browser.
    if (!navigator.gpu)
      throw new WebGpuUnavailableError(
        "WebGPU is not supported in this browser.",
      );

    // Store our canvas element for later use.
    this.canvas = canvas;
    // Store our sky color for later use.
    this.skyColor = skyColor;
  }

  /**
   * Initialize the renderer.
   * NOTE: This method should be called after the renderer is created.
   */
  public async initialize(): Promise<void> {
    // If the renderer is already initialized, we don't need to do anything.
    if (this.context.initialized) return;

    // Get the WebGPU device adapter
    const adapter: GPUAdapter | null = await navigator.gpu.requestAdapter();
    // TODO: Should this have a more specific error type?
    if (adapter === null)
      throw new WebGpuUnavailableError("No WebGPU adapter available.");
    const device: GPUDevice = await adapter.requestDevice();
    // TODO: What are these errors?????
    device.addEventListener("uncapturederror", (event) =>
      console.error("Uncaptured WebGPU error:", event.error),
    );

    // Setup our canvas and configure it for WebGPU rendering.
    const context: GPUCanvasContext = this.canvas.getContext(
      "webgpu",
    ) as GPUCanvasContext;
    const format: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat();
    // TODO: What happens if the canvas is resized?
    context.configure({ device, format, alphaMode: "opaque" });

    // Construct our depth texture
    const depthTexture = device.createTexture({
      size: {
        // TODO: Should we allow the user to change the size of the depth texture?
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Store our rendering context for later use.
    this.context = {
      initialized: true,
      context: {
        context,
        device,
        format,
        depthTexture,
      },
    };

    // Begin our render loop
    this.update(0);
  }

  /** The main update loop for the renderer. */
  private update(timeStamp: number): void {
    // Compute the delta time since the last update
    const deltaTime = this.lastTimeStamp === 0 ? 0 : (timeStamp - this.lastTimeStamp) / 1000;
    this.lastTimeStamp = timeStamp;
    // Emit an update event so the world can update all the objects in the scene.
    this.dispatchEvent(new RendererUpdateEvent(deltaTime, timeStamp));
    // Render the world
    if (this.scene !== null) this.render(this.scene);
    // Request the next frame to be rendered.
    window.requestAnimationFrame(this.update.bind(this));
  }

  /** Renders the given scene. */
  private render(scene: GameObject): void {
    if (!this.context.initialized)
      throw new Error("Renderer is not initialized.");
    if (this.camera === undefined)
      throw new Error("No camera set for the renderer.");

    const context = this.context.context;

    // TODO: Document these better
    // Create the command encoder.
    const encoder = context.device.createCommandEncoder();
    // Begin the render pass.
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.context.getCurrentTexture().createView(),
          // The clear color for the render pass (sky color)
          clearValue: { r: this.skyColor.x, g: this.skyColor.y, b: this.skyColor.z, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        // TODO: We may need to refactor this for canvas resizing.
        view: context.depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    // Traverse the scene collecting the items
    // NOTE: We are using an iterative queue approach here so we can find the camera world position.
    const lightBuffer: [Light, Vec3, Vec3][] = [];
    const renderQueue: { obj: RenderableGameObject; worldMatrix: Mat4 }[] = [];
    const workQueue = [{ obj: scene, worldMatrix: mat4() }];
    // We default to using the camera's position and rotation in local space, 
    // but we will update these values if we find the camera in the scene graph.
    let cameraPosition: Vec3 = this.camera.position;
    let cameraRotation: Vec3 = this.camera.rotation;
    while (workQueue.length > 0) {
      const { obj, worldMatrix } = workQueue.pop()!;
      // If this object is a camera, store the camera position for later use (While we have a reference this is the only way to get the camera position in world space)
      if (obj instanceof Camera && obj === this.camera) {
        // Extract the camera position from the world matrix (This is the only way to get the camera position in world space)
        cameraPosition = vec3(worldMatrix[3][0], worldMatrix[3][1], worldMatrix[3][2]);
        cameraRotation = vec3(worldMatrix[0][2], worldMatrix[1][2], worldMatrix[2][2]);
      }
      // If the object is a light, store the light data for later use
      if (obj instanceof Light) {
        lightBuffer.push([
          obj,
          // Extract the position and direction from the world matrix
          vec3(worldMatrix[3][0], worldMatrix[3][1], worldMatrix[3][2]),
          vec3(worldMatrix[0][2], worldMatrix[1][2], worldMatrix[2][2])
        ]);
      }
      // If the object is render add it to the render queue
      if (obj instanceof RenderableGameObject) {
        renderQueue.push({ obj, worldMatrix });
      }
      // Add the object's children to the work queue
      const modelMatrix = obj.getModelMatrix();
      const childWorldMatrix = mult(worldMatrix, modelMatrix);
      for (const child of obj.children) {
        workQueue.push({ obj: child, worldMatrix: childWorldMatrix });
      }
    }
    // Get the camera's view and projection matrices in world space
    const viewMatrix: Mat4 = Camera.getViewMatrix(cameraPosition, cameraRotation);
    const projectionMatrix: Mat4 = this.camera.getProjectionMatrix();
    const viewProjectionMatrix: Mat4 = mult(projectionMatrix, viewMatrix);
    // Render the objects in the render queue
    for (const { obj, worldMatrix } of renderQueue) {
      obj.render(context, pass, worldMatrix, lightBuffer, viewProjectionMatrix, cameraPosition);
    }

    // End the render pass and submit the commands to the GPU.
    pass.end();
    // Submit the commands to the GPU.
    context.device.queue.submit([encoder.finish()]);
  }


  // Public api
  /** Sets the camera the renderer will render from. */
  public setCamera(camera: Camera): void {
    this.camera = camera;
  }
  /** Sets the scene to render. */
  public setScene(scene: GameObject): void {
    this.scene = scene;
  }
}

export default Renderer;
