// A Vite plugin is used to allow importing shader files as strings, but TypeScript doesn't know
// that these files are valid to import. This file provides global type "shims" that tell TypeScript
// to interpret them as if they were JavaScript modules containing a single default export: a string
// called `value`.

/// <reference types="wesl-plugin/suffixes" />

declare module "*.glsl" {
  const value: string;
  export default value;
}

declare module "*.vert" {
  const value: string;
  export default value;
}

declare module "*.frag" {
  const value: string;
  export default value;
}

declare module "*.vs" {
  const value: string;
  export default value;
}

declare module "*.fs" {
  const value: string;
  export default value;
}

declare module "*.wgsl" {
  const value: string;
  export default value;
}
