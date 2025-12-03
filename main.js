import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#111a25');
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 2000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// Sun
const sunGeometry = new THREE.SphereGeometry( 8, 32, 32 ); 
const sunMaterial = new THREE.MeshBasicMaterial( { color: '#ba8a3e' } ); 
const sun = new THREE.Mesh( sunGeometry, sunMaterial );
scene.add( sun );

// Planet Data (Radius relative to Earth=0.5, Distance, Color, Speed)
const planetData = [
    { name: "Mercury", radius: 0.38 * 0.5, distance: 15, color: '#A5A5A5', speed: 0.02 },
    { name: "Venus", radius: 0.95 * 0.5, distance: 22, color: '#E3BB76', speed: 0.015 },
    { name: "Earth", radius: 0.5, distance: 30, color: '#22A6B3', speed: 0.01 },
    { name: "Mars", radius: 0.53 * 0.5, distance: 40, color: '#DD4C39', speed: 0.008 },
    { name: "Jupiter", radius: 11.2 * 0.5, distance: 70, color: '#D9CDB9', speed: 0.004 },
    { name: "Saturn", radius: 9.45 * 0.5, distance: 100, color: '#F4D03F', speed: 0.003 },
    { name: "Uranus", radius: 4.0 * 0.5, distance: 140, color: '#7DE3F4', speed: 0.002 },
    { name: "Neptune", radius: 3.88 * 0.5, distance: 180, color: '#3E54E8', speed: 0.001 }
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
    scene.add(orbit);
    
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
    scene.add( ring );

    planets.push({ mesh: planet, orbit: orbit, speed: data.speed });
});

// Add OrbitControls
const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true; 
controls.dampingFactor = 0.05;

camera.position.set(0, 60, 120);

function animate() {
	requestAnimationFrame( animate );
    
    planets.forEach(p => {
        p.orbit.rotation.y += p.speed;
    });

    controls.update(); 

	renderer.render( scene, camera );
}

animate();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}