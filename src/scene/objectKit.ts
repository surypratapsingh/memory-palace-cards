// 3D Object Kit for Loci.
// Builds visually distinct objects for each kind from 2-5 primitives (box, cylinder, sphere, cone, torus).
// Shares unit geometries to minimize GPU memory.
import * as THREE from 'three';
import type { Locus } from '../data/palace.ts';
import type { LocusMood } from '../types.ts';

// Shared unit geometries
const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeom = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
const sphereGeom = new THREE.SphereGeometry(0.5, 16, 12);
const coneGeom = new THREE.ConeGeometry(0.5, 1, 16);
const torusGeom = new THREE.TorusGeometry(0.5, 0.1, 12, 24);

export interface LocusNode {
  group: THREE.Group;
  locus: Locus;
  materials: THREE.MeshStandardMaterial[];
  baseColors: number[];
  mood: LocusMood;
  plaqueTexture: THREE.CanvasTexture;
  plaqueMaterial: THREE.MeshBasicMaterial;
}

function makePrimitive(
  geom: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number],
  scale: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  return mesh;
}

function createPlaque(index: number): { mesh: THREE.Mesh; texture: THREE.CanvasTexture; material: THREE.MeshBasicMaterial } {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 128);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#d4af37';
    ctx.strokeRect(4, 4, 120, 120);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), 64, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(boxGeom, material);
  mesh.scale.set(0.45, 0.02, 0.35);
  return { mesh, texture, material };
}

export function buildLocusObject(locus: Locus): LocusNode {
  const group = new THREE.Group();
  group.position.set(locus.pos[0], 0, locus.pos[1]);

  // Rotate group to face away from wall (facing direction -locus.face)
  const angle = Math.atan2(locus.face[0], locus.face[1]);
  group.rotation.y = angle;

  const materials: THREE.MeshStandardMaterial[] = [];
  const baseColors: number[] = [];

  const mainMat = new THREE.MeshStandardMaterial({
    color: locus.color,
    roughness: 0.5,
    metalness: 0.15,
  });
  materials.push(mainMat);
  baseColors.push(locus.color);

  const accentColor = new THREE.Color(locus.color).offsetHSL(0.05, 0.1, -0.1).getHex();
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.4,
    metalness: 0.3,
  });
  materials.push(accentMat);
  baseColors.push(accentColor);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.3,
    metalness: 0.7,
  });
  materials.push(goldMat);
  baseColors.push(0xd4af37);

  // Construct each kind from 2 to 5 primitives
  switch (locus.kind) {
    case 'armchair':
      // Seat, backrest, arm L, arm R
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.35, 0], [0.8, 0.3, 0.8]));
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.8, -0.3], [0.8, 0.7, 0.2]));
      group.add(makePrimitive(boxGeom, accentMat, [-0.4, 0.55, 0], [0.15, 0.4, 0.8]));
      group.add(makePrimitive(boxGeom, accentMat, [0.4, 0.55, 0], [0.15, 0.4, 0.8]));
      break;

    case 'bookshelf':
      // Outer frame, shelves, books
      group.add(makePrimitive(boxGeom, mainMat, [0, 1.0, 0], [1.1, 2.0, 0.4]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 0.7, 0.05], [0.95, 0.05, 0.35]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 1.3, 0.05], [0.95, 0.05, 0.35]));
      group.add(makePrimitive(boxGeom, goldMat, [0, 0.85, 0.05], [0.8, 0.25, 0.3]));
      break;

    case 'globe':
    case 'globe_celestial':
      // Base, pillar, sphere, ring
      group.add(makePrimitive(cylinderGeom, accentMat, [0, 0.05, 0], [0.6, 0.1, 0.6]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0, 0.5, 0], [0.1, 0.8, 0.1]));
      group.add(makePrimitive(sphereGeom, mainMat, [0, 1.0, 0], [0.7, 0.7, 0.7]));
      group.add(makePrimitive(torusGeom, goldMat, [0, 1.0, 0], [0.85, 0.85, 0.85], [0.4, 0, 0]));
      break;

    case 'fireplace':
      // Hearth, mantle, fire cone
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.6, 0], [1.3, 1.2, 0.5]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 1.25, 0.05], [1.5, 0.12, 0.6]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 0.45, 0.1], [0.7, 0.7, 0.35]));
      group.add(makePrimitive(coneGeom, goldMat, [0, 0.3, 0.1], [0.35, 0.45, 0.35]));
      break;

    case 'clock':
      // Tall case, clock face, top crest, pendulum
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.9, 0], [0.5, 1.8, 0.4]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0, 1.5, 0.21], [0.35, 0.05, 0.35], [Math.PI / 2, 0, 0]));
      group.add(makePrimitive(coneGeom, accentMat, [0, 1.95, 0], [0.4, 0.3, 0.3]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0, 0.7, 0.1], [0.04, 0.6, 0.04]));
      break;

    case 'desk':
      // Top, left pedestal, right pedestal
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.75, 0], [1.4, 0.1, 0.8]));
      group.add(makePrimitive(boxGeom, accentMat, [-0.5, 0.35, 0], [0.35, 0.7, 0.7]));
      group.add(makePrimitive(boxGeom, accentMat, [0.5, 0.35, 0], [0.35, 0.7, 0.7]));
      break;

    case 'stove':
      // Stove body, oven window, burners
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.45, 0], [0.9, 0.9, 0.8]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 0.35, 0.41], [0.65, 0.4, 0.05]));
      group.add(makePrimitive(cylinderGeom, goldMat, [-0.22, 0.92, -0.15], [0.22, 0.04, 0.22]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0.22, 0.92, 0.15], [0.22, 0.04, 0.22]));
      break;

    case 'refrigerator':
      // Body, upper door, lower door, handles
      group.add(makePrimitive(boxGeom, mainMat, [0, 1.0, 0], [0.85, 2.0, 0.8]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 1.5, 0.41], [0.8, 0.85, 0.04]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 0.5, 0.41], [0.8, 1.0, 0.04]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0.35, 1.0, 0.44], [0.03, 0.4, 0.03]));
      break;

    case 'cabinet':
      // Main box, doors, legs
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.85, 0], [1.0, 1.3, 0.5]));
      group.add(makePrimitive(boxGeom, accentMat, [-0.24, 0.85, 0.26], [0.45, 1.15, 0.04]));
      group.add(makePrimitive(boxGeom, accentMat, [0.24, 0.85, 0.26], [0.45, 1.15, 0.04]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0, 0.1, 0], [0.9, 0.2, 0.4]));
      break;

    case 'table':
      // Tabletop, 4 legs
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.75, 0], [1.2, 0.08, 0.9]));
      group.add(makePrimitive(cylinderGeom, accentMat, [-0.5, 0.36, -0.35], [0.08, 0.72, 0.08]));
      group.add(makePrimitive(cylinderGeom, accentMat, [0.5, 0.36, -0.35], [0.08, 0.72, 0.08]));
      group.add(makePrimitive(cylinderGeom, accentMat, [-0.5, 0.36, 0.35], [0.08, 0.72, 0.08]));
      group.add(makePrimitive(cylinderGeom, accentMat, [0.5, 0.36, 0.35], [0.08, 0.72, 0.08]));
      break;

    case 'sink':
      // Counter, basin, faucet
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.45, 0], [1.0, 0.9, 0.7]));
      group.add(makePrimitive(cylinderGeom, accentMat, [0, 0.91, 0], [0.6, 0.02, 0.5]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0, 1.1, -0.2], [0.04, 0.35, 0.04]));
      break;

    case 'cauldron':
      // Pot cylinder, rim torus, legs
      group.add(makePrimitive(cylinderGeom, mainMat, [0, 0.45, 0], [0.8, 0.6, 0.8]));
      group.add(makePrimitive(torusGeom, accentMat, [0, 0.75, 0], [0.85, 0.85, 0.85], [Math.PI / 2, 0, 0]));
      group.add(makePrimitive(cylinderGeom, goldMat, [-0.3, 0.1, 0], [0.08, 0.25, 0.08]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0.3, 0.1, 0], [0.08, 0.25, 0.08]));
      break;

    case 'plant':
      // Pot, stem, foliage sphere
      group.add(makePrimitive(cylinderGeom, accentMat, [0, 0.25, 0], [0.5, 0.5, 0.5]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0, 0.65, 0], [0.08, 0.4, 0.08]));
      group.add(makePrimitive(sphereGeom, mainMat, [0, 1.1, 0], [0.9, 0.9, 0.9]));
      break;

    case 'fountain':
      // Basin, center pillar, bowl, water sphere
      group.add(makePrimitive(cylinderGeom, mainMat, [0, 0.2, 0], [1.2, 0.4, 1.2]));
      group.add(makePrimitive(cylinderGeom, accentMat, [0, 0.7, 0], [0.3, 0.8, 0.3]));
      group.add(makePrimitive(cylinderGeom, mainMat, [0, 1.05, 0], [0.7, 0.2, 0.7]));
      group.add(makePrimitive(sphereGeom, goldMat, [0, 1.2, 0], [0.25, 0.25, 0.25]));
      break;

    case 'bench':
      // Seat, backrest, legs
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.4, 0], [1.3, 0.1, 0.5]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 0.75, -0.22], [1.3, 0.6, 0.08]));
      group.add(makePrimitive(boxGeom, goldMat, [-0.55, 0.2, 0], [0.08, 0.4, 0.45]));
      group.add(makePrimitive(boxGeom, goldMat, [0.55, 0.2, 0], [0.08, 0.4, 0.45]));
      break;

    case 'planter':
      // Trough, soil, flowers
      group.add(makePrimitive(boxGeom, mainMat, [0, 0.3, 0], [1.1, 0.5, 0.5]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 0.56, 0], [1.0, 0.05, 0.4]));
      group.add(makePrimitive(coneGeom, goldMat, [-0.3, 0.7, 0], [0.2, 0.3, 0.2]));
      group.add(makePrimitive(coneGeom, goldMat, [0.3, 0.7, 0], [0.2, 0.3, 0.2]));
      break;

    case 'pedestal':
      // Base, pillar, top cap, bust
      group.add(makePrimitive(boxGeom, accentMat, [0, 0.1, 0], [0.6, 0.2, 0.6]));
      group.add(makePrimitive(cylinderGeom, mainMat, [0, 0.65, 0], [0.35, 0.9, 0.35]));
      group.add(makePrimitive(boxGeom, accentMat, [0, 1.15, 0], [0.55, 0.1, 0.55]));
      group.add(makePrimitive(sphereGeom, goldMat, [0, 1.4, 0], [0.4, 0.45, 0.4]));
      break;

    case 'telescope':
      // Tripod leg 1, tripod leg 2, barrel
      group.add(makePrimitive(cylinderGeom, accentMat, [0, 0.6, 0], [0.1, 1.2, 0.1]));
      group.add(makePrimitive(cylinderGeom, goldMat, [-0.25, 0.3, 0], [0.05, 0.7, 0.05], [0, 0, 0.4]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0.25, 0.3, 0], [0.05, 0.7, 0.05], [0, 0, -0.4]));
      group.add(makePrimitive(cylinderGeom, mainMat, [0, 1.25, 0], [0.15, 1.1, 0.15], [0.5, 0, 0]));
      break;

    case 'armillary':
      // Base, outer ring, inner ring, sphere
      group.add(makePrimitive(cylinderGeom, accentMat, [0, 0.35, 0], [0.4, 0.7, 0.4]));
      group.add(makePrimitive(torusGeom, goldMat, [0, 0.95, 0], [0.65, 0.65, 0.65]));
      group.add(makePrimitive(torusGeom, mainMat, [0, 0.95, 0], [0.55, 0.55, 0.55], [Math.PI / 2, 0, 0]));
      group.add(makePrimitive(sphereGeom, goldMat, [0, 0.95, 0], [0.18, 0.18, 0.18]));
      break;

    case 'orrery':
      // Base, spindle, ring, planet 1, planet 2
      group.add(makePrimitive(cylinderGeom, accentMat, [0, 0.2, 0], [0.6, 0.4, 0.6]));
      group.add(makePrimitive(cylinderGeom, goldMat, [0, 0.7, 0], [0.06, 0.8, 0.06]));
      group.add(makePrimitive(torusGeom, mainMat, [0, 0.8, 0], [0.7, 0.7, 0.7], [Math.PI / 2, 0, 0]));
      group.add(makePrimitive(sphereGeom, goldMat, [0, 1.15, 0], [0.25, 0.25, 0.25]));
      group.add(makePrimitive(sphereGeom, mainMat, [0.35, 0.8, 0], [0.12, 0.12, 0.12]));
      break;

    case 'astrolabe':
    default:
      // Stand, disk, pointer, rim
      group.add(makePrimitive(cylinderGeom, accentMat, [0, 0.4, 0], [0.35, 0.8, 0.35]));
      group.add(makePrimitive(cylinderGeom, mainMat, [0, 1.0, 0], [0.65, 0.04, 0.65], [Math.PI / 2, 0, 0]));
      group.add(makePrimitive(torusGeom, goldMat, [0, 1.0, 0], [0.68, 0.68, 0.68]));
      group.add(makePrimitive(boxGeom, goldMat, [0, 1.0, 0.04], [0.04, 0.7, 0.02], [0, 0, 0.6]));
      break;
  }

  // Tag all meshes with locus index for raycasting
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.userData.locusIndex = locus.index;
    }
  });

  // Create and attach floor plaque in front of the object
  const plaque = createPlaque(locus.index);
  plaque.mesh.position.set(0, 0.01, 0.55);
  plaque.mesh.userData.locusIndex = locus.index;
  group.add(plaque.mesh);

  return {
    group,
    locus,
    materials,
    baseColors,
    mood: 'normal',
    plaqueTexture: plaque.texture,
    plaqueMaterial: plaque.material,
  };
}

export function updateLocusMoodVisuals(node: LocusNode, time: number): void {
  if (node.mood === 'normal') {
    for (let i = 0; i < node.materials.length; i++) {
      node.materials[i].emissive.setHex(0x000000);
      node.materials[i].color.setHex(node.baseColors[i]);
    }
  } else if (node.mood === 'weak') {
    // Dimmed with dull red emissive
    for (let i = 0; i < node.materials.length; i++) {
      node.materials[i].emissive.setHex(0x440808);
      const dimmed = new THREE.Color(node.baseColors[i]).multiplyScalar(0.7);
      node.materials[i].color.copy(dimmed);
    }
  } else if (node.mood === 'highlight') {
    // Pulsing glow
    const pulse = (Math.sin(time * 5) + 1) * 0.5; // [0, 1]
    const glowColor = new THREE.Color(0x38bdf8).multiplyScalar(0.2 + pulse * 0.5);
    for (let i = 0; i < node.materials.length; i++) {
      node.materials[i].emissive.copy(glowColor);
      node.materials[i].color.setHex(node.baseColors[i]);
    }
  }
}

export function disposeLocusNode(node: LocusNode): void {
  for (const mat of node.materials) {
    mat.dispose();
  }
  node.plaqueMaterial.dispose();
  node.plaqueTexture.dispose();
}

export function disposeSharedGeometries(): void {
  boxGeom.dispose();
  cylinderGeom.dispose();
  sphereGeom.dispose();
  coneGeom.dispose();
  torusGeom.dispose();
}
