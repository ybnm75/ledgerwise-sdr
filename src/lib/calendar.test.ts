import { describe, expect, it } from "vitest";
import { bookingProviderEventId, calculateSlots, isValidTimeZone } from "@/lib/calendar";

const rules = {
  timeZone: "America/New_York",
  workdayStartMinutes: 9 * 60,
  workdayEndMinutes: 17 * 60,
  durationMinutes: 30,
  bufferMinutes: 15,
  minimumNoticeMinutes: 0
};

describe("calendar slot calculation", () => {
  it("uses host working hours and excludes meetings plus buffers", () => {
    const slots = calculateSlots({
      rangeStart: new Date("2026-11-23T14:00:00Z"),
      rangeEnd: new Date("2026-11-23T18:00:00Z"),
      now: new Date("2026-11-22T00:00:00Z"),
      rules,
      busy: [{ start: "2026-11-23T15:00:00Z", end: "2026-11-23T15:30:00Z" }]
    });
    expect(slots[0]).toBe("2026-11-23T14:00:00.000Z");
    expect(slots).not.toContain("2026-11-23T14:30:00.000Z");
    expect(slots).not.toContain("2026-11-23T15:30:00.000Z");
    expect(slots).toContain("2026-11-23T16:00:00.000Z");
  });

  it("follows daylight-saving changes through the IANA timezone", () => {
    const slots = calculateSlots({
      rangeStart: new Date("2026-03-09T12:00:00Z"),
      rangeEnd: new Date("2026-03-09T15:00:00Z"),
      now: new Date("2026-03-08T00:00:00Z"),
      rules,
      busy: [],
      limit: 1
    });
    expect(slots).toEqual(["2026-03-09T13:00:00.000Z"]);
  });

  it("never offers weekends", () => {
    const slots = calculateSlots({
      rangeStart: new Date("2026-11-21T00:00:00Z"),
      rangeEnd: new Date("2026-11-23T00:00:00Z"),
      now: new Date("2026-11-20T00:00:00Z"),
      rules,
      busy: []
    });
    expect(slots).toEqual([]);
  });

  it("enforces minimum notice", () => {
    const slots = calculateSlots({
      rangeStart: new Date("2026-11-23T14:00:00Z"),
      rangeEnd: new Date("2026-11-23T17:00:00Z"),
      now: new Date("2026-11-23T12:00:00Z"),
      rules: { ...rules, minimumNoticeMinutes: 24 * 60 },
      busy: []
    });
    expect(slots).toEqual([]);
  });

  it("validates attendee IANA timezones", () => {
    expect(isValidTimeZone("Africa/Algiers")).toBe(true);
    expect(isValidTimeZone("not/a-timezone")).toBe(false);
  });

  it("derives a stable Google event id for booking reconciliation", () => {
    expect(bookingProviderEventId("same-booking")).toBe(bookingProviderEventId("same-booking"));
    expect(bookingProviderEventId("same-booking")).not.toBe(bookingProviderEventId("other-booking"));
    expect(bookingProviderEventId("same-booking")).toMatch(/^[a-v0-9]{5,1024}$/);
  });
});
