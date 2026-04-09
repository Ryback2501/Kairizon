"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@prisma/client";
import { ProductCard } from "./ProductCard";
import { AddProductForm } from "./AddProductForm";

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json() as Product[];
      setProducts(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  function handleDeleted(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function handleUpdated(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <div className="space-y-6">
      <AddProductForm onAdded={fetchProducts} />

      {loading ? (
        <p className="text-sm text-brand-gray text-center py-8">Loading…</p>
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
