// The `three` namespace React Three Fiber sees in production builds (docs/adr/0012-three-catalogue.md).
// R3F does `import * as THREE from 'three'` and `extend(THREE)`, which keeps every three export
// alive. `scripts/three-catalogue.ts` points R3F's `three` import here instead, so the bundler can
// tree-shake the rest; `scripts/three-catalogue.test.ts` checks both lists. Two groups of names belong here:
// - what R3F's own code reads off `THREE` (renderer, camera, colour space and shadow constants);
// - the constructor behind every lowercase JSX element the scene uses (`<mesh>` needs `Mesh`).
// A JSX element whose class is missing throws at runtime in the built app only; e2e catches it.
export {
  // R3F internals (dist/events-*.esm.js and react-three-fiber.esm.js, v9.8)
  ACESFilmicToneMapping,
  BasicShadowMap,
  Clock,
  Color,
  ColorManagement,
  Layers,
  LinearSRGBColorSpace,
  NoToneMapping,
  Object3D,
  OrthographicCamera,
  PCFShadowMap,
  PCFSoftShadowMap,
  PerspectiveCamera,
  RGBAFormat,
  Raycaster,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  VSMShadowMap,
  Vector2,
  Vector3,
  WebGLRenderer,
  // JSX elements used in src/scene
  BoxGeometry,
  CapsuleGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
