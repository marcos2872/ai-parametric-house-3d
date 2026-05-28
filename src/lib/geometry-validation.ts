import type { ArchitecturalProject, Room } from "./schema";

export function isOpenRoomName(name: string): boolean {
  return /varanda|porch|balcony|terrace|terra[cç]o|patio|p[aá]tio|deck/i.test(name);
}

export function isOpenRoom(room: Pick<Room, "name">): boolean {
  return isOpenRoomName(room.name);
}

export function findOverlappingRooms(project: ArchitecturalProject): string[] {
  const rooms = project.rooms.filter((room) => !isOpenRoom(room));
  const overlaps: string[] = [];

  for (let i = 0; i < rooms.length; i++) {
    const a = rooms[i];
    for (let j = i + 1; j < rooms.length; j++) {
      const b = rooms[j];
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapZ = Math.min(a.z + a.depth, b.z + b.depth) - Math.max(a.z, b.z);

      if (overlapX > 0.05 && overlapZ > 0.05) {
        overlaps.push(`${a.name} x ${b.name}`);
      }
    }
  }

  return overlaps;
}
