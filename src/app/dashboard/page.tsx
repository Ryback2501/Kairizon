import { Header } from "@/components/Header";
import { ProductList } from "@/components/ProductList";

export default function DashboardPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-brand-canvas px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <ProductList />
        </div>
      </main>
    </>
  );
}
