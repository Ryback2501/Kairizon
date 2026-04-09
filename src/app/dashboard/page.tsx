import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  return (
    <main className="min-h-screen bg-brand-canvas px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-cal text-3xl font-semibold text-brand-charcoal mb-8">
          Dashboard
        </h1>
        <p className="text-brand-gray">Products will appear here.</p>
      </div>
    </main>
  );
}
