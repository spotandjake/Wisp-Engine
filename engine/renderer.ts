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
  private camera: Camera;
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

    // Create a default camera for the renderer to use if one is not set.
    this.camera = new Camera(
      vec3(0, 0, 5),
      vec3(0, 0, 0),
      canvas.width / canvas.height,
    );
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

  /** Collect lights from the scene. */
  private getLightData(scene: GameObject): [Light, Vec3, Vec3][] {
    // Collect the lights from the scene
    const lights: [Light, Vec3, Vec3][] = [];
    const collect = (obj: GameObject, worldMatrix: Mat4) => {
      const modelMatrix = mult(worldMatrix, obj.getModelMatrix());
      const worldPosition = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
      const worldDirection = vec3(modelMatrix[0][2], modelMatrix[1][2], modelMatrix[2][2]);
      // TODO: We need to track the transform of the light in the scene.
      if (obj instanceof Light) lights.push([obj, worldPosition, worldDirection]);
      for (const child of obj.children) collect(child, modelMatrix);
    };
    collect(scene, mat4());
    return lights;
  }

  /** Render an object in the scene. */
  private renderObject(
    context: RendererContext,
    pass: GPURenderPassEncoder,
    worldMatrix: Mat4,
    lights: [Light, Vec3, Vec3][],
    viewProjectionMatrix: Mat4,
    cameraPosition: Vec3,
    gameObject: GameObject,
  ): void {
    // Render the object itself
    if (gameObject instanceof RenderableGameObject) {
      gameObject.render(context, pass, worldMatrix, lights, viewProjectionMatrix, cameraPosition);
    }
    // Render the object's children
    const modelMatrix = gameObject.getModelMatrix();
    const childWorldMatrix = mult(worldMatrix, modelMatrix);
    for (const child of gameObject.children) {
      // NOTE: We handle nested transformations by using the parent as the world.
      this.renderObject(context, pass, childWorldMatrix, lights, viewProjectionMatrix, cameraPosition, child);
    }
  }

  /** Renders the given scene. */
  private render(scene: GameObject): void {
    if (!this.context.initialized)
      throw new Error("Renderer is not initialized.");
    const context = this.context.context;
    // Get the camera's view and projection matrices
    const viewMatrix: Mat4 = this.camera.getViewMatrix();
    const cameraPosition: Vec3 = this.camera.position;
    const projectionMatrix: Mat4 = this.camera.getProjectionMatrix();
    // Compute the combined view-projection matrix
    const viewProjectionMatrix: Mat4 = mult(projectionMatrix, viewMatrix);

    // Update the lighting buffer
    const lightData = this.getLightData(scene);
    // TODO: Figure out how best to pack the light data into a buffer and update it

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

    // Render the scene, (use the viewProjectionMatrix as the initial worldMatrix for the root object)
    this.renderObject(context, pass, mat4(), lightData, viewProjectionMatrix, cameraPosition, scene);

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
