import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CATEGORY_META,
  FLOOR_LABELS,
  places,
  type Category,
  type Floor,
  type Place,
} from "@/data/campus";
import { findRoute, floorName } from "@/lib/pathfinding";
import { CampusMap } from "@/components/CampusMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusNav — Smart Interactive Campus Navigation" },
      {
        name: "description",
        content:
          "Find classrooms, labs, offices and facilities on campus with search, floor-wise indoor maps and turn-by-turn walking directions.",
      },
      { property: "og:title", content: "CampusNav — Smart Interactive Campus Navigation" },
      {
        property: "og:description",
        content:
          "Interactive campus map with search, categories, indoor floors and shortest-path walking directions for new students.",
      },
    ],
  }),
  component: CampusNav,
});

const CATEGORY_ORDER: Category[] = [
  "classroom",
  "lab",
  "office",
  "library",
  "canteen",
  "washroom",
  "medical",
  "parking",
  "hostel",
  "sports",
];

function CampusNav() {
  const [query, setQuery] = useState("");
  const [floor, setFloor] = useState<Floor>(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [origin, setOrigin] = useState<Place>(places[0]);
  const [destination, setDestination] = useState<Place | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [stepFree, setStepFree] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return places
      .filter((p) =>
        [p.name, p.room, p.dept, p.faculty, p.building, CATEGORY_META[p.category].label]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query]);

  const visible = useMemo(
    () =>
      places.filter(
        (p) =>
          p.floor === floor &&
          (!category || p.category === category) &&
          (!query.trim() || results.some((r) => r.id === p.id) || p.id === destination?.id),
      ),
    [floor, category, query, results, destination],
  );

  const route = useMemo(
    () => (destination ? findRoute(origin, destination, { stepFree }) : null),
    [origin, destination, stepFree],
  );

  const pick = (p: Place) => {
    setDestination(p);
    setFloor(p.floor);
    setQuery("");
    setNavigating(false);
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg text-primary-foreground">
              🎓
            </div>
            <div>
              <h1 className="font-display text-xl leading-tight">CampusNav</h1>
              <p className="text-xs text-muted-foreground">
                Smart Interactive Campus Navigation System
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">You are at</span>
            <select
              value={origin.id}
              onChange={(e) => setOrigin(places.find((p) => p.id === e.target.value)!)}
              className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              aria-label="Current location"
            >
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  📍 {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[380px_1fr]">
        {/* Left panel */}
        <section className="space-y-4">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search room, lab, department, faculty…"
              className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              aria-label="Search campus"
            />
            <span className="pointer-events-none absolute left-3.5 top-3 text-sm">🔍</span>
            {results.length > 0 && (
              <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => pick(r)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary"
                    >
                      <span>{CATEGORY_META[r.category].icon}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{r.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.building} · {FLOOR_LABELS[r.floor]}
                          {r.room ? ` · ${r.room}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel p-4">
            <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              Categories
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_ORDER.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(active ? null : c)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary text-secondary-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{CATEGORY_META[c].icon}</span>
                    <span className="truncate">{CATEGORY_META[c].label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {destination ? (
            <div className="panel overflow-hidden">
              <div className="border-b border-border p-4">
                <p className="text-xs uppercase tracking-widest text-primary">Destination</p>
                <h2 className="mt-1 font-display text-lg">{destination.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {destination.dept ?? CATEGORY_META[destination.category].label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {destination.building} • {FLOOR_LABELS[destination.floor]}
                  {destination.room ? ` • Room ${destination.room}` : ""}
                </p>
                {route && (
                  <div className="mt-3 flex gap-4 text-sm">
                    <span>📍 {route.metres} m away</span>
                    <span>🚶 {route.minutes} min</span>
                  </div>
                )}
                <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={stepFree}
                    onChange={(e) => setStepFree(e.target.checked)}
                    className="accent-[var(--primary)]"
                  />
                  Step-free route (use lifts / ramps)
                </label>
                {stepFree && !destination.accessible && (
                  <p className="mt-2 rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive-foreground">
                    ⚠️ This room is only reachable by stairs. Ask staff at the block entrance for
                    assistance.
                  </p>
                )}
                <button
                  onClick={() => setNavigating(true)}
                  className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-display text-sm text-primary-foreground transition-opacity hover:opacity-90"
                >
                  GET DIRECTIONS
                </button>
              </div>

              {navigating && route && (
                <ol className="space-y-0 p-4">
                  {route.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 pb-3 last:pb-0">
                      <div className="flex flex-col items-center">
                        <span
                          className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                            s.kind === "arrive"
                              ? "bg-primary"
                              : s.kind === "start"
                                ? "bg-accent"
                                : "bg-muted-foreground"
                          }`}
                        />
                        {i < route.steps.length - 1 && (
                          <span className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <p className="text-sm leading-snug text-foreground">{s.text}</p>
                    </li>
                  ))}
                </ol>
              )}
              {navigating && !route && (
                <p className="p-4 text-sm text-muted-foreground">
                  No step-free route available to this room.
                </p>
              )}
            </div>
          ) : (
            <div className="panel p-4 text-sm text-muted-foreground">
              <p className="font-display text-base text-foreground">Freshman mode 🧑‍🎓</p>
              <p className="mt-1">
                Pick where you are in the header, then search or tap any marker on the map to get
                walking directions across campus.
              </p>
            </div>
          )}
        </section>

        {/* Map */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Floor</span>
            {([0, 1, 2] as Floor[]).map((f) => (
              <button
                key={f}
                onClick={() => setFloor(f)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  floor === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {FLOOR_LABELS[f]}
              </button>
            ))}
            {category && (
              <button
                onClick={() => setCategory(null)}
                className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
              >
                Clear filter ✕
              </button>
            )}
          </div>

          <div className="h-[560px]">
            <CampusMap
              floor={floor}
              visible={visible}
              origin={origin}
              destination={destination}
              routeNodeIds={navigating && route ? route.nodeIds : null}
              onSelect={pick}
            />
          </div>

          {navigating && route && (
            <p className="text-xs text-muted-foreground">
              Route from <span className="text-foreground">{origin.name}</span> to{" "}
              <span className="text-foreground">{destination?.name}</span> ·{" "}
              {route.metres} m · {route.minutes} min ·{" "}
              {destination ? floorName(destination.floor) : ""}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
