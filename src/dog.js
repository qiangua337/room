import * as THREE from 'three';

/** A small, self-contained corgi rig. +Z is forward; paws rest on y = 0. */
export function createDog() {
  const group = new THREE.Group();
  group.name = 'Mochi the corgi';
  group.scale.setScalar(0.92);
  const material = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  const tan = material('#c58b49');
  const golden = material('#dbab68');
  const cream = material('#fff0d6');
  const dark = material('#292521', 0.43);
  const pink = material('#d39b8d');
  const coral = material('#b55241', 0.6);
  const brass = new THREE.MeshStandardMaterial({ color: '#d1b668', roughness: 0.38, metalness: 0.65 });
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const legGeo = new THREE.CapsuleGeometry(0.037, 0.066, 4, 10);
  const toeGeo = new THREE.SphereGeometry(1, 12, 8);
  const rig = new THREE.Group();
  group.add(rig);

  function ellipsoid(parent, mat, position, scale, geo = sphere) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function curve(parent, points, radius, mat) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 12, radius, 6, false), mat);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Compact, long body and the corgi's distinctive cream chest.
  const torso = ellipsoid(rig, tan, [0, 0.242, -0.049], [0.121, 0.122, 0.226]);
  ellipsoid(rig, golden, [0, 0.276, -0.048], [0.111, 0.094, 0.195]);
  ellipsoid(rig, cream, [0, 0.216, 0.118], [0.101, 0.123, 0.092]);
  ellipsoid(rig, cream, [0, 0.181, -0.035], [0.095, 0.062, 0.172]);

  const legs = [];
  for (const rear of [false, true]) {
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.080, 0.181, rear ? -0.192 : 0.115);
      rig.add(hip);
      const upper = new THREE.Mesh(legGeo, tan);
      upper.position.y = -0.048;
      upper.castShadow = true;
      upper.receiveShadow = true;
      hip.add(upper);
      ellipsoid(hip, cream, [0, -0.137, 0.018], [0.044, 0.043, 0.063], toeGeo);
      // A subtle toe seam helps the paws read at a close distance.
      for (const x of [-0.013, 0.013]) {
        curve(hip, [[x,-0.133,0.070],[x,-0.148,0.074],[x,-0.160,0.061]], 0.0015, golden);
      }
      legs.push({ hip, rear, side });
    }
  }

  // Head motion is independent of the torso so it can look toward its owner.
  const head = new THREE.Group();
  head.position.set(0, 0.354, 0.186);
  rig.add(head);
  ellipsoid(head, tan, [0, 0, 0.002], [0.103, 0.098, 0.107]);
  ellipsoid(head, cream, [0, -0.034, 0.089], [0.073, 0.047, 0.068]);
  ellipsoid(head, cream, [0, 0.025, 0.091], [0.019, 0.065, 0.022]);
  // The cheeks slightly overlap the muzzle to avoid a mechanical silhouette.
  for (const side of [-1, 1]) {
    ellipsoid(head, cream, [side * 0.062, -0.020, 0.064], [0.044, 0.044, 0.040]);
  }
  ellipsoid(head, dark, [0, -0.022, 0.149], [0.025, 0.019, 0.017]);
  ellipsoid(head, cream, [-0.007, -0.016, 0.163], [0.005, 0.0023, 0.0018], toeGeo);
  curve(head, [[0, -0.035, 0.150], [0, -0.049, 0.147], [-0.019, -0.054, 0.143]], 0.0022, dark);
  curve(head, [[0, -0.049, 0.147], [0.013, -0.054, 0.145], [0.025, -0.047, 0.140]], 0.0022, dark);

  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.060, 0.025, 0.087);
    head.add(eye);
    ellipsoid(eye, dark, [0,0,0], [0.012,0.015,0.008], toeGeo);
    ellipsoid(eye, cream, [-0.003,0.004,0.007], [0.0036,0.0036,0.002], toeGeo);
    eyes.push(eye);
    ellipsoid(head, golden, [side * 0.062,0.050,0.077], [0.022,0.009,0.012], toeGeo);
  }

  function earShape(width, height) {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.quadraticCurveTo(-width * .56, height * .45, -width * .09, height * .94);
    s.quadraticCurveTo(0, height * 1.06, width * .11, height * .94);
    s.quadraticCurveTo(width * .52, height * .38, width / 2, 0);
    s.quadraticCurveTo(0, -height * .11, -width / 2, 0);
    return s;
  }
  const outerEarGeo = new THREE.ExtrudeGeometry(earShape(.079,.107), {
    depth: .012, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .008, bevelThickness: .005, curveSegments: 8
  });
  const innerEarGeo = new THREE.ShapeGeometry(earShape(.044,.075), 8);
  const innerEarMat = material('#deb3a2');
  innerEarMat.side = THREE.DoubleSide;
  const ears = [];
  for (const side of [-1,1]) {
    const ear = new THREE.Group();
    ear.position.set(side * .069,.055,-.009);
    ear.rotation.z = -side * .20;
    head.add(ear);
    const outer = new THREE.Mesh(outerEarGeo,tan);
    outer.castShadow = true;
    ear.add(outer);
    const inner = new THREE.Mesh(innerEarGeo,innerEarMat);
    inner.position.set(0,.014,.018);
    ear.add(inner);
    ears.push({ear,side});
  }

  const collar = new THREE.Mesh(new THREE.TorusGeometry(.085,.009,8,28),coral);
  collar.position.set(0,.296,.139);
  collar.rotation.x = -.35;
  collar.scale.set(1,1.08,1);
  collar.castShadow = true;
  rig.add(collar);
  const tag = new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.005,16),brass);
  tag.rotation.x = Math.PI / 2;
  tag.position.set(0,.213,.168);
  rig.add(tag);

  const tail = new THREE.Group();
  tail.position.set(0,.286,-.250);
  rig.add(tail);
  curve(tail, [[0,0,0],[0,.030,-.055],[0,.090,-.064],[0,.116,-.028]], .027, tan);
  ellipsoid(tail,cream,[0,.116,-.028],[.029,.030,.031],toeGeo);

  // The tongue only peeks out when the owner calls or pets the dog.
  const tongue = ellipsoid(head,pink,[0,-.067,.130],[.014,.020,.019],toeGeo);
  tongue.visible = false;

  let sittingTarget = 0;
  let sitting = 0;
  let moving = 0;
  let lastTime = null;
  let stepPhase = 0;
  const smooth = (a,b,rate,dt) => THREE.MathUtils.lerp(a,b,1-Math.exp(-rate*dt));
  function setSitting(value) { sittingTarget = value ? 1 : 0; }
  function update(time, speed = 0, happy = false) {
    const dt = lastTime === null ? 1/60 : Math.max(0,Math.min(.08,time-lastTime));
    lastTime = time;
    const pace = Math.min(1.8,Math.max(0,Math.abs(speed)));
    moving = smooth(moving,Math.min(1,pace*1.8),9,dt);
    sitting = smooth(sitting,sittingTarget,7,dt);
    const gait = moving * (1-sitting);
    stepPhase += dt * (8 + pace * 5);
    const breath = Math.sin(time * 2.6) * .003;
    rig.position.y = breath + Math.abs(Math.sin(stepPhase))*gait*.010 - sitting*.031;
    rig.rotation.x = sitting * -.12;
    rig.rotation.z = Math.sin(stepPhase)*gait*.025;
    torso.scale.y = .122 + breath*.45;
    for (const {hip,rear,side} of legs) {
      const phase = stepPhase + ((side === -1) !== rear ? Math.PI : 0);
      hip.rotation.x = Math.sin(phase)*.40*gait + (rear ? -1.10 : .10)*sitting;
      hip.rotation.z = rear ? side*.18*sitting : 0;
      hip.position.y = .181 - (rear ? .046 : 0)*sitting;
      hip.position.z = (rear ? -.192 : .115) + (rear ? .053 : -.012)*sitting;
    }
    head.rotation.y = Math.sin(time*.71)*.10*(1-gait*.65);
    head.rotation.x = -.025 + Math.sin(time*1.17)*.022 + sitting*.10;
    head.rotation.z = happy ? Math.sin(time*1.6)*.075 : Math.sin(time*.53)*.025;
    const blinkPhase = ((time + .4) % 4.7);
    const blink = blinkPhase < .15 ? Math.max(.06,Math.abs(blinkPhase-.075)/.075) : 1;
    for (const eye of eyes) eye.scale.y = blink;
    for (const {ear,side} of ears) {
      const twitch = Math.pow(Math.max(0,Math.sin(time*1.73+side)),18)*.055;
      ear.rotation.z = -side*(.20+twitch);
      ear.rotation.x = Math.sin(time*1.2+side)*.018;
    }
    tail.rotation.y = Math.sin(time*(happy ? 14 : 7))*(happy ? .72 : .29);
    tail.rotation.z = Math.cos(time*(happy ? 14 : 7))*.10;
    tongue.visible = Boolean(happy);
    tongue.scale.y = .02 + Math.sin(time*6)*.002;
    tag.rotation.z = Math.sin(stepPhase)*gait*.13;
  }

  group.userData.pet = 'dog';
  group.userData.dimensions = { length: .65, height: .49, width: .26 };
  update(0);
  return { group, update, setSitting };
}

