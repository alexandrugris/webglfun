
import * as THREE from "./libs/three.module.js"
import {FlyControls} from "./libs/FlyControls.js";
import {BufferGeometryUtils} from "./libs/BufferGeometryUtils.js";

const renderer = new THREE.WebGLRenderer();
const clock = new THREE.Clock(true);

let scene = null;
let camera = null;
let skybox = null
let earth = null;
let skyBoxUniforms = null;
let earthUniforms = null;
let atmosphereUniforms = null;
let cameraControls = null;
let atmosphere = null;

function newVector(v){
  return new THREE.Vector3(v.x, v.y, v.z);
}

function copyVector(dest, src){
  dest.x = src.x;
  dest.y = src.y;
  dest.z = src.z;
}

function update(dt){

  if(cameraControls){
    cameraControls.update(dt);
  }

  // ensure the sun and the light have the same direction
  let sunLight = scene.getObjectByName('sun_light');
  let sunSprite = scene.getObjectByName('sun_sprite');

  let lightPos = sunLight.position.normalize();
  let lightPosU = new THREE.Uniform(newVector(lightPos));

  if(skybox) {

      copyVector(skybox.position, camera.position);
      skybox.rotation.x += 0.005 * dt;
      skybox.rotation.y += -0.1 * dt;

      let cameraDir = THREE.Vector3.prototype.setFromMatrixColumn(camera.matrixWorld, 2).normalize();

      skyBoxUniforms.lightDirection = lightPosU;
      skyBoxUniforms.cameraDirection = new THREE.Uniform(cameraDir);


      skybox.updateMatrixWorld();

      // keep the sun in the same place in the sky
      if (sunSprite.originalPositionSkyboxSpace === undefined){
        // the sun sprite
        let invWorld = new THREE.Matrix4();
        sunSprite.originalPositionSkyboxSpace = newVector(sunSprite.position);
        sunSprite.originalPositionSkyboxSpace.applyMatrix4(invWorld.getInverse(skybox.matrixWorld));

        // the light dir
       sunSprite.originalSkyboxPosition = newVector(skybox.position);
      }

      let newPos = newVector(sunSprite.originalPositionSkyboxSpace);
      newPos.applyMatrix4(skybox.matrixWorld);
      copyVector(sunSprite.position, newPos);
      sunSprite.updateMatrixWorld();

      lightPos = new THREE.Vector3();
      let skyboxMovement = new THREE.Vector3();
      skyboxMovement.subVectors(skybox.position, sunSprite.originalSkyboxPosition);
      lightPos.subVectors(sunSprite.position, skyboxMovement);
      copyVector(sunLight.position, lightPos);


  }

  if(earth){
    earthUniforms.lightDirection = lightPosU;
    earth.rotation.x -= 0.001 * dt;
    earth.rotation.y += 0.05 * dt;
  }

  if(atmosphere){
    atmosphereUniforms.lightDirection = lightPosU;
  }
}

function render(){

  update(clock.getDelta())
  renderer.clear();

  if(skybox != null){
    renderer.render(skybox, camera);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);

    if(camera != null) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
}

async function loadTexture(texture){
  let imgLoader = new THREE.TextureLoader();
  // TODO: set texture parameters to make it look nicer
  return new Promise( (resolve, reject) => imgLoader.load(texture, (tex) => {
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    resolve(tex);
    }, null, reject))
}

async function fixMaterials() {

  // first is the SkyBox
  skyBoxUniforms = {
    diffuseTexture: {
      type: "t",
      value: await loadTexture("./assets/sky/sky_at_night.jpg")
    },
  }

  atmosphereUniforms = {

    earthCenter: new THREE.Uniform(earth.position),
    earthRadius: new THREE.Uniform(10.0),
    atmosphereRadius: new THREE.Uniform(10.4),

  }

  earthUniforms = {

    diffuseTexture: {
      type: "t",
      value: await loadTexture("./assets/earth/earth_diffuse.jpg")
    },

    diffuseNight: {
      type: "t",
      value: await loadTexture("./assets/earth/earth_diffuse_night.jpg")
    },

    normalMap: {
      type: "t",
      value: await loadTexture("./assets/earth/earth_normal_map.png")
    },

    specularMap: {
      type: "t",
      value: await loadTexture( "./assets/earth/earth_specular_map.png")
    },

    cloudsMap: {
      type: "t",
      value: await loadTexture( "./assets/earth/clouds1.jpg")
    }

  }

  update(0);

  skybox.material = new THREE.ShaderMaterial({

    uniforms: skyBoxUniforms,

    vertexShader: document.getElementById("skyBoxVertexShader").innerText,
    fragmentShader: document.getElementById("skyBoxFragmentShader").innerText,

    // always show the skybox behind all other objects
    depthTest : false,
    depthWrite: false,

    // always inside the box
    side: THREE.BackSide,

  });

  // reuse the code to compute tangets for normal mapping
  BufferGeometryUtils.computeTangents(earth.geometry);

  earth.material = new THREE.ShaderMaterial({

    uniforms: earthUniforms,
    //attributes: earth.geometry.attributes,

    vertexShader: document.getElementById("earthVertexShader").innerText,
    fragmentShader: document.getElementById("earthFragmentShader").innerText,

    side: THREE.FrontSide

  });

  atmosphere.material = new THREE.ShaderMaterial({
    uniforms: atmosphereUniforms,

    vertexShader: document.getElementById("atmosphereVertexShader").innerText,
    fragmentShader: document.getElementById("atmosphereFragmentShader").innerText,

    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    side: THREE.FrontSide,

    transparent: true,
  });

}

async function loadObject(json){

  let objLoader = new THREE.ObjectLoader();
  return new Promise( (accept, reject) => objLoader.load(json, accept, null ,reject));

}

async function main() {

  // initialize the renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("webgl-container").appendChild(renderer.domElement);

  scene = await loadObject("./assets/earth_and_water.json");
  camera = await loadObject("./assets/camera.json");

  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  cameraControls = new FlyControls(camera, renderer.domElement);
  cameraControls.dragToLook = true;
  cameraControls.movementSpeed = 4.0;
  cameraControls.rollSpeed = 0.1;

  skybox = scene.getObjectByName('SkyBox');
  scene.remove(skybox);

  earth = scene.getObjectByName("Earth");
  atmosphere = scene.getObjectByName("Atmosphere");
  scene.remove(atmosphere);
  earth.add(atmosphere);

  fixMaterials().then( () => {

    // the don't allow background to autoclear
    renderer.autoClear = false;
    scene.background = null;

    render()
});

}

export { main, resize }
