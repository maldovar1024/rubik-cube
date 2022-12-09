@group(0) @binding(0) var<uniform> time: f32;

@stage(fragment)
fn main(@builtin(position) position: vec4<f32>, @location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
    return color;
}

