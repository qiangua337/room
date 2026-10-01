import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Photo-inspired loft bed / desk / stair / wardrobe suite.
 * Canonical layout: bed along z, room aisle at x < 0, stair at +z.
 * Bed rear is z=-1.525; wardrobe ends at z=2.31. Caller may rotate the
 * returned group to mirror the complete suite. `side` is reserved.
 * Colliders describe local floor-level furniture in x/z, not the loft deck.
 */
export function createLoftSuite({ wood, white, metal, fabric } = {}, side = 1) {
  void side;
  const group = new THREE.Group();
  group.name = 'photo-loft-bed-suite';
  const colliders = [];
  const mat = (color, roughness = 0.65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const m = {
    wood: wood || mat('#b99960'), white: white || mat('#eeeee5', 0.48),
    metal: metal || mat('#afb2a9', 0.26, 0.75), fabric: fabric || mat('#90a7aa', 0.96),
    ivory: mat('#dedcc9', 0.95), cream: mat('#e1dfc8', 0.58), dark: mat('#343936', 0.76),
    chair: mat('#5d635f', 0.63), brass: mat('#b5a16c', 0.4, 0.25),
    recess: mat('#8f907f'), book: mat('#6a828a'), red: mat('#ae6152'),
    navy: mat('#283946'), pale: mat('#d7ddd6'), mug: mat('#c6d0be', 0.33),
    screen: mat('#101a23', 0.28), sole: mat('#c6c6b9'), black: mat('#22272a'),
  };
  const boxCache = new Map();
  function box(w, h, d, x, y, z, material, round = 0, parent = group) {
    const key = `${w}/${h}/${d}/${round}`;
    if (!boxCache.has(key)) boxCache.set(key, round ? new RoundedBoxGeometry(w, h, d, 2, Math.min(round, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d));
    const obj = new THREE.Mesh(boxCache.get(key), material);
    obj.position.set(x, y, z); obj.castShadow = true; obj.receiveShadow = true; parent.add(obj); return obj;
  }
  function rod(a, b, r, material = m.white, parent = group, sides = 8) {
    const delta = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const obj = new THREE.Mesh(new THREE.CylinderGeometry(r, r, delta.length(), sides), material);
    obj.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    obj.castShadow = true; obj.receiveShadow = true; parent.add(obj); return obj;
  }
  function torus(radius, tube, x, y, z, material, parent = group) {
    const obj = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 18), material);
    obj.position.set(x, y, z); obj.castShadow = true; parent.add(obj); return obj;
  }
  function collider(minX, maxX, minZ, maxZ, kind) { colliders.push({ minX, maxX, minZ, maxZ, kind }); }
  const x0 = .025, x1 = 1.155, rear = -1.50, front = .60;

  // Four square steel columns and oak end boards, as in the references.
  for (const x of [x0, x1]) for (const z of [rear, front]) {
    box(.045, 2.19, .045, x, 1.095, z, m.white, .009);
    collider(x - .04, x + .04, z - .04, z + .04, 'bed-post');
    box(.067, .035, .067, x, .021, z, m.white, .008);
    rod([x, 2.19, z], [x, 2.97, z], .009, m.white);
    box(.035, .035, .035, x, 2.955, z, m.brass, .008);
  }
  for (const x of [x0, x1]) rod([x, 2.97, rear], [x, 2.97, front], .008);
  for (const z of [rear, front]) rod([x0, 2.97, z], [x1, 2.97, z], .008);
  box(1.13, .08, 2.14, .59, 1.725, -.45, m.white, .012);
  box(1.08, .026, 2.09, .59, 1.671, -.45, m.wood);
  // Near end is an oak privacy panel edged in painted steel.
  box(1.095, 1.66, .04, .59, .87, front, m.wood);
  box(1.14, .035, .048, .59, .058, front, m.white);
  collider(.025, 1.155, .566, .628, 'bed-end-panel');
  // End caps have the same softly rounded top corners as the photographed bed.
  for (const z of [front, rear]) {
    box(1.17, .59, .052, .59, 1.995, z, m.white, .068);
    box(1.077, .506, .054, .59, 1.99, z + (z > 0 ? .008 : -.008), m.wood, .055);
    box(1.13, .039, .059, .59, 1.724, z, m.white, .006);
  }
  // Long side rails: oak lower infill and light, open white upper railing.
  for (const x of [x0, x1]) {
    box(.035, .227, 2.03, x, 1.87, -.45, m.wood);
    box(.047, .035, 2.10, x, 1.751, -.45, m.white, .006);
    box(.047, .032, 2.10, x, 1.991, -.45, m.white, .006);
    box(.038, .038, 2.10, x, 2.184, -.45, m.white, .008);
    for (let i = 1; i < 6; i++) box(.032, .19, .026, x, 2.083, rear + i * .35, m.white, .005);
    for (const z of [-1.17, -.37, .35]) {
      box(.009, .047, .038, x - .024, 1.886, z, m.pale, .006);
      rod([x - .029, 1.894, z], [x - .045, 1.87, z], .004, m.metal);
    }
  }
  // A mattress, pillow and a slightly crumpled blue-grey quilt.
  box(1.072, .125, 2.02, .59, 1.823, -.45, m.ivory, .045);
  box(.84, .115, .36, .59, 1.927, -1.195, m.pale, .075).rotation.y = -.06;
  box(.78, .016, .035, .59, 1.987, -1.21, m.ivory, .008);
  const quiltGeo = new THREE.PlaneGeometry(1.058, 1.34, 18, 28);
  const qp = quiltGeo.attributes.position;
  for (let i = 0; i < qp.count; i++) {
    const x = qp.getX(i), longitudinal = qp.getY(i);
    const ripple = .013 * Math.sin(x * 28 + longitudinal * 15) + .011 * Math.cos(longitudinal * 18);
    qp.setXYZ(i, x, ripple + .012 * Math.sin(longitudinal * 5), longitudinal);
  }
  quiltGeo.computeVertexNormals();
  const quiltMat = m.fabric.clone(); quiltMat.side = THREE.DoubleSide;
  const quilt = new THREE.Mesh(quiltGeo, quiltMat);
  quilt.position.set(.59, 1.921, -.105); quilt.receiveShadow = true; quilt.castShadow = true; group.add(quilt);
  const fold = box(1.01, .065, .16, .6, 1.937, .39, m.fabric, .031); fold.rotation.z = -.035;
  for (let j = 0; j < 5; j++) {
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(1.01, .006), m.pale);
    seam.rotation.x = -Math.PI / 2; seam.position.set(.59, 1.944, -.61 + j * .205); group.add(seam);
  }

  // The under-bed desk is against the outer wall; its aisle side is open.
  box(.59, .047, 1.43, .875, .765, -.65, m.wood, .01);
  box(.033, .735, .04, .61, .368, -1.335, m.white);
  box(.033, .735, .04, .61, .368, .035, m.white);
  box(.035, .76, 1.43, 1.153, .38, -.65, m.white);
  box(.57, .028, .37, .878, .16, -.12, m.wood);
  box(.57, .032, .38, .878, .59, -.12, m.wood);
  box(.56, .50, .028, .878, .425, .07, m.white);
  collider(.584, 1.18, -1.37, .10, 'desk');
  // Narrow open bookshelf at the desk's back, with mixed books and a toiletry bottle.
  box(.22, .80, .032, 1.015, 1.184, -1.29, m.wood);
  for (const y of [.81, 1.17, 1.57]) box(.30, .028, .35, 1.012, y, -1.15, m.white);
  for (let i = 0; i < 6; i++) {
    const color = [m.book, m.cream, m.red, m.navy, m.ivory, m.pale][i];
    box(.17, .21 + (i % 3) * .027, .026, 1.01, .839 + (.21 + (i % 3) * .027) / 2, -1.26 + i * .033, color, .002);
    box(.175, .008, .028, 1.007, .873, -1.26 + i * .033, m.ivory);
  }
  // Laptop faces the aisle, with hinge, keyboard rows, and a muted blue display.
  const laptop = new THREE.Group(); laptop.position.set(.845, .798, -.66); group.add(laptop);
  box(.27, .014, .39, 0, 0, 0, m.dark, .006, laptop);
  box(.016, .225, .39, .125, .12, 0, m.black, .006, laptop).rotation.z = .14;
  box(.006, .184, .351, .102, .124, 0, m.screen, .003, laptop).rotation.z = .14;
  const screenGlow = new THREE.MeshBasicMaterial({ color: '#7394a5' });
  box(.007, .01, .14, .080, .20, -.07, screenGlow, .001, laptop);
  box(.007, .007, .22, .088, .156, 0, screenGlow, .001, laptop);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) box(.024, .003, .031, .027 - r * .037, .009, -.145 + c * .041, m.recess, .002, laptop);
  box(.055, .002, .085, -.088, .01, .01, m.metal, .003, laptop);
  // A mug with a visible open top and handle.
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.037, .031, .086, 14, 1, true), m.mug);
  cup.position.set(.73, .833, -.24); cup.castShadow = true; group.add(cup);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(.031, 14), mat('#534b38', .22)); tea.rotation.x = -Math.PI / 2; tea.position.set(.73, .865, -.24); group.add(tea);
  torus(.025, .0055, .73, .84, -.282, m.mug).rotation.y = Math.PI / 2;
  box(.14, .011, .22, .86, .806, -.96, m.cream, .004).rotation.y = .13;
  box(.13, .012, .20, .855, .819, -.96, m.red, .003).rotation.y = -.05;
  rod([.79, .832, -1.02], [.90, .832, -.88], .0035, m.navy);
  // A dark hanging jacket at the end of the desktop, plus its hook.
  rod([1.112, 1.47, .22], [.88, 1.47, .22], .007, m.metal);
  box(.20, .68, .078, .92, 1.12, .235, m.black, .03);
  box(.09, .5, .07, .80, 1.17, .235, m.dark, .028).rotation.z = -.15;
  box(.09, .5, .07, 1.04, 1.17, .235, m.black, .028).rotation.z = .1;
  box(.055, .06, .083, .92, 1.451, .235, m.dark, .012);

  // Grey molded shell chair with the thin chrome sled base visible in the photo.
  const chair = new THREE.Group(); chair.position.set(-.16, 0, -.52); chair.rotation.y = -.1; group.add(chair);
  box(.42, .037, .40, 0, .443, 0, m.chair, .035, chair);
  const chairBack = box(.046, .38, .416, -.204, .647, 0, m.chair, .03, chair); chairBack.rotation.z = -.11;
  for (const z of [-.163, .163]) {
    rod([-.182, .43, z], [-.26, .037, z], .011, m.metal, chair);
    rod([.145, .43, z], [.225, .037, z], .011, m.metal, chair);
    rod([-.26, .037, z], [.225, .037, z], .011, m.metal, chair);
  }
  rod([-.24, .048, -.163], [-.24, .048, .163], .011, m.metal, chair);
  collider(-.44, .075, -.76, -.28, 'chair');
  // Small fabric bag hung from the chair rather than a large generic solid block.
  box(.12, .25, .23, -.43, .40, -.54, m.black, .03);
  const strap = torus(.078, .009, -.423, .55, -.53, m.black); strap.scale.set(.55, 1, 1); strap.rotation.y = Math.PI / 2;

  // Four storage steps, rising towards the front end of the loft bed.
  const stairWidth = 1.115, stepDepth = .247;
  for (let i = 0; i < 4; i++) {
    const height = (4 - i) * .423, z = .77 + i * stepDepth;
    box(stairWidth, height, stepDepth - .004, .59, height / 2, z, m.cream, .007);
    box(stairWidth + .026, .033, stepDepth + .028, .59, height + .012, z + .011, m.white, .012);
    box(stairWidth - .075, .34, .017, .59, height - .196, z + stepDepth / 2 + .003, m.white, .005);
    // The reference drawers use shallow, horizontal, recessed pull handles.
    box(.175, .028, .018, .59, height - .12, z + stepDepth / 2 + .014, m.recess, .012);
    box(.144, .013, .022, .59, height - .13, z + stepDepth / 2 + .017, m.pale, .004);
  }
  collider(.025, 1.155, .64, 1.648, 'storage-stair');
  for (const x of [.015, 1.165]) {
    rod([x, 2.215, .69], [x, .724, 1.686], .024, m.white);
    rod([x, .05, 1.655], [x, .724, 1.686], .025, m.white);
    rod([x, 1.69, .70], [x, 2.215, .69], .022, m.white);
  }

  // Cream wardrobe immediately beside the stairs, with oak edging and twin doors.
  const wardrobePartsStart = group.children.length;
  box(1.18, 2.27, .62, .59, 1.135, 2.0, m.wood, .01);
  box(.024, 2.19, .584, 1.175, 1.125, 2.0, m.white, .008);
  box(.024, 2.19, .584, .005, 1.125, 2.0, m.white, .008);
  box(1.145, .025, .612, .59, 2.263, 2.0, m.white, .006);
  box(1.12, .057, .60, .59, .04, 2.018, m.white, .006);
  for (const x of [.311, .869]) {
    box(.546, 1.565, .033, x, .832, 2.318, m.white, .009);
    box(.546, .586, .033, x, 1.932, 2.318, m.white, .009);
    const handleX = x < .59 ? x + .154 : x - .154;
    box(.025, .228, .01, handleX, 1.015, 2.339, m.recess, .007);
    box(.025, .183, .01, handleX, 1.928, 2.339, m.recess, .007);
    box(.01, .196, .007, handleX-.007, 1.015, 2.345, m.metal, .003);
    box(.01, .155, .007, handleX-.007, 1.928, 2.345, m.metal, .003);
    box(.044, .052, .008, x - .06, 1.337, 2.34, m.pale, .006);
    rod([x - .06, 1.344, 2.348], [x - .06, 1.32, 2.36], .004, m.metal);
  }
  box(.073, .11, .014, .594, 1.167, 2.343, m.pale, .008);
  torus(.011, .004, .594, 1.186, 2.356, m.metal);
  collider(.50, 1.19, 1.69, 2.87, 'wardrobe');
  // Luggage on top is a distinctive part of the reference.
  box(1.025, .22, .50, .60, 2.384, 2.0, m.chair, .05);
  box(1.033, .019, .505, .60, 2.36, 2.0, m.black, .008);
  for (const x of [.16, 1.04]) box(.05, .026, .47, x, 2.501, 2.0, m.metal, .008);
  box(.24, .025, .051, .6, 2.40, 2.27, m.black, .01);
  rod([.48, 2.40, 2.29], [.72, 2.40, 2.29], .012, m.dark);
  // Cabinet doors face the central aisle, matching the photographed side walls.
  const wardrobe = new THREE.Group();
  const wardrobeParts = group.children.slice(wardrobePartsStart);
  for (const part of wardrobeParts) wardrobe.add(part);
  wardrobe.position.set(2.865, 0, 1.69);
  wardrobe.rotation.y = -Math.PI / 2;
  group.add(wardrobe);
  // Shoes below the desk add the everyday scale of the photos.
  for (const [x, z, color] of [[.44, -1.18, m.ivory], [.62, -1.18, m.ivory], [.94, -.22, m.navy], [.96, -.01, m.navy]]) {
    box(.12, .052, .27, x, .035, z, m.sole, .04);
    box(.113, .075, .225, x, .085, z + .012, color, .042);
    for (let l = 0; l < 3; l++) rod([x - .027, .126, z - .03 + l * .025], [x + .028, .126, z - .03 + l * .025], .003, m.ivory);
  }
  return { group, colliders };
}
