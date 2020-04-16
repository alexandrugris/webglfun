

const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const light = new THREE.AmbientLight(0xffffff);

let camera = null;

function createTriangleGeometry(size, singleColor = false){

  let geom = new THREE.Geometry();
  geom.vertices.push(new THREE.Vector3(-size * 0.5, 0, 0));
  geom.vertices.push(new THREE.Vector3(size * 0.5, 0, 0));
  geom.vertices.push(new THREE.Vector3(0, Math.sqrt((3.0 / 4.0) * size * size )), 0);

  geom.faces.push(new THREE.Face3(0, 1, 2));

  let mat = null;

  if (singleColor) {
    mat = new THREE.MeshBasicMaterial({color: 0x00ff00});
  }
  else{
     mat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      vertexColors: THREE.VertexColors
    })

    geom.faces[0].vertexColors[0] = new THREE.Color(0xff0000);
    geom.faces[0].vertexColors[1] = new THREE.Color(0x00ff00);
    geom.faces[0].vertexColors[2] = new THREE.Color(0x0000ff);

  }

  return new THREE.Mesh(geom, mat);

  // TODO: check out ExtrudeGeometry and ShapeGeometry
}

function initScene(){

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("webgl-container").appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(35, window.innerWidth/window.innerHeight, 1, 1000);
  camera.position.z = 100;
  scene.add(camera);

  scene.add(light);

  let box = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshBasicMaterial(
      {
        color: 0xff0000,
        wireframe: true
      })
  );

  box.name = "my-box";
  box.add(new THREE.AxesHelper(30));

  scene.add(box);
  scene.add(createTriangleGeometry(20, false));

  scene.add(new AnimatedPlaneGeometry());

}
class AnimatedPlaneGeometry extends THREE.Mesh{

  constructor() {
    super(new THREE.PlaneGeometry(40, 40, 40, 40), new THREE.MeshBasicMaterial({wireframe: true}));
    this.name = "my-wave";
  }

  update(dt){

    for(let i = 0; i < this.geometry.vertices.length; i++){
      this.geometry.vertices[i].z = Math.sin(this.geometry.vertices[i].x + dt)
    }

    // TODO: check GeometryUtils

    new THREE.GeometryUtils.crossVectors()

    // TODO: must call the following to update the geometry
    this.geometry.verticesNeedUpdate = true;
  }

}

let dt = 0;
function update(){
  let box = scene.getObjectByName("my-box");
  box.rotation.y += 0.01;

  let wave = scene.getObjectByName("my-wave");
  wave.update(dt+=0.1);
}

function render(){

  update();

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function main(){
  initScene();
  render();
}
