// This module implements a GLTF based renderable object
import type { Vec3 } from "mv-redux";
import type { Geometry } from "../geometry";
import {
  WebIO,
  type Material as GltfMaterial,
  type Primitive,
} from "@gltf-transform/core";
import { vec4, vec3 } from "mv-redux";
import Renderer from "../renderer";
import Material from "../prototypes/material";
import GameObject from "../prototypes/gameObject";
import RenderableGameObject from "../prototypes/renderableGameObject";

/** Converts a GLTF material to an engine material */
const convertGltfMaterialToEngineMaterial = async (
  renderer: Renderer,
  gltfMaterial: GltfMaterial | null,
): Promise<Material> => {
  if (gltfMaterial === null) return new Material(vec4(1, 1, 1, 1), null, 32);
  // NOTE: We fall back to white if the material is null, since we don't have a material to use
  const color = gltfMaterial.getBaseColorFactor();
  // Load the texture
  const baseTexture = gltfMaterial.getBaseColorTexture();
  if (baseTexture == null) return new Material(vec4(...color), null, 32);
  const pixelData = baseTexture.getImage();
  if (pixelData === null) return new Material(vec4(...color), null, 32);
  const blob = new Blob([pixelData], { type: baseTexture.getMimeType() });
  const bitmap = await createImageBitmap(blob);
  const textureReference = await renderer.loadImageBitmap(bitmap);
  return new Material(vec4(...color), textureReference, 32);
};

/** Converts a GLTF primitive to an engine geometry */
const convertGltfGeometryToEngineGeometry = (
  gltfPrimitive: Primitive,
): Geometry => {
  // Extract the geometry attributes
  const position = gltfPrimitive.getAttribute("POSITION");
  const normal = gltfPrimitive.getAttribute("NORMAL");
  const index = gltfPrimitive.getIndices();
  const uv = gltfPrimitive.getAttribute("TEXCOORD_0");
  const color = gltfPrimitive.getAttribute("COLOR_0");

  // Validate it's a model we can load
  if (gltfPrimitive.getMode() !== 4)
    throw new Error("Only triangle primitives are supported");
  if (!position) throw new Error("Primitive is missing POSITION");
  if (!normal) throw new Error("Primitive is missing NORMAL");

  // Extract the underlying array buffers
  const positions = position.getArray();
  const normals = normal.getArray();
  const indexData = index?.getArray();
  const uvs = uv?.getArray();
  const colorData = color?.getArray();

  // Validate the underlying data type of the position attribute
  if (!(positions instanceof Float32Array))
    throw new Error("POSITION must use FLOAT components");
  if (!(normals instanceof Float32Array))
    throw new Error("NORMAL must use FLOAT components");
  if (uvs && !(uvs instanceof Float32Array))
    throw new Error("TEXCOORD_0 must use FLOAT components");
  if (colorData && !(colorData instanceof Float32Array))
    throw new Error("COLOR_0 must use FLOAT components");

  // Extract the color information
  let colors: Float32Array | undefined;
  if (colorData) {
    if (color!.getType() === "VEC3") {
      colors = new Float32Array(colorData);
    } else if (color!.getType() === "VEC4") {
      colors = new Float32Array((colorData.length / 4) * 3);

      for (let i = 0, j = 0; i < colorData.length; i += 4, j += 3) {
        colors[j] = colorData[i];
        colors[j + 1] = colorData[i + 1];
        colors[j + 2] = colorData[i + 2];
      }
    } else {
      throw new Error("COLOR_0 must be VEC3 or VEC4");
    }
  }

  // Extract the index information
  let indices: Uint16Array | Uint32Array | undefined;
  if (indexData) {
    if (indexData instanceof Uint16Array || indexData instanceof Uint32Array)
      indices = indexData;
    else if (indexData instanceof Uint8Array)
      indices = new Uint16Array(indexData);
    else throw new Error("Unsupported index component type");
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: uvs ? new Float32Array(uvs) : undefined,
    colors,
    indices,
  };
};

export default (renderer: Renderer) => {
  // Create our GLTF loader
  const io = new WebIO({ credentials: "include" });

  return async (gltfPath: string) => {
    // Load the gltf
    const document = await io.read(gltfPath);

    // Get the root and the meshes from the gltf document
    const root = document.getRoot();
    const meshes = root.listMeshes();
    // Extract the individual child meshes from the primitives
    const parts: GameObject[] = [];
    for (const mesh of meshes) {
      // Get the primitives that actually make up the mesh
      const primitives = mesh.listPrimitives();
      for (const primitive of primitives) {
        // Extract the material from the primitive
        const rawMaterial = primitive.getMaterial();
        const material = await convertGltfMaterialToEngineMaterial(
          renderer,
          rawMaterial,
        );
        // Extract the geometry from the primitive
        const geometry = convertGltfGeometryToEngineGeometry(primitive);

        // Create a new class that extends RenderableGameObject and overrides the getGeometry method
        const part = class GLTFPart extends RenderableGameObject {
          public name: string = mesh.getName() || "GLTFPart";
          constructor(
            position: Vec3,
            rotation: Vec3,
            scale: Vec3,
            material: Material,
          ) {
            super(position, rotation, scale, material);
          }
          protected override getGeometry(): Geometry {
            return geometry;
          }
        };

        // Add the part to the list of parts
        parts.push(
          new part(vec3(0, 0, 0), vec3(0, 0, 0), vec3(1, 1, 1), material),
        );
      }
    }

    return class Gltf extends GameObject {
      public name: string = root.getName() || "GltfModel";
      constructor(position: Vec3, rotation: Vec3, scale: Vec3) {
        super(position, rotation, scale);
        // Add the children parts to the Gltf model
        for (const part of parts) this.addChild(part);
      }
    };
  };
};
