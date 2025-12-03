export const planetVertexToon = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const planetFragmentToon = `
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 sunPosition;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
    vec3 lightDir = normalize(sunPosition - vWorldPosition);
    float intensity = dot(vNormal, lightDir);
    
    // Cel Shading Steps
    float shade = 1.0;
    if (intensity < 0.1) shade = 0.5; // Shadow
    else if (intensity < 0.5) shade = 0.8; // Midtone
    else shade = 1.0; // Highlight
    
    // Use color1 as the main color
    vec3 finalColor = color1 * shade;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;