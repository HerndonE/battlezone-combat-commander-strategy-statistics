import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  1,
  2000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting is optional since we switch to MeshBasicMaterial
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(-1, 0, 1);
scene.add(light);

camera.position.z = 1000;
scene.add(camera);
scene.background = new THREE.Color(0x000000);

// Smoke texture
const smokeTexture = new THREE.TextureLoader().load(
  "https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png"
);

// Use MeshBasicMaterial instead of Lambert for performance
const smokeMaterial = new THREE.MeshBasicMaterial({
  color: 0x0287ef,
  map: smokeTexture,
  transparent: true,
  opacity: 0.7,
});

const smokeGeo = new THREE.PlaneGeometry(300, 300);
const smokeParticles = [];

const PARTICLE_COUNT = 50; // reduced from 100

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const particle = new THREE.Mesh(smokeGeo, smokeMaterial);
  particle.position.set(
    Math.random() * 500 - 250,
    Math.random() * 500 - 250,
    Math.random() * 1000 - 100
  );
  particle.rotation.z = Math.random() * Math.PI * 2;
  particle.userData.rotationSpeed = Math.random() * 0.2 + 0.05; // optional random speed
  scene.add(particle);
  smokeParticles.push(particle);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  smokeParticles.forEach((p) => {
    p.rotation.z += p.userData.rotationSpeed * delta;
  });
  renderer.render(scene, camera);
}

animate();

// Handle resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
