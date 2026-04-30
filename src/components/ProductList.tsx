"use client";

import { useEffect, useReducer } from "react";
import type { Product } from "@/types";
import { ProductCard } from "./ProductCard";

interface ProductListProps {
  refreshKey?: number;
}

type State = { loading: boolean; error: boolean; products: Product[] };
type Action =
  | { type: "load" }
  | { type: "success"; products: Product[] }
  | { type: "error" }
  | { type: "delete"; id: string }
  | { type: "update"; product: Product };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return { loading: true, error: false, products: state.products };
    case "success":
      return { loading: false, error: false, products: action.products };
    case "error":
      return { loading: false, error: true, products: state.products };
    case "delete":
      return { ...state, products: state.products.filter((p) => p.id !== action.id) };
    case "update":
      return {
        ...state,
        products: state.products.map((p) => (p.id === action.product.id ? action.product : p)),
      };
  }
}

export function ProductList({ refreshKey }: ProductListProps) {
  const [{ loading, error, products }, dispatch] = useReducer(reducer, {
    loading: true,
    error: false,
    products: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: "load" });
    void fetch("/api/products", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Product[]>;
      })
      .then((data) => dispatch({ type: "success", products: data }))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        dispatch({ type: "error" });
      });
    return () => controller.abort();
  }, [refreshKey]);

  function handleDeleted(id: string) {
    dispatch({ type: "delete", id });
  }

  function handleUpdated(updated: Product) {
    dispatch({ type: "update", product: updated });
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-sm text-brand-gray text-center py-8">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-500 text-center py-8">Failed to load products. Please refresh the page.</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-brand-gray text-center py-8">
          No products tracked yet. Paste an Amazon URL above to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
