/** Interiors for Dhigali, matched to the published villa plan (king bed toward the lagoon glass, daybed, freestanding tub, rain shower, plunge pool). Surfaces are original painted textures. The view through the glass is the live island. */

type ThreeNS = typeof import("three");
type Object3D = import("three").Object3D;
type Material = import("three").Material;
type MeshStandardMaterial = import("three").MeshStandardMaterial;

export const DHIGALI_ROOM_COPY: Record<string, { title: string; line: string }> = {
  villas: {
    title: "라군 빌라",
    line: "킹 베드, 독립 욕조, 레인 샤워. 미닫이 유리 밖 데크에 데이베드와 플런지 풀이 있고, 그 너머는 지금 라군이다.",
  },
  arrival: {
    title: "도착 파빌리온",
    line: "열린 지붕 아래 벤치. 기둥 사이로 남쪽 잔교와 바다가 그대로 보인다.",
  },
  lobby: {
    title: "리셉션",
    line: "체크인 데스크와 의자. 벽이 없어서 버기 길과 야자수가 홀 안으로 이어진다.",
  },
  jade: {
    title: "제이드",
    line: "열린 다이닝. 테이블 사이로 보면 라군이 벽 역할을 한다.",
  },
  capers: {
    title: "케이퍼스",
    line: "가운데는 연주가 서는 자리이고, 식탁은 가장자리에 놓여 있다.",
  },
  cafe: {
    title: "카페",
    line: "낮은 카운터와 테이블. 잔 너머로 해변 빛이 들어온다.",
  },
  haali: {
    title: "할리 선셋 바",
    line: "바 카운터 너머가 서쪽이다. 노을은 이 섬의 해를 그대로 본다.",
  },
  east: {
    title: "이스트 바",
    line: "메인 바. 스툴에 앉으면 등 뒤로 섬의 길이 열려 있다.",
  },
  spa: {
    title: "디갈리 스파",
    line: "트리트먼트 베드와 플런지. 정원 쪽은 벽 없이 야자수와 맞닿아 있다.",
  },
  dive: {
    title: "다이브 센터",
    line: "벤치와 탱크, 핀. 북쪽 리프 쪽이 열려 있다.",
  },
  mosque: {
    title: "모스크",
    line: "신발을 벗어 두고 들어선 조용한 마루. 꾸미지 않은 흰 바닥이다.",
  },
  play: {
    title: "플레이 키즈클럽",
    line: "낮은 방석과 공. 지붕만 있고 모래가 바로 옆이다.",
  },
  battuta: {
    title: "바투타",
    line: "낮은 식탁의 시그니처 다이닝. 열린 옆면으로 섬이 보인다.",
  },
  faru: {
    title: "파루 그릴",
    line: "그릴 카운터의 불 옆. 오버워터 잔교와 물이 한 장면이다.",
  },
};

export type RoomKind = "welcome" | "lobby" | "dining" | "cafe" | "bar" | "spa" | "dive" | "quiet" | "play" | "grill";

export const DHIGALI_ROOM_KIND: Record<string, RoomKind> = {
  arrival: "welcome",
  lobby: "lobby",
  jade: "dining",
  capers: "dining",
  cafe: "cafe",
  haali: "bar",
  east: "bar",
  spa: "spa",
  dive: "dive",
  mosque: "quiet",
  play: "play",
  battuta: "dining",
  faru: "grill",
};

export type RoomKit = {
  teakFloor: MeshStandardMaterial;
  linen: MeshStandardMaterial;
  duvet: MeshStandardMaterial;
  plaster: MeshStandardMaterial;
  stone: MeshStandardMaterial;
  cream: MeshStandardMaterial;
  glass: Material;
  sheer: MeshStandardMaterial;
  white: MeshStandardMaterial;
  lamp: MeshStandardMaterial;
  screen: MeshStandardMaterial;
  leaf: MeshStandardMaterial;
  metal: MeshStandardMaterial;
  water: MeshStandardMaterial;
  rug: MeshStandardMaterial;
  aqua: MeshStandardMaterial;
  timber: MeshStandardMaterial;
  coal: MeshStandardMaterial;
  materials: Material[];
};

export type LocalGaze = {
  eye: import("three").Vector3;
  look: import("three").Vector3;
  stand: import("three").Vector3;
  floorY: number;
  trim: import("three").Mesh;
};

export type PavilionBuilt = {
  highlight: import("three").Mesh;
  eye: import("three").Vector3;
  look: import("three").Vector3;
  stand: import("three").Vector3;
  floorY: number;
};

function makeTex(THREE: ThreeNS, size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function plankTex(THREE: ThreeNS) {
  return makeTex(THREE, 256, (ctx, s) => {
    ctx.fillStyle = "#b5814e";
    ctx.fillRect(0, 0, s, s);
    const rows = 6;
    for (let i = 0; i < rows; i++) {
      const y = (i * s) / rows;
      const h = s / rows - 2;
      ctx.fillStyle = i % 2 === 0 ? "#c99560" : "#a87445";
      ctx.fillRect(0, y, s, h);
      ctx.strokeStyle = "rgba(92, 52, 24, 0.35)";
      ctx.strokeRect(0.5, y + 0.5, s - 1, h - 1);
      ctx.strokeStyle = "rgba(255, 226, 190, 0.18)";
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const gy = y + 6 + k * (h / 5);
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(s * 0.3, gy + 3, s * 0.6, gy - 4, s, gy + 1);
      }
      ctx.stroke();
    }
  });
}

function linenTex(THREE: ThreeNS, hem: string | null) {
  return makeTex(THREE, 256, (ctx, s) => {
    ctx.fillStyle = "#f6f1e7";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(214, 196, 168, 0.55)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y = 18 + i * 26;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(80, y + 10, 160, y - 12, s, y + 4);
      ctx.stroke();
    }
    if (hem) {
      ctx.fillStyle = hem;
      ctx.fillRect(0, s - 28, s, 28);
    }
  });
}

function plasterTex(THREE: ThreeNS) {
  return makeTex(THREE, 128, (ctx, s) => {
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgba(220, 206, 184, 0.35)";
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.ellipse((i * 37) % s, (i * 53) % s, 18, 8, i, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function stoneTex(THREE: ThreeNS) {
  return makeTex(THREE, 128, (ctx, s) => {
    ctx.fillStyle = "#efe8dc";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(190, 176, 156, 0.7)";
    const n = 4;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.strokeRect(x * (s / n) + 2, y * (s / n) + 2, s / n - 4, s / n - 4);
      }
    }
  });
}

function rugTex(THREE: ThreeNS) {
  return makeTex(THREE, 128, (ctx, s) => {
    ctx.fillStyle = "#f3ead8";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#7ec8c3";
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, s - 16, s - 16);
    ctx.strokeStyle = "#e7c48a";
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, s - 36, s - 36);
  });
}

function std(THREE: ThreeNS, color: number, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function makeRoomKit(THREE: ThreeNS): RoomKit {
  const teakMap = plankTex(THREE);
  const teakFloor = new THREE.MeshStandardMaterial({ color: 0xd2b07a, map: teakMap, roughness: 0.78 });
  if (teakFloor.map) teakFloor.map.repeat.set(3, 2);
  const linenMap = linenTex(THREE, null);
  const duvetMap = linenTex(THREE, "#7ec8c3");
  const plasterMap = plasterTex(THREE);
  const stoneMap = stoneTex(THREE);
  const rugMap = rugTex(THREE);
  const linen = new THREE.MeshStandardMaterial({ color: 0xf7f4ee, map: linenMap, roughness: 0.92 });
  const duvet = new THREE.MeshStandardMaterial({ color: 0xf7f4ee, map: duvetMap, roughness: 0.9 });
  const plaster = new THREE.MeshStandardMaterial({ color: 0xf4efe6, map: plasterMap, roughness: 0.86 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xefe8dc, map: stoneMap, roughness: 0.8 });
  const rug = new THREE.MeshStandardMaterial({ color: 0xf3ead8, map: rugMap, roughness: 0.95 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xe7f6f4,
    roughness: 0.06,
    metalness: 0,
    transmission: 0.92,
    thickness: 0.08,
    transparent: true,
    opacity: 1,
  });
  const sheer = new THREE.MeshStandardMaterial({
    color: 0xfff8ee,
    transparent: true,
    opacity: 0.28,
    roughness: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const materials: Material[] = [
    teakFloor,
    linen,
    duvet,
    plaster,
    stone,
    rug,
    glass,
    sheer,
    std(THREE, 0xf7f4ee, 0.62),
    std(THREE, 0xfff1c2, 0.4),
    std(THREE, 0x1c2430, 0.35),
    std(THREE, 0x2f8f4e, 0.8),
    std(THREE, 0xd5dbe2, 0.28),
    std(THREE, 0x2fbfc8, 0.18),
    std(THREE, 0x7ec8c3, 0.72),
    std(THREE, 0xc4a574, 0.7),
    std(THREE, 0xf4efe4, 0.62),
  ];
  const [white, lamp, screen, leaf, metal, water, aqua, timber, cream] = materials.slice(8) as MeshStandardMaterial[];
  lamp.emissive.set(0xffb347);
  lamp.emissiveIntensity = 1.6;
  screen.emissive.set(0x8fb8c9);
  screen.emissiveIntensity = 0.35;
  metal.metalness = 0.65;
  water.transparent = true;
  water.opacity = 0.85;
  const coal = new THREE.MeshStandardMaterial({
    color: 0xff7a3c,
    emissive: 0xff5a1f,
    emissiveIntensity: 0.8,
    roughness: 0.45,
  });
  materials.push(coal);
  return {
    teakFloor,
    linen,
    duvet,
    plaster,
    stone,
    cream: cream!,
    glass,
    sheer,
    white: white!,
    lamp: lamp!,
    screen: screen!,
    leaf: leaf!,
    metal: metal!,
    water: water!,
    rug,
    aqua: aqua!,
    timber: timber!,
    coal,
    materials,
  };
}

function addBox(
  THREE: ThreeNS,
  parent: Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  material: Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addFan(THREE: ThreeNS, parent: Object3D, x: number, y: number, z: number, kit: RoomKit, fans: Object3D[]) {
  const fan = new THREE.Group();
  fan.position.set(x, y, z);
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 1.05), kit.white);
    blade.position.z = 0.52;
    pivot.add(blade);
    fan.add(pivot);
  }
  fan.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), kit.metal));
  parent.add(fan);
  fans.push(fan);
}

/** Lagoon villa shell in group space. Glass and pool face local +Z, which the caller aims at open water. */
export function furnishLagoonVilla(THREE: ThreeNS, group: Object3D, kit: RoomKit, fans: Object3D[]): LocalGaze {
  const cx = 0.3;
  const cz = -0.35;
  const floorY = 2.6;
  const halfX = 2.42;
  const halfZ = 1.52;
  const wallH = 2.02;
  const backZ = cz - halfZ;
  const frontZ = cz + halfZ;

  const floor = addBox(THREE, group, halfX * 2, 0.06, halfZ * 2, cx, floorY, cz, kit.teakFloor);
  floor.receiveShadow = true;
  addBox(THREE, group, 2.2, 0.02, 2.05, cx - 0.05, floorY + 0.04, cz - 0.05, kit.rug);

  addBox(THREE, group, 0.1, wallH, halfZ * 2, cx - halfX, floorY + wallH / 2, cz, kit.plaster);
  addBox(THREE, group, 0.1, wallH, halfZ * 2, cx + halfX, floorY + wallH / 2, cz, kit.plaster);
  addBox(THREE, group, 1.75, wallH, 0.1, cx - 1.55, floorY + wallH / 2, backZ, kit.plaster);
  addBox(THREE, group, 1.75, wallH, 0.1, cx + 1.55, floorY + wallH / 2, backZ, kit.plaster);
  const trimMat = kit.timber.clone();
  kit.materials.push(trimMat);
  const trim = addBox(THREE, group, 1.25, 0.42, 0.1, cx, floorY + wallH - 0.21, backZ, trimMat);
  addBox(THREE, group, halfX * 2 + 0.1, 0.14, 0.12, cx, floorY + wallH - 0.02, frontZ, kit.timber);
  addBox(THREE, group, 1.65, 1.85, 0.04, cx - 1.55, floorY + 0.98, frontZ, kit.glass);
  addBox(THREE, group, 1.65, 1.85, 0.04, cx + 1.55, floorY + 0.98, frontZ, kit.glass);
  addBox(THREE, group, 0.08, 1.7, 0.04, cx - 0.78, floorY + 1.05, frontZ - 0.08, kit.sheer);
  addBox(THREE, group, 0.08, 1.7, 0.04, cx + 0.78, floorY + 1.05, frontZ - 0.08, kit.sheer);

  addBox(THREE, group, 1.9, 0.9, 0.08, cx - 0.05, floorY + 0.72, cz - 0.95, kit.timber);
  addBox(THREE, group, 1.85, 0.28, 1.65, cx - 0.05, floorY + 0.28, cz + 0.05, kit.linen);
  addBox(THREE, group, 1.8, 0.1, 1.15, cx - 0.05, floorY + 0.46, cz + 0.22, kit.duvet);
  addBox(THREE, group, 0.42, 0.16, 0.28, cx - 0.48, floorY + 0.52, cz - 0.62, kit.white);
  addBox(THREE, group, 0.42, 0.16, 0.28, cx + 0.38, floorY + 0.52, cz - 0.62, kit.white);
  addBox(THREE, group, 0.55, 0.1, 0.2, cx - 0.05, floorY + 0.5, cz - 0.55, kit.aqua);
  addBox(THREE, group, 0.42, 0.4, 0.42, cx - 1.15, floorY + 0.28, cz - 0.72, kit.timber);
  addBox(THREE, group, 0.42, 0.4, 0.42, cx + 1.05, floorY + 0.28, cz - 0.72, kit.timber);
  addBox(THREE, group, 0.1, 0.1, 0.1, cx - 1.15, floorY + 0.56, cz - 0.72, kit.lamp);
  addBox(THREE, group, 0.1, 0.1, 0.1, cx + 1.05, floorY + 0.56, cz - 0.72, kit.lamp);
  addBox(THREE, group, 0.62, 0.4, 0.08, cx + 1.15, floorY + 1.15, cz - 0.15, kit.screen);

  const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.48, 18), kit.white);
  tub.position.set(cx + 1.55, floorY + 0.28, cz + 0.55);
  group.add(tub);
  const bath = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), kit.water);
  bath.position.set(cx + 1.55, floorY + 0.42, cz + 0.55);
  group.add(bath);
  addBox(THREE, group, 1.15, 1.7, 0.04, cx + 1.15, floorY + 1.0, cz - 0.85, kit.glass);
  addBox(THREE, group, 0.08, 0.08, 0.08, cx + 1.85, floorY + 1.85, cz - 1.05, kit.metal);
  addBox(THREE, group, 0.7, 0.62, 0.4, cx - 1.55, floorY + 0.4, backZ + 0.35, kit.timber);

  addBox(THREE, group, 1.55, 0.16, 0.7, -1.35, 2.61, 1.9, kit.linen);
  addBox(THREE, group, 0.55, 0.08, 1.1, 1.5, 2.57, 1.95, kit.teakFloor);
  addBox(THREE, group, 0.55, 0.08, 1.1, 0.6, 2.57, 1.95, kit.teakFloor);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.28, 8), kit.cream);
  shade.position.set(-1.35, 3.35, 2.15);
  group.add(shade);
  addBox(THREE, group, 0.06, 0.7, 0.06, -1.35, 2.95, 2.15, kit.timber);

  addFan(THREE, group, cx, floorY + wallH - 0.18, cz, kit, fans);

  return {
    eye: new THREE.Vector3(cx - 1.05, floorY + 1.45, -0.2),
    look: new THREE.Vector3(-0.6, floorY + 1.2, 5.2),
    stand: new THREE.Vector3(1.45, floorY, 0.35),
    floorY,
    trim,
  };
}

function chair(THREE: ThreeNS, parent: Object3D, x: number, y: number, z: number, yaw: number, kit: RoomKit) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  addBox(THREE, g, 0.42, 0.08, 0.42, 0, 0.48, 0, kit.timber);
  addBox(THREE, g, 0.42, 0.4, 0.06, 0, 0.75, 0.18, kit.linen);
  parent.add(g);
}

function table(THREE: ThreeNS, parent: Object3D, x: number, y: number, z: number, seats: number, kit: RoomKit) {
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 14), kit.timber);
  top.position.set(x, y + 0.74, z);
  parent.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 8), kit.timber);
  leg.position.set(x, y + 0.36, z);
  parent.add(leg);
  const candle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), kit.lamp);
  candle.position.set(x, y + 0.84, z);
  parent.add(candle);
  for (let i = 0; i < seats; i++) {
    const a = (i / seats) * Math.PI * 2;
    chair(THREE, parent, x + Math.cos(a) * 1.05, y, z + Math.sin(a) * 1.05, a + Math.PI, kit);
  }
}

function barCounter(THREE: ThreeNS, parent: Object3D, x: number, y: number, z: number, kit: RoomKit, warm: boolean) {
  addBox(THREE, parent, 2.6, 0.95, 0.62, x, y + 0.5, z, warm ? kit.timber : kit.cream);
  addBox(THREE, parent, 2.5, 0.06, 0.5, x, y + 1.0, z, warm ? kit.coal : kit.stone);
  for (let i = -1; i <= 1; i++) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10), kit.linen);
    stool.position.set(x + i * 0.7, y + 0.72, z + 0.7);
    parent.add(stool);
  }
}

export function buildPavilion(
  THREE: ThreeNS,
  parent: Object3D,
  spec: { id: string; x: number; z: number; radius: number; height: number; accent: number; kind: RoomKind },
  kit: RoomKit,
  fans: Object3D[],
): PavilionBuilt {
  const { id, x, z, radius, height, kind } = spec;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const floorY = 0.46;
  const deck = new THREE.Mesh(new THREE.CircleGeometry(radius, 22), kind === "quiet" ? kit.stone : kit.teakFloor);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = floorY;
  deck.receiveShadow = true;
  g.add(deck);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, height - 0.3, 6), kit.timber);
    post.position.set(Math.cos(a) * (radius - 0.25), height / 2, Math.sin(a) * (radius - 0.25));
    post.castShadow = true;
    g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, 0.16, 20), kit.cream);
  roof.position.y = height;
  g.add(roof);
  const bandMat = new THREE.MeshStandardMaterial({ color: spec.accent, roughness: 0.58 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.08, radius * 1.08, 0.1, 20), bandMat);
  band.position.y = height - 0.16;
  g.add(band);
  kit.materials.push(bandMat);

  if (kind === "dining") {
    if (id === "capers") {
      table(THREE, g, -radius * 0.48, floorY, radius * 0.2, 2, kit);
      table(THREE, g, radius * 0.48, floorY, -radius * 0.15, 2, kit);
    } else {
      table(THREE, g, 0, floorY, 0.2, radius > 5.5 ? 4 : 3, kit);
      if (radius > 5) table(THREE, g, -radius * 0.42, floorY, -radius * 0.28, 2, kit);
    }
    if (id === "jade") addBox(THREE, g, 2.4, 0.85, 0.6, 0, floorY + 0.45, -radius * 0.48, kit.cream);
  } else if (kind === "bar") {
    const west = id === "haali";
    barCounter(THREE, g, west ? -radius * 0.2 : radius * 0.15, floorY, 0, kit, false);
  } else if (kind === "cafe") {
    barCounter(THREE, g, 0, floorY, -radius * 0.2, kit, false);
    table(THREE, g, radius * 0.35, floorY, radius * 0.25, 2, kit);
  } else if (kind === "lobby") {
    addBox(THREE, g, 2.3, 0.95, 0.7, 0, floorY + 0.5, -0.3, kit.cream);
    addBox(THREE, g, 0.12, 0.12, 0.12, 0.4, floorY + 1.05, -0.3, kit.lamp);
    chair(THREE, g, -0.7, floorY, 0.9, 0, kit);
    chair(THREE, g, 0.7, floorY, 0.9, 0, kit);
  } else if (kind === "welcome") {
    addBox(THREE, g, 1.8, 0.4, 0.5, 0, floorY + 0.28, 0.2, kit.linen);
    addBox(THREE, g, 0.4, 0.08, 0.28, 0.9, floorY + 0.7, -0.4, kit.timber);
  } else if (kind === "spa") {
    addBox(THREE, g, 0.75, 0.4, 1.9, -0.3, floorY + 0.32, 0, kit.linen);
    addBox(THREE, g, 0.4, 0.08, 0.28, -0.3, floorY + 0.56, -0.7, kit.white);
    const plunge = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.28, 18), kit.water);
    plunge.position.set(radius * 0.38, floorY + 0.12, 0.15);
    g.add(plunge);
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), kit.leaf);
    plant.position.set(-radius * 0.45, floorY + 0.4, -radius * 0.35);
    g.add(plant);
    addFan(THREE, g, 0, height - 0.35, 0, kit, fans);
  } else if (kind === "dive") {
    addBox(THREE, g, 1.4, 0.42, 0.45, -0.4, floorY + 0.28, 0, kit.timber);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 10), kit.metal);
    tank.position.set(0.7, floorY + 0.4, -0.2);
    g.add(tank);
    addBox(THREE, g, 0.5, 0.08, 0.22, 0.55, floorY + 0.52, 0.35, kit.aqua);
  } else if (kind === "play") {
    addBox(THREE, g, 0.45, 0.45, 0.45, -0.4, floorY + 0.28, 0.1, kit.aqua);
    addBox(THREE, g, 0.35, 0.35, 0.35, 0.35, floorY + 0.22, -0.2, kit.duvet);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), kit.lamp);
    ball.position.set(0.1, floorY + 0.22, 0.45);
    g.add(ball);
  } else if (kind === "grill") {
    barCounter(THREE, g, 0, floorY, -0.2, kit, true);
  } else {
    addBox(THREE, g, 0.7, 0.12, 0.28, radius * 0.72, 0.2, 0, kit.timber);
  }

  if (kind === "dining" || kind === "bar" || kind === "cafe") {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), kit.lamp);
      bulb.position.set(Math.cos(a) * (radius * 0.75), height - 0.38, Math.sin(a) * (radius * 0.75));
      g.add(bulb);
    }
  }

  parent.add(g);
  const eye = new THREE.Vector3(x, floorY + 1.62, z + Math.min(radius * 0.62, 3.2));
  const look = new THREE.Vector3(x, floorY + 1.45, z - Math.min(radius * 0.9, 6));
  const stand = new THREE.Vector3(x + 1.15, floorY, z - Math.min(radius * 0.55, 2.6));
  if (id === "haali") {
    eye.set(x + 0.4, floorY + 1.6, z);
    look.set(x - 16, floorY + 1.5, z);
  }
  return { highlight: band, eye, look, stand, floorY };
}
