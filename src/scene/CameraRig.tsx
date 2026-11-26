import { useFrame } from '@react-three/fiber';
import { CONFIG } from '../core/config.ts';

/**
 * Applies the camera config (field of view, overview position) every frame, so tuning shows at
 * once. A stand-in until the follow camera arrives; it allocates nothing per frame.
 */
export function CameraRig() {
  useFrame(({ camera }) => {
    const [x, y, z] = CONFIG.camera.position;
    if (camera.position.x === x && camera.position.y === y && camera.position.z === z) {
      if (!('fov' in camera) || camera.fov === CONFIG.camera.fov) return;
    }
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    if ('fov' in camera) {
      camera.fov = CONFIG.camera.fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
