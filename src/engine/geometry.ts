// TODO: Figure out if this is what we actually want
/** A representation of a 3D geometric shape. */
export type Geometry = {
  /** Vertex positions (x, y, z). */
  positions: Float32Array;
  /** Optional vertex normals (x, y, z). */
  normals: Float32Array;
  /** Optional texture coordinates (u, v). */
  uvs?: Float32Array;
  /** Optional vertex colors (r, g, b). */
  colors?: Float32Array;
  /** Optional triangle indices. */
  indices?: Uint16Array | Uint32Array;
};
