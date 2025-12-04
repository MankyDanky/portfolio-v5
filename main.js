const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
resize();
window.addEventListener('resize', resize);

const vertexShaderSource = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec4 iMouse;

    void main() {
        vec2 F = gl_FragCoord.xy;
        vec4 O;
        
        // centered, aspect-correct coordinates
        vec2 p = (F*2. - iResolution.xy) / (iResolution.y * .7);
        
        // camera / effect rotation from mouse X
        float mx = iMouse.z > 0.0 ? (iMouse.x / iResolution.x) : 0.5;
        float my = iMouse.z > 0.0 ? (iMouse.y / iResolution.y) : 0.5;
        float yRange = mix(0.9, 1.1, my);
        float xRange = mix(0.9, 1.1, mx);
        
        float angle = mix(-0.05, 0.05, mx);
        float ca = cos(angle);
        float sa = sin(angle);
        mat2 R = mat2(ca, -sa, sa, ca);
        
        vec2 pr = p;
        vec2 d = vec2(0.0, 1.0);
        vec2 c = pr * mat2(1., 1., d / (.1 + 5. / dot(5.*pr - d, 5.*pr - d)));
        vec2 v = c;
        v *= mat2(cos(log(length(v)) + iTime*.2 + vec4(0,33,11,0))) * 5.;
        
        vec4 o = vec4(0.0);
        for (float i = 1.0; i < 10.0; i++) {
            o += sin(v.xyyx) + yRange;
            v += .7 * sin(v.yx * i + iTime) / i + .5;
        }
        
        float radial = length(pr);
        O = 1. - exp(
            -exp(vec4(-.6,-.4,0.5,0)) / o
            / (.1 + .1 * pow(length(sin(v/.3)*.2 + c*vec2(1,2)) - 1., 2.))
            / (1. * xRange + 5. * exp(.3*c.y - dot(c,c)))
            / (.03 + abs(radial - .7)) * .2
        );
        
        gl_FragColor = O;
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}

const positionLocation = gl.getAttribLocation(program, 'position');
const resolutionLocation = gl.getUniformLocation(program, 'iResolution');
const timeLocation = gl.getUniformLocation(program, 'iTime');
const mouseLocation = gl.getUniformLocation(program, 'iMouse');

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1
]), gl.STATIC_DRAW);

let startTime = Date.now();
let mouse = [0, 0, 0, 0];

canvas.addEventListener('mousemove', (e) => {
    mouse[0] = (e.clientX)/2;
    mouse[1] = (canvas.height - e.clientY)/2;
    mouse[2] = 1;
});

canvas.addEventListener('mouseleave', () => {
    mouse[2] = 0;
});

// --- Audio Management ---

const audio = new Audio('piano.mp3');
audio.loop = true;
audio.volume = 0; // Start silent

let fadeInterval;

function fadeAudio(targetVolume, duration, callback) {
    const startVolume = audio.volume;
    const change = targetVolume - startVolume;
    const startTime = performance.now();

    clearInterval(fadeInterval);

    fadeInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Simple linear fade
        audio.volume = Math.max(0, Math.min(1, startVolume + (change * progress)));

        if (progress >= 1) {
            clearInterval(fadeInterval);
            if (callback) callback();
        }
    }, 50);
}

function playMusic() {
    // If already playing and fading in, don't restart
    if (!audio.paused && audio.volume > 0) return;

    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            // Fade in to 50% volume over 2 seconds
            fadeAudio(0.5, 2000);
        }).catch(error => {
            console.log("Autoplay prevented. Waiting for interaction.");
            // Add one-time listener to start on interaction
            const startOnInteraction = () => {
                audio.play();
                fadeAudio(0.5, 2000);
                window.removeEventListener('click', startOnInteraction);
                window.removeEventListener('keydown', startOnInteraction);
                window.removeEventListener('mousemove', startOnInteraction);
            };
            window.addEventListener('click', startOnInteraction);
            window.addEventListener('keydown', startOnInteraction);
            window.addEventListener('mousemove', startOnInteraction);
        });
    }
}

function pauseMusic() {
    // Fade out to 0 over 1 second, then pause
    fadeAudio(0, 1000, () => {
        audio.pause();
    });
}

// Start music when the curtain reveals (using the existing load event timing)
// window.addEventListener('load', () => {
//     setTimeout(() => {
//         playMusic();
//     }, 500);
// });

// // Trigger curtain reveal on load
// window.addEventListener('load', () => {
//     // Small delay to ensure everything is ready and to make the effect noticeable
//     setTimeout(() => {
//         document.body.classList.add('revealed');
//     }, 500);
// });

// --- Interaction ---

const enterOverlay = document.getElementById('enter-overlay');

enterOverlay.addEventListener('click', () => {
    enterOverlay.classList.add('hidden');
    
    // Start music immediately on interaction
    playMusic();
    
    // Trigger curtain reveal
    setTimeout(() => {
        document.body.classList.add('revealed');
    }, 200);
});

// Handle tab switching
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        pauseMusic();
    } else {
        playMusic();
    }
});

function render() {
    const time = (Date.now() - startTime) / 1000;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, time);
    gl.uniform4f(mouseLocation, mouse[0], mouse[1], mouse[2], mouse[3]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

render();
