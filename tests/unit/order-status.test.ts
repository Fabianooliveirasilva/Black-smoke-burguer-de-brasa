import { describe, expect, it } from "vitest";
import { allowedNextStatuses, canTransition, customerCanCancel, timeline } from "@/server/order-status";

describe("order status machine", () => {
  it("follows the delivery and pickup timelines one step at a time", () => {
    expect(timeline("DELIVERY")).toContain("OUT_FOR_DELIVERY");
    expect(timeline("PICKUP")).toContain("READY_FOR_PICKUP");
    expect(canTransition("ASSEMBLING", "OUT_FOR_DELIVERY", "DELIVERY")).toBe(true);
    expect(canTransition("ASSEMBLING", "READY_FOR_PICKUP", "DELIVERY")).toBe(false);
    expect(canTransition("RECEIVED", "DELIVERED", "DELIVERY")).toBe(false);
  });
  it("allows cancel only before assembly and nothing after a final state", () => {
    expect(allowedNextStatuses("RECEIVED", "PICKUP")).toEqual(["PREPARING", "CANCELED"]);
    expect(allowedNextStatuses("PREPARING", "PICKUP")).toContain("CANCELED");
    expect(allowedNextStatuses("ASSEMBLING", "PICKUP")).not.toContain("CANCELED");
    expect(allowedNextStatuses("DELIVERED", "PICKUP")).toEqual([]);
    expect(allowedNextStatuses("CANCELED", "DELIVERY")).toEqual([]);
  });
  it("lets customers cancel only received, unpaid orders", () => {
    expect(customerCanCancel("RECEIVED", "PENDING")).toBe(true);
    expect(customerCanCancel("RECEIVED", "PAID")).toBe(false);
    expect(customerCanCancel("PREPARING", "PENDING")).toBe(false);
  });
});
