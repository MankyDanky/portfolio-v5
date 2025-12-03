import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

import { simpleSkyboxVertex, simpleSkyboxFragment } from './shaders/simpleSkybox.js';
import { nebulaSkyboxVertex, nebulaSkyboxFragment } from './shaders/nebulaSkybox.js';
import { planetVertex, planetFragment } from './shaders/planetShader.js';

const scene = new THREE.Scene();

// --- Mode State ---
let currentMode = 1;

// --- Skybox ---
const skyboxGeometry = new THREE.SphereGeometry( 500000, 60, 40 );
const simpleSkyboxMaterial = new THREE.ShaderMaterial({
    vertexShader: simpleSkyboxVertex,
    fragmentShader: simpleSkyboxFragment,
    side: THREE.BackSide
});
const nebulaSkyboxMaterial = new THREE.ShaderMaterial({
    vertexShader: nebulaSkyboxVertex,
    fragmentShader: nebulaSkyboxFragment,
    side: THREE.BackSide
});

const skybox = new THREE.Mesh( skyboxGeometry, simpleSkyboxMaterial );
scene.add( skybox );

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild( renderer.domElement );

// --- Post-processing ---
const composer = new EffectComposer( renderer );
const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

// Bloom Pass (Mode 2)
const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = 0.5;
bloomPass.strength = 0.6;
bloomPass.radius = 0.5;
bloomPass.enabled = false; // Start disabled
composer.addPass( bloomPass );

// RGB Shift Pass (Mode 1 & 2)
const rgbShiftPass = new ShaderPass( RGBShiftShader );
rgbShiftPass.uniforms[ 'amount' ].value = 0.0010;
composer.addPass( rgbShiftPass );

const solarSystem = new THREE.Group();
scene.add(solarSystem);

// --- Sun ---
const sunGeometry = new THREE.SphereGeometry( 16, 32, 32 ); 
const sunMaterialBasic = new THREE.MeshBasicMaterial( { color: '#ffb642' } ); 
const sunMaterialBloom = new THREE.MeshBasicMaterial( { color: '#ffaa00' } ); // Brighter for bloom
const sun = new THREE.Mesh( sunGeometry, sunMaterialBasic );
solarSystem.add( sun );

// Sun Light (Mode 2)
const sunLight = new THREE.PointLight( 0xffffff, 2, 1000 );
sunLight.position.set(0, 0, 0);
sunLight.visible = false; // Start disabled
scene.add(sunLight);

// --- Planets ---
// Planet Data (Radius relative to Earth=0.5, Distance, Color, Speed)
const planetData = [
    { name: "Mercury", radius: 0.38 * 0.5, distance: 28, color: '#A5A5A5', color2: '#5A5A5A', speed: 0.02 },
    { name: "Venus", radius: 0.95 * 0.5, distance: 44, color: '#E3BB76', color2: '#D3A050', speed: 0.015 },
    { name: "Earth", radius: 0.5, distance: 60, color: '#22A6B3', color2: '#105060', speed: 0.01 },
    { name: "Mars", radius: 0.53 * 0.5, distance: 78, color: '#DD4C39', color2: '#8D2C19', speed: 0.008 },
    { name: "Jupiter", radius: 11.2 * 0.5, distance: 140, color: '#D9CDB9', color2: '#998D79', speed: 0.004 },
    { name: "Saturn", radius: 9.45 * 0.5, distance: 200, color: '#F4D03F', color2: '#C4A01F', speed: 0.003 },
    { name: "Uranus", radius: 4.0 * 0.5, distance: 280, color: '#7DE3F4', color2: '#4DA3B4', speed: 0.002 },
    { name: "Neptune", radius: 3.88 * 0.5, distance: 360, color: '#3E54E8', color2: '#1E34A8', speed: 0.001 }
];

const planets = [];

planetData.forEach(data => {
    // Planet Mesh
    const geometry = new THREE.SphereGeometry( data.radius, 32, 16 );
    
    // Mode 1 Material
    const materialBasic = new THREE.MeshBasicMaterial( { color: data.color } );
    
    // Mode 2 Material (Shader)
    const materialShader = new THREE.ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
            color1: { value: new THREE.Color(data.color) },
            color2: { value: new THREE.Color(data.color2) },
            sunPosition: { value: new THREE.Vector3(0, 0, 0) }
        }
    });

    const planet = new THREE.Mesh( geometry, materialBasic );
    
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

    planets.push({ 
        mesh: planet, 
        orbit: orbit, 
        speed: data.speed,
        materialBasic: materialBasic,
        materialShader: materialShader
    });
});

// Add OrbitControls
const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.05;

camera.position.set(0, 140, 280);
camera.lookAt(0, 0, 0);

// --- Mode Switching Logic ---
function setMode(mode) {
    currentMode = mode;
    
    if (mode === 1) {
        // Mode 1: Simple
        skybox.material = simpleSkyboxMaterial;
        sun.material = sunMaterialBasic;
        sunLight.visible = false;
        bloomPass.enabled = false;
        
        planets.forEach(p => {
            p.mesh.material = p.materialBasic;
        });
        
        document.getElementById('mode1').classList.add('active');
        document.getElementById('mode2').classList.remove('active');
    } else {
        // Mode 2: Realistic
        skybox.material = nebulaSkyboxMaterial;
        sun.material = sunMaterialBloom;
        sunLight.visible = true;
        bloomPass.enabled = true;
        
        planets.forEach(p => {
            p.mesh.material = p.materialShader;
        });
        
        document.getElementById('mode1').classList.remove('active');
        document.getElementById('mode2').classList.add('active');
    }
}

// Event Listeners
document.getElementById('mode1').addEventListener('click', () => setMode(1));
document.getElementById('mode2').addEventListener('click', () => setMode(2));

function animate() {
	requestAnimationFrame( animate );
    
    planets.forEach(p => {
        p.orbit.rotation.y += p.speed;
    });

    controls.update();

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