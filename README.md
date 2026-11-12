# Wisp Engine

Wisp Engine is a lightweight rendering engine built on top of WebGPU, designed to provide a foundation for building 3D games and interactive scenes.

The engine combines **entity-component-system (ECS)** architecture with traditional inheritance to give developers flexibility when structuring game objects, building scenes, and implementing complex behaviors.

Wisp is still in it's early stages, and may not cover every use case. This project has also been a learning experience, so not every abstraction is necessarily perfect. However, after building and experimenting with several scenes, I've found the architecture to be a practical starting point for developing WebGPU applications and games.

## Highlights

- [**GLTF model loading**](https://en.wikipedia.org/wiki/GlTF) – Load and render scenes built with gltf models.
- **Custom shaders** – A set of shader conventions that allows developers to provide their own WGSL shaders.
- [**ECS behavioural system**](https://en.wikipedia.org/wiki/Entity_component_system) – Build dynamic and complex game behaviors through composable entities and components.
- [**Blinn–Phong lighting**](https://en.wikipedia.org/wiki/Blinn%E2%80%93Phong_reflection_model) – Built-in lighting model for basic 3D scene illumination.
- **Flexible scene architecture** – Combine ECS and inheritance to organize game objects and their behaviors.


## Building

A simple example scene is provided in `main.ts` to get you started. Feel free to modify it or replace it with your own scene.

To get started, install the dependencies and launch the development server:

```bash
npm ci # Installs the dependencies (npm install would override package-lock)
npm run dev # Hosts the vite server
```

## Commands

* 

## Dependencies

This project is built using minimal dependencies however a list of them and what they are used for is below:
* `@types/node`, `@webgpu/types` - Add more Typescript type definitions.
* `typescript`- The TSC compiler used for typechecking.
* `vite` - A build time framework allowing for interactive development.
* `wesl-plugin` - A vite plugin for [Wesl](https://wesl-lang.dev/docs/Getting-Started) which is a superset of WGSL implementing a module system.
* `mv-redux` - Basic vector and matrix operations.
* [`webgpu-utils`](https://www.npmjs.com/package/webgpu-utils) - A basic abstraction library similar to mv redux to simplify common webgpu abstractions.
