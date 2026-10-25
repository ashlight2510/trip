import { normalizeHeading, type RoadviewProvider } from "./types";

const FOV = 100;
const CARDINALS = [
  { bearing: 0, label: "북" },
  { bearing: 90, label: "동" },
  { bearing: 180, label: "남" },
  { bearing: 270, label: "서" },
];

/** Drag-to-look stand-in used when no street-level imagery is available. */
export const fallbackProvider: RoadviewProvider = {
  id: "fallback",
  attribution: "",
  isConfigured: () => true,

  async mount(el, target) {
    const [sky, ground] = target.palette ?? ["#1e293b", "#0f172a"];
    const root = document.createElement("div");
    root.style.cssText = `position:absolute;inset:0;overflow:hidden;cursor:grab;touch-action:none;user-select:none;background:linear-gradient(180deg, ${sky} 0%, ${sky} 52%, ${ground} 52%, ${ground} 100%);`;
    el.appendChild(root);

    const marks = [
      ...CARDINALS.map((c) => ({ ...c, strong: false })),
      ...(target.landmarks ?? []).map((l) => ({ ...l, strong: true })),
    ].map((m) => {
      const node = document.createElement("div");
      node.textContent = m.label;
      node.style.cssText = m.strong
        ? "position:absolute;top:44%;transform:translate(-50%,-50%);padding:6px 14px;border-radius:999px;background:rgba(255,255,255,.16);backdrop-filter:blur(6px);color:#fff;font-size:15px;font-weight:600;white-space:nowrap;"
        : "position:absolute;top:56%;transform:translate(-50%,0);color:rgba(255,255,255,.55);font-size:13px;letter-spacing:.2em;";
      root.appendChild(node);
      return { ...m, node };
    });

    let heading = normalizeHeading(target.heading);
    const listeners = new Set<(deg: number) => void>();

    const render = () => {
      const w = root.clientWidth;
      for (const m of marks) {
        const rel = ((m.bearing - heading + 540) % 360) - 180;
        m.node.style.display = Math.abs(rel) > FOV / 2 + 15 ? "none" : "block";
        m.node.style.left = `${w / 2 + (rel / FOV) * w}px`;
      }
    };

    const set = (deg: number) => {
      heading = normalizeHeading(deg);
      render();
      listeners.forEach((cb) => cb(heading));
    };

    let dragX: number | null = null;
    const down = (e: PointerEvent) => {
      dragX = e.clientX;
      root.style.cursor = "grabbing";
      root.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (dragX === null) return;
      set(heading - ((e.clientX - dragX) / root.clientWidth) * FOV);
      dragX = e.clientX;
    };
    const up = () => {
      dragX = null;
      root.style.cursor = "grab";
    };
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);
    window.addEventListener("resize", render);
    render();

    return {
      getHeading: () => heading,
      setHeading: set,
      onHeadingChange(cb) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      destroy() {
        window.removeEventListener("resize", render);
        listeners.clear();
        root.remove();
      },
    };
  },
};
