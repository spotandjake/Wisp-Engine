# 🌀 Wisp Engine

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

The following npm scripts are available:

- `npm run dev` – Starts the Vite development server with live reloading.
- `npm run build` – Builds the project and outputs the production files to `./dist`.
- `npm run preview` – Serves the production build locally for previewing before deployment.
- `npm run check` – Runs TypeScript type checking.
- `npm run format` – Formats the project using Prettier.
- `npm run lint` – Checks the project for formatting issues.
- `npm run clean` – Removes the `./dist` directory.

The source of these commands can be found in `./package.json`.

## Dependencies

The Wisp Engine has been built mostly from scratch. However in order to keep things manageable (and maintain my sanity), a handful of libraries are used to handle more tedious or complex problems.

Below is a breakdown of the project's dependencies and what they're used for.

### Runtime Dependencies

These dependencies are bundled with the project and used at runtime. They provide utilities and abstractions that simplify otherwise tedious or complex implementation details.

- [`@gltf-transform/core`](https://www.npmjs.com/package/@gltf-transform/core) – Used by `./src/engine/primitives/gltf.ts` to handle GLTF parsing and decoding. GLTF is a fairly complex format, so this library allows us to support generic model loading without having to implement the format ourselves.
- [`mv-redux`](https://www.npmjs.com/package/mv-redux) – A lightweight mathematics library providing vector and matrix operations used throughout the engine.
- [`webgpu-utils`](https://www.npmjs.com/package/webgpu-utils) – Provides utility functions and abstractions for working with WebGPU, particularly when interacting with shaders and GPU resources.
  - Initially, these operations were implemented manually (older Git commits contain the original implementations). However, WebGPU is a relatively low-level API with a fair amount of repetitive boilerplate. This library helps reduce that complexity without hiding the underlying API.

### Development Dependencies

These dependencies are used during development and are not required as runtime libraries.

- [`vite`](https://www.npmjs.com/package/vite) – Provides the development server and build tooling, making it easier to work with TypeScript and ES modules in the browser.
- [`typescript`](https://www.npmjs.com/package/typescript) – Adds static typing to JavaScript, helping catch errors during development.
- [`wesl-plugin`](https://www.npmjs.com/package/wesl-plugin) – Provides a module system for WGSL through WESL, a small superset of WGSL.
  - While not strictly required, this makes the engine considerably more extensible by allowing shaders to share common code and abstractions.
- [`prettier`](https://www.npmjs.com/package/prettier) – Maintains consistent code formatting throughout the project.
- [`@webgpu/types`](https://www.npmjs.com/package/@webgpu/types) – Provides TypeScript definitions for the WebGPU API.
- [`@types/node`](https://www.npmjs.com/package/@types/node) – Provides TypeScript definitions for Node.js APIs used by Vite and the development tooling.

## Model Attribution

The house model has been taken from SketchFab, and was made by `Lodgelus`, it is available [here](https://sketchfab.com/3d-models/house-with-interior-and-porch-51aa0e8c9b224262af9df8942761e5c7).

## License

Wisp Engine is open source and distributed under the terms of the license included in this repository. See the `LICENSE` file for details.

Third-party dependencies are distributed under their respective licenses.
