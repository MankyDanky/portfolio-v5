import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

const scene = new THREE.Scene();

// Skybox
const vertexShader = `
varying vec3 vWorldPosition;
void main() {
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const fragmentShader = `
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

const skyboxGeometry = new THREE.SphereGeometry( 1500, 60, 40 );
const skyboxMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide
});
const skybox = new THREE.Mesh( skyboxGeometry, skyboxMaterial );
scene.add( skybox );

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 2000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// Post-processing
const composer = new EffectComposer( renderer );
const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

const rgbShiftPass = new ShaderPass( RGBShiftShader );
rgbShiftPass.uniforms[ 'amount' ].value = 0.0010;
composer.addPass( rgbShiftPass );

const solarSystem = new THREE.Group();
scene.add(solarSystem);

// Sun
const sunGeometry = new THREE.SphereGeometry( 16, 32, 32 ); 
const sunMaterial = new THREE.MeshBasicMaterial( { color: '#ffb642' } ); 
const sun = new THREE.Mesh( sunGeometry, sunMaterial );
solarSystem.add( sun );

// Planet Data (Radius relative to Earth=0.5, Distance, Color, Speed)
const planetData = [
    { name: "Mercury", radius: 0.38 * 0.5, distance: 28, color: '#A5A5A5', speed: 0.02 },
    { name: "Venus", radius: 0.95 * 0.5, distance: 44, color: '#E3BB76', speed: 0.015 },
    { name: "Earth", radius: 0.5, distance: 60, color: '#22A6B3', speed: 0.01 },
    { name: "Mars", radius: 0.53 * 0.5, distance: 78, color: '#DD4C39', speed: 0.008 },
    { name: "Jupiter", radius: 11.2 * 0.5, distance: 140, color: '#D9CDB9', speed: 0.004 },
    { name: "Saturn", radius: 9.45 * 0.5, distance: 200, color: '#F4D03F', speed: 0.003 },
    { name: "Uranus", radius: 4.0 * 0.5, distance: 280, color: '#7DE3F4', speed: 0.002 },
    { name: "Neptune", radius: 3.88 * 0.5, distance: 360, color: '#3E54E8', speed: 0.001 }
];

const planets = [];

planetData.forEach(data => {
    // Planet Mesh
    const geometry = new THREE.SphereGeometry( data.radius, 32, 16 );
    const material = new THREE.MeshBasicMaterial( { color: data.color } );
    const planet = new THREE.Mesh( geometry, material );
    
    // Orbit Group (to rotate around sun)
    const orbit = new THREE.Object3D();
    orbit.add(planet);
    solarSystem.add(orbit);
    
    planet.position.x = data.distance;
    
    // Orbit Path (Ring)
    const points = [];
    for (let i = 0; i <= 128; i++) {
        const angle = (i / 128) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * data.distance, 0, Math.sin(angle) * data.distance));
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
    const lineMaterial = new THREE.LineBasicMaterial( { color: 0xffffff, transparent: true, opacity: 0.1 } );
    const ring = new THREE.LineLoop( lineGeometry, lineMaterial );
    solarSystem.add( ring );

    planets.push({ mesh: planet, orbit: orbit, speed: data.speed });
});

solarSystem.rotation.x = 0.4;
solarSystem.rotation.z = 0.4;

camera.position.set(0, 70, 140);
camera.lookAt(0, 0, 0);

function animate() {
	requestAnimationFrame( animate );
    
    planets.forEach(p => {
        p.orbit.rotation.y += p.speed;
    });

	composer.render();
}

animate();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    composer.setSize( window.innerWidth, window.innerHeight );
}