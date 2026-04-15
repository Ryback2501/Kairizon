import { computePrice } from "@/lib/pricing";
import type { Seller } from "@/types";

function makeSeller(overrides: Partial<Seller> = {}): Seller {
  return {
    name: "Amazon",
    price: 10,
    shipping: 0,
    isSecondHand: false,
    ...overrides,
  };
}

describe("computePrice", () => {
  it("returns the total price (price + shipping) of the sole eligible seller", () => {
    const sellers = [makeSeller({ price: 20, shipping: 5 })];
    expect(computePrice(sellers, false, [])).toBe(25);
  });

  it("returns the minimum total across multiple eligible sellers", () => {
    const sellers = [
      makeSeller({ name: "Amazon", price: 30, shipping: 0 }),
      makeSeller({ name: "Other", price: 25, shipping: 3 }),
      makeSeller({ name: "Cheap", price: 20, shipping: 0 }),
    ];
    expect(computePrice(sellers, false, [])).toBe(20);
  });

  it("excludes sellers in the excludedSellers list", () => {
    const sellers = [
      makeSeller({ name: "Amazon", price: 20, shipping: 0 }),
      makeSeller({ name: "OtherSeller", price: 15, shipping: 0 }),
    ];
    expect(computePrice(sellers, false, ["OtherSeller"])).toBe(20);
  });

  it("excludes second-hand sellers when includeSecondHand is false", () => {
    const sellers = [
      makeSeller({ name: "NewSeller", price: 30, shipping: 0, isSecondHand: false }),
      makeSeller({ name: "UsedSeller", price: 10, shipping: 0, isSecondHand: true }),
    ];
    expect(computePrice(sellers, false, [])).toBe(30);
  });

  it("includes second-hand sellers when includeSecondHand is true", () => {
    const sellers = [
      makeSeller({ name: "NewSeller", price: 30, shipping: 0, isSecondHand: false }),
      makeSeller({ name: "UsedSeller", price: 10, shipping: 0, isSecondHand: true }),
    ];
    expect(computePrice(sellers, true, [])).toBe(10);
  });

  it("returns null when all sellers are excluded", () => {
    const sellers = [
      makeSeller({ name: "Amazon", price: 20, shipping: 0 }),
    ];
    expect(computePrice(sellers, false, ["Amazon"])).toBeNull();
  });

  it("returns null when sellers array is empty", () => {
    expect(computePrice([], false, [])).toBeNull();
  });

  it("returns null when only second-hand sellers exist and includeSecondHand is false", () => {
    const sellers = [
      makeSeller({ name: "UsedSeller", price: 10, shipping: 0, isSecondHand: true }),
    ];
    expect(computePrice(sellers, false, [])).toBeNull();
  });

  it("accounts for shipping when comparing sellers", () => {
    const sellers = [
      makeSeller({ name: "CheapItem", price: 10, shipping: 8 }),
      makeSeller({ name: "FreeShipping", price: 15, shipping: 0 }),
    ];
    // 10+8=18 vs 15+0=15 — FreeShipping wins
    expect(computePrice(sellers, false, [])).toBe(15);
  });

  it("applies both exclusion and second-hand filters simultaneously", () => {
    const sellers = [
      makeSeller({ name: "Amazon", price: 50, shipping: 0, isSecondHand: false }),
      makeSeller({ name: "Excluded", price: 20, shipping: 0, isSecondHand: false }),
      makeSeller({ name: "UsedSeller", price: 10, shipping: 0, isSecondHand: true }),
    ];
    expect(computePrice(sellers, false, ["Excluded"])).toBe(50);
  });
});
