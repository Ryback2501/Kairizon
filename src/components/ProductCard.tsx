"use client";

import { useState } from "react";
import type { Product } from "@/types";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Toggle } from "./ui/Toggle";
import type { Seller } from "@/types";
import { isAmazonSeller, getAmazonDomainInfo, buildCamelUrl } from "@/lib/amazon";
import { AmazonStoreBadge } from "./ui/AmazonStoreBadge";
import { deduplicateSellers } from "@/lib/pricing";

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
  const [cardError, setCardError] = useState<string | null>(null);

  async function saveTarget() {
    setCardError(null);
    const value = targetInput === "" ? null : parseFloat(targetInput);
    if (value !== null && isNaN(value)) {
      setCardError("Invalid price");
      return;
    }
    setSavingTarget(true);
    try {
      const res = await fetch(`/api/products/${product.id}/target`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPrice: value }),
      });
      if (res.ok) {
        const updated = await res.json() as Product;
        onUpdated(updated);
        setEditingTarget(false);
      } else {
        setCardError("Could not save target price");
      }
    } catch {
      setCardError("Network error");
    } finally {
      setSavingTarget(false);
    }
  }

  async function toggleStockAlert(checked: boolean) {
    setCardError(null);
    setTogglingStock(true);
    try {
      const res = await fetch(`/api/products/${product.id}/stock-alert`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackStock: checked }),
      });
      if (res.ok) {
        const updated = await res.json() as Product;
        onUpdated(updated);
      } else {
        setCardError("Could not update stock alert");
      }
    } catch {
      setCardError("Network error");
    } finally {
      setTogglingStock(false);
    }
  }

  async function toggleSecondHand(checked: boolean) {
    setCardError(null);
    setTogglingSecondHand(true);
    try {
      const res = await fetch(`/api/products/${product.id}/second-hand`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeSecondHand: checked }),
      });
      if (res.ok) {
        const updated = await res.json() as Product;
        onUpdated(updated);
      } else {
        setCardError("Could not update second-hand setting");
      }
    } catch {
      setCardError("Network error");
    } finally {
      setTogglingSecondHand(false);
    }
  }

  async function toggleSeller(sellerName: string, exclude: boolean) {
    setCardError(null);
    setTogglingSellerName(sellerName);
    const current: string[] = JSON.parse(product.excludedSellers);
    const newExcluded = exclude
      ? Array.from(new Set([...current, sellerName]))
      : current.filter((n) => n !== sellerName);
    try {
      const res = await fetch(`/api/products/${product.id}/excluded-sellers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludedSellers: newExcluded }),
      });
      if (res.ok) {
        const updated = await res.json() as Product;
        onUpdated(updated);
      } else {
        setCardError("Could not update seller");
      }
    } catch {
      setCardError("Network error");
    } finally {
      setTogglingSellerName(null);
    }
  }

  async function toggleNotified() {
    const newNotified = !product.notified;
    setCardError(null);
    setTogglingNotified(true);
    try {
      const res = await fetch(`/api/products/${product.id}/notified`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notified: newNotified }),
      });
      if (res.ok) {
        const updated = await res.json() as Product;
        onUpdated(updated);
      } else {
        setCardError("Could not update notification state");
      }
    } catch {
      setCardError("Network error");
    } finally {
      setTogglingNotified(false);
    }
  }

  async function handleDelete() {
    setCardError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (res.ok) onDeleted(product.id);
      else setCardError("Could not delete product");
    } catch {
      setCardError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  // ── Price display logic ──────────────────────────────────────────────────
  const sellers = deduplicateSellers(JSON.parse(product.availableSellers) as Seller[]);
  const excluded: string[] = JSON.parse(product.excludedSellers);

  const isAmazonSelected = !excluded.some((e) => isAmazonSeller(e));
  const amazonSeller = sellers.find((s) => isAmazonSeller(s.name));

  const nonAmazonEligible = sellers
    .filter(
      (s) =>
        !isAmazonSeller(s.name) &&
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
  const { currency, locale } = getAmazonDomainInfo(product.url);
  const camelUrl = buildCamelUrl(product.url);
  // Stock alert toggle enabled only when Amazon is selected and has no stock
  const stockAlertEnabled = isAmazonSelected && !amazonSeller;

  // ── Seller table data ────────────────────────────────────────────────────
  type DisplaySeller = Seller & { outOfStock?: boolean };
  const amazonDisplaySeller = sellers.find((s) => isAmazonSeller(s.name));
  const nonAmazonSellers = sellers
    .filter((s) => !isAmazonSeller(s.name))
    .filter((s) => product.includeSecondHand || !s.isSecondHand)
    .sort((a, b) => a.price + a.shipping - (b.price + b.shipping));
  const displaySellers: DisplaySeller[] = [
    amazonDisplaySeller ?? { name: "Amazon", price: 0, shipping: 0, isSecondHand: false, outOfStock: true },
    ...nonAmazonSellers,
  ];

  return (
    <Card className="flex gap-4">
      <div className="shrink-0 flex flex-col items-center gap-1.5">
        {product.image && (
          <img
            src={product.image}
            alt={product.title}
            width={72}
            height={72}
            className="rounded object-contain bg-brand-subtle"
          />
        )}
        <AmazonStoreBadge url={product.url} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Title + delete button */}
        <div className="flex items-start justify-between gap-2">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-ink hover:underline line-clamp-2 leading-snug"
          >
            {product.title}
          </a>
          <button
            disabled={deleting}
            onClick={handleDelete}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-brand-gray hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <span className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-medium px-2 py-0.5 rounded-pill text-xs">
                Out of stock
              </span>
            ) : mainPrice !== null ? (
              <span className="font-semibold text-brand-ink text-sm flex items-baseline gap-1">
                {mainPrice.toLocaleString(locale, { style: "currency", currency })}
                {isUsed && <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">(used)</span>}
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
                    ? `Alert below ${product.targetPrice.toLocaleString(locale, { style: "currency", currency })}`
                    : "No price alert"}
                </li>
                {stockAlertEnabled && product.trackStock && (
                  <li className="text-xs text-brand-gray">Alert when back in stock</li>
                )}
                {otherOptionPrice !== null && (
                  <li className="text-xs text-brand-gray">
                    {`Other options from ${otherOptionPrice.toLocaleString(locale, { style: "currency", currency })}`}
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
                  <th className="pb-1 text-left font-semibold text-brand-ink">Seller</th>
                  <th className="pb-1 text-right font-semibold text-brand-ink pl-3 w-16">Price</th>
                  <th className="pb-1 text-right font-semibold text-brand-ink pl-3 w-16">Shipping</th>
                  <th className="pb-1 text-right font-semibold text-brand-ink pl-3 w-16">Total</th>
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
                      <td className={`py-0.5 ${isExcluded ? "text-brand-gray line-through" : "text-brand-ink"}`}>
                        {seller.name}
                        {seller.isSecondHand && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">(used)</span>
                        )}
                      </td>
                      {isOutOfStock ? (
                        <td colSpan={3} className="py-0.5 pl-3 text-center text-red-500 dark:text-red-400 font-medium">
                          Out of stock
                        </td>
                      ) : (
                        <>
                          <td className={`py-0.5 pl-3 text-right font-medium ${isExcluded ? "text-brand-gray" : "text-brand-ink"}`}>
                            {seller.price.toLocaleString(locale, { style: "currency", currency })}
                          </td>
                          <td className="py-0.5 pl-3 text-right text-brand-gray">
                            {seller.shipping === 0
                              ? "Free"
                              : seller.shipping.toLocaleString(locale, { style: "currency", currency })}
                          </td>
                          <td className={`py-0.5 pl-3 text-right font-medium ${isExcluded ? "text-brand-gray" : "text-brand-ink"}`}>
                            {total.toLocaleString(locale, { style: "currency", currency })}
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

        {/* Error message */}
        {cardError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{cardError}</p>
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
              {/* camelcamelcamel price-history link — supported marketplaces only */}
              {camelUrl && (
                <a
                  href={camelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity"
                  aria-label="Check price history at camelcamelcamel.com"
                  title="Check price history at camelcamelcamel.com"
                >
                  {/* Camel icon by Delapouite (game-icons.net), CC BY 3.0 */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                    <path d="M420.8 26.91c-11.4.76-23.7 4.65-33.6 10.29-5.3-4.86-13.5-10.52-19.3-6.11-12.5 9.46-2.4 20.76 6.8 27.94 5.5 35.86 20.7 93.17-9.8 105.97C317 183.1 308.4 36.14 241 37.94c-40.4 1.08-22.6 59.65-62.6 61.65-29.5 1.51-27.3-54.51-51.9-55.36-25.9-.9-44.62 18.9-57.71 86.97-25.63-.1-35.73 20.1-47.42 59.2-11.686 39-3 115.6 1.2 162.4l7.87-76.3c2.43 12 6.19 24.1 11.91 36.7 3.91 18.7 5.44 37.4 5.81 56-8.2 10.2-8.8 26.2-.42 35.5-.92 26.8-2.67 53.5-1.68 80.3 34.48.5 66.04-1 99.54 0 1.8-11.9-14.9-20.4-34.3-30.3.3-13.7.2-30.5 0-47.5 8.8-10.2 9-28.1-.2-36.8.1-21.3.8-38.6 3.3-43.9 8-17.1 20.6-31.9 29.1-47.2 28.7 5.3 59.7 2.9 91.9-4.7l.7 85.5c-7.7 11.3-8 27.7.3 37.8 4.7 29 .6 58.1.8 87.1h58c2.3-15-22.5-23.1-34.6-30.1 0-22.1-3.9-38.8-.4-60.3 5-9.9 5.3-21.5.4-30.8.9-33 3.3-66 10.7-99 1.6-.6 7.9-3.7 9.3-5.3l10.9 98.4c-5.6 11.9-4.4 27.3 4 36.7 6.6 30.1 4.5 59.5 7.9 89.6l61.2.8c.3-12.3-29.1-20-40.3-25.5-6.4-21.4-5.7-43.1-6.7-64.9 8-12.1 7.6-28.9-1.1-39.5.5-38.3 5.5-76.8 18.4-114.6 106.6-5.9 96.2-72 99.3-133.2 1.4-27.24 55.5 1.7 60-11.61 2.4-6.92 3.6-13.89 0-21.84-8.6-19.29-23.9-20.32-36.7-20.63-12.3-7.36-22.6-25.96-35.5-26.31zm6.7 19.58c4.9 2.64 3.8 7.47 2.7 10.11-6.6 1.96-16.3-1.08-20.8-4.59 3.9-2.99 12.2-5.39 18.1-5.52zM80.6 302.3c3.05 7.8 5.74 15.6 7.35 23.2 3.22 15.3 4.91 30.7 5.72 46.2-7.48 10.3-7.78 26.1.59 35-.25 21.6-1.3 43.2-1.52 64.7-4.54-7.5-12.92-14-24.94-17.1.16-14.4-.44-32.4-1.08-50.6 6.91-10.2 7.01-25.6-1.11-34.3-.67-27-.34-49.4 3.78-54.1 3.95-4.5 7.67-8.8 11.21-13z" />
                  </svg>
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
