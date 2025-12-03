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

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const sunFragment = `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

${noiseGLSL}

void main() {
    // Animated noise for plasma effect
    float n1 = snoise(vPosition * 0.15 + vec3(0.0, time * 0.8, 0.0));
    float n2 = snoise(vPosition * 0.3 - vec3(time * 0.8, 0.0, 0.0));
    float n3 = snoise(vPosition * 0.6 + vec3(0.0, 0.0, time * 1.5));
    
    float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    
    // Color palette
    vec3 dark = vec3(0.8, 0.1, 0.0);   // Dark Red
    vec3 base = vec3(1.0, 0.4, 0.0);   // Orange
    vec3 bright = vec3(1.0, 0.8, 0.2); // Yellow
    vec3 hot = vec3(1.0, 1.0, 0.8);    // White-ish
    
    vec3 color = mix(dark, base, smoothstep(-0.5, 0.0, noise));
    color = mix(color, bright, smoothstep(0.0, 0.4, noise));
    color = mix(color, hot, smoothstep(0.4, 0.8, noise));
    
    // Add some emission intensity for bloom
    gl_FragColor = vec4(color * 1.0, 1.0);
}
`;

export const flareVertex = `
uniform float time;
attribute vec3 aRandom;
varying vec3 vColor;

${noiseGLSL}

void main() {
    vec3 pos = position;
    vec3 normal = normalize(pos);
    
    // Noise for flare movement
    float n = snoise(pos * 0.2 + vec3(0.0, time * 0.5, 0.0));
    
    // Create spikes/flares
    float spike = smoothstep(0.0, 1.0, n);
    
    // Push particles out based on noise
    pos += normal * (spike * 2.0 + aRandom.x * 1.0);
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = (20.0 * aRandom.y + 10.0) * (100.0 / -mvPosition.z);
    
    // Color based on distance/noise
    vColor = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.9, 0.5), spike);
}
`;

export const flareFragment = `
varying vec3 vColor;

void main() {
    // Soft circular particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (dist > 0.5) discard;
    
    // Soft glow falloff
    float alpha = 1.0 - (dist * 2.0);
    alpha = pow(alpha, 1.5);
    
    gl_FragColor = vec4(vColor, alpha);
}
`;