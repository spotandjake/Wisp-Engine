import { vec3, vec4, radians } from "mv-redux";
import { WebGpuUnavailableError } from "./engine/internal/errors";
import {
  // Camera Elements
  cameraToggle,
  cameraPositions,
  cameraRotations,
  // Item Movement Elements
  itemToggles,
  itemPositions,
  itemRotations,
  itemScales,
} from "./menu";
// Engine
import Renderer, { RendererUpdateEvent } from "./engine/renderer";
import Controller from "./engine/controller";
import GameObject from "./engine/prototypes/gameObject";
import Material from "./engine/prototypes/material";
import getGLTFLoader from "./engine/primitives/gltf";
// Behaviors
import PlayerController from "./behaviors/playerController";
import SliderBehavior from "./behaviors/sliderBehavior";
import SelectionBehavior from "./behaviors/selectionBehavior";
// Models
import World from "./engine/primitives/world";
import Camera from "./engine/primitives/camera";
import Plane from "./engine/primitives/plane";
import Cube from "./engine/primitives/cube";
import Light, { LightType } from "./engine/primitives/light";
import Player from "./objects/player";

// Get our dom items
const canvas = document.getElementById("screen") as HTMLCanvasElement;

// Setup our renderer
let renderer: Renderer;
try {
  renderer = new Renderer(canvas, vec3(0.5, 0.7, 1.0), vec3(0.15, 0.15, 0.15));
  await renderer.initialize();
} catch (error: unknown) {
  if (error instanceof WebGpuUnavailableError) {
    console.error(error);
    alert(
      "WebGPU is not available in your browser. Please try a different browser.",
    );
  }
  // Otherwise this error is completely unknown and unexpected
  throw error;
}

// Initiate our GLTF loader
const loadGLTF = getGLTFLoader(renderer);
const House = await loadGLTF("./models/house/scene.gltf");
const Bed = await loadGLTF("./models/bed/scene.gltf");

// Create some behaviors
const controller = new Controller(window);
const cameraSliderBehavior = (gameObject: GameObject) =>
  new SliderBehavior(gameObject, cameraPositions, cameraRotations, undefined);

// Setup our scene
const world = new World();

const ground = new Plane(
  vec3(-500, 0, -500),
  vec3(0, 0, 0),
  vec3(1000, 1, 1000),
  // Grass Green ground
  new Material(
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0),
    32,
    null,
  ),
);
world.addChild(ground);
const house = new House(vec3(0, 1, 0), vec3(0, 0, 0), vec3(0.03, 0.03, 0.03));
world.addChild(house);
const bed = new Bed(
  vec3(6, 1.5, 20),
  vec3(-Math.PI / 2, (Math.PI / 2) * 2, 0),
  vec3(4),
);
world.addChild(bed);

const sun = new Light(
  vec3(0, 10, 0),
  vec3(radians(-45), radians(45), 0),
  LightType.Directional,
  1.0,
  1000.0,
  vec4(1, 1, 1, 1),
);
world.addChild(sun);

// NOTE: The numbers here were picked by hand to give a nice view of the scene.
const skyCamera = new Camera(
  vec3(55, 45, 55),
  vec3(radians(-30), radians(45), 0),
  canvas.width / canvas.height,
);
skyCamera.addBehavior(cameraSliderBehavior(skyCamera));
world.addChild(skyCamera);

const flashLight = new Light(
  vec3(0, 0, 0),
  vec3(0, 0, 0),
  LightType.Point,
  25.0,
  100.0,
  vec4(1, 1, 1, 1),
);
const playerCamera = new Camera(
  vec3(0, 0, 0),
  vec3(0, 0, 0),
  canvas.width / canvas.height,
);
const player = new Player(
  vec3(30, 2.5, -30),
  vec3(0, Math.PI / 2, 0),
  vec3(1, 1, 1),
  playerCamera,
);
player.addChild(flashLight);
const playerController = new PlayerController(controller, player, 10, 2);
player.addBehavior(playerController);
world.addChild(player);

// Create our moveable items
const itemSliderBehavior = (gameObject: GameObject) =>
  new SliderBehavior(gameObject, itemPositions, itemRotations, itemScales);

const itemA = new Cube(vec3(20, 2, -10), vec3(0, 0, 0), vec3(2, 2, 2));
const itemASelection = new SelectionBehavior(
  itemSliderBehavior(itemA),
  itemToggles.cubeA,
);
itemA.addBehavior(itemASelection);
world.addChild(itemA);

const itemB = new Cube(vec3(20, 2, 0), vec3(0, 0, 0), vec3(2, 2, 2));
const itemBSelection = new SelectionBehavior(
  itemSliderBehavior(itemB),
  itemToggles.cubeB,
);
itemB.addBehavior(itemBSelection);
world.addChild(itemB);

const itemC = new Cube(vec3(0, 0, 5), vec3(0, 0, 0), vec3(1, 1, 1));
const itemCSelection = new SelectionBehavior(
  itemSliderBehavior(itemC),
  itemToggles.cubeC,
);
itemC.addBehavior(itemCSelection);
itemB.addChild(itemC);

// Set our basic renderer properties
renderer.setScene(world);
const pickCamera = () => {
  if (cameraToggle.checked) {
    renderer.setCamera(skyCamera);
  } else {
    renderer.setCamera(playerCamera);
  }
};
pickCamera();
cameraToggle.addEventListener("change", pickCamera);

// Expose a basic rendering loop
renderer.addEventListener("engineUpdate", (event: Event) => {
  if (!(event instanceof RendererUpdateEvent)) return;
  const { deltaTime, timeStamp } = event;
  // Update the world
  world.update(deltaTime);
});
