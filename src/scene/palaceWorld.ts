// Palace 3D architecture: floors, walls, ceilings, doorways, lighting, and golden ribbon.
// Spec: tasks/T1-scene.md.
import * as THREE from 'three';
import { ROOMS, DOORS, LOCI, glidePath } from '../data/palace.ts';

const CEILING_HEIGHT = 4.0;

export interface PalaceWorld {
  root: THREE.Group;
  dispose(): void;
}

export function buildPalaceWorld(): PalaceWorld {
  const root = new THREE.Group();
  const disposables: { dispose(): void }[] = [];

  // Base ambient lighting for scene visibility
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  root.add(ambientLight);

  // Per-room materials and lighting
  const roomThemes = [
    { floor: 0x3d2817, wall: 0x2b1d14, light: ROOMS[0].light }, // Library: warm amber, dark wood
    { floor: 0xd8e2dc, wall: 0x94a3b8, light: ROOMS[1].light }, // Kitchen: cool white, tile
    { floor: 0x4a5d4e, wall: 0x1b4332, light: ROOMS[2].light }, // Greenhouse: green, foliage/stone
    { floor: 0x0f172a, wall: 0x0a0f1d, light: ROOMS[3].light }, // Observatory: deep blue, slate
  ];

  for (let r = 0; r < ROOMS.length; r++) {
    const room = ROOMS[r];
    const theme = roomThemes[r];
    const width = room.rect.x1 - room.rect.x0;
    const depth = room.rect.z1 - room.rect.z0;
    const cx = (room.rect.x0 + room.rect.x1) / 2;
    const cz = (room.rect.z0 + room.rect.z1) / 2;

    // Room point light
    const pointLight = new THREE.PointLight(theme.light, 1.2, 25);
    pointLight.position.set(cx, CEILING_HEIGHT - 0.5, cz);
    root.add(pointLight);

    // Floor
    const floorGeom = new THREE.PlaneGeometry(width, depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: theme.floor,
      roughness: 0.6,
      metalness: 0.1,
    });
    disposables.push(floorGeom, floorMat);
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(cx, 0, cz);
    root.add(floorMesh);

    // Ceiling
    const ceilGeom = new THREE.PlaneGeometry(width, depth);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
    });
    disposables.push(ceilGeom, ceilMat);
    const ceilMesh = new THREE.Mesh(ceilGeom, ceilMat);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(cx, CEILING_HEIGHT, cz);
    root.add(ceilMesh);

    // North wall (z = z1)
    const nWallGeom = new THREE.PlaneGeometry(width, CEILING_HEIGHT);
    const wallMat = new THREE.MeshStandardMaterial({
      color: theme.wall,
      roughness: 0.7,
    });
    disposables.push(nWallGeom, wallMat);
    const nWallMesh = new THREE.Mesh(nWallGeom, wallMat);
    nWallMesh.position.set(cx, CEILING_HEIGHT / 2, room.rect.z1);
    nWallMesh.rotation.y = Math.PI;
    root.add(nWallMesh);

    // South wall (z = z0)
    const sWallGeom = new THREE.PlaneGeometry(width, CEILING_HEIGHT);
    disposables.push(sWallGeom);
    const sWallMesh = new THREE.Mesh(sWallGeom, wallMat);
    sWallMesh.position.set(cx, CEILING_HEIGHT / 2, room.rect.z0);
    root.add(sWallMesh);

    // West wall: solid for room 0, door opening for rooms 1, 2, 3
    if (r === 0) {
      const wWallGeom = new THREE.PlaneGeometry(depth, CEILING_HEIGHT);
      disposables.push(wWallGeom);
      const wWallMesh = new THREE.Mesh(wWallGeom, wallMat);
      wWallMesh.position.set(room.rect.x0, CEILING_HEIGHT / 2, cz);
      wWallMesh.rotation.y = Math.PI / 2;
      root.add(wWallMesh);
    } else {
      // Flanking wall sections below and above door (z in [5.5, 8.5])
      const doorZ0 = 5.5;
      const doorZ1 = 8.5;
      // Bottom section: z in [0, 5.5] -> length 5.5
      const lowerGeom = new THREE.PlaneGeometry(doorZ0, CEILING_HEIGHT);
      disposables.push(lowerGeom);
      const lowerMesh = new THREE.Mesh(lowerGeom, wallMat);
      lowerMesh.position.set(room.rect.x0, CEILING_HEIGHT / 2, doorZ0 / 2);
      lowerMesh.rotation.y = Math.PI / 2;
      root.add(lowerMesh);

      // Upper section: z in [8.5, 14] -> length 5.5
      const upperGeom = new THREE.PlaneGeometry(depth - doorZ1, CEILING_HEIGHT);
      disposables.push(upperGeom);
      const upperMesh = new THREE.Mesh(upperGeom, wallMat);
      upperMesh.position.set(room.rect.x0, CEILING_HEIGHT / 2, doorZ1 + (depth - doorZ1) / 2);
      upperMesh.rotation.y = Math.PI / 2;
      root.add(upperMesh);

      // Header above door opening
      const headerGeom = new THREE.PlaneGeometry(doorZ1 - doorZ0, CEILING_HEIGHT - 2.8);
      disposables.push(headerGeom);
      const headerMesh = new THREE.Mesh(headerGeom, wallMat);
      headerMesh.position.set(room.rect.x0, 2.8 + (CEILING_HEIGHT - 2.8) / 2, (doorZ0 + doorZ1) / 2);
      headerMesh.rotation.y = Math.PI / 2;
      root.add(headerMesh);
    }

    // East wall: solid for room 3, door opening for rooms 0, 1, 2
    if (r === ROOMS.length - 1) {
      const eWallGeom = new THREE.PlaneGeometry(depth, CEILING_HEIGHT);
      disposables.push(eWallGeom);
      const eWallMesh = new THREE.Mesh(eWallGeom, wallMat);
      eWallMesh.position.set(room.rect.x1, CEILING_HEIGHT / 2, cz);
      eWallMesh.rotation.y = -Math.PI / 2;
      root.add(eWallMesh);
    } else {
      const doorZ0 = 5.5;
      const doorZ1 = 8.5;
      const lowerGeom = new THREE.PlaneGeometry(doorZ0, CEILING_HEIGHT);
      disposables.push(lowerGeom);
      const lowerMesh = new THREE.Mesh(lowerGeom, wallMat);
      lowerMesh.position.set(room.rect.x1, CEILING_HEIGHT / 2, doorZ0 / 2);
      lowerMesh.rotation.y = -Math.PI / 2;
      root.add(lowerMesh);

      const upperGeom = new THREE.PlaneGeometry(depth - doorZ1, CEILING_HEIGHT);
      disposables.push(upperGeom);
      const upperMesh = new THREE.Mesh(upperGeom, wallMat);
      upperMesh.position.set(room.rect.x1, CEILING_HEIGHT / 2, doorZ1 + (depth - doorZ1) / 2);
      upperMesh.rotation.y = -Math.PI / 2;
      root.add(upperMesh);

      const headerGeom = new THREE.PlaneGeometry(doorZ1 - doorZ0, CEILING_HEIGHT - 2.8);
      disposables.push(headerGeom);
      const headerMesh = new THREE.Mesh(headerGeom, wallMat);
      headerMesh.position.set(room.rect.x1, 2.8 + (CEILING_HEIGHT - 2.8) / 2, (doorZ0 + doorZ1) / 2);
      headerMesh.rotation.y = -Math.PI / 2;
      root.add(headerMesh);
    }

    // Star ceiling points for Observatory (Room 3)
    if (r === 3) {
      const starCount = 300;
      const starPositions = new Float32Array(starCount * 3);
      for (let s = 0; s < starCount; s++) {
        starPositions[s * 3] = room.rect.x0 + Math.random() * width;
        starPositions[s * 3 + 1] = CEILING_HEIGHT - 0.05;
        starPositions[s * 3 + 2] = room.rect.z0 + Math.random() * depth;
      }
      const starGeom = new THREE.BufferGeometry();
      starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.06,
        transparent: true,
        opacity: 0.85,
      });
      disposables.push(starGeom, starMat);
      const stars = new THREE.Points(starGeom, starMat);
      root.add(stars);
    }
  }

  // Doorway connectors between rooms
  for (let d = 0; d < DOORS.length; d++) {
    const door = DOORS[d];
    const w = door.x1 - door.x0;
    const depth = door.z1 - door.z0;
    const cx = (door.x0 + door.x1) / 2;
    const cz = (door.z0 + door.z1) / 2;

    const doorFloorGeom = new THREE.PlaneGeometry(w, depth);
    const doorFloorMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
    });
    disposables.push(doorFloorGeom, doorFloorMat);
    const doorFloorMesh = new THREE.Mesh(doorFloorGeom, doorFloorMat);
    doorFloorMesh.rotation.x = -Math.PI / 2;
    doorFloorMesh.position.set(cx, 0.005, cz);
    root.add(doorFloorMesh);

    // Decorative door arch / frame
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.5,
    });
    disposables.push(archMat);
    const postGeom = new THREE.BoxGeometry(0.1, 2.8, 0.1);
    disposables.push(postGeom);

    const postL = new THREE.Mesh(postGeom, archMat);
    postL.position.set(cx, 1.4, door.z0);
    root.add(postL);

    const postR = new THREE.Mesh(postGeom, archMat);
    postR.position.set(cx, 1.4, door.z1);
    root.add(postR);

    const beamGeom = new THREE.BoxGeometry(0.1, 0.1, depth);
    disposables.push(beamGeom);
    const beam = new THREE.Mesh(beamGeom, archMat);
    beam.position.set(cx, 2.8, cz);
    root.add(beam);
  }

  // Golden path ribbon on the floor along glidePath of consecutive loci
  const ribbonPoints: THREE.Vector3[] = [];
  for (let i = 0; i < LOCI.length; i++) {
    const nextIdx = (i + 1) % LOCI.length;
    const path = glidePath(i, nextIdx);
    for (let p = 0; p < path.length; p++) {
      ribbonPoints.push(new THREE.Vector3(path[p][0], 0.015, path[p][1]));
    }
  }

  const ribbonCurve = new THREE.CatmullRomCurve3(ribbonPoints, true);
  // Sample curve to build a continuous flat ribbon on the floor
  const sampleCount = 600;
  const sampled = ribbonCurve.getPoints(sampleCount);

  const ribbonGeom = new THREE.BufferGeometry();
  const ribbonPositions: number[] = [];
  const ribbonWidth = 0.12;

  for (let k = 0; k < sampled.length; k++) {
    const curr = sampled[k];
    const next = sampled[(k + 1) % sampled.length];
    const tangent = new THREE.Vector3().subVectors(next, curr).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(ribbonWidth);

    ribbonPositions.push(curr.x - normal.x, 0.015, curr.z - normal.z);
    ribbonPositions.push(curr.x + normal.x, 0.015, curr.z + normal.z);
  }

  const ribbonIndices: number[] = [];
  for (let k = 0; k < sampled.length; k++) {
    const idx0 = k * 2;
    const idx1 = k * 2 + 1;
    const idx2 = ((k + 1) % sampled.length) * 2;
    const idx3 = ((k + 1) % sampled.length) * 2 + 1;

    ribbonIndices.push(idx0, idx2, idx1);
    ribbonIndices.push(idx1, idx2, idx3);
  }

  ribbonGeom.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
  ribbonGeom.setIndex(ribbonIndices);
  ribbonGeom.computeVertexNormals();

  const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.3,
    metalness: 0.7,
    side: THREE.DoubleSide,
  });
  disposables.push(ribbonGeom, ribbonMat);
  const ribbonMesh = new THREE.Mesh(ribbonGeom, ribbonMat);
  root.add(ribbonMesh);

  return {
    root,
    dispose() {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
