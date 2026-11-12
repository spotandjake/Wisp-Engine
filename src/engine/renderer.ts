import { type Vec3, type Mat4, vec3, mult, mat4, inverse } from "mv-redux";
import { createTextureFromImage } from "webgpu-utils";
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

export type TextureReference = Symbol;

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
  /** A global store for all textures. */
  private textureStore: Map<TextureReference, GPUTexture> = new Map();
  /** The resize observer for the canvas. */
  private resizeObserver: ResizeObserver | null = null;

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
    // Initialize the texture store for later use.
    this.textureStore = new Map();

    this.resizeObserver = new ResizeObserver(this.resize.bind(this));
    this.resizeObserver.observe(this.canvas);
    this.resize();
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
    if (adapter === null)
      throw new WebGpuUnavailableError("No WebGPU adapter available.");
    const device: GPUDevice = await adapter.requestDevice();
    device.addEventListener("uncapturederror", (event) =>
      console.error("Uncaptured WebGPU error:", event.error),
    );

    // Setup our canvas and configure it for WebGPU rendering.
    const context: GPUCanvasContext = this.canvas.getContext(
      "webgpu",
    ) as GPUCanvasContext;
    const format: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "opaque" });

    // Construct our depth texture
    const depthTexture = device.createTexture({
      size: {
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

  /** Handles canvas resizing. */
  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));

    if (this.canvas.width === width && this.canvas.height === height) {
      return;
    }

    this.canvas.width = width;
    this.canvas.height = height;

    if (this.context.initialized) {
      const rendererContext = this.context.context;
      const oldDepthTexture = rendererContext.depthTexture;

      rendererContext.depthTexture = rendererContext.device.createTexture({
        size: { width, height },
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      oldDepthTexture.destroy();
    }

    if (this.camera !== undefined && this.camera.autoResize) {
      this.camera.setAspectRatio(width / height);
    }
  }

  /** The main update loop for the renderer. */
  private update(timeStamp: number): void {
    // Compute the delta time since the last update
    const deltaTime =
      this.lastTimeStamp === 0 ? 0 : (timeStamp - this.lastTimeStamp) / 1000;
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

    // Create the command encoder.
    const encoder = context.device.createCommandEncoder();
    // Begin the render pass.
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.context.getCurrentTexture().createView(),
          // The clear color for the render pass (sky color)
          clearValue: {
            r: this.skyColor.x,
            g: this.skyColor.y,
            b: this.skyColor.z,
            a: 1,
          },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
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
    const workQueue = [{ obj: scene, worldMatrix: mat4(), shouldRender: true }];
    // We default to using the camera's position and rotation in local space,
    // but we will update these values if we find the camera in the scene graph.
    let cameraPosition: Vec3 = this.camera.position;
    let cameraWorldMatrix: Mat4 = this.camera.getModelMatrix();
    while (workQueue.length > 0) {
      const {
        obj,
        worldMatrix,
        shouldRender: parentShouldRender,
      } = workQueue.pop()!;
      const modelMatrix = obj.getModelMatrix();
      const childWorldMatrix = mult(worldMatrix, modelMatrix);
      // If this object is a camera, store the camera position for later use (While we have a reference this is the only way to get the camera position in world space)
      if (obj instanceof Camera && obj === this.camera) {
        // NOTE: We need the position in world space, so we extract it from the world matrix.
        cameraPosition = vec3(
          childWorldMatrix[3][0],
          childWorldMatrix[3][1],
          childWorldMatrix[3][2],
        );
        cameraWorldMatrix = childWorldMatrix;
      }
      // If the object is a light, store the light data for later use
      if (obj instanceof Light) {
        const rotationY = Math.asin(
          Math.max(-1, Math.min(1, childWorldMatrix[2][0])),
        );
        const rotationX = Math.atan2(
          -childWorldMatrix[2][1],
          childWorldMatrix[2][2],
        );
        const rotationZ = Math.atan2(
          -childWorldMatrix[1][0],
          childWorldMatrix[0][0],
        );
        lightBuffer.push([
          obj,
          // Extract the position and direction from the world matrix
          vec3(
            childWorldMatrix[3][0],
            childWorldMatrix[3][1],
            childWorldMatrix[3][2],
          ),
          vec3(rotationX, rotationY, rotationZ),
        ]);
      }
      const shouldRender = parentShouldRender && obj.shouldRender(this);
      // If the object is render add it to the render queue
      if (obj instanceof RenderableGameObject && shouldRender) {
        renderQueue.push({ obj, worldMatrix });
      }
      // Add the object's children to the work queue
      for (const child of obj.children) {
        workQueue.push({
          obj: child,
          worldMatrix: childWorldMatrix,
          shouldRender,
        });
      }
    }
    // Get the camera's view and projection matrices in world space
    const viewMatrix: Mat4 = inverse(cameraWorldMatrix);
    const projectionMatrix: Mat4 = this.camera.getProjectionMatrix();
    const viewProjectionMatrix: Mat4 = mult(projectionMatrix, viewMatrix);
    // Render the objects in the render queue
    for (const { obj, worldMatrix } of renderQueue) {
      obj.render(
        context,
        pass,
        this.textureStore,
        worldMatrix,
        lightBuffer,
        viewProjectionMatrix,
        cameraPosition,
      );
    }

    // End the render pass and submit the commands to the GPU.
    pass.end();
    // Submit the commands to the GPU.
    context.device.queue.submit([encoder.finish()]);
  }

  // Public api
  /** Gets the camera the renderer is rendering from. */
  public getCamera(): Camera | undefined {
    return this.camera;
  }
  /** Sets the camera the renderer will render from. */
  public setCamera(camera: Camera): void {
    this.camera = camera;
    if (this.camera !== undefined && this.camera.autoResize) {
      this.camera.setAspectRatio(this.canvas.width / this.canvas.height);
    }
  }
  /** Sets the scene to render. */
  public setScene(scene: GameObject): void {
    this.scene = scene;
  }
  /** Loads a texture from an image file. */
  public async loadTexture(path: string): Promise<TextureReference> {
    if (!this.context.initialized)
      throw new Error("Renderer is not initialized.");
    const context = this.context.context;

    // Load the texture from the image file and create a GPU texture
    const texture = await createTextureFromImage(context.device, path, {
      mips: true,
    });
    // Create a unique reference for the texture and store it in the cache
    const textureRef: TextureReference = Symbol("texture");
    this.textureStore.set(textureRef, texture);

    return textureRef;
  }

  public async loadImageBitmap(bitmap: ImageBitmap): Promise<TextureReference> {
    if (!this.context.initialized)
      throw new Error("Renderer is not initialized.");
    const context = this.context.context;

    // Create a GPU texture from the pixels
    const texture = context.device.createTexture({
      size: [bitmap.width, bitmap.height, 1],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    // Copy the pixels to the GPU texture
    context.device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture },
      [bitmap.width, bitmap.height],
    );
    // Create a unique reference for the texture and store it in the cache
    const textureRef: TextureReference = Symbol("texture");
    this.textureStore.set(textureRef, texture);

    return textureRef;
  }
}

export default Renderer;
