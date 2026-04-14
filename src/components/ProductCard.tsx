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

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(product.id);
    else setDeleting(false);
  }

  // Amazon in the seller list → has stock. No Amazon entry → out of stock.
  const amazonHasStock = (JSON.parse(product.availableSellers) as Seller[]).some(
    (s) => /^amazon$/i.test(s.name.trim())
  );

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
        <div className="flex items-start justify-between gap-2">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-charcoal hover:underline line-clamp-2 leading-snug"
          >
            {product.title}
          </a>
          {/* Delete — circle ghost button, turns red on hover */}
          <button
            disabled={deleting}
            onClick={handleDelete}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-brand-gray hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Remove product"
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

        {/* Row: current price · target price label/input · out-of-stock badge */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-brand-gray">
          {product.currentPrice !== null ? (
            <span className="font-semibold text-brand-charcoal text-sm">
              {product.currentPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
            </span>
          ) : (
            <span>No price data</span>
          )}

          {editingTarget ? (
            <Input
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Target price"
              className="w-28 py-1 text-xs"
            />
          ) : (
            product.targetPrice !== null && (
              <span className="text-xs text-brand-gray">
                Alert below {product.targetPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </span>
            )
          )}

          {!product.inStock && (
            <span className="bg-red-50 text-red-600 font-medium px-2 py-0.5 rounded-pill text-xs">
              Out of stock
            </span>
          )}
        </div>

        {/* Row: toggles — only visible while editing */}
        {editingTarget && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Toggle
                checked={product.trackStock}
                onChange={toggleStockAlert}
                disabled={togglingStock || amazonHasStock}
                label="Notify when back in stock"
              />
              <Toggle
                checked={product.includeSecondHand}
                onChange={toggleSecondHand}
                disabled={togglingSecondHand}
                label="Include second-hand"
              />
            </div>

            {/* Seller selection */}
            {(() => {
              type DisplaySeller = Seller & { outOfStock?: boolean };
              const sellers: Seller[] = JSON.parse(product.availableSellers);
              const excluded: string[] = JSON.parse(product.excludedSellers);
              const amazonSeller = sellers.find((s) => /^amazon$/i.test(s.name.trim()));
              const nonAmazonSellers = sellers
                .filter((s) => !/^amazon$/i.test(s.name.trim()))
                .sort((a, b) => (a.price + a.shipping) - (b.price + b.shipping));
              const displaySellers: DisplaySeller[] = [
                amazonSeller ?? { name: "Amazon", price: 0, shipping: 0, isSecondHand: false, outOfStock: true },
                ...nonAmazonSellers,
              ];
              return (
                <div className="mt-3">
                  {/* Header row */}
                  <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center mb-1 px-1">
                    <span />
                    <span className="text-xs font-semibold text-brand-charcoal">Seller</span>
                    <span className="text-xs font-semibold text-brand-charcoal text-right">Price</span>
                    <span className="text-xs font-semibold text-brand-charcoal text-right">Shipping</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {displaySellers.map((seller) => {
                      const isExcluded = excluded.includes(seller.name);
                      const isToggling = togglingSellerName === seller.name;
                      const isOutOfStock = !!seller.outOfStock;
                      return (
                        <label
                          key={seller.name}
                          className={`grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center px-1 py-0.5 rounded select-none ${isOutOfStock ? "cursor-default" : "cursor-pointer hover:bg-brand-subtle"}`}
                        >
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            disabled={isToggling || isOutOfStock}
                            onChange={(e) => toggleSeller(seller.name, !e.target.checked)}
                            className="accent-brand-charcoal"
                          />
                          <span className={`text-xs truncate ${isExcluded ? "text-brand-gray line-through" : "text-brand-charcoal"}`}>
                            {seller.name}
                            {seller.isSecondHand && (
                              <span className="ml-1 text-amber-600 font-medium">(used)</span>
                            )}
                          </span>
                          {isOutOfStock ? (
                            <span className="col-span-2 text-xs text-right text-red-500 font-medium">Out of stock</span>
                          ) : (
                            <>
                              <span className={`text-xs text-right font-medium ${isExcluded ? "text-brand-gray" : "text-brand-charcoal"}`}>
                                {seller.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                              </span>
                              <span className="text-xs text-right text-brand-gray">
                                {seller.shipping === 0
                                  ? "Free"
                                  : seller.shipping.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                              </span>
                            </>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* Row: action buttons — always at the bottom */}
        <div className="mt-3 flex items-center gap-2">
          {editingTarget ? (
            <>
              {/* Save — dark filled circle, checkmark */}
              <button
                disabled={savingTarget}
                onClick={saveTarget}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Save target price"
              >
                {savingTarget ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              {/* Cancel — subtle circle, X */}
              <button
                onClick={() => {
                  setEditingTarget(false);
                  setTargetInput(product.targetPrice?.toString() ?? "");
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-brand-subtle text-brand-charcoal border border-black/10 hover:opacity-80 transition-opacity"
                aria-label="Cancel editing"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </>
          ) : (
            /* Edit / Set target price — dark filled circle, pencil */
            <button
              onClick={() => setEditingTarget(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-brand-charcoal text-white hover:opacity-80 transition-opacity"
              aria-label={product.targetPrice !== null ? "Edit target price" : "Set target price"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
