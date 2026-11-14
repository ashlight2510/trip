"use client";

import { useEffect, useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";
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
}: {
  lat: number;
  lng: number;
  heading: number;
  minutes: number;
  nearId: string | null;
  people: Person[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef({ lat, lng, heading, minutes, nearId, people });
  live.current = { lat, lng, heading, minutes, nearId, people };

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

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.45, 1.1, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff }),
      );
      body.position.y = 1.2;
      const you = new THREE.Group();
      you.add(body);
      scene.add(you);

      const npcs = new Map<string, Mesh>();
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
        you.position.set(here.x, 0, -here.z);
        you.rotation.y = -((now.heading * Math.PI) / 180);
        const hour = (now.minutes / 60) % 24;
        const dusk = hour >= 16 && hour < 19;
        const night = hour >= 19 || hour < 5;
        scene.background = new THREE.Color(night ? 0x07141c : dusk ? 0xc45c3e : 0x8ecae6);
        const sea = water.material as MeshStandardMaterial;
        sea.color.set(night ? 0x062433 : dusk ? 0x8a4a3a : 0x0e7490);
        sun.intensity = night ? 0.25 : dusk ? 0.7 : 1.15;
        sun.color.set(dusk ? 0xffb067 : 0xfff4dd);
        for (const [id, mesh] of buildings) {
          const mat = mesh.material as MeshStandardMaterial;
          mat.emissive.set(id === now.nearId ? 0xf0c27a : 0x000000);
          mat.emissiveIntensity = id === now.nearId ? 0.45 : 0;
        }
        for (const person of now.people) {
          let mesh = npcs.get(person.id);
          if (!mesh) {
            mesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.55, 10, 8),
              new THREE.MeshStandardMaterial({ color: person.color }),
            );
            scene.add(mesh);
            npcs.set(person.id, mesh);
          }
          const at = toLocal(person.lat, person.lng);
          mesh.position.set(at.x, 1.1, -at.z);
        }
        const ang = ((now.heading * Math.PI) / 180) + orbit;
        camera.position.set(here.x - Math.sin(ang) * 16, 8, -here.z + Math.cos(ang) * 16);
        camera.lookAt(here.x, 1.5, -here.z);
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
