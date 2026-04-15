"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@prisma/client";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Toggle } from "./ui/Toggle";
import type { Seller } from "@/types";

interface ProductCardProps {
  product: Product;
  onDeleted: (id: string) => void;
  onUpdated: (product: Product) => void;
}

export function ProductCard({ product, onDeleted, onUpdated }: ProductCardProps) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(
    product.targetPrice?.toString() ?? ""
  );
  const [savingTarget, setSavingTarget] = useState(false);
  const [togglingStock, setTogglingStock] = useState(false);
  const [togglingSecondHand, setTogglingSecondHand] = useState(false);
  const [togglingSellerName, setTogglingSellerName] = useState<string | null>(null);
  const [togglingNotified, setTogglingNotified] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveTarget() {
    setSavingTarget(true);
    const value = targetInput === "" ? null : parseFloat(targetInput);
    const res = await fetch(`/api/products/${product.id}/target`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPrice: value }),
    });
    if (res.ok) {
      const updated = await res.json() as Product;
      onUpdated(updated);
      setEditingTarget(false);
    }
    setSavingTarget(false);
  }

  async function toggleStockAlert(checked: boolean) {
    setTogglingStock(true);
    const res = await fetch(`/api/products/${product.id}/stock-alert`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackStock: checked }),
    });
    if (res.ok) {
      const updated = await res.json() as Product;
      onUpdated(updated);
    }
    setTogglingStock(false);
  }

  async function toggleSecondHand(checked: boolean) {
    setTogglingSecondHand(true);
    const res = await fetch(`/api/products/${product.id}/second-hand`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeSecondHand: checked }),
    });
    if (res.ok) {
      const updated = await res.json() as Product;
      onUpdated(updated);
    }
    setTogglingSecondHand(false);
  }

  async function toggleSeller(sellerName: string, exclude: boolean) {
    setTogglingSellerName(sellerName);
    const current: string[] = JSON.parse(product.excludedSellers);
    const newExcluded = exclude
      ? Array.from(new Set([...current, sellerName]))
      : current.filter((n) => n !== sellerName);
    const res = await fetch(`/api/products/${product.id}/excluded-sellers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excludedSellers: newExcluded }),
    });
    if (res.ok) {
      const updated = await res.json() as Product;
      onUpdated(updated);
    }
    setTogglingSellerName(null);
  }

  async function toggleNotified() {
    setTogglingNotified(true);
    const res = await fetch(`/api/products/${product.id}/notified`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notified: !product.notified }),
    });
    if (res.ok) {
      const updated = await res.json() as Product;
      onUpdated(updated);
    }
    setTogglingNotified(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(product.id);
    else setDeleting(false);
  }

  // ── Price display logic ──────────────────────────────────────────────────
  // Deduplicate by name (safety net for any legacy data stored with duplicates)
  const rawSellers: Seller[] = JSON.parse(product.availableSellers);
  const sellerMap = new Map<string, Seller>();
  for (const s of rawSellers) {
    const key = s.name.toLowerCase();
    const existing = sellerMap.get(key);
    if (!existing || s.price + s.shipping < existing.price + existing.shipping) {
      sellerMap.set(key, s);
    }
  }
  const sellers = Array.from(sellerMap.values());
  const excluded: string[] = JSON.parse(product.excludedSellers);

  const isAmazonSelected = !excluded.some((e) => /^amazon$/i.test(e.trim()));
  const amazonSeller = sellers.find((s) => /^amazon$/i.test(s.name.trim()));

  const nonAmazonEligible = sellers
    .filter(
      (s) =>
        !/^amazon$/i.test(s.name.trim()) &&
        !excluded.some((e) => e.toLowerCase() === s.name.toLowerCase()) &&
        (product.includeSecondHand || !s.isSecondHand)
    )
    .sort((a, b) => a.price + a.shipping - (b.price + b.shipping));

  // No seller selected when all are excluded
  const hasAnySelectedSeller = sellers.some(
    (s) => !excluded.some((e) => e.toLowerCase() === s.name.toLowerCase())
  );
  const showNoSellerSelected = !hasAnySelectedSeller;

  let mainPriceSeller: Seller | null = null;
  let showOutOfStock = false;
  let otherOptionPrice: number | null = null;

  if (!showNoSellerSelected) {
    if (isAmazonSelected) {
      if (amazonSeller) {
        mainPriceSeller = amazonSeller;
      } else {
        showOutOfStock = true;
      }
      otherOptionPrice =
        nonAmazonEligible.length > 0
          ? nonAmazonEligible[0].price + nonAmazonEligible[0].shipping
          : null;
    } else {
      // Amazon not selected — show cheapest non-Amazon eligible seller
      mainPriceSeller = nonAmazonEligible[0] ?? null;
    }
  }

  const mainPrice = mainPriceSeller
    ? mainPriceSeller.price + mainPriceSeller.shipping
    : null;
  const isUsed = mainPriceSeller?.isSecondHand ?? false;
  // Stock alert toggle enabled only when Amazon is selected and has no stock
  const stockAlertEnabled = isAmazonSelected && !amazonSeller;

  // ── Seller table data ────────────────────────────────────────────────────
  type DisplaySeller = Seller & { outOfStock?: boolean };
  const amazonDisplaySeller = sellers.find((s) => /^amazon$/i.test(s.name.trim()));
  const nonAmazonSellers = sellers
    .filter((s) => !/^amazon$/i.test(s.name.trim()))
    .filter((s) => product.includeSecondHand || !s.isSecondHand)
    .sort((a, b) => a.price + a.shipping - (b.price + b.shipping));
  const displaySellers: DisplaySeller[] = [
    amazonDisplaySeller ?? { name: "Amazon", price: 0, shipping: 0, isSecondHand: false, outOfStock: true },
    ...nonAmazonSellers,
  ];

  return (
    <Card className="flex gap-4">
      {product.image && (
        <div className="shrink-0">
          <Image
            src={product.image}
            alt={product.title}
            width={72}
            height={72}
            className="rounded object-contain bg-brand-subtle"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Title + delete button */}
        <div className="flex items-start justify-between gap-2">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-charcoal hover:underline line-clamp-2 leading-snug"
          >
            {product.title}
          </a>
          <button
            disabled={deleting}
            onClick={handleDelete}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-brand-gray hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Remove product"
            title="Remove product"
          >
            {deleting ? (
              <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            )}
          </button>
        </div>

        {/* Price row */}
        {!showNoSellerSelected && (
          <div className="mt-2 flex items-center gap-2">
            {showOutOfStock ? (
              <span className="bg-red-50 text-red-600 font-medium px-2 py-0.5 rounded-pill text-xs">
                Out of stock
              </span>
            ) : mainPrice !== null ? (
              <span className="font-semibold text-brand-charcoal text-sm flex items-baseline gap-1">
                {mainPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                {isUsed && <span className="text-amber-600 font-medium text-xs">(used)</span>}
              </span>
            ) : (
              <span className="text-xs text-brand-gray">No price data</span>
            )}
          </div>
        )}

        {/* Info lines — bullet list when not editing, input when editing */}
        {editingTarget ? (
          <div className="mt-3 inline-flex items-center gap-2">
            <label className="text-xs font-medium text-brand-gray shrink-0">Target price</label>
            <Input
              value={targetInput}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                  setTargetInput(val);
                }
              }}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              className="w-28 py-1 text-xs"
            />
          </div>
        ) : (
          <ul className="mt-3 list-disc list-inside flex flex-col gap-0.5">
            {showNoSellerSelected ? (
              <li className="text-xs text-brand-gray">No seller selected. Edit the item to select sellers.</li>
            ) : (
              <>
                <li className="text-xs text-brand-gray">
                  {product.targetPrice !== null
                    ? `Alert below ${product.targetPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`
                    : "No price alert"}
                </li>
                {stockAlertEnabled && product.trackStock && (
                  <li className="text-xs text-brand-gray">Alert when back in stock</li>
                )}
                {otherOptionPrice !== null && (
                  <li className="text-xs text-brand-gray">
                    {`Other options from ${otherOptionPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`}
                  </li>
                )}
              </>
            )}
          </ul>
        )}

        {/* Edit mode — toggles and seller table */}
        {editingTarget && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Toggle
                checked={product.trackStock}
                onChange={toggleStockAlert}
                disabled={togglingStock || !stockAlertEnabled}
                label="Alert when back in stock"
              />
              <Toggle
                checked={product.includeSecondHand}
                onChange={toggleSecondHand}
                disabled={togglingSecondHand}
                label="Include second-hand"
              />
            </div>

            {/* Seller table */}
            <table className="w-full mt-3 text-xs border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="pb-1 w-5" />
                  <th className="pb-1 text-left font-semibold text-brand-charcoal">Seller</th>
                  <th className="pb-1 text-right font-semibold text-brand-charcoal pl-3 w-16">Price</th>
                  <th className="pb-1 text-right font-semibold text-brand-charcoal pl-3 w-16">Shipping</th>
                  <th className="pb-1 text-right font-semibold text-brand-charcoal pl-3 w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {displaySellers.map((seller) => {
                  const isExcluded = excluded.some((e) => e.toLowerCase() === seller.name.toLowerCase());
                  const isToggling = togglingSellerName === seller.name;
                  const isOutOfStock = !!seller.outOfStock;
                  const total = seller.price + seller.shipping;
                  return (
                    <tr
                      key={seller.name}
                      className={`select-none rounded ${!isToggling ? "cursor-pointer hover:bg-brand-subtle" : ""}`}
                      onClick={!isToggling ? () => toggleSeller(seller.name, !isExcluded) : undefined}
                    >
                      <td
                        className="pr-2 py-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          disabled={isToggling}
                          onChange={(e) => toggleSeller(seller.name, !e.target.checked)}
                          className="accent-brand-charcoal"
                        />
                      </td>
                      <td className={`py-0.5 ${isExcluded ? "text-brand-gray line-through" : "text-brand-charcoal"}`}>
                        {seller.name}
                        {seller.isSecondHand && (
                          <span className="ml-1 text-amber-600 font-medium">(used)</span>
                        )}
                      </td>
                      {isOutOfStock ? (
                        <td colSpan={3} className="py-0.5 pl-3 text-center text-red-500 font-medium">
                          Out of stock
                        </td>
                      ) : (
                        <>
                          <td className={`py-0.5 pl-3 text-right font-medium ${isExcluded ? "text-brand-gray" : "text-brand-charcoal"}`}>
                            {seller.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                          </td>
                          <td className="py-0.5 pl-3 text-right text-brand-gray">
                            {seller.shipping === 0
                              ? "Free"
                              : seller.shipping.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                          </td>
                          <td className={`py-0.5 pl-3 text-right font-medium ${isExcluded ? "text-brand-gray" : "text-brand-charcoal"}`}>
                            {total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* Action row */}
        <div className="mt-3 flex items-center gap-2">
          {editingTarget ? (
            <>
              {/* Save */}
              <button
                disabled={savingTarget}
                onClick={saveTarget}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Save target price"
                title="Save"
              >
                {savingTarget ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              {/* Cancel */}
              <button
                onClick={() => {
                  setEditingTarget(false);
                  setTargetInput(product.targetPrice?.toString() ?? "");
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-subtle text-brand-charcoal border border-black/10 hover:opacity-80 transition-opacity"
                aria-label="Cancel editing"
                title="Cancel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </>
          ) : (
            <>
              {/* Edit */}
              <button
                onClick={() => setEditingTarget(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity"
                aria-label={product.targetPrice !== null ? "Edit target price" : "Set target price"}
                title={product.targetPrice !== null ? "Edit target price" : "Set target price"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              {/* Notified toggle — only when a target price is set */}
              {product.targetPrice !== null && (
                <button
                  disabled={togglingNotified}
                  onClick={toggleNotified}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    product.notified
                      ? "bg-amber-400 text-white hover:opacity-80"
                      : "bg-brand-charcoal text-white hover:opacity-80"
                  }`}
                  aria-label={product.notified ? "Notified — click to re-enable alerts" : "Not notified — click to suppress alerts"}
                  title={product.notified ? "Re-enable alerts" : "Suppress alerts"}
                >
                  {togglingNotified ? (
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                  ) : product.notified ? (
                    /* Bell-off (muted) */
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                      <path d="M18 8a6 6 0 0 0-9.33-5" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    /* Bell (active) */
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
