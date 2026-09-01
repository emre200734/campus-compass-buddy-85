export type Category =
  | "classroom"
  | "lab"
  | "office"
  | "library"
  | "canteen"
  | "washroom"
  | "medical"
  | "parking"
  | "hostel"
  | "gate"
  | "sports";

export type Floor = 0 | 1 | 2;

export interface Place {
  id: string;
  name: string;
  category: Category;
  building: string;
  floor: Floor;
  room?: string;
  dept?: string;
  faculty?: string;
  /** graph node this place connects to */
  node: string;
  /** map coordinates in the 0-1000 x 0-700 campus space */
  x: number;
  y: number;
  accessible: boolean;
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  label?: string;
  /** true when reaching this node requires stairs */
  stairs?: boolean;
  lift?: boolean;
  building?: string;
  floor?: Floor;
}

export interface Edge {
  a: string;
  b: string;
  /** stairs edges are skipped in step-free routing */
  stairs?: boolean;
  lift?: boolean;
}

export interface BuildingShape {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const CATEGORY_META: Record<Category, { label: string; icon: string; tone: string }> = {
  classroom: { label: "Classrooms", icon: "🏫", tone: "var(--cat-classroom)" },
  lab: { label: "Laboratories", icon: "🧪", tone: "var(--cat-lab)" },
  office: { label: "Faculty Offices", icon: "👨‍🏫", tone: "var(--cat-office)" },
  library: { label: "Library", icon: "📚", tone: "var(--cat-library)" },
  canteen: { label: "Canteen", icon: "🍴", tone: "var(--cat-canteen)" },
  washroom: { label: "Washrooms", icon: "🚻", tone: "var(--cat-washroom)" },
  medical: { label: "Medical Room", icon: "🏥", tone: "var(--cat-medical)" },
  parking: { label: "Bus / Parking", icon: "🚌", tone: "var(--cat-parking)" },
  hostel: { label: "Hostel", icon: "🏠", tone: "var(--cat-hostel)" },
  gate: { label: "Gates", icon: "🚪", tone: "var(--cat-gate)" },
  sports: { label: "Sports", icon: "⚽", tone: "var(--cat-sports)" },
};

export const FLOOR_LABELS: Record<Floor, string> = {
  0: "Ground",
  1: "1st Floor",
  2: "2nd Floor",
};

export const buildings: BuildingShape[] = [
  { id: "main", name: "Main Block", x: 120, y: 300, w: 190, h: 130 },
  { id: "blockA", name: "Block A", x: 120, y: 90, w: 190, h: 130 },
  { id: "blockB", name: "Block B", x: 560, y: 90, w: 210, h: 150 },
  { id: "library", name: "Library", x: 400, y: 330, w: 150, h: 120 },
  { id: "canteen", name: "Canteen", x: 620, y: 330, w: 150, h: 100 },
  { id: "hostel", name: "Hostel", x: 620, y: 500, w: 170, h: 110 },
  { id: "sports", name: "Sports Ground", x: 130, y: 500, w: 230, h: 120 },
];

/** Outdoor walkway junctions */
const walk: GraphNode[] = [
  { id: "w_gate", x: 450, y: 660, label: "Main Gate" },
  { id: "w_plaza", x: 450, y: 560, label: "Central Plaza" },
  { id: "w_mid", x: 450, y: 470, label: "Quad" },
  { id: "w_north", x: 450, y: 260, label: "North Walk" },
  { id: "w_west", x: 340, y: 380, label: "West Walk" },
  { id: "w_westN", x: 340, y: 160, label: "Block A Path" },
  { id: "w_east", x: 590, y: 380, label: "East Walk" },
  { id: "w_eastN", x: 600, y: 260, label: "Block B Path" },
  { id: "w_hostel", x: 620, y: 555, label: "Hostel Path" },
  { id: "w_sports", x: 340, y: 560, label: "Sports Path" },
  { id: "w_park", x: 250, y: 660, label: "Parking Path" },
];

/** Building interior nodes: entrance (floor 0) + floor landings */
function tower(prefix: string, x: number, y: number, floors: Floor[]) {
  const nodes: GraphNode[] = [{ id: `${prefix}_e`, x, y, label: "Entrance", floor: 0 }];
  const edges: Edge[] = [];
  floors.forEach((f) => {
    nodes.push({ id: `${prefix}_f${f}`, x, y, label: `Floor ${f}`, floor: f });
    if (f === 0) {
      edges.push({ a: `${prefix}_e`, b: `${prefix}_f0` });
    } else {
      edges.push({ a: `${prefix}_f${f - 1}`, b: `${prefix}_f${f}`, stairs: true });
      edges.push({ a: `${prefix}_f${f - 1}`, b: `${prefix}_f${f}`, lift: true });
    }
  });
  return { nodes, edges };
}

const towers = [
  tower("main", 215, 430, [0, 1]),
  tower("blockA", 215, 220, [0, 1, 2]),
  tower("blockB", 665, 240, [0, 1, 2]),
  tower("lib", 475, 450, [0, 1]),
  tower("can", 695, 430, [0]),
  tower("hos", 705, 500, [0]),
];

export const nodes: GraphNode[] = [...walk, ...towers.flatMap((t) => t.nodes)];

export const edges: Edge[] = [
  { a: "w_gate", b: "w_plaza" },
  { a: "w_gate", b: "w_park" },
  { a: "w_plaza", b: "w_mid" },
  { a: "w_plaza", b: "w_sports" },
  { a: "w_plaza", b: "w_hostel" },
  { a: "w_mid", b: "w_west" },
  { a: "w_mid", b: "w_east" },
  { a: "w_mid", b: "w_north" },
  { a: "w_west", b: "w_westN" },
  { a: "w_westN", b: "blockA_e" },
  { a: "w_west", b: "main_e" },
  { a: "w_north", b: "w_eastN" },
  { a: "w_eastN", b: "blockB_e" },
  { a: "w_east", b: "w_eastN" },
  { a: "w_mid", b: "lib_e" },
  { a: "w_east", b: "can_e" },
  { a: "w_hostel", b: "hos_e" },
  ...towers.flatMap((t) => t.edges),
];

export const places: Place[] = [
  // Gates & outdoor
  { id: "gate", name: "Main Gate", category: "gate", building: "Campus", floor: 0, node: "w_gate", x: 450, y: 660, accessible: true },
  { id: "parking", name: "Bus Stop & Parking", category: "parking", building: "Campus", floor: 0, node: "w_park", x: 250, y: 660, accessible: true },
  { id: "ground", name: "Sports Ground", category: "sports", building: "Campus", floor: 0, node: "w_sports", x: 340, y: 560, accessible: true },

  // Main Block
  { id: "admin", name: "Administrative Office", category: "office", building: "Main Block", floor: 0, room: "M-01", node: "main_f0", x: 175, y: 340, accessible: true },
  { id: "reception", name: "Reception & Help Desk", category: "office", building: "Main Block", floor: 0, room: "M-02", node: "main_f0", x: 250, y: 340, accessible: true },
  { id: "medical", name: "Medical Room", category: "medical", building: "Main Block", floor: 0, room: "M-05", node: "main_f0", x: 175, y: 400, accessible: true },
  { id: "wash_main", name: "Washroom — Main Block", category: "washroom", building: "Main Block", floor: 0, node: "main_f0", x: 285, y: 400, accessible: true },
  { id: "exam", name: "Examination Cell", category: "office", building: "Main Block", floor: 1, room: "M-104", node: "main_f1", x: 250, y: 370, accessible: true },
  { id: "seminar", name: "Seminar Hall", category: "classroom", building: "Main Block", floor: 1, room: "M-110", node: "main_f1", x: 175, y: 370, accessible: true },

  // Block A
  { id: "a101", name: "Classroom A101", category: "classroom", building: "Block A", floor: 1, room: "A101", dept: "Electronics", node: "blockA_f1", x: 165, y: 130, accessible: true },
  { id: "a102", name: "Classroom A102", category: "classroom", building: "Block A", floor: 1, room: "A102", dept: "Electronics", node: "blockA_f1", x: 235, y: 130, accessible: true },
  { id: "physlab", name: "Physics Lab", category: "lab", building: "Block A", floor: 0, room: "A004", node: "blockA_f0", x: 165, y: 190, accessible: true },
  { id: "chemlab", name: "Chemistry Lab", category: "lab", building: "Block A", floor: 0, room: "A006", node: "blockA_f0", x: 265, y: 190, accessible: true },
  { id: "eclab", name: "Electronics Lab", category: "lab", building: "Block A", floor: 2, room: "A201", node: "blockA_f2", x: 200, y: 110, accessible: false },
  { id: "hod_ec", name: "HOD Electronics — Dr. Meera Nair", category: "office", building: "Block A", floor: 2, room: "A210", faculty: "Dr. Meera Nair", node: "blockA_f2", x: 275, y: 110, accessible: false },
  { id: "wash_a", name: "Washroom — Block A", category: "washroom", building: "Block A", floor: 1, node: "blockA_f1", x: 290, y: 160, accessible: true },

  // Block B
  { id: "cslab1", name: "CS Lab 1", category: "lab", building: "Block B", floor: 1, room: "B104", dept: "Computer Science", node: "blockB_f1", x: 610, y: 140, accessible: true },
  { id: "cslab2", name: "CS Lab 2", category: "lab", building: "Block B", floor: 2, room: "B204", dept: "Computer Science", node: "blockB_f2", x: 700, y: 140, accessible: true },
  { id: "b204", name: "Classroom B204", category: "classroom", building: "Block B", floor: 2, room: "B204A", dept: "Computer Science", node: "blockB_f2", x: 610, y: 190, accessible: true },
  { id: "b101", name: "Classroom B101", category: "classroom", building: "Block B", floor: 1, room: "B101", dept: "Computer Science", node: "blockB_f1", x: 700, y: 190, accessible: true },
  { id: "cs_dept", name: "CS Department Office", category: "office", building: "Block B", floor: 0, room: "B002", faculty: "Prof. Arun Shah", node: "blockB_f0", x: 610, y: 215, accessible: true },
  { id: "aiml", name: "AI / ML Research Lab", category: "lab", building: "Block B", floor: 2, room: "B210", dept: "Computer Science", node: "blockB_f2", x: 745, y: 115, accessible: true },
  { id: "wash_b", name: "Washroom — Block B", category: "washroom", building: "Block B", floor: 0, node: "blockB_f0", x: 740, y: 215, accessible: true },

  // Library
  { id: "lib_read", name: "Central Library", category: "library", building: "Library", floor: 0, node: "lib_f0", x: 440, y: 370, accessible: true },
  { id: "lib_digital", name: "Digital Reading Room", category: "library", building: "Library", floor: 1, room: "L-101", node: "lib_f1", x: 510, y: 370, accessible: true },

  // Canteen & Hostel
  { id: "canteen", name: "Main Canteen", category: "canteen", building: "Canteen", floor: 0, node: "can_f0", x: 660, y: 370, accessible: true },
  { id: "juice", name: "Juice & Snacks Corner", category: "canteen", building: "Canteen", floor: 0, node: "can_f0", x: 735, y: 370, accessible: true },
  { id: "hostel_b", name: "Boys Hostel", category: "hostel", building: "Hostel", floor: 0, node: "hos_f0", x: 665, y: 540, accessible: true },
  { id: "hostel_g", name: "Girls Hostel", category: "hostel", building: "Hostel", floor: 0, node: "hos_f0", x: 750, y: 540, accessible: true },
];

export const placeById = (id: string) => places.find((p) => p.id === id);
