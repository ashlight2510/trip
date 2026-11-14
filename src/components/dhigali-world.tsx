"use client";

import { useEffect, useRef } from "react";
import type { Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, Points, PointsMaterial, SpriteMaterial, Vector3 } from "three";
import { DHIGALI_COAST } from "@/lib/dhigali-coast";
import { LAGOON_TRACK } from "@/lib/dhigali-coaster";
import { DHIGALI_FEATURES } from "@/lib/dhigali-collected";
import { DHIGALI_CENTER, GEO_SPOTS, toLocal } from "@/lib/dhigali-geo";

type Person = { id: string; lat: number; lng: number; color: string };

export function DhigaliWorld({
  lat,
  lng,
  heading,
  minutes,
  nearId,
  people,
  fireworks,
  underwater,
  swimsuit,
  busLat,
  busLng,
  busHeading,
  guestName,
  shirt,
  mode,
  lift,
  onCoaster,
  onLanded,
}: {
  lat: number;
  lng: number;
  heading: number;
  minutes: number;
  nearId: string | null;
  people: Person[];
  fireworks: boolean;
  underwater: boolean;
  swimsuit: boolean;
  busLat: number;
  busLng: number;
  busHeading: number;
  guestName: string;
  shirt: number;
  mode: "orbit" | "drop" | "play";
  lift: number;
  onCoaster: boolean;
  onLanded: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;
  const live = useRef({ lat, lng, heading, minutes, nearId, people, fireworks, underwater, swimsuit, busLat, busLng, busHeading, guestName, shirt, mode, lift, onCoaster });
  live.current = { lat, lng, heading, minutes, nearId, people, fireworks, underwater, swimsuit, busLat, busLng, busHeading, guestName, shirt, mode, lift, onCoaster };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let frame = 0;
    const cleanups: (() => void)[] = [];

    void import("three").then((THREE) => {
      if (dead || !hostRef.current) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.16;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(52, host.clientWidth / Math.max(1, host.clientHeight), 0.4, 4000);
      scene.add(new THREE.AmbientLight(0xfff4e8, 0.36));
      scene.add(new THREE.HemisphereLight(0x9fd4ff, 0xe7c48a, 0.72));
      const sun = new THREE.DirectionalLight(0xfff2d8, 1.35);
      sun.position.set(-80, 120, 40);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 180;
      sun.shadow.camera.left = -28;
      sun.shadow.camera.right = 28;
      sun.shadow.camera.top = 28;
      sun.shadow.camera.bottom = -28;
      scene.add(sun, sun.target);
      const sunDisk = new THREE.Mesh(
        new THREE.SphereGeometry(14, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0xfff1c9 }),
      );
      scene.add(sunDisk);
      const skyDay = new THREE.Color(0x4da3ef);
      const skyRise = new THREE.Color(0xf3b183);
      const skySet = new THREE.Color(0xe07a4c);
      const skyNight = new THREE.Color(0x07141c);
      const skyMix = new THREE.Color();
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(0x2f7ec8) },
          uHorizon: { value: new THREE.Color(0xd7e7f5) },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y*0.55+0.45, 0.0, 1.0); gl_FragColor = vec4(mix(uHorizon, uTop, pow(h, 0.7)), 1.0); }`,
      });
      const skyDome = new THREE.Mesh(new THREE.SphereGeometry(2400, 28, 18), skyMat);
      scene.add(skyDome);
      const uSkyTop = skyMat.uniforms.uTop!.value as Color;
      const uSkyHorizon = skyMat.uniforms.uHorizon!.value as Color;

      const waterMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uShallow: { value: new THREE.Color(0x7eefe4) },
          uDeep: { value: new THREE.Color(0x1a9eb8) },
        },
        vertexShader: `
          uniform float uTime;
          varying float vWave;
          void main() {
            vec3 p = position;
            float w = sin(p.x * 0.045 + uTime * 0.9) * 0.55 + cos(p.y * 0.038 + uTime * 0.65) * 0.4;
            p.z += w;
            vWave = w;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uShallow;
          uniform vec3 uDeep;
          varying float vWave;
          void main() {
            float t = clamp(vWave * 0.4 + 0.18, 0.0, 1.0);
            gl_FragColor = vec4(mix(uDeep, uShallow, t), 1.0);
          }
        `,
      });
      const water = new THREE.Mesh(new THREE.CircleGeometry(4200, 96), waterMat);
      water.rotation.x = -Math.PI / 2;
      scene.add(water);
      const fog = new THREE.Fog(0x8ecae6, 40, 520);
      scene.fog = fog;
      const uShallow = waterMat.uniforms.uShallow!.value as Color;
      const uDeep = waterMat.uniforms.uDeep!.value as Color;

      const shape = new THREE.Shape();
      DHIGALI_COAST.forEach(([la, ln], i) => {
        const p = toLocal(la, ln);
        if (i === 0) shape.moveTo(p.x, p.z);
        else shape.lineTo(p.x, p.z);
      });
      const sand = new THREE.MeshStandardMaterial({ color: 0xf6e2b4, roughness: 0.92 });
      const island = new THREE.Mesh(new THREE.ShapeGeometry(shape), sand);
      island.rotation.x = -Math.PI / 2;
      island.position.y = 0.35;
      island.receiveShadow = true;
      scene.add(island);

      const greens = [0x1f6b3a, 0x2f8f4e, 0x3d6b45, 0x145c32, 0x4caf6a];
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
      const plantPalm = (x: number, z: number, scale: number) => {
        const h = 4.2 * scale;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.2 * scale, h, 7), trunkMat);
        trunk.position.set(x, h / 2 + 0.4, -z);
        trunk.castShadow = true;
        const crownMat = new THREE.MeshStandardMaterial({
          color: greens[Math.floor(Math.random() * greens.length)]!,
          roughness: 0.75,
        });
        const crown = new THREE.Group();
        for (let f = 0; f < 6; f++) {
          const frond = new THREE.Mesh(new THREE.ConeGeometry(0.28 * scale, 2.2 * scale, 5), crownMat);
          frond.position.y = 0.35 * scale;
          frond.rotation.z = 0.9;
          frond.rotation.y = (f / 6) * Math.PI * 2;
          crown.add(frond);
        }
        crown.position.set(x, h + 0.2, -z);
        const bush = new THREE.Mesh(
          new THREE.SphereGeometry(0.85 * scale, 8, 6),
          new THREE.MeshStandardMaterial({ color: greens[(greens.length + 2) % greens.length]!, roughness: 1 }),
        );
        bush.position.set(x + 0.9 * scale, 0.7, -z + 0.4);
        scene.add(trunk, crown, bush);
      };
      const cream = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.62 });
      const timber = new THREE.MeshStandardMaterial({ color: 0xe2c48a, roughness: 0.72 });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xc5eef2,
        roughness: 0.08,
        metalness: 0.15,
        transparent: true,
        opacity: 0.55,
      });
      const poolMat = new THREE.MeshStandardMaterial({ color: 0x2fbfc8, roughness: 0.18, metalness: 0.05 });
      const slatMat = new THREE.MeshStandardMaterial({ color: 0xd2b07a, roughness: 0.8 });
      const railMat = new THREE.MeshStandardMaterial({ color: 0xe4e8ee, metalness: 0.55, roughness: 0.28 });
      const overwaterVilla = (x: number, z: number) => {
        const g = new THREE.Group();
        g.position.set(x, 0, -z);
        for (const [px, pz] of [
          [-2.4, -1.5],
          [2.4, -1.5],
          [-2.4, 1.5],
          [2.4, 1.5],
        ] as [number, number][]) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 2.5, 8), cream);
          pillar.position.set(px, 1.25, pz);
          g.add(pillar);
        }
        const deck = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.16, 5), timber);
        deck.position.y = 2.45;
        g.add(deck);
        const house = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.15, 3.5), cream);
        house.position.set(0.3, 3.6, -0.35);
        house.castShadow = true;
        g.add(house);
        const slab = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 4.3), cream);
        slab.position.set(0.3, 4.75, -0.35);
        g.add(slab);
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.85, 0.05), glassMat);
        door.position.set(0.15, 3.45, 1.42);
        g.add(door);
        const curtain = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 1.7, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xf3e6cf, roughness: 0.9 }),
        );
        curtain.position.set(1.15, 3.45, 1.46);
        g.add(curtain);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.55, 2.3), cream);
        rim.position.set(-1.1, 1.85, 3.35);
        g.add(rim);
        const pool = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.1, 1.65), poolMat);
        pool.position.set(-1.1, 2.12, 3.35);
        g.add(pool);
        for (let i = 0; i < 7; i++) {
          const slat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.55, 0.32), slatMat);
          slat.position.set(-3.15, 3.35, -1.35 + i * 0.36);
          g.add(slat);
        }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.05, 0.05), railMat);
        rail.position.set(0.5, 3.15, 2.35);
        g.add(rail);
        for (let i = 0; i < 5; i++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.26), timber);
          step.position.set(2.7, 2.15 - i * 0.38, 2.55 + i * 0.26);
          g.add(step);
        }
        scene.add(g);
      };

      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfff1c2,
        emissive: 0xffb347,
        emissiveIntensity: 2.4,
        roughness: 0.35,
      });
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.55 });
      const haloMat = new THREE.SpriteMaterial({ color: 0xffd27a, transparent: true, opacity: 0.5, depthWrite: false });
      let lamps = 0;
      const placeLamp = (x: number, z: number) => {
        if (lamps >= 40) return;
        lamps += 1;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 2.5, 6), poleMat);
        pole.position.set(x, 1.65, z);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), bulbMat);
        bulb.position.set(x, 2.95, z);
        const halo = new THREE.Sprite(haloMat);
        halo.position.set(x, 2.95, z);
        halo.scale.set(1.8, 1.8, 1);
        scene.add(pole, bulb, halo);
      };
      const flowerColors = [0xf08a9a, 0xf7f4ee, 0xf0d27a, 0xc9a6e8];
      let flowers = 0;
      const placeFlower = (x: number, z: number) => {
        if (flowers >= 52) return;
        flowers += 1;
        const bloom = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 7, 6),
          new THREE.MeshStandardMaterial({ color: flowerColors[flowers % flowerColors.length]!, roughness: 0.65 }),
        );
        bloom.position.set(x, 0.55, z);
        scene.add(bloom);
      };
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xfff7ef, roughness: 1 });
      const clouds = new THREE.Group();
      for (let i = 0; i < 12; i++) {
        const puff = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const ball = new THREE.Mesh(new THREE.SphereGeometry(7 + k * 2.4, 8, 6), cloudMat);
          ball.position.set(k * 8, k === 1 ? 2.2 : 0, (k - 1) * 3);
          puff.add(ball);
        }
        const ang = (i / 12) * Math.PI * 2;
        puff.position.set(Math.cos(ang) * (190 + (i % 3) * 36), 52 + (i % 4) * 7, Math.sin(ang) * (130 + (i % 3) * 28));
        clouds.add(puff);
      }
      scene.add(clouds);

      for (const feature of DHIGALI_FEATURES) {
        const pts = feature.points.map(([la, ln]) => {
          const p = toLocal(la, ln);
          return new THREE.Vector3(p.x, feature.kind === "wood" ? 0.5 : 0.55, -p.z);
        });
        if (pts.length < 2) continue;
        if (feature.kind === "wood") {
          const ring = feature.points.map(([la, ln]) => toLocal(la, ln));
          const wood = new THREE.Shape();
          ring.forEach((p, i) => (i === 0 ? wood.moveTo(p.x, p.z) : wood.lineTo(p.x, p.z)));
          const mesh = new THREE.Mesh(
            new THREE.ShapeGeometry(wood),
            new THREE.MeshStandardMaterial({ color: 0x3aaa4c, roughness: 0.9 }),
          );
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.y = 0.42;
          scene.add(mesh);
          let minX = Infinity;
          let maxX = -Infinity;
          let minZ = Infinity;
          let maxZ = -Infinity;
          for (const p of ring) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minZ = Math.min(minZ, p.z);
            maxZ = Math.max(maxZ, p.z);
          }
          const inside = (x: number, z: number) => {
            let hit = false;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
              const a = ring[i]!;
              const b = ring[j]!;
              const cross = a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x;
              if (cross) hit = !hit;
            }
            return hit;
          };
          let planted = 0;
          for (let n = 0; n < 700 && planted < 90; n++) {
            const x = minX + Math.random() * (maxX - minX);
            const z = minZ + Math.random() * (maxZ - minZ);
            if (!inside(x, z)) continue;
            plantPalm(x, z, 0.75 + Math.random() * 0.7);
            planted++;
          }
        } else {
          const deckColor = feature.kind === "pier" ? 0xd8c7a2 : feature.kind === "service" ? 0xc4a574 : 0xe7e1d6;
          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i]!;
            const b = pts[i + 1]!;
            const len = a.distanceTo(b);
            if (len < 0.4) continue;
            const ribbon = new THREE.Mesh(
              new THREE.BoxGeometry(len, 0.08, feature.kind === "pier" ? 1.6 : 1.15),
              new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.8 }),
            );
            ribbon.position.set((a.x + b.x) / 2, a.y, (a.z + b.z) / 2);
            ribbon.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
            scene.add(ribbon);
            if ((feature.kind === "service" || feature.kind === "footway") && i % 3 === 0) {
              const dx = b.x - a.x;
              const dz = b.z - a.z;
              const span = Math.hypot(dx, dz) || 1;
              const side = i % 2 === 0 ? 1.5 : -1.5;
              placeLamp((a.x + b.x) / 2 + (-dz / span) * side, (a.z + b.z) / 2 + (dx / span) * side);
            }
            if (feature.kind === "footway" && i % 2 === 0) {
              placeFlower((a.x + b.x) / 2 + 1.2, (a.z + b.z) / 2 + 0.4);
            }
          }
          if (feature.kind === "pier" && feature.points.length >= 8) {
            let walked = 0;
            let prev = toLocal(feature.points[0]![0], feature.points[0]![1]);
            for (let i = 1; i < feature.points.length; i++) {
              const cur = toLocal(feature.points[i]![0], feature.points[i]![1]);
              walked += Math.hypot(cur.x - prev.x, cur.z - prev.z);
              if (walked > 22) {
                walked = 0;
                overwaterVilla(cur.x, cur.z);
              }
              prev = cur;
            }
          }
        }
      }

      const spotLook: Record<string, { wall: number; roof: number; r: number; h: number }> = {
        arrival: { wall: 0xf7f1e4, roof: 0xc4784a, r: 5, h: 3.2 },
        lobby: { wall: 0xfffaf3, roof: 0x8d6b4a, r: 6, h: 4 },
        jade: { wall: 0xd7efe4, roof: 0x2f6b4f, r: 6.5, h: 3.6 },
        capers: { wall: 0xf3e2c8, roof: 0xb85c38, r: 7, h: 4.2 },
        cafe: { wall: 0xf6d7b0, roof: 0xd4a017, r: 4.2, h: 3 },
        haali: { wall: 0xe7c2a0, roof: 0x6b3a2a, r: 5.5, h: 3.4 },
        east: { wall: 0xf0d0c0, roof: 0x9a4e3a, r: 4.5, h: 3.2 },
        spa: { wall: 0xd5ebe0, roof: 0x3d6b4f, r: 5, h: 3 },
        dive: { wall: 0xd5e4ef, roof: 0x1b4965, r: 4.4, h: 3 },
        mosque: { wall: 0xf7f7f2, roof: 0x1f7a6b, r: 3.6, h: 4.5 },
        play: { wall: 0xf8d0cf, roof: 0xc45c6a, r: 4, h: 2.8 },
        battuta: { wall: 0xf4efe6, roof: 0x8a5a3a, r: 6, h: 3.8 },
        faru: { wall: 0xf0e0cc, roof: 0xa85c38, r: 5, h: 3.2 },
      };
      const buildings = new Map<string, Mesh>();
      for (const spot of GEO_SPOTS) {
        const look = spotLook[spot.id];
        if (!look) continue;
        const p = toLocal(spot.lat, spot.lng);
        const wall = new THREE.Mesh(
          new THREE.CylinderGeometry(look.r * 0.85, look.r, look.h, 14),
          new THREE.MeshStandardMaterial({ color: look.wall, roughness: 0.75 }),
        );
        wall.position.y = look.h / 2 + 0.4;
        wall.castShadow = true;
        wall.receiveShadow = true;
        const roof = new THREE.Mesh(
          new THREE.CylinderGeometry(look.r * 1.08, look.r * 1.08, 0.22, 16),
          new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.55 }),
        );
        roof.position.y = look.h + 0.55;
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(look.r * 1.1, look.r * 1.1, 0.12, 16),
          new THREE.MeshStandardMaterial({ color: look.roof, roughness: 0.6 }),
        );
        band.position.y = look.h + 0.28;
        const group = new THREE.Group();
        group.add(wall, roof, band);
        group.position.set(p.x, 0, -p.z);
        scene.add(group);
        buildings.set(spot.id, wall);
      }

      DHIGALI_COAST.forEach(([la, ln], i) => {
        if (i % 5 !== 0) return;
        const p = toLocal(la, ln);
        const toward = toLocal(DHIGALI_CENTER.lat, DHIGALI_CENTER.lng);
        plantPalm(p.x + (toward.x - p.x) * 0.06, p.z + (toward.z - p.z) * 0.06, 0.85 + (i % 3) * 0.15);
      });

      function makeWalker(color: number) {
        const g = new THREE.Group();
        const cloth = new THREE.MeshStandardMaterial({ color });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c7a5 });
        const suitMat = new THREE.MeshStandardMaterial({ color: 0x1b6f8a });
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.28, 4, 8), cloth);
        torso.position.y = 1.12;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skinMat);
        head.position.y = 1.72;
        const shorts = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.08, 4, 8), suitMat);
        shorts.position.y = 0.96;
        shorts.visible = false;
        const limb = (x: number, y: number, tall: number) => {
          const pivot = new THREE.Group();
          pivot.position.set(x, y, 0);
          const part = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, tall * 0.62, 3, 6), cloth);
          part.position.y = -tall / 2;
          pivot.add(part);
          g.add(pivot);
          return { pivot, part };
        };
        const armL = limb(-0.32, 1.38, 0.52);
        const armR = limb(0.32, 1.38, 0.52);
        const legL = limb(-0.12, 0.88, 0.72);
        const legR = limb(0.12, 0.88, 0.72);
        g.add(torso, head, shorts);
        return {
          g,
          armL: armL.pivot,
          armR: armR.pivot,
          legL: legL.pivot,
          legR: legR.pivot,
          torso,
          shorts,
          cloth,
          skinMat,
          limbs: [armL.part, armR.part, legL.part, legR.part],
          phase: 0,
        };
      }
      const swing = (walker: ReturnType<typeof makeWalker>, stride: number) => {
        if (stride > 0.015) walker.phase += Math.min(0.55, stride * 1.6);
        const s = stride > 0.015 ? Math.sin(walker.phase) * 0.85 : 0;
        walker.legL.rotation.x = s;
        walker.legR.rotation.x = -s;
        walker.armL.rotation.x = -s * 0.55;
        walker.armR.rotation.x = s * 0.55;
      };

      const you = makeWalker(0xf4f7fb);
      scene.add(you.g);
      const nameCanvas = document.createElement("canvas");
      nameCanvas.width = 512;
      nameCanvas.height = 128;
      const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
      nameSprite.scale.set(2.2, 0.55, 1);
      nameSprite.position.set(0, 2.55, 0);
      you.g.add(nameSprite);
      let painted = "";
      const paintName = (text: string) => {
        const ctx2 = nameCanvas.getContext("2d");
        if (!ctx2) return;
        ctx2.clearRect(0, 0, 512, 128);
        ctx2.fillStyle = "rgba(255,248,220,0.94)";
        const x = 36;
        const y = 28;
        const w = 440;
        const h = 72;
        const r = 28;
        ctx2.beginPath();
        ctx2.moveTo(x + r, y);
        ctx2.arcTo(x + w, y, x + w, y + h, r);
        ctx2.arcTo(x + w, y + h, x, y + h, r);
        ctx2.arcTo(x, y + h, x, y, r);
        ctx2.arcTo(x, y, x + w, y, r);
        ctx2.closePath();
        ctx2.fill();
        ctx2.fillStyle = "#3d2a16";
        ctx2.font = "600 40px sans-serif";
        ctx2.textAlign = "center";
        ctx2.textBaseline = "middle";
        ctx2.fillText(text.slice(0, 16), 256, 64);
        const tex = new THREE.CanvasTexture(nameCanvas);
        const mat = nameSprite.material as SpriteMaterial;
        mat.map?.dispose();
        mat.map = tex;
        mat.needsUpdate = true;
      };
      const chute = new THREE.Group();
      const goreColors = [0xf7f1e4, 0xf08a7a, 0xf7f1e4, 0x7ec8c3];
      for (let i = 0; i < 8; i++) {
        const gore = new THREE.Mesh(
          new THREE.SphereGeometry(2.5, 8, 8, (i * Math.PI) / 4, Math.PI / 4, 0, Math.PI / 2.2),
          new THREE.MeshStandardMaterial({
            color: goreColors[i % goreColors.length]!,
            side: THREE.DoubleSide,
            roughness: 0.62,
          }),
        );
        chute.add(gore);
      }
      chute.position.y = 3.2;
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0xf7f4ee });
      for (const [x, z] of [
        [-0.7, -0.7],
        [0.7, -0.7],
        [-0.7, 0.7],
        [0.7, 0.7],
      ] as [number, number][]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.7, 4), ropeMat);
        rope.position.set(x, -0.75, z);
        chute.add(rope);
      }
      chute.visible = false;
      you.g.add(chute);

      const trackMat = new THREE.MeshStandardMaterial({ color: 0xf7f1e6, roughness: 0.4, metalness: 0.2 });
      const stiltMat = new THREE.MeshStandardMaterial({ color: 0x1d5f78, roughness: 0.65 });
      const railPts = LAGOON_TRACK.map((sample) => {
        const p = toLocal(sample.lat, sample.lng);
        return new THREE.Vector3(p.x, sample.lift, -p.z);
      });
      for (let i = 0; i < railPts.length; i++) {
        const a = railPts[i];
        const b = railPts[(i + 1) % railPts.length];
        if (!a || !b) continue;
        const len = a.distanceTo(b);
        if (len < 0.2) continue;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.62), trackMat);
        beam.position.copy(a).add(b).multiplyScalar(0.5);
        scene.add(beam);
        beam.lookAt(b);
        beam.rotateY(Math.PI / 2);
        if (i % 2 === 0 && a.y > 0.8) {
          const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, a.y, 6), stiltMat);
          stilt.position.set(a.x, a.y / 2, a.z);
          scene.add(stilt);
        }
      }
      const dock = railPts[0];
      if (dock) {
        const platform = new THREE.Mesh(
          new THREE.BoxGeometry(6.2, 0.16, 3.4),
          new THREE.MeshStandardMaterial({ color: 0xe7c48a, roughness: 0.72 }),
        );
        platform.position.set(dock.x, dock.y, dock.z);
        scene.add(platform);
      }
      const car = new THREE.Group();
      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.62, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.45 }),
      );
      shell.position.y = 0.72;
      shell.castShadow = true;
      const carStripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.38, 0.14, 2.22),
        new THREE.MeshStandardMaterial({ color: 0xf08a7a, roughness: 0.5 }),
      );
      carStripe.position.y = 0.88;
      const safety = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.06, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x242424 }),
      );
      safety.position.set(0, 1.16, -0.1);
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.42, 6),
        new THREE.MeshStandardMaterial({ color: 0xf08a7a }),
      );
      nose.rotation.x = -Math.PI / 2;
      nose.position.set(0, 0.9, -1.2);
      car.add(shell, carStripe, safety, nose);
      for (const wx of [-0.55, 0.55]) {
        for (const wz of [-0.7, 0.7]) {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.22, 0.16, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222 }),
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0.28, wz);
          car.add(wheel);
        }
      }
      if (dock) car.position.set(dock.x, dock.y + 0.15, dock.z);
      scene.add(car);

      const bus = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 1.7, 1.9),
        new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.55 }),
      );
      body.position.y = 1.55;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(4.62, 0.28, 1.92),
        new THREE.MeshStandardMaterial({ color: 0x1b6f8a }),
      );
      stripe.position.y = 1.35;
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.55, 1.7),
        new THREE.MeshStandardMaterial({ color: 0xb9e4ea, transparent: true, opacity: 0.55, roughness: 0.1 }),
      );
      glass.position.y = 2.05;
      bus.add(body, stripe, glass);
      for (const wx of [-1.4, 1.4]) {
        for (const wz of [-0.7, 0.7]) {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10),
            new THREE.MeshStandardMaterial({ color: 0x222222 }),
          );
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 0.32, wz);
          bus.add(wheel);
        }
      }
      scene.add(bus);
      const stageAt = (spotId: string, east: number, north: number, color: number) => {
        const spot = GEO_SPOTS.find((item) => item.id === spotId);
        if (!spot) return null;
        const at = toLocal(spot.lat, spot.lng);
        const performer = makeWalker(color);
        performer.g.position.set(at.x + east, 0, -at.z - north);
        scene.add(performer.g);
        return performer;
      };
      const duo = [stageAt("capers", -1.3, 0.2, 0xc45c4c), stageAt("capers", 1.3, 0.2, 0xe7b8a0)];
      const trumpet = stageAt("capers", 0, -1.4, 0xf0c27a);
      if (trumpet) {
        const bell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.09, 0.42, 8),
          new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.6, roughness: 0.35 }),
        );
        bell.rotation.z = Math.PI / 2;
        bell.position.set(0.28, 1.25, 0.15);
        trumpet.g.add(bell);
      }
      const sax = stageAt("haali", 0.9, 0, 0x1b4965);
      const fish = new THREE.Group();
      for (let i = 0; i < 14; i++) {
        const body = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 0.7, 6),
          new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffd166 : 0x7bdff2 }),
        );
        body.rotation.z = Math.PI / 2;
        body.position.set((i % 5) * 1.4, -1.2 - (i % 3) * 0.4, i * 0.8);
        fish.add(body);
      }
      scene.add(fish);

      type Spark = { points: Points; life: number; vel: Vector3[] };
      const sparks: Spark[] = [];
      let nextBurst = 0;
      const launch = (origin: Vector3) => {
        const count = 28;
        const positions = new Float32Array(count * 3);
        const vel: Vector3[] = [];
        for (let i = 0; i < count; i++) {
          const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6 + 0.4, Math.random() - 0.5).normalize();
          const speed = 8 + Math.random() * 10;
          vel.push(dir.multiplyScalar(speed));
          positions[i * 3] = origin.x;
          positions[i * 3 + 1] = origin.y;
          positions[i * 3 + 2] = origin.z;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const hue = Math.random();
        const points = new THREE.Points(
          geo,
          new THREE.PointsMaterial({ color: new THREE.Color().setHSL(hue, 0.85, 0.62), size: 0.55, transparent: true }),
        );
        scene.add(points);
        sparks.push({ points, life: 1.6, vel });
      };

      const npcs = new Map<string, ReturnType<typeof makeWalker>>();
      const lastNpc = new Map<string, Vector3>();
      let orbit = 0.35;
      const onDown = (e: PointerEvent) => {
        const startX = e.clientX;
        const start = orbit;
        const move = (ev: PointerEvent) => {
          orbit = start + (ev.clientX - startX) * 0.008;
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      };
      renderer.domElement.addEventListener("pointerdown", onDown);

      let dropP = 0;
      let dropping = false;
      let told = false;
      let preview = 0.6;
      let prevLift = dock?.y ?? 0;
      let clockMs = performance.now();

      const tick = () => {
        const nowMs = performance.now();
        const dt = Math.min(0.05, (nowMs - clockMs) / 1000);
        clockMs = nowMs;
        const now = live.current;
        if (now.mode === "drop") {
          if (!dropping) {
            dropping = true;
            dropP = 0;
            told = false;
          }
          dropP = Math.min(1, dropP + dt / 8.2);
          if (dropP >= 1 && !told) {
            told = true;
            landedRef.current();
          }
        } else {
          dropping = false;
        }
        const here = toLocal(now.lat, now.lng);
        const stood = you.g.position.clone();
        const busAt = toLocal(now.busLat, now.busLng);
        bus.position.set(busAt.x, 0, -busAt.z);
        bus.rotation.y = -((now.busHeading * Math.PI) / 180);
        const riding = Math.hypot(here.x - busAt.x, here.z - busAt.z) < 1.2 && now.mode === "play" && !now.onCoaster;
        const airY = now.mode === "drop" ? (1 - dropP) * 82 : 0;
        you.g.visible = now.mode !== "orbit" && !now.underwater && !riding && !now.onCoaster;
        chute.visible = now.mode === "drop";
        if (now.guestName !== painted) {
          painted = now.guestName || "손님";
          paintName(painted);
        }
        you.cloth.color.set(now.shirt);
        if (now.onCoaster) {
          const pitch = Math.max(-0.45, Math.min(0.45, (prevLift - now.lift) * 0.35));
          car.position.set(here.x, now.lift + 0.15, -here.z);
          car.rotation.set(pitch, -((now.heading * Math.PI) / 180), 0);
          prevLift = now.lift;
          if (nameSprite.parent !== car) car.add(nameSprite);
          nameSprite.position.set(0, 2.2, 0);
        } else if (dock) {
          car.position.set(dock.x, dock.y + 0.15, dock.z);
          car.rotation.set(0, 0, 0);
          prevLift = dock.y;
          if (nameSprite.parent !== you.g) you.g.add(nameSprite);
          nameSprite.position.set(0, 2.55, 0);
        }
        clouds.rotation.y += dt * 0.02;
        for (const performer of [...duo, trumpet, sax]) {
          if (!performer) continue;
          performer.phase += 0.08;
          performer.armR.rotation.x = Math.sin(performer.phase) * 0.25;
        }
        you.shorts.visible = now.swimsuit;
        you.torso.material = now.swimsuit ? you.skinMat : you.cloth;
        for (const part of you.limbs) part.material = now.swimsuit ? you.skinMat : you.cloth;
        you.g.position.set(here.x, airY, -here.z);
        you.g.rotation.y = -((now.heading * Math.PI) / 180);
        swing(you, stood.distanceTo(you.g.position));
        const hour = (now.minutes / 60) % 24;
        const arc = ((hour - 6) / 12) * Math.PI;
        const elev = Math.sin(arc);
        const sunX = Math.cos(arc) * 280;
        const sunY = elev * 190;
        sunDisk.position.set(sunX, Math.max(sunY, -30), 20);
        sunDisk.visible = elev > -0.08;
        sun.position.set(sunX, Math.max(sunY, 8), 20);
        const rising = hour >= 5 && hour < 9;
        const setting = hour >= 16 && hour < 19.2;
        if (elev > 0.25) skyMix.copy(skyDay);
        else if (elev > -0.05) skyMix.copy(rising ? skyRise : skySet).lerp(skyDay, (elev + 0.05) / 0.3);
        else skyMix.copy(skyNight).lerp(rising ? skyRise : skySet, Math.max(0, (elev + 0.35) / 0.3));
        scene.background = skyMix;
        uSkyTop.copy(skyMix);
        uSkyHorizon.copy(skyMix).lerp(setting || rising ? skySet : skyDay, 0.35);
        skyDome.position.set(here.x, 0, -here.z);
        sun.target.position.set(here.x, 0, -here.z);
        sun.target.updateMatrixWorld();
        const reef = now.onCoaster && now.lift < -0.2;
        fog.color.copy(now.underwater || reef ? uDeep : skyMix);
        fog.near = now.underwater || reef ? 1 : 36;
        fog.far = now.underwater || reef ? 28 : now.mode === "orbit" ? 460 : 640;
        waterMat.uniforms.uTime!.value += 0.016;
        uShallow.set(setting || rising ? 0xf6c9a4 : 0x6af0e4);
        uDeep.set(now.underwater || reef ? 0x0a6e86 : 0x1498b8);
        sun.intensity = elev > 0 ? 0.35 + elev * 0.9 : 0.15;
        sun.color.set(setting || rising ? 0xffb067 : 0xfff4dd);
        (sunDisk.material as MeshBasicMaterial).color.set(setting || rising ? 0xffb15a : 0xfff6d4);
        for (const [id, mesh] of buildings) {
          const mat = mesh.material as MeshStandardMaterial;
          mat.emissive.set(id === now.nearId ? 0xf0c27a : 0x000000);
          mat.emissiveIntensity = id === now.nearId ? 0.45 : 0;
        }
        for (const person of now.people) {
          let walker = npcs.get(person.id);
          if (!walker) {
            walker = makeWalker(new THREE.Color(person.color).getHex());
            scene.add(walker.g);
            npcs.set(person.id, walker);
          }
          const at = toLocal(person.lat, person.lng);
          const next = new THREE.Vector3(at.x, 0, -at.z);
          const prev = lastNpc.get(person.id);
          const stride = prev ? prev.distanceTo(next) : 0;
          const moving = stride > 0.01;
          if (moving && prev) {
            walker.g.rotation.y = -Math.atan2(next.x - prev.x, -(next.z - prev.z));
          }
          walker.g.position.copy(next);
          swing(walker, stride);
          lastNpc.set(person.id, next);
        }
        const ang = (now.heading * Math.PI) / 180 + orbit;
        const bob = Math.sin(you.phase) * (stood.distanceTo(you.g.position) > 0.015 ? 0.06 : 0);
        fish.visible = now.underwater || reef;
        fish.position.set(here.x, reef ? now.lift : 0, -here.z);
        fish.rotation.y += 0.01;
        let desired: Vector3;
        let look: Vector3;
        if (now.mode === "orbit") {
          preview += dt * 0.15;
          const focus = dock ?? new THREE.Vector3(here.x, 4, -here.z);
          const dir = new THREE.Vector3(focus.x, 0, focus.z);
          if (dir.lengthSq() < 1) dir.set(1, 0, 0);
          dir.normalize();
          const side = new THREE.Vector3(-dir.z, 0, dir.x);
          desired = new THREE.Vector3(
            focus.x + dir.x * 78 + side.x * Math.sin(preview) * 28,
            38,
            focus.z + dir.z * 78 + side.z * Math.sin(preview) * 28,
          );
          desired.y = 32;
          look = new THREE.Vector3(focus.x - dir.x * 36, 7, focus.z - dir.z * 36);
        } else if (now.mode === "drop") {
          const dist = 16 + (1 - dropP) * 34;
          desired = new THREE.Vector3(
            here.x - Math.sin(ang) * dist,
            airY + 12 + (1 - dropP) * 22,
            -here.z + Math.cos(ang) * dist,
          );
          look = new THREE.Vector3(here.x, airY + 2.4, -here.z);
        } else if (now.onCoaster) {
          desired = new THREE.Vector3(here.x - Math.sin(ang) * 7.4, now.lift + 3.8, -here.z + Math.cos(ang) * 7.4);
          look = new THREE.Vector3(here.x, now.lift + 1.15, -here.z);
        } else if (now.underwater) {
          desired = new THREE.Vector3(here.x, -1.15, -here.z);
          look = new THREE.Vector3(
            here.x + Math.sin((now.heading * Math.PI) / 180) * 6,
            -1.25,
            -here.z - Math.cos((now.heading * Math.PI) / 180) * 6,
          );
        } else {
          desired = new THREE.Vector3(here.x - Math.sin(ang) * 9.2, 5.6 + bob, -here.z + Math.cos(ang) * 9.2);
          look = new THREE.Vector3(here.x, 1.15 + bob, -here.z);
        }
        if (camera.position.lengthSq() < 1) camera.position.copy(desired);
        else camera.position.lerp(desired, now.mode === "orbit" ? 0.05 : 0.12);
        camera.lookAt(look);
        if (now.fireworks) {
          nextBurst -= 0.016;
          if (nextBurst <= 0) {
            nextBurst = 0.7 + Math.random() * 0.8;
            const spot = GEO_SPOTS[Math.floor(Math.random() * GEO_SPOTS.length)]!;
            const at = toLocal(spot.lat, spot.lng);
            launch(new THREE.Vector3(at.x + (Math.random() - 0.5) * 30, 18 + Math.random() * 10, -at.z));
          }
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const spark = sparks[i]!;
          spark.life -= 0.016;
          const attr = spark.points.geometry.getAttribute("position");
          for (let p = 0; p < spark.vel.length; p++) {
            const v = spark.vel[p]!;
            v.y -= 6 * 0.016;
            attr.setX(p, attr.getX(p) + v.x * 0.016);
            attr.setY(p, attr.getY(p) + v.y * 0.016);
            attr.setZ(p, attr.getZ(p) + v.z * 0.016);
          }
          attr.needsUpdate = true;
          (spark.points.material as PointsMaterial).opacity = Math.max(0, spark.life / 1.6);
          if (spark.life <= 0) {
            scene.remove(spark.points);
            spark.points.geometry.dispose();
            sparks.splice(i, 1);
          }
        }
        renderer.render(scene, camera);
        frame = requestAnimationFrame(tick);
      };
      tick();

      const onResize = () => {
        if (!hostRef.current) return;
        camera.aspect = hostRef.current.clientWidth / Math.max(1, hostRef.current.clientHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(hostRef.current.clientWidth, hostRef.current.clientHeight);
      };
      window.addEventListener("resize", onResize);
      cleanups.push(() => {
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.dispose();
        host.removeChild(renderer.domElement);
      });
    });

    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      for (const fn of cleanups) fn();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 z-0" />;
}
