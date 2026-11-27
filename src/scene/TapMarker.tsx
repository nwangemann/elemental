import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MeshBasicMaterial, RingGeometry, type Mesh } from 'three';
import { tileTop, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { LAYOUT } from '../core/layout.ts';
import { RING_COLOR } from '../core/palette.ts';
import type { WalkTarget } from '../core/steering.ts';
import {
  stepTapMarker,
  tapMarkerLook,
  type MarkerLook,
  type TapMarker,
} from '../core/tapMarker.ts';

/** Above the surface it sits on, so it never z-fights the tile top or the ground. */
const LIFT = 0.004;
/** Gap between the tile edge and the marker's outer edge, and the marker's width, units. */
const EDGE_INSET = 0.04;
const WIDTH = 0.05;
/** A target in a gap or on the ground has no tile to frame: a smaller square marks the point. */
const POINT_SCALE = 0.4;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The tap-to-walk marker: a square outline just inside the target tile's top (or a small one on
 * the ground for a gap point) that pulses once when the tap lands and holds faintly until the
 * character arrives. One mesh, drawn only while live, so at most one draw call.
 */
export function TapMarkerMesh({
  marker,
  target,
  activation,
}: {
  marker: TapMarker;
  target: WalkTarget;
  activation: Activation;
}) {
  const mesh = useRef<Mesh<RingGeometry, MeshBasicMaterial>>(null);
  const look = useMemo<MarkerLook>(() => ({ scale: 1, opacity: 1 }), []);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const geometry = useMemo(() => {
    // A four-segment ring starting at 45° is a square; its radius is the half-side × √2.
    const outer = (LAYOUT.tileSize / 2 - EDGE_INSET) * Math.SQRT2;
    const inner = (LAYOUT.tileSize / 2 - EDGE_INSET - WIDTH) * Math.SQRT2;
    return new RingGeometry(inner, outer, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2);
  }, []);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: RING_COLOR,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const live = stepTapMarker(marker, target, dt);
    m.visible = live;
    if (!live) return;
    tapMarkerLook(marker.age, CONFIG.tiles, reduced, look);
    const onTile = marker.tile >= 0;
    const s = look.scale * (onTile ? 1 : POINT_SCALE);
    m.position.set(marker.x, (onTile ? tileTop(activation, marker.tile) : 0) + LIFT, marker.z);
    m.scale.set(s, 1, s);
    m.material.opacity = look.opacity;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} visible={false} />;
}
