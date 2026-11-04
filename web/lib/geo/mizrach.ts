/*
 * Mizrach: the direction to Jerusalem (the Temple Mount) from where the person is, for facing
 * while davening. The great-circle direction, in degrees clockwise from true north. Safe on the device.
 */

/** The Temple Mount. */
export const JERUSALEM = { lat: 31.7781, lon: 35.2354 };

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Degrees from true north (0–360) to face Jerusalem from a place. */
export function bearingToJerusalem(from: { lat: number; lon: number }): number {
  const φ1 = rad(from.lat);
  const φ2 = rad(JERUSALEM.lat);
  const Δλ = rad(JERUSALEM.lon - from.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** "east-northeast": the direction in words, for a person without a compass. */
export function directionWords(bearing: number): string {
  const names = ["north", "north-northeast", "northeast", "east-northeast", "east", "east-southeast", "southeast", "south-southeast", "south", "south-southwest", "southwest", "west-southwest", "west", "west-northwest", "northwest", "north-northwest"];
  return names[Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16];
}
