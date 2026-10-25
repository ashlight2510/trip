import type { LayerSpec } from "@/lib/sound/engine";

export function Compass({ heading, layers }: { heading: number; layers: LayerSpec[] }) {
  const sources = layers.filter((l) => l.bearing !== undefined);

  return (
    <div className="relative size-20 rounded-full border border-white/25 bg-black/30 backdrop-blur-md">
      <svg viewBox="-50 -50 100 100" className="absolute inset-0 size-full">
        <g style={{ transform: `rotate(${-heading}deg)`, transition: "transform 80ms linear" }}>
          <text y={-34} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[11px] font-semibold">
            N
          </text>
          {sources.map((l, i) => {
            const r = (l.bearing! * Math.PI) / 180;
            return (
              <circle key={i} cx={Math.sin(r) * 34} cy={-Math.cos(r) * 34} r={4} className="fill-sky-300/90">
                <title>{l.label ?? l.kind}</title>
              </circle>
            );
          })}
        </g>
        <path d="M0 -22 L6 4 L0 0 L-6 4 Z" className="fill-white" />
      </svg>
    </div>
  );
}
