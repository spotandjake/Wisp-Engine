# Assignment-02

This is my assignment 2, instead of completeing the basic project with webgl, I decided to invest my time in building a good rendering abstraction based around webGPU which fulfils the goals of the assignment and can be used for my project.

## Building

The commands below can be used to build my project.

```bash
npm ci # Installs the dependencies
npm run dev # Hosts the vite server
```

## Commands

TODO

## Dependencies

This project is built using minimal dependencies however a list of them and what they are used for is below:
* `@types/node`, `@webgpu/types` - Add more Typescript type definitions.
* `typescript`- The TSC compiler used for typechecking.
* `vite` - A build time framework allowing for interactive development.
* `wesl-plugin` - A vite plugin for [Wesl](https://wesl-lang.dev/docs/Getting-Started) which is a superset of WGSL implementing a module system.
* `mv-redux` - Basic vector and matrix operations.

## Architecture

I figured given the complexity of my renderer I should give a basic overview of how things work and the abstractions I have implemented.

*` ./engine` - The heart of our implementation
  * `./renderer.ts` - The main orchestrator responsible for setting up webGPU and managing rendering passes.
  * `./geometry.ts` - The standardized geometry layout for any object in the scene.
  * `./controller.ts` - A small class for managing user inputs in a standardized cross platform manner.
  * `./shaders/` - A home for all of our engines build in behaviors
    * `./engine.wesl` - This is the base `wgsl` shader that all shaders are expected to inherit from, it allows us to separate the engine's shader expectations from a users shader.
    * `./engine.ts` - This implements the shaders ABI abstracting communication.
    * `./default.wesl` - The default shader used by our renderableObjects, that handles rendering generic geometries.
    * `./default.ts` - This implements the shaders ABI abstracting communication.
  * `./prototypes` - The base classes that we expect users to build off of.
    * `./gameObject.ts` - This is the root item in our scene, it handles the transform information and children elements of a particular node, everything that gets rendered is a `gameObject`
    * ./renderableGameObject.ts` - This is an extension of our gameObject for anything renderable, it handles the default rendering implementation (though users can override it if they need something more unique).
    * `./behavior.ts` - This is the base of our extensible [ecs](https://en.wikipedia.org/wiki/Entity_component_system) based behavior system, users can implement custom behaviors that make scene items do something without having to manage all updates from the root of the application.
  * `./primitives/` - This folder contains our base scene items.
    * `./camera.ts` - A basic camera implementation responsible for handling view and projection matrices.
    * `./light.ts` - A basic light object that allows users to light their scene.
    * `./plane.ts` - A basic plane, as a building block for more complex shapes. (We should probably add some more primitives)
    * `./world.ts` - A basic world class, which is really just a game object that holds everything.
  * `./internal/` - This folder contains any internal utilities that don't really fit elsewhere
    * `./errors.ts` - A central place for proper custom error type and error handling.
  * `./behaviors/` - This folder contains our primitive behaviors
    * `./controllable.ts` - Connects the `Controllable` class to a GameObject allowing for standard fps movement.
* `./behaviors` - User implemented Behaviors
  * `./slider.ts` - Allows us to control any 3dObject using a set of range inputs
* `./geometry` - A collection of user defined geometry
  * `./house.ts` - A basic house model.
* `./objects` - A collection of user defined GameObjects
  * `./house.ts` - The actual game object implementing the house geometry
* `main.ts` - The entrypoint for our project, and where we assemble our scene