import * as THREE from 'three';

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// Orthographic camera for full screen shader
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// --- Shader ---

const fragmentShader = `
    uniform float iTime;
    uniform vec3 iResolution;

    void mainImage(out vec4 O, vec2 F)
    {
        //Iterator and attenuation (distance-squared)
        float i = .2;
        float a = 0.0;
        
        //Resolution for scaling and centering
        vec2 r = iResolution.xy;
        
        //Centered ratio-corrected coordinates
        vec2 p = ( F+F - r ) / r.y / .7;
        
        //Diagonal vector for skewing
        vec2 d = vec2(-1,1);
        
        //Blackhole center
        vec2 b = p - i*d;
        
        //Rotate and apply perspective
        // c = p * mat2(1, 1, d/(.1 + i/dot(b,b)))
        vec2 D = d/(.1 + i/dot(b,b));
        vec2 c = p * mat2(1.0, 1.0, D.x, D.y);
        
        //Rotate into spiraling coordinates
        // v = c * mat2(cos(.5*log(a=dot(c,c)) + iTime*i + vec4(0,33,11,0)))/i
        a = dot(c,c);
        vec4 angles = .5*log(a) + iTime*i + vec4(0,33,11,0);
        vec4 cosAngles = cos(angles);
        vec2 v = c * mat2(cosAngles.x, cosAngles.y, cosAngles.z, cosAngles.w) / i;
        
        //Waves cumulative total for coloring
        vec2 w = vec2(0.0);
        
        //Loop through waves
        // for(; i++<9.; w += 1.+sin(v) )
        //     v += .7* sin(v.yx*i+iTime) / i + .5;
        
        for(int j=0; j<30; j++) {
            i++;
            if(i >= 9.0) break;
            
            v += .7* sin(v.yx*i+iTime) / i + .5;
            w += 1.+sin(v);
        }
        
        //Acretion disk radius
        i = length( sin(v/.3)*.4 + c*(3.+d) );
        
        //Red/blue gradient
        O = 1. - exp( -exp( c.x * vec4(.6,-.4,-1,0) )
                       //Wave coloring
                       /  w.xyyx
                       //Acretion disk brightness
                       / ( 2. + i*i/4. - i )
                       //Center darkness
                       / ( .5 + 1. / a )
                       //Rim highlight
                       / ( .03 + abs( length(p)-.7 ) )
                 );
    }

    void main() {
        mainImage(gl_FragColor, gl_FragCoord.xy);
    }
`;

const vertexShader = `
    void main() {
        gl_Position = vec4(position, 1.0);
    }
`;

// --- Object Creation ---

const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) }
    }
});

const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// --- Event Listeners ---

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
});

// --- Animation Loop ---

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    material.uniforms.iTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
}

animate();
