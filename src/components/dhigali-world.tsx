"use client";

import { useEffect, useRef } from "react";
import type { Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, Points, PointsMaterial, Vector3 } from "three";
import { DHIGALI_COAST } from "@/lib/dhigali-coast";
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
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef({ lat, lng, heading, minutes, nearId, people, fireworks, underwater, swimsuit });
  live.current = { lat, lng, heading, minutes, nearId, people, fireworks, underwater, swimsuit };

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
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, host.clientWidth / Math.max(1, host.clientHeight), 0.4, 4000);
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
      sun.position.set(-80, 120, 40);
      scene.add(sun);
      const sunDisk = new THREE.Mesh(
        new THREE.SphereGeometry(14, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0xfff1c9 }),
      );
      scene.add(sunDisk);
      const skyDay = new THREE.Color(0x8ecae6);
      const skyRise = new THREE.Color(0xf3b183);
      const skySet = new THREE.Color(0xe07a4c);
      const skyNight = new THREE.Color(0x07141c);
      const skyMix = new THREE.Color();

      const waterMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uShallow: { value: new THREE.Color(0x3ec6c6) },
          uDeep: { value: new THREE.Color(0x0a4f66) },
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
            float t = clamp(vWave * 0.55 + 0.5, 0.0, 1.0);
            gl_FragColor = vec4(mix(uDeep, uShallow, t), 1.0);
          }
        `,
      });
      const water = new THREE.Mesh(new THREE.CircleGeometry(1800, 80), waterMat);
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
      const sand = new THREE.MeshStandardMaterial({ color: 0xf0d7a8, roughness: 0.95 });
      const island = new THREE.Mesh(new THREE.ShapeGeometry(shape), sand);
      island.rotation.x = -Math.PI / 2;
      island.position.y = 0.35;
      scene.add(island);

      const greens = [0x1f6b3a, 0x2f8f4e, 0x3d6b45, 0x145c32, 0x4caf6a];
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
      const plantPalm = (x: number, z: number, scale: number) => {
        const h = 3.2 * scale;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, h, 7), trunkMat);
        trunk.position.set(x, h / 2 + 0.4, -z);
        const crownMat = new THREE.MeshStandardMaterial({
          color: greens[Math.floor(Math.random() * greens.length)]!,
          roughness: 0.8,
        });
        const crown = new THREE.Mesh(new THREE.ConeGeometry(1.15 * scale, 2.4 * scale, 8), crownMat);
        crown.position.set(x, h + 0.7, -z);
        scene.add(trunk, crown);
      };

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
            new THREE.MeshStandardMaterial({ color: 0x214d30, roughness: 1 }),
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
          }
          if (feature.kind === "pier" && feature.points.length >= 8) {
            let walked = 0;
            let prev = toLocal(feature.points[0]![0], feature.points[0]![1]);
            for (let i = 1; i < feature.points.length; i++) {
              const cur = toLocal(feature.points[i]![0], feature.points[i]![1]);
              walked += Math.hypot(cur.x - prev.x, cur.z - prev.z);
              if (walked > 16) {
                walked = 0;
                const pole = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.12, 0.16, 2.2, 6),
                  new THREE.MeshStandardMaterial({ color: 0xc8b89a }),
                );
                pole.position.set(cur.x, 1.1, -cur.z);
                const deck = new THREE.Mesh(
                  new THREE.CylinderGeometry(2.6, 2.8, 0.35, 10),
                  new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.65 }),
                );
                deck.position.set(cur.x, 2.3, -cur.z);
                const roof = new THREE.Mesh(
                  new THREE.ConeGeometry(3.1, 1.5, 10),
                  new THREE.MeshStandardMaterial({ color: 0xc4784a, roughness: 0.7 }),
                );
                roof.position.set(cur.x, 3.3, -cur.z);
                scene.add(pole, deck, roof);
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
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(look.r * 1.15, 1.8, 14),
          new THREE.MeshStandardMaterial({ color: look.roof, roughness: 0.65 }),
        );
        roof.position.y = look.h + 1.3;
        const group = new THREE.Group();
        group.add(wall, roof);
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
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.36, 4, 8), cloth);
        torso.position.y = 1.2;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), skinMat);
        head.position.y = 1.64;
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

      const tick = () => {
        const now = live.current;
        const here = toLocal(now.lat, now.lng);
        const stood = you.g.position.clone();
        you.g.visible = !now.underwater;
        for (const performer of [...duo, trumpet, sax]) {
          if (!performer) continue;
          performer.phase += 0.08;
          performer.armR.rotation.x = Math.sin(performer.phase) * 0.25;
        }
        you.shorts.visible = now.swimsuit;
        you.torso.material = now.swimsuit ? you.skinMat : you.cloth;
        for (const part of you.limbs) part.material = now.swimsuit ? you.skinMat : you.cloth;
        you.g.position.set(here.x, 0, -here.z);
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
        fog.color.copy(now.underwater ? uDeep : skyMix);
        fog.near = now.underwater ? 1 : 40;
        fog.far = now.underwater ? 26 : 520;
        waterMat.uniforms.uTime!.value += 0.016;
        uShallow.set(setting || rising ? 0xe08a62 : 0x3ec6c6);
        uDeep.set(now.underwater ? 0x06384c : setting || rising ? 0x5a3a48 : 0x0a4f66);
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
        fish.visible = now.underwater;
        fish.position.set(here.x, 0, -here.z);
        fish.rotation.y += 0.01;
        const desired = now.underwater
          ? new THREE.Vector3(here.x, -1.15, -here.z)
          : new THREE.Vector3(here.x - Math.sin(ang) * 4.2, 1.85 + bob, -here.z + Math.cos(ang) * 4.2);
        if (camera.position.lengthSq() < 1) camera.position.copy(desired);
        else camera.position.lerp(desired, now.underwater ? 0.12 : 0.16);
        if (now.underwater) {
          camera.lookAt(here.x + Math.sin(now.heading * Math.PI / 180) * 6, -1.25, -here.z - Math.cos(now.heading * Math.PI / 180) * 6);
        } else {
          camera.lookAt(here.x, 1.25 + bob, -here.z);
        }
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
