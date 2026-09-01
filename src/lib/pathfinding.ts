import { edges, nodes, places, type Edge, type GraphNode, type Place } from "@/data/campus";

const nodeMap = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));

/** metres per map unit */
const SCALE = 0.5;
const WALK_SPEED = 75; // metres per minute

function edgeCost(e: Edge): number {
  const a = nodeMap.get(e.a)!;
  const b = nodeMap.get(e.b)!;
  const planar = Math.hypot(a.x - b.x, a.y - b.y) * SCALE;
  if (e.stairs) return 25;
  if (e.lift) return 40;
  return planar;
}

export interface RouteStep {
  text: string;
  metres: number;
  kind: "start" | "walk" | "turn" | "enter" | "stairs" | "lift" | "arrive";
}

export interface RouteResult {
  nodeIds: string[];
  metres: number;
  minutes: number;
  steps: RouteStep[];
  stepFree: boolean;
}

function buildAdjacency(stepFreeOnly: boolean) {
  const adj = new Map<string, { to: string; edge: Edge; cost: number }[]>();
  for (const e of edges) {
    if (stepFreeOnly && e.stairs) continue;
    if (!stepFreeOnly && e.lift) continue; // prefer stairs when step-free is off
    const c = edgeCost(e);
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a)!.push({ to: e.b, edge: e, cost: c });
    adj.get(e.b)!.push({ to: e.a, edge: e, cost: c });
  }
  return adj;
}

function dijkstra(from: string, to: string, stepFreeOnly: boolean) {
  const adj = buildAdjacency(stepFreeOnly);
  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: Edge }>();
  const visited = new Set<string>();
  dist.set(from, 0);

  while (true) {
    let current: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < best) {
        best = d;
        current = id;
      }
    }
    if (current === null) break;
    if (current === to) break;
    visited.add(current);
    for (const nb of adj.get(current) ?? []) {
      if (visited.has(nb.to)) continue;
      const nd = best + nb.cost;
      if (nd < (dist.get(nb.to) ?? Infinity)) {
        dist.set(nb.to, nd);
        prev.set(nb.to, { node: current, edge: nb.edge });
      }
    }
  }

  if (!dist.has(to)) return null;
  const path: string[] = [to];
  const usedEdges: Edge[] = [];
  let cur = to;
  while (cur !== from) {
    const p = prev.get(cur);
    if (!p) return null;
    usedEdges.unshift(p.edge);
    path.unshift(p.node);
    cur = p.node;
  }
  return { path, usedEdges };
}

function bearingTurn(a: GraphNode, b: GraphNode, c: GraphNode): string | null {
  const v1 = { x: b.x - a.x, y: b.y - a.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  if (!v1.x && !v1.y) return null;
  if (!v2.x && !v2.y) return null;
  const cross = v1.x * v2.y - v1.y * v2.x;
  const dot = v1.x * v2.x + v1.y * v2.y;
  const angle = (Math.atan2(cross, dot) * 180) / Math.PI;
  if (Math.abs(angle) < 25) return null;
  if (angle > 0) return "right";
  return "left";
}

export function findRoute(
  origin: Place,
  destination: Place,
  options: { stepFree?: boolean } = {},
): RouteResult | null {
  const stepFree = !!options.stepFree;
  const res = dijkstra(origin.node, destination.node, stepFree);
  if (!res) return null;

  const steps: RouteStep[] = [{ text: `You are at ${origin.name}`, metres: 0, kind: "start" }];
  let total = 0;
  let pendingWalk = 0;

  const flushWalk = () => {
    if (pendingWalk >= 5) {
      steps.push({
        text: `Walk straight for ${Math.round(pendingWalk / 5) * 5} m`,
        metres: pendingWalk,
        kind: "walk",
      });
    }
    pendingWalk = 0;
  };

  for (let i = 0; i < res.usedEdges.length; i++) {
    const e = res.usedEdges[i]!;
    const a = nodeMap.get(res.path[i]!)!;
    const b = nodeMap.get(res.path[i + 1]!)!;

    if (e.stairs || e.lift) {
      flushWalk();
      const up = (b.floor ?? 0) > (a.floor ?? 0);
      steps.push({
        text: e.lift
          ? `Take the lift ${up ? "up" : "down"} to ${floorName(b.floor ?? 0)}`
          : `Take the stairs ${up ? "up" : "down"} to ${floorName(b.floor ?? 0)}`,
        metres: 0,
        kind: e.lift ? "lift" : "stairs",
      });
      continue;
    }

    const d = Math.hypot(a.x - b.x, a.y - b.y) * SCALE;
    total += d;
    pendingWalk += d;

    const entering = b.id.endsWith("_e");
    if (entering) {
      flushWalk();
      const bld = places.find((p) => p.node.startsWith(b.id.replace("_e", "_f")))?.building;
      steps.push({ text: `Enter ${bld ?? "the building"}`, metres: 0, kind: "enter" });
      continue;
    }

    const next = res.path[i + 2] ? nodeMap.get(res.path[i + 2]!) : undefined;
    if (next) {
      const turn = bearingTurn(a, b, next);
      if (turn) {
        flushWalk();
        steps.push({
          text: `Turn ${turn} at ${b.label ?? "the junction"}`,
          metres: 0,
          kind: "turn",
        });
      }
    }
  }
  flushWalk();

  steps.push({
    text:
      destination.floor === 0
        ? `${destination.name} is on your ${destination.room ? `right — Room ${destination.room}` : "right"}`
        : `${destination.name}${destination.room ? ` (Room ${destination.room})` : ""} is on the ${floorName(destination.floor)}`,
    metres: 0,
    kind: "arrive",
  });

  return {
    nodeIds: res.path,
    metres: Math.round(total),
    minutes: Math.max(1, Math.round(total / WALK_SPEED)),
    steps,
    stepFree,
  };
}

export function floorName(f: number) {
  return f === 0 ? "Ground Floor" : f === 1 ? "1st Floor" : `${f}nd Floor`;
}

export function routePoints(nodeIds: string[]) {
  return nodeIds.map((id) => nodeMap.get(id)!).filter(Boolean);
}
