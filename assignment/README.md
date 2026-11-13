# Assignment

The main goal of this project was for my COIS-4480 assignment below are the parts of that assignment separate from the rendering itself, I also put together a list of how i'm fulfilling each requirement to make it a bit more clear as some of my abstractions abstract over the requirements.

## Theory

### Question 1: Modern graphics & GPU computing

TODO:

### Question 2: Cameras for virtual reality

TODO:

## Requirements

- [x] Define your scene using a tree structure.
  - This is achieved by `../src/engine/prototypes/gameObject.ts`
- [x] Update and render your scene by traversing the tree; drawing a node in the tree should also draw all of its children.
  - This is achieved by `../src/engine/renderer.ts`
- [x] Grouped/nested objects should move together; (e.g., a character model's hands would move along with their arms, which would move along with their torso, and so on. )
  - This is achieved by the combined operations in `../src/engine/renderer.ts`, `../src/engine/prototypes/gameObject.ts` & `../src/engine/prototypes/renderableGameObject.ts`
- [x] Have at least one “grandchild” in your scene: an object whose overall position is based on two or more ancestors.
  - I have many but a simple one is the `playerFlashlight` in `../src/main.ts`
- [x] Have at least one set of “siblings” in your scene graph: two or more objects with the same parent, but whose transformations do not affect each other. Worded another way, have at least one node in your scene graph with more than one child node.
  - I have this in a few places but one of the main ones is `World` in `../src/engine/primitives/world.ts`
- [x] Have at least one node in your scene graph with three or more children attached to it.
  - I have this in a few places but one of the main ones is `World` in `../src/engine/primitives/world.ts`
  - You can also check the `Player` in `../src/objects/player.ts`
- [x] Make cameras into their own sub-class of your base scene object class.
  - This is achieved in `../src/engine/primitives/camera.ts`
  - Camera extraction is done in the `Renderer` in `../src/engine/renderer.ts`
- [x] Have at least two cameras in your scene graph. One of them must be a child of some other object in the scene graph so it stays attached as the object moves around.
  - I have multiple cameras they can be found in `../src/main.ts`
  - I have a nested camera in `../src/objects/player.ts`
  - This is also technically achieved by the world.
- [x] Cameras should have properties for field of view, near clipping plane distance, far clipping plane distance, and aspect ratio.
  - This is implemented in `../src/engine/primitives/camera.ts`
- [x] Cameras should have methods or getters that return their view and projection matrices.
  - I've done this a bit differently then stated but it achieves the same goals, the `inverse` of the model matrix is used for the `viewMatrix` in the `Renderer` and we compute the perspective matrix in the `Camera` itself.
- [x] Use a button or dropdown to switch between the cameras in your scene (of which there should be at least two; see above).
  - This is implemented in `../src/main.ts` near the bottom
- [x] Allow for one of your cameras to be positioned and oriented in the scene using xx, yy, and zz sliders.
  - This is implemented in `../src/main.ts` as a behavior, the behavior itself is in `../src/behaviors/sliderBehavior.ts`
- [x] Allow for some of your objects to be transformed using sliders or other inputs. Make sure to cover all three dimensions of position, rotation, and scale between all your controllable objects.
  - I set this up in `../src/main.ts`, however the actual behavior is composed with `../src/behavior/selectionBehavior.ts` and `../src/behavior/sliderBehavior.ts`
- [x] Ensure that at least one of your controllable objects has a child, to show that its transformation affects all of its children.
  - I set this up in `../src/main.ts`
- [x] Draw/position your objects by passing model, view, and projection matrices to the shader (as opposed to generating them in the shader from individual properties).
  - I pre-multiply the view and projection matrices in the renderer for less data passing.
  - The model matrix is computed in `../src/engine/prototypes/gameObject.ts`
- [x] Like the first assignment, you should take advantage of composition, inheritance, or some other abstraction to simplify your code and avoid repetition.
- [x] Also like the first assignment, you should keep your code organized by making use of JavaScript/TypeScript modules (separate files with imports and exports in them).
