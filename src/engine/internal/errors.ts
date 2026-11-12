// Centralized utils for implementing custom errors.

/** Creates a new error constructor with the given name. */
const defineError = (name: string): new (message: string) => Error => {
  // NOTE: Classes in JS are first class citizens, so we can create a
  // class dynamically and return it from a function.
  return class extends Error {
    constructor(message: string) {
      super(message);
      this.name = name;
    }
  };
};

// Renderer Errors
export const WebGpuUnavailableError = defineError("WebGpuUnavailableError");

// RenderableGameObject Errors
export const EmptyGeometryError = defineError("EmptyGeometryError");
