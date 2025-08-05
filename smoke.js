import * as THREE from "https://esm.sh/three";

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  1,
  10000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(-1, 0, 1);

scene.add(light);
camera.position.z = 1000;
scene.add(camera);
scene.background = new THREE.Color("rgb(0, 0, 0)");

const geometry = new THREE.BoxGeometry(200, 200, 200);
const material = new THREE.MeshLambertMaterial({
  color: new THREE.Color("rgb(255, 255, 255)"),
  wireframe: false,
});

let cubeSineDriver = 0;

THREE.ImageUtils.crossOrigin = "";

const smokeTexture = new THREE.TextureLoader().load(
  "https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png"
);
const smokeMaterial = new THREE.MeshLambertMaterial({
  color: new THREE.Color("rgba(129, 94, 255, 1)"),
  map: smokeTexture,
  transparent: true,
});
const smokeGeo = new THREE.PlaneGeometry(300, 300);
const smokeParticles = [];

for (let p = 0; p < 100; p++) {
  const particle = new THREE.Mesh(smokeGeo, smokeMaterial);
  particle.position.set(
    Math.random() * 500 - 250,
    Math.random() * 500 - 250,
    Math.random() * 1000 - 100
  );
  particle.rotation.z = Math.random() * 360;
  scene.add(particle);
  smokeParticles.push(particle);
}

function animate() {
  // note: three.js includes requestAnimationFrame shim
  requestAnimationFrame(animate);
  evolveSmoke();
  render();
}

function evolveSmoke() {
  let sp = smokeParticles.length;
  const delta = clock.getDelta();
  while (sp--) {
    smokeParticles[sp].rotation.z += delta * 0.1;
  }
}

function render() {
  cubeSineDriver += 0.01;
  renderer.render(scene, camera);
}

animate();

document.body.appendChild(renderer.domElement);

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
