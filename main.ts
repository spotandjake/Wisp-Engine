import { vec3 } from "mv-redux";
import { WebGpuUnavailableError } from './engine/errors';
import Renderer, { RendererUpdateEvent } from './engine/renderer';

import World from './engine/primitives/world';
import Camera from './engine/primitives/camera';
import Plane from './engine/primitives/plane';

// Get our dom items
const canvas = document.getElementById('screen') as HTMLCanvasElement;
// Setup our renderer
let renderer: Renderer;
try {
  renderer = new Renderer(
    canvas,
    vec3(0.5, 0.7, 1.0),
  );
  await renderer.initialize();
} catch (error: unknown) {
  // TODO: Display a nice error message to the user if WebGPU is not available.
  if (error instanceof WebGpuUnavailableError) throw error;
  // Otherwise this error is completely unknown and unexpected
  throw error;
}
// Setup our scene
const world = new World();
renderer.setScene(world);

// Create our initial main camera
const camera = new Camera(
  vec3(0, 5, 0),
  vec3(-Math.PI / 2, 0, 0),
  canvas.width / canvas.height
);
world.addChild(camera);
renderer.setCamera(camera);

// Construct a ground
const plane = new Plane(
  vec3(0, 0, 0),
  vec3(0, 0, 0),
  vec3(1, 1, 1)
);
world.addChild(plane);

// Render the world
renderer.addEventListener('engineUpdate', (event: Event) => {
  if (!(event instanceof RendererUpdateEvent)) return;
  const { deltaTime, timeStamp } = event;
  // TODO: Perform any updates to the scene here
  // camera.rotation.y += deltaTime * 0.5;
});