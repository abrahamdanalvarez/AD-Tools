"""Weight-only 8-bit quantisation of an ONNX model (development tool, never shipped).

Conv, MatMul and Gemm weights become int8 with one scale per output channel,
followed by a DequantizeLinear node. Activations stay float32, so the model
runs unchanged on ONNX Runtime Web's WebGPU and WASM backends, at about a
quarter of the download size.

Usage: python scripts/models/quantize.py <in.onnx> <out.onnx>
Requires the pinned packages in scripts/models/requirements.txt.
"""
import sys

import numpy as np
import onnx
from onnx import helper, numpy_helper

MIN_ELEMENTS = 4096  # small tensors save little and are the most sensitive


def weight_axis(node: onnx.NodeProto, index: int, ndim: int):
    """Output-channel axis of a weight used as input `index` of `node`, or None."""
    if index != 1:
        return None
    if node.op_type == "Conv":
        return 0
    if node.op_type == "MatMul" and ndim == 2:
        return 1
    if node.op_type == "Gemm":
        trans_b = any(a.name == "transB" and a.i == 1 for a in node.attribute)
        return 0 if trans_b else 1
    return None


def quantize(src: str, dst: str) -> None:
    model = onnx.load(src)
    opset = max(o.version for o in model.opset_import if o.domain in ("", "ai.onnx"))
    if opset < 13:
        sys.exit(f"Opset {opset} has no per-axis DequantizeLinear (needs 13+).")
    graph = model.graph
    uses: dict[str, list[tuple[onnx.NodeProto, int]]] = {}
    for node in graph.node:
        for i, name in enumerate(node.input):
            uses.setdefault(name, []).append((node, i))
    graph_inputs = {i.name for i in graph.input}

    kept, added, dq_nodes = [], [], []
    before = after = 0
    for init in graph.initializer:
        w = numpy_helper.to_array(init) if init.data_type == onnx.TensorProto.FLOAT else None
        # Identity just passes the (dequantised) weight on, so it doesn't decide the axis.
        axes = {weight_axis(n, i, w.ndim) for n, i in uses.get(init.name, []) if n.op_type != "Identity"} if w is not None else {None}
        if w is None or w.size < MIN_ELEMENTS or w.ndim < 2 or init.name in graph_inputs or len(axes) != 1 or None in axes:
            kept.append(init)
            continue
        axis = axes.pop()
        reduce = tuple(d for d in range(w.ndim) if d != axis)
        scale = (np.abs(w).max(axis=reduce) / 127).astype(np.float32)
        scale[scale == 0] = 1
        shape = [1] * w.ndim
        shape[axis] = -1
        q = np.clip(np.rint(w / scale.reshape(shape)), -127, 127).astype(np.int8)
        n = init.name
        added += [
            numpy_helper.from_array(q, f"{n}__q"),
            numpy_helper.from_array(scale, f"{n}__scale"),
            numpy_helper.from_array(np.zeros_like(scale, dtype=np.int8), f"{n}__zero"),
        ]
        dq_nodes.append(helper.make_node("DequantizeLinear", [f"{n}__q", f"{n}__scale", f"{n}__zero"], [n], name=f"{n}__dq", axis=axis))
        before += w.nbytes
        after += q.nbytes + scale.nbytes * 2

    del graph.initializer[:]
    graph.initializer.extend(kept + added)
    # Dequantize first, so every consumer comes after its weight (topological order).
    nodes = list(graph.node)
    del graph.node[:]
    graph.node.extend(dq_nodes + nodes)
    onnx.checker.check_model(model)
    onnx.save(model, dst)
    print(f"quantised {len(dq_nodes)} weights: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    quantize(sys.argv[1], sys.argv[2])
