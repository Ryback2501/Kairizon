"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@prisma/client";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
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
          <Button
            variant="ghost"
            size="sm"
            loading={deleting}
            onClick={handleDelete}
            className="shrink-0 text-brand-gray hover:text-red-600"
            aria-label="Remove product"
          >
            ✕
          </Button>
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
                disabled={togglingStock}
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
              const sellers: Seller[] = JSON.parse(product.availableSellers);
              const excluded: string[] = JSON.parse(product.excludedSellers);
              if (sellers.length === 0) return null;
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
                    {sellers.map((seller) => {
                      const isExcluded = excluded.includes(seller.name);
                      const isToggling = togglingSellerName === seller.name;
                      return (
                        <label
                          key={seller.name}
                          className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center px-1 py-0.5 rounded cursor-pointer select-none hover:bg-brand-subtle"
                        >
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            disabled={isToggling}
                            onChange={(e) => toggleSeller(seller.name, !e.target.checked)}
                            className="accent-brand-charcoal"
                          />
                          <span className={`text-xs truncate ${isExcluded ? "text-brand-gray line-through" : "text-brand-charcoal"}`}>
                            {seller.name}
                            {seller.isSecondHand && (
                              <span className="ml-1 text-amber-600 font-medium">(used)</span>
                            )}
                          </span>
                          <span className={`text-xs text-right font-medium ${isExcluded ? "text-brand-gray" : "text-brand-charcoal"}`}>
                            {seller.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                          </span>
                          <span className={`text-xs text-right ${isExcluded ? "text-brand-gray" : "text-brand-gray"}`}>
                            {seller.shipping === 0
                              ? "Free"
                              : seller.shipping.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                          </span>
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
              <Button size="sm" loading={savingTarget} onClick={saveTarget}>
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditingTarget(false);
                  setTargetInput(product.targetPrice?.toString() ?? "");
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setEditingTarget(true)}>
              {product.targetPrice !== null ? "Edit" : "Set target price"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
