import { describe, expect, it } from "vitest";
import { dayDiff, reminderCopy, reminderMilestones } from "../src/services/paymentReminders.js";

describe("payment reminder schedule", () => {
  it("calculates dates without local timezone drift", () => {
    expect(dayDiff("2026-07-22", "2026-07-19")).toBe(3);
    expect(dayDiff("2026-07-19", "2026-07-19")).toBe(0);
    expect(dayDiff("2026-07-17", "2026-07-19")).toBe(-2);
  });

  it("uses stable idempotency keys for each reminder milestone", () => {
    expect(reminderCopy(3, "P101", 1200000).key).toBe("before_3");
    expect(reminderCopy(0, "P101", 1200000).key).toBe("due_today");
    expect(reminderCopy(-7, "P101", 1200000).key).toBe("overdue_7");
    expect(reminderCopy(-14, "P101", 1200000).title).toBe("Cảnh báo nợ quá hạn lâu");
  });

  it("mentions only the remaining amount", () => {
    expect(reminderCopy(-2, "P205", 187500).body).toContain("187.500");
    expect(reminderCopy(-2, "P205", 187500).body).toContain("P205");
  });

  it("uses owner reminder preferences with safe defaults", () => {
    expect([...reminderMilestones([5, 0], [1, 10])]).toEqual([5, 0, -1, -10]);
    expect([...reminderMilestones(null, undefined)]).toEqual([3, 0, -2, -7, -14]);
    expect([...reminderMilestones([999, -1], [2])]).toEqual([3, 0, -2]);
  });
});
