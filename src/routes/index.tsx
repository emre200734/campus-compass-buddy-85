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

const POPULAR_IDS = ["library", "canteen", "cs-lab-2", "admin-office", "washroom-a", "medical"];

function CampusNav() {
  const [query, setQuery] = useState("");
  const [floor, setFloor] = useState<Floor>(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [origin, setOrigin] = useState<Place>(places[0]!);
  const [destination, setDestination] = useState<Place | null>(null);
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

  const popular = useMemo(
    () =>
      POPULAR_IDS.map((id) => places.find((p) => p.id === id)).filter(
        (p): p is Place => Boolean(p),
      ),
    [],
  );

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

  // Picking a destination shows directions immediately — no extra click.
  const pick = (p: Place) => {
    setDestination(p);
    setFloor(p.floor);
    setQuery("");
  };

  const reset = () => {
    setDestination(null);
    setQuery("");
    setCategory(null);
    setFloor(0);
  };

  const swap = () => {
    if (!destination) return;
    setOrigin(destination);
    setDestination(origin);
    setFloor(origin.floor);
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg text-primary-foreground">
            🎓
          </div>
          <div>
            <h1 className="font-display text-xl leading-tight">CampusNav</h1>
            <p className="text-xs text-muted-foreground">
              Kisi bhi class, lab ya office tak ka sabse aasan rasta
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[400px_1fr]">
        {/* Left panel */}
        <section className="space-y-4">
          {/* Step 1 — where are you */}
          <div className="panel p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                1
              </span>
              Aap abhi kahan ho?
            </p>
            <select
              value={origin.id}
              onChange={(e) => setOrigin(places.find((p) => p.id === e.target.value) ?? origin)}
              className="w-full rounded-xl border border-input bg-secondary px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              aria-label="Current location"
            >
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  📍 {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2 — where to go */}
          <div className="panel p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              Kahan jaana hai?
            </p>
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: CS Lab 2, library, canteen…"
                className="w-full rounded-xl border border-input bg-secondary py-3 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
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

            {/* Popular quick picks */}
            {!destination && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-muted-foreground">Ya ek tap mein chuno:</p>
                <div className="flex flex-wrap gap-2">
                  {popular.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => pick(p)}
                      className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground transition-colors hover:bg-muted"
                    >
                      {CATEGORY_META[p.category].icon} {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="panel p-4">
            <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              Categories — map par filter karo
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

          {/* Destination + directions */}
          {destination && (
            <div className="panel overflow-hidden">
              <div className="border-b border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-primary">Destination</p>
                    <h2 className="mt-1 font-display text-lg">{destination.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {destination.dept ?? CATEGORY_META[destination.category].label}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {destination.building} • {FLOOR_LABELS[destination.floor]}
                      {destination.room ? ` • Room ${destination.room}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                    aria-label="Clear destination"
                  >
                    ✕ Clear
                  </button>
                </div>

                {route ? (
                  <div className="mt-3 flex items-center gap-4 rounded-xl bg-secondary px-3 py-2.5 text-sm">
                    <span>📍 {route.metres} m</span>
                    <span>🚶 {route.minutes} min walk</span>
                    <button
                      onClick={swap}
                      className="ml-auto rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted"
                      title="Swap start and destination"
                    >
                      ⇅ Swap
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive-foreground">
                    ⚠️ Step-free route available nahi hai is room tak — stairs use karein.
                  </p>
                )}

                <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={stepFree}
                    onChange={(e) => setStepFree(e.target.checked)}
                    className="accent-[var(--primary)]"
                  />
                  Step-free route (lift / ramp only)
                </label>
                {stepFree && !destination.accessible && (
                  <p className="mt-2 rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive-foreground">
                    ⚠️ Ye room sirf stairs se pahuncha ja sakta hai. Block entrance par staff se
                    help lein.
                  </p>
                )}
              </div>

              {route && (
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
            </div>
          )}

          {!destination && (
            <div className="panel p-4 text-sm text-muted-foreground">
              <p className="font-display text-base text-foreground">Naye ho campus par? 🧑‍🎓</p>
              <p className="mt-1">
                Upar apni location chuno, phir search karo ya map par kisi bhi marker ko tap karo —
                rasta turant mil jayega.
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
              routeNodeIds={route ? route.nodeIds : null}
              onSelect={pick}
            />
          </div>

          {route && destination && (
            <p className="text-xs text-muted-foreground">
              Route from <span className="text-foreground">{origin.name}</span> to{" "}
              <span className="text-foreground">{destination.name}</span> · {route.metres} m ·{" "}
              {route.minutes} min · {floorName(destination.floor)}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
