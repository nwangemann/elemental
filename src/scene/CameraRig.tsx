import { useFrame } from '@react-three/fiber';
import { CONFIG } from '../core/config.ts';

/**
 * Applies the camera config (field of view, overview position and target) every frame, so
 * tuning shows at once. A stand-in until the follow camera arrives; it allocates nothing.
 */
export function CameraRig() {
  useFrame(({ camera }) => {
    const [x, y, z] = CONFIG.camera.position;
    const [tx, ty, tz] = CONFIG.camera.target;
    camera.position.set(x, y, z);
    camera.lookAt(tx, ty, tz);
    if ('fov' in camera && camera.fov !== CONFIG.camera.fov) {
      camera.fov = CONFIG.camera.fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
