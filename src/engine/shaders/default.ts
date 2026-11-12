// This file contains the default shader ABI, which is used to interface with the default shader. It provides a way to set up the necessary data and resources for rendering objects in the scene, we keep it next to the shader code so that we can keep it in sync with the shader code.
import type { Mat4 } from "mv-redux";
import type { StructuredView } from "webgpu-utils";
import type { StandardShaderAbiInput, StructView } from "./generic";

import { makeStructuredView } from "webgpu-utils";

// The bind group index for the default shader's bind group.
const BIND_GROUP = 1;

// Default Shader ABI
// ============================
/** The input for the default shader ABI. */
export interface DefaultShaderAbiInput {
  /** The world matrix to use for the engine shader. */
  modelMatrix: Mat4;
}
/** The interface for the engine shader ABI. */
export default (
  { device, defs, layouts, pass }: StandardShaderAbiInput,
  { modelMatrix }: DefaultShaderAbiInput,
) => {
  // Create our structured views
  const modelStructView = makeStructuredView(
    defs.uniforms.model,
  ) as StructView<{ matrix: Mat4 }>;

  // Create our buffers
  const getViewSize = (view: StructuredView) => view.arrayBuffer.byteLength;
  const defaultUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  const modelStructBuffer = device.createBuffer({
    size: getViewSize(modelStructView),
    usage: defaultUsage,
  });

  // Construct the actual bind group
  const bindings = [modelStructBuffer];
  const bindGroup = device.createBindGroup({
    layout: layouts[BIND_GROUP],
    entries: [
      // Pass our buffers
      ...bindings.map((b, i) => ({ binding: i, resource: { buffer: b } })),
    ],
  });

  const getBuff = (view: StructuredView) => view.arrayBuffer;
  // Set the renderer data in the structured view and write it to the GPU buffer
  modelStructView.set({
    matrix: modelMatrix,
  });
  device.queue.writeBuffer(modelStructBuffer, 0, getBuff(modelStructView));

  // Bind the bind group to the render pass
  pass.setBindGroup(BIND_GROUP, bindGroup);
};
