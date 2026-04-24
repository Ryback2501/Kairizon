"use client";

import { useEffect, useState } from "react";
import type { Product } from "@prisma/client";
import { ProductCard } from "./ProductCard";

interface ProductListProps {
  refreshKey?: number;
}

export function ProductList({ refreshKey }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json() as Product[];
        setProducts(data);
      }
      setLoading(false);
    }
    void fetchProducts();
  }, [refreshKey]);

  function handleDeleted(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function handleUpdated(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <div className="space-y-6">
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
