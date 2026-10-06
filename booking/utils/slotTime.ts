/** ``HH:MM`` slice of an ISO datetime (``2026-03-23T09:00:00`` → ``09:00``). */
const ISO_CLOCK_START = 11;
const ISO_CLOCK_END = 16;

/**
 * The clock time of a slot boundary. Availability slots arrive either as
 * ``"09:00"`` or as an ISO datetime; both normalise to ``"09:00"``.
 */
export function slotClockTime(value: string): string {
  return value.includes('T') ? value.slice(ISO_CLOCK_START, ISO_CLOCK_END) : value;
}
