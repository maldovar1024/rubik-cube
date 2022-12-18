@group(0) @binding(0) var<uniform> transformMatrics: array<mat4x4<f32>, 27>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

@vertex
fn main(@builtin(instance_index) instance_idx: u32, @location(0) position: vec3<f32>, @location(1) color: vec4<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.position = transformMatrics[instance_idx] * vec4<f32>(position, 1.0);
    output.color = color;

    return output;
}
