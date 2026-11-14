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
      const island = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshStandardMaterial({ color: 0xe7d3a1, roughness: 0.9 }),
      );
      island.rotation.x = -Math.PI / 2;
      island.position.y = 0.35;
      scene.add(island);

      for (const feature of DHIGALI_FEATURES) {
        const pts = feature.points.map(([la, ln]) => {
          const p = toLocal(la, ln);
          return new THREE.Vector3(p.x, feature.kind === "wood" ? 0.5 : 0.55, -p.z);
        });
        if (pts.length < 2) continue;
        if (feature.kind === "wood") {
          const wood = new THREE.Shape();
          feature.points.forEach(([la, ln], i) => {
            const p = toLocal(la, ln);
            if (i === 0) wood.moveTo(p.x, p.z);
            else wood.lineTo(p.x, p.z);
          });
          const mesh = new THREE.Mesh(
            new THREE.ShapeGeometry(wood),
            new THREE.MeshStandardMaterial({ color: 0x3f7d49, roughness: 1 }),
          );
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.y = 0.5;
          scene.add(mesh);
        } else {
          const color = feature.kind === "pier" ? 0xf7f1e4 : feature.kind === "service" ? 0xe6c98a : 0xffffff;
          scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color })));
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
                  new THREE.BoxGeometry(6.5, 2.2, 4.8),
                  new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.7 }),
                );
                deck.position.set(cur.x, 2.4, -cur.z);
                scene.add(pole, deck);
              }
              prev = cur;
            }
          }
        }
      }

      const buildings = new Map<string, Mesh>();
      for (const spot of GEO_SPOTS) {
        const p = toLocal(spot.lat, spot.lng);
        const h = spot.id === "villas" ? 3.2 : 6.5;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(spot.id === "villas" ? 7 : 11, h, 8),
          new THREE.MeshStandardMaterial({ color: spot.roof }),
        );
        mesh.position.set(p.x, h / 2 + 0.4, -p.z);
        scene.add(mesh);
        buildings.set(spot.id, mesh);
      }

      DHIGALI_COAST.forEach(([la, ln], i) => {
        if (i % 6 !== 0) return;
        const p = toLocal(la, ln);
        const toward = toLocal(DHIGALI_CENTER.lat, DHIGALI_CENTER.lng);
        const x = p.x + (toward.x - p.x) * 0.08;
        const z = p.z + (toward.z - p.z) * 0.08;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.4, 4, 6),
          new THREE.MeshStandardMaterial({ color: 0x6b4a2b }),
        );
        trunk.position.set(x, 2.4, -z);
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(1.6, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x2f6b3a }),
        );
        crown.position.set(x, 4.6, -z);
        scene.add(trunk, crown);
      });

      function makeWalker(color: number) {
        const g = new THREE.Group();
        const cloth = new THREE.MeshStandardMaterial({ color });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c7a5 });
        const suitMat = new THREE.MeshStandardMaterial({ color: 0x1b6f8a });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.26), cloth);
        torso.position.y = 1.18;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), skinMat);
        head.position.y = 1.64;
        const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.28), suitMat);
        shorts.position.y = 0.96;
        shorts.visible = false;
        const limb = (x: number, y: number, tall: number) => {
          const pivot = new THREE.Group();
          pivot.position.set(x, y, 0);
          const part = new THREE.Mesh(new THREE.BoxGeometry(0.1, tall, 0.1), cloth);
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
