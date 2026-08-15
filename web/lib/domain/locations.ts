// Location helpers ported from views/_shared.py + views/unit_detail.py, with
// two owner-requested changes: corridors are two-per-floor (Floor NA/NB) and
// custody transfers allow moving any unit to any destination.

import { FLOORS, ROOM_SUFFIXES, SPARE_STORAGE } from "./constants";
import type { PtacUnit } from "@/types/database";

export function roomOptions(): string[] {
  const rooms: string[] = [];
  for (const floor of FLOORS) {
    for (const suffix of ROOM_SUFFIXES) {
      const roomNum = `${floor}${String(suffix).padStart(2, "0")}`;
      if (suffix === 11) {
        rooms.push(`Suite ${roomNum}-A`, `Suite ${roomNum}-B`);
      } else {
        rooms.push(`Room ${roomNum}`);
      }
    }
  }
  return rooms;
}

// Two hallway slots per floor (e.g. "Floor 2A", "Floor 2B"). Units can also be
// given a fully custom hallway name via the Edit Specifications dialog.
export function corridorOptions(): string[] {
  return FLOORS.flatMap((floor) => [`Floor ${floor}A`, `Floor ${floor}B`]);
}

export function locationOptions(): string[] {
  return [
    ...roomOptions(),
    ...corridorOptions(),
    "Elevator Closet",
    "Maintenance Office",
    "Doyle Shop",
    SPARE_STORAGE,
  ];
}

export function inferLocationType(location: string): string {
  if (location === "Maintenance Office") return "Maintenance Office";
  if (location === "Doyle Shop") return "Doyle Shop";
  if (location.includes("Storage") || location.includes("Spare")) return "Spare";
  if (location.includes("Hallway") || location.includes("Corridor")) return "Hallway";
  // Corridor slots like "Floor 2A" / "Floor 6B".
  if (/^Floor\s+\d+[A-Za-z]$/.test(location)) return "Hallway";
  if (location.includes("Elevator")) return "Elevator Closet";
  return "Room";
}

// The status a unit should carry given its location type. Rooms, hallways,
// the elevator closet, and spares are all "Active"; the office and shop keep
// their own status so display/grouping stays correct.
export function statusForLocationType(locationType: string): string {
  if (locationType === "Maintenance Office") return "Maintenance Office";
  if (locationType === "Doyle Shop") return "Doyle Shop";
  return "Active";
}

export function targetStatusForLocation(location: string): string {
  if (location === "Maintenance Office") return "Maintenance Office";
  if (location === "Doyle Shop") return "Doyle Shop";
  return "Active";
}

// Only single-slot locations can be "occupied": one PTAC per guest room,
// hallway slot, or elevator closet. Maintenance Office, Doyle Shop, and
// Spare Storage hold any number of units at once.
export function isSingleOccupancyLocation(location: string): boolean {
  return ["Room", "Hallway", "Elevator Closet"].includes(inferLocationType(location));
}

// Any unit physically at the target location occupies it — regardless of its
// status label. (Checking status === "Active" missed "Needs PM" occupants and
// wrongly blocked multi-capacity spots when a status label drifted.)
export function occupantAtLocation(
  units: PtacUnit[],
  targetLocation: string,
  currentPtacId: string
): PtacUnit | null {
  for (const unit of units) {
    if (unit.ptac_id === currentPtacId) continue;
    if (unit.current_location_name === targetLocation) {
      return unit;
    }
  }
  return null;
}

export interface LocationGroup {
  label: string;
  options: string[];
}

// Locations that can accept a newly registered unit, grouped for a dropdown.
// Storage / office / shop always accept units; single-slot spots (rooms,
// hallway slots, elevator closet) are listed only when currently empty.
export function availableLocationGroups(
  units: PtacUnit[],
  customCategories: string[] = []
): LocationGroup[] {
  const occupied = new Set(
    units.map((unit) => unit.current_location_name).filter((name): name is string => Boolean(name))
  );
  const openRooms = roomOptions().filter((loc) => !occupied.has(loc));
  const openCorridors = corridorOptions().filter((loc) => !occupied.has(loc));

  const groups: LocationGroup[] = [
    { label: "Storage & Holding", options: [SPARE_STORAGE, "Maintenance Office", "Doyle Shop"] },
  ];
  // Custom categories (multi-capacity buckets) are always available.
  const customOptions = customCategories.filter((name) => name !== "Elevator Closet");
  if (customOptions.length) groups.push({ label: "Custom Locations", options: customOptions });
  if (openRooms.length) groups.push({ label: "Guest Rooms (empty)", options: openRooms });
  if (openCorridors.length) groups.push({ label: "Hallways (empty)", options: openCorridors });
  if (!occupied.has("Elevator Closet")) {
    groups.push({ label: "Elevator Closet", options: ["Elevator Closet"] });
  }
  return groups;
}

export function nextPtacId(units: PtacUnit[]): string {
  const numbers = units
    .map((unit) => (unit.ptac_id ?? "").replace("PTAC-", ""))
    .filter((part) => /^\d+$/.test(part))
    .map((part) => parseInt(part, 10));
  const nextNumber = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `PTAC-${String(nextNumber).padStart(3, "0")}`;
}

export type TransferRoute =
  | "Guest Room"
  | "Corridor/Hallway"
  | "Elevator Closet"
  | "Spare Storage"
  | "Maintenance Office"
  | "Doyle Shop";

// Any unit can be moved to any destination. The earlier state-based
// restrictions were removed at the owner's request so a custody transfer is
// never blocked by a unit's current location or status.
export function allowedTransferPaths(): TransferRoute[] {
  return [
    "Guest Room",
    "Corridor/Hallway",
    "Elevator Closet",
    "Spare Storage",
    "Maintenance Office",
    "Doyle Shop",
  ];
}

// Accepts built-in routes and custom category names (which resolve to
// themselves via the final return).
export function resolveTargetLocation(
  route: string | null,
  roomChoice?: string | null,
  corridorChoice?: string | null
): string | null {
  if (!route) return null;
  if (route === "Guest Room") return roomChoice ?? null;
  if (route === "Corridor/Hallway") return corridorChoice ?? null;
  if (route === "Elevator Closet") return "Elevator Closet";
  if (route === "Spare Storage") return SPARE_STORAGE;
  return route;
}
