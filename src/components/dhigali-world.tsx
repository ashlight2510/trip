"use client";

import { useEffect, useRef } from "react";
import type { Mesh, MeshBasicMaterial, MeshStandardMaterial, Points, PointsMaterial, Vector3 } from "three";
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
}: {
  lat: number;
  lng: number;
  heading: number;
  minutes: number;
  nearId: string | null;
  people: Person[];
  fireworks: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef({ lat, lng, heading, minutes, nearId, people, fireworks });
  live.current = { lat, lng, heading, minutes, nearId, people, fireworks };

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

      const water = new THREE.Mesh(
        new THREE.CircleGeometry(1800, 48),
        new THREE.MeshStandardMaterial({ color: 0x0b6e8a, roughness: 0.35 }),
      );
      water.rotation.x = -Math.PI / 2;
      scene.add(water);

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
        const skin = new THREE.MeshStandardMaterial({ color: 0xf1c7a5 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.26), cloth);
        torso.position.y = 1.18;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), skin);
        head.position.y = 1.64;
        const limb = (x: number, y: number, tall: number) => {
          const pivot = new THREE.Group();
          pivot.position.set(x, y, 0);
          const part = new THREE.Mesh(new THREE.BoxGeometry(0.1, tall, 0.1), cloth);
          part.position.y = -tall / 2;
          pivot.add(part);
          g.add(pivot);
          return pivot;
        };
        const armL = limb(-0.32, 1.38, 0.52);
        const armR = limb(0.32, 1.38, 0.52);
        const legL = limb(-0.12, 0.88, 0.72);
        const legR = limb(0.12, 0.88, 0.72);
        g.add(torso, head);
        return { g, armL, armR, legL, legR, phase: 0 };
      }
      const swing = (walker: ReturnType<typeof makeWalker>, moving: boolean) => {
        if (moving) walker.phase += 0.22;
        const s = moving ? Math.sin(walker.phase) * 0.75 : 0;
        walker.legL.rotation.x = s;
        walker.legR.rotation.x = -s;
        walker.armL.rotation.x = -s * 0.55;
        walker.armR.rotation.x = s * 0.55;
      };

      const you = makeWalker(0xf4f7fb);
      scene.add(you.g);

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
        you.g.position.set(here.x, 0, -here.z);
        you.g.rotation.y = -((now.heading * Math.PI) / 180);
        swing(you, stood.distanceTo(you.g.position) > 0.015);
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
        const sea = water.material as MeshStandardMaterial;
        sea.color.set(elev > 0.2 ? 0x0e7490 : setting || rising ? 0x8a4a3a : 0x062433);
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
          const moving = prev ? prev.distanceTo(next) > 0.01 : false;
          if (moving && prev) {
            walker.g.rotation.y = -Math.atan2(next.x - prev.x, -(next.z - prev.z));
          }
          walker.g.position.copy(next);
          swing(walker, moving);
          lastNpc.set(person.id, next);
        }
        const ang = (now.heading * Math.PI) / 180 + orbit;
        const desired = new THREE.Vector3(here.x - Math.sin(ang) * 5.2, 2.5, -here.z + Math.cos(ang) * 5.2);
        if (camera.position.lengthSq() < 1) camera.position.copy(desired);
        else camera.position.lerp(desired, 0.18);
        camera.lookAt(here.x, 1.35, -here.z);
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
