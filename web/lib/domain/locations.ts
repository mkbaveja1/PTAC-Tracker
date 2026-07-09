// Ported one-to-one from views/_shared.py and views/unit_detail.py.
// allowedTransferPaths() / resolveTargetLocation() encode hotel operational
// policy — the rules must match the Python reference exactly.

import { FLOORS, ROOM_SUFFIXES, SPARE_STORAGE } from "./constants";
import { displayStatus } from "./display";
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

export function corridorOptions(): string[] {
  return FLOORS.map((floor) => `Floor ${floor} Hallway`);
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
  if (location.includes("Elevator")) return "Elevator Closet";
  return "Room";
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

export function activeUnitAtLocation(
  units: PtacUnit[],
  targetLocation: string,
  currentPtacId: string
): PtacUnit | null {
  for (const unit of units) {
    if (unit.ptac_id === currentPtacId) continue;
    if (unit.current_location_name === targetLocation && unit.status === "Active") {
      return unit;
    }
  }
  return null;
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

export function allowedTransferPaths(unit: PtacUnit): TransferRoute[] {
  const status = displayStatus(unit);
  const locationType = unit.location_type;

  if (
    ["Active", "Needs PM"].includes(status) &&
    ["Room", "Hallway", "Elevator Closet"].includes(locationType ?? "")
  ) {
    return ["Maintenance Office", "Doyle Shop"];
  }
  if (status === "Doyle Shop") {
    return ["Spare Storage", "Guest Room", "Maintenance Office"];
  }
  if (status === "Maintenance Office") {
    return ["Guest Room", "Corridor/Hallway", "Elevator Closet", "Spare Storage", "Doyle Shop"];
  }
  if (status === "Spare/Storage") {
    return ["Guest Room", "Corridor/Hallway", "Elevator Closet", "Maintenance Office", "Doyle Shop"];
  }
  return ["Maintenance Office", "Doyle Shop"];
}

export function resolveTargetLocation(
  route: TransferRoute | null,
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
