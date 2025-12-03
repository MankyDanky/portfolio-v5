// Simplex 3D Noise
const noiseGLSL = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}
`;

export const sunVertex = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const sunFragment = `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

${noiseGLSL}

void main() {
    // Animated noise for plasma effect
    float n1 = snoise(vPosition * 0.15 + vec3(0.0, time * 0.8, 0.0));
    float n2 = snoise(vPosition * 0.3 - vec3(time * 0.8, 0.0, 0.0));
    float n3 = snoise(vPosition * 0.6 + vec3(0.0, 0.0, time * 1.5));
    
    float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    
    // Fresnel Effect (0.0 at center, 1.0 at edge)
    vec3 viewDir = normalize(vViewPosition);
    float viewDot = dot(vNormal, viewDir);
    float fresnel = 1.0 - abs(viewDot);
    
    // Color Palette
    vec3 cCenter = vec3(1.0, 0.35, 0.0);  // Deep Orange (Center)
    vec3 cMid = vec3(1.0, 0.8, 0.2);      // Yellow (Mid-way)
    vec3 cRim = vec3(1.0, 1.0, 0.9);      // White (Edge)
    
    // Radial Gradient: Center(Orange) -> Mid(Yellow) -> Edge(White)
    vec3 baseColor = mix(cCenter, cMid, smoothstep(0.0, 0.7, fresnel));
    baseColor = mix(baseColor, cRim, smoothstep(0.7, 1.0, fresnel));
    
    // Apply Noise to texture (modulate brightness)
    // Noise range is roughly -1 to 1. Map to 0.8 to 1.2
    float brightness = 1.0 + noise * 0.3;
    
    vec3 finalColor = baseColor * brightness;
    
    // Output
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const flareVertex = `
uniform float time;
attribute vec3 aRandom;
varying vec3 vRandom;
varying float vFresnel;

${noiseGLSL}

void main() {
    vRandom = aRandom;
    vec3 pos = position;
    vec3 normal = normalize(pos);
    
    // Noise for flare movement
    float n = snoise(pos * 0.2 + vec3(0.0, time * 0.5, 0.0));
    
    // Create spikes/flares
    float spike = smoothstep(0.0, 1.0, n);
    
    // Push particles out based on noise - REDUCED AMPLITUDE
    pos += normal * (spike * 0.6 + aRandom.x * 0.3);
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Calculate Fresnel for color (View Space)
    vec3 viewDir = normalize(-mvPosition.xyz);
    vec3 viewNormal = normalize(normalMatrix * normal);
    float viewDot = max(0.0, dot(viewDir, viewNormal));
    vFresnel = 1.0 - viewDot; // 0 at center, 1 at edge
    
    // Size attenuation
    gl_PointSize = (40.0 * aRandom.y + 20.0) * (100.0 / -mvPosition.z);
}
`;

export const flareFragment = `
uniform float time;
varying vec3 vRandom;
varying float vFresnel;

${noiseGLSL}

void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    
    if (dist > 0.5) discard;
    
    // Dynamic internal noise for shape
    float n = snoise(vec3(uv * 8.0, time * 2.0 + vRandom.x * 10.0));
    
    // Shape sculpting
    float r = dist * 2.0;
    float shape = (1.0 - r);
    shape += n * 0.3;
    
    float alpha = smoothstep(0.0, 0.2, shape);
    if (alpha < 0.01) discard;
    
    // Color Palette matching Sun Surface
    vec3 cCenter = vec3(1.0, 0.35, 0.0);  // Deep Orange
    vec3 cEdge = vec3(1.0, 1.0, 0.9);     // White/Yellow
    
    // Mix based on position on sphere (Fresnel)
    // Center flares are orange, Edge flares are white
    vec3 baseColor = mix(cCenter, cEdge, smoothstep(0.5, 1.0, vFresnel));
    
    // Add a little internal heat to the flare itself
    vec3 cHot = vec3(1.0, 0.9, 0.5);
    vec3 finalColor = mix(baseColor, cHot, smoothstep(0.5, 1.0, shape) * 0.5);
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;