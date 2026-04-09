import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { ProductList } from "@/components/ProductList";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

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
