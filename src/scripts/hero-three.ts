// Tree-shaken Three.js surface for the hero scene. Re-exporting only the
// members the scene actually uses lets the bundler drop the rest of Three.js.
// HeroScene.astro dynamic-imports THIS module, so the (still sizeable) WebGL
// renderer stays code-split and off the critical path, and only downloads for
// capable visitors who haven't opted out of motion/data usage.
export {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  EdgesGeometry,
  Euler,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
