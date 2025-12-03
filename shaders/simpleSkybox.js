export const simpleSkyboxVertex = `
varying vec3 vWorldPosition;
void main() {
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

export const simpleSkyboxFragment = `
varying vec3 vWorldPosition;
void main() {
    vec3 dir = normalize(vWorldPosition);
    vec3 color = vec3(0.067, 0.102, 0.145); // #111a25
    
    float scale = 300.0;
    vec3 p = dir * scale;
    vec3 cell = floor(p);
    
    float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    
    if (h > 0.995) {
        float brightness = (h - 0.995) / (1.0 - 0.995);
        color = mix(color, vec3(1.0), brightness);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;