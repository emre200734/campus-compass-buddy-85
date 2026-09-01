import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildings,
  edges,
  nodes,
  places,
  CATEGORY_META,
  type Floor,
  type Place,
} from "@/data/campus";
import { routePoints } from "@/lib/pathfinding";

const VIEW_W = 900;
const VIEW_H = 720;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 4;

const nodeMap = new Map(nodes.map((n) => [n.id, n]));

interface Props {
  floor: Floor;
  visible: Place[];
  origin: Place | null;
  destination: Place | null;
  routeNodeIds: string[] | null;
  onSelect: (p: Place) => void;
}

export function CampusMap({
  floor,
  visible,
  origin,
  destination,
  routeNodeIds,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const applyZoom = useCallback((next: number, px: number, py: number) => {
    const { zoom: z, offset: o } = stateRef.current;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    const k = clamped / z;
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
    setZoom(clamped);
  }, []);

  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    applyZoom(
      stateRef.current.zoom * Math.exp(-dy * 0.0018),
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  };


  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const routePts = routeNodeIds ? routePoints(routeNodeIds) : [];
  const routeD = routePts.length
    ? routePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
    : "";

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-[var(--map-bg)] hairline-grid touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      style={{ cursor: drag.current ? "grabbing" : "grab" }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-full w-full"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
        role="img"
        aria-label="Interactive campus map"
      >
        {/* green zones */}
        <rect x="60" y="40" width="800" height="640" rx="28" fill="var(--map-ground)" opacity="0.25" />

        {/* walkways */}
        {edges
          .filter((e) => !e.stairs && !e.lift)
          .map((e, i) => {
            const a = nodeMap.get(e.a)!;
            const b = nodeMap.get(e.b)!;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--map-path)"
                strokeWidth={13}
                strokeLinecap="round"
              />
            );
          })}

        {/* buildings */}
        {buildings.map((b) => (
          <g key={b.id}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx="12"
              fill="var(--map-building)"
              stroke="var(--map-building-edge)"
              strokeWidth="2"
            />
            <text
              x={b.x + b.w / 2}
              y={b.y + 22}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="15"
              fontFamily="var(--font-display)"
              letterSpacing="1"
            >
              {b.name.toUpperCase()}
            </text>
          </g>
        ))}

        {/* route */}
        {routeD && (
          <>
            <path d={routeD} fill="none" stroke="var(--route)" strokeWidth="11" opacity="0.18" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d={routeD}
              fill="none"
              stroke="var(--route)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="18 14"
              style={{ animation: "route-dash 1.1s linear infinite" }}
            />
          </>
        )}

        {/* place markers */}
        {visible.map((p) => {
          const isOrigin = origin?.id === p.id;
          const isDest = destination?.id === p.id;
          const tone = CATEGORY_META[p.category].tone;
          return (
            <g
              key={p.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(p);
              }}
              style={{ cursor: "pointer" }}
            >
              {isOrigin && (
                <circle cx={p.x} cy={p.y} r="8" fill="var(--accent)" opacity="0.5">
                  <animate attributeName="r" values="8;22" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={isDest || isOrigin ? 11 : 8}
                fill={isDest ? "var(--route)" : isOrigin ? "var(--accent)" : tone}
                stroke="var(--map-bg)"
                strokeWidth="3"
              />
              <text
                x={p.x}
                y={p.y - 15}
                textAnchor="middle"
                fontSize="11.5"
                fill="var(--foreground)"
                fontFamily="var(--font-body)"
              >
                {p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
        <span className="rounded-full bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          Showing {visible.length} places · {floor === 0 ? "Ground" : floor === 1 ? "1st" : "2nd"} floor
        </span>
        <div className="pointer-events-auto flex flex-col gap-1">
          <button
            aria-label="Zoom in"
            onClick={() => applyZoom(stateRef.current.zoom * 1.3, 0, 0)}
            className="h-9 w-9 rounded-lg border border-border bg-card text-lg text-foreground transition-colors hover:bg-secondary"
          >
            +
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => applyZoom(stateRef.current.zoom / 1.3, 0, 0)}
            className="h-9 w-9 rounded-lg border border-border bg-card text-lg text-foreground transition-colors hover:bg-secondary"
          >
            −
          </button>
          <button
            aria-label="Reset view"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="h-9 w-9 rounded-lg border border-border bg-card text-xs text-muted-foreground transition-colors hover:bg-secondary"
          >
            ⤢
          </button>
        </div>
      </div>
    </div>
  );
}

export const allPlaces = places;
