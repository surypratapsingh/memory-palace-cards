import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EYE_HEIGHT, LOCI, viewpoint } from '../data/palace.ts';

const CARD_WIDTH = 0.8;
const CARD_HEIGHT = 0.65;
const CARD_Y = 1.9;
const CAMERA_FOV = 65;
const CAMERA_NEAR = 0.1;
const GUIDED_PITCH = Math.atan2(1.3 - EYE_HEIGHT, 1.8);
const OBJECT_TOPS: Readonly<Record<string, number>> = {
  armchair: 1.15, bookshelf: 2, globe: 1.51, fireplace: 1.31, clock: 2.1,
  desk: 0.8, stove: 0.94, refrigerator: 2, cabinet: 1.5, table: 0.79,
  sink: 1.275, cauldron: 1.26, plant: 1.55, fountain: 1.325, bench: 1.05,
  planter: 0.85, pedestal: 1.625, telescope: 1.768, armillary: 1.34,
  orrery: 1.275, astrolabe: 1.408, globe_celestial: 1.51,
};
const ASPECTS = [16 / 9, 4 / 3] as const;
const MARGIN_NDC = 0.1;

function cameraAt(index: number, aspect: number): THREE.PerspectiveCamera {
  const locus = LOCI[index]!;
  const [x, z] = viewpoint(index);
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, 1000);
  camera.rotation.order = 'YXZ';
  camera.position.set(x, EYE_HEIGHT, z);
  camera.rotation.set(GUIDED_PITCH, Math.atan2(locus.face[0], locus.face[1]), 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

function assertInside(camera: THREE.PerspectiveCamera, point: THREE.Vector3, label: string): void {
  const projected = point.clone().project(camera);
  assert.ok(projected.z >= -1 && projected.z <= 1, `${label}: depth ${projected.z}`);
  assert.ok(Math.abs(projected.x) <= 1 - MARGIN_NDC, `${label}: x=${projected.x}`);
  assert.ok(Math.abs(projected.y) <= 1 - MARGIN_NDC, `${label}: y=${projected.y}`);
}

test('all 52 billboard corners and locus object tops fit the guided frustum at 16:9 and 4:3', () => {
  for (const aspect of ASPECTS) {
    for (let index = 0; index < LOCI.length; index++) {
      const locus = LOCI[index]!;
      const camera = cameraAt(index, aspect);
      const center = new THREE.Vector3(locus.pos[0], CARD_Y, locus.pos[1]);
      for (const x of [-CARD_WIDTH / 2, CARD_WIDTH / 2]) {
        for (const y of [-CARD_HEIGHT / 2, CARD_HEIGHT / 2]) {
          const corner = new THREE.Vector3(x, y, 0).applyQuaternion(camera.quaternion).add(center);
          assertInside(camera, corner, `${locus.name} billboard corner at ${aspect.toFixed(2)}`);
        }
      }
      const top = OBJECT_TOPS[locus.kind];
      assert.ok(top !== undefined, `Missing top height for ${locus.kind}`);
      assertInside(camera, new THREE.Vector3(locus.pos[0], top, locus.pos[1]), `${locus.name} top at ${aspect.toFixed(2)}`);
    }
  }
});
