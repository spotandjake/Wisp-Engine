# Wisp Engine

This direction contains the core implementation of the Wisp Engine, which provides rendering and scene management infrastructure along with supporting systems to make building and displaying 3D scenes easy.

## Architecture

The core of Wisp Engine lives in `./renderer.ts`, which is responsible for initializing the WebGPU environment, managing the render loop, and handling rendering resources such as textures and buffers.

A renderer operates on a scene, which is essentially a tree of `GameObjects`. While the renderer can work with individual `GameObjects`, the recommended starting point is the `World` object.

A `World` acts as the root of a scene and is responsible for propagating update and rendering calls throughout its child objects, as well as updating the behavioral system.

Within a world, you can use existing `GameObjects` or extend them to create your own primitives and more specialized scene objects.

### Behaviors

`GameObjects` can have behaviors attached to them. Behaviors provide a way to encapsulate more complex or reusable functionality, such as keyboard input, player movement, or other game logic, and apply it to different objects.

This separation between an inheritance-based scene graph and an ECS-based behavioral system is a common approach in game engine architecture. It allows scene objects to maintain a clear structural hierarchy while keeping their functionality modular and composable.

### Game Objects

As mentioned earlier, a `GameObject` is the basic building block of a scene. Each game object exposes the following properties:

- `position: Vec3`
- `rotation: Vec3`
- `scale: Vec3`
- `children: GameObject[]`
- `behaviors: Behavior[]`

A game object serves two purposes: it can act as a parent to other objects, defining their coordinate space, or represent an actual object within the scene.

All transformations are defined in local space relative to the object's parent. This allows objects to be grouped into hierarchies, where transformations applied to a parent are inherited by its children.

A game object can have behaviors applied to it, though it's important to note that they are applied in the order.

#### RenderableGameObject

A `RenderableGameObject` extends `GameObject` with rendering capabilities. It provides the renderer a `render` method, allowing the object to control its own rendering management and participate in the pipeline.

More information about the shader format can be found in [`./shaders`](./shaders). The default `RenderableGameObject` implementation is also intended to serve as a base for creating custom renderable objects.

In most cases, subclasses should only need to override `getGeometry()` to provide their own geometry data. The default `render()` implementation handles the actual rendering using the engine's built-in shader.

However if the default shaders don't fit your purposes, you can override `render` and implement your own to achieve more complex things.

Materials define how an object should appear when rendered. They describe surface properties such as base color and textures, which are used by the renderer and lighting system to determine the final appearance of an object.

Textures provide additional surface detail by mapping image data onto an object's geometry using UV coordinates. Materials can optionally reference textures, allowing them to be combined with base colors and other material properties.

Textures are completely optional, allowing objects to use simple vertex colors when additional detail isn't needed, additionally both vertex coloring and textures can be applied to get more varied effects (such as per vertex tinting).

### Prototypes

The `./prototypes` directory contains the base implementations used to build and extend the engine's systems.

These classes provide the common functionality and interfaces that other engine components build upon, rather than representing ready-to-use scene objects themselves.

Some examples include:

- `GameObject` – The base scene object.
- `RenderableGameObject` – Extends `GameObject` with rendering capabilities.
- `Behavior` – The base implementation for attachable behaviours.
- `Material` – Defines the surface properties used when rendering objects.

### Primitives

The `./primitives` directory contains ready-to-use `GameObjects` that can be added directly to your scenes.

These should provide a reasonable starting point for most basic scenes, although more complex use cases may require implementing your own objects.

#### World

The `World` is the root object of a scene and is responsible for coordinating updates throughout the scene hierarchy and behavioural system.

To ensure behaviours are updated, you must call `world.update()` once per frame.

#### Camera

The `Camera` represents the viewpoint from which the scene is rendered.

After initializing the renderer, you must register a camera using `renderer.setCamera()`. The camera must also be part of the scene hierarchy.

#### Light

Represents a light source within the scene. Lights provide illumination for objects using the engine's lighting system.

The current implementation supports up to 64 lights per scene.

#### GLTF

One of the more complex primitives provided by the engine. It uses `@gltf-transform/core` to parse GLTF assets and converts their contents into a hierarchy of `GameObjects` and `RenderableGameObjects`.

This allows complex models containing multiple meshes and objects to be loaded directly into a scene without manually constructing their geometry.

#### Cube and Plane

Simple geometric primitives that serve as basic building blocks for scenes.

These are useful for quickly creating simple geometry without having to implement custom mesh data.

### Shaders

The shader system uses [WESL](https://wesl-lang.dev/), a small superset of [WGSL](https://www.w3.org/TR/WGSL/) that introduces a module system.

The primary reason for using WESL is to separate the shader functionality provided by the engine from the shaders implemented by users. This allows shared functionality, such as lighting calculations and common data structures, to be defined once and reused across multiple shaders.

Currently, there are two main shader files:

- `./engine.wesl` – Defines the core shader functionality provided by the engine, including common data structures and lighting calculations.
- `./default.wesl` – Defines the default shader used by `RenderableGameObject`. This also serves as a reference for implementing custom shaders.

You are free to provide your own shaders, although doing so requires at least a basic understanding of WGSL and the engine's shader conventions.

#### TypeScript Integration

Each shader also has an associated TypeScript file. This is necessary because communication between JavaScript and WGSL is not entirely standardized and depends heavily on the structures, bindings, and data types defined by each shader.

Keeping the TypeScript implementation alongside its corresponding shader allows us to define strongly typed interfaces for GPU resources and shader data. It also makes it easier to keep both sides of the implementation in sync as shaders evolve.

### Lighting

The current lighting implementation is probably one of the areas where Wisp needs the most work.

Lighting calculations are implemented in `./engine.wesl` using a basic version of the [Blinn–Phong Reflectance Model](https://en.wikipedia.org/wiki/Blinn%E2%80%93Phong_reflection_model). This is a considerable improvement over the initial [Lambertian Reflectance Model](https://en.wikipedia.org/wiki/Lambertian_reflectance) I implemented, although it still falls short of more modern approaches such as [Physically Based Rendering (PBR)](https://en.wikipedia.org/wiki/Physically_based_rendering).

The existing abstractions should make transitioning to a more advanced lighting model relatively straightforward. However, PBR would introduce additional complexity, both in terms of shader calculations and the material data required, such as roughness and metallic properties, along with their associated textures.

#### Current Limitations

There are a few notable limitations in the current implementation:

- **No light filtering:** Every light in the scene contributes to lighting calculations, regardless of its distance from the object being rendered. This can become increasingly expensive as the number of lights grows.
- **No occlusion:** Lighting calculations do not account for other objects obstructing light sources.
- **No shadows:** Objects currently do not cast shadows onto other objects.

#### Future Improvements

Shadows are one of the more obvious improvements I'd like to implement.

A common approach would be to render the scene from each light's perspective into a depth texture, then compare those depths against the depth of the fragments being rendered in the main pass. This is generally known as shadow mapping.

While the underlying technique isn't particularly complicated, integrating it into the rendering pipeline is a considerably larger task. It introduces additional rendering passes, depth textures, and resource management. The cost also scales with the number of shadow casting lights, which could become quite expensive without better filtering.

I'd also like to investigate more efficient light selection techniques so that objects only need to consider nearby or otherwise relevant lights, rather than processing every light in the scene.
