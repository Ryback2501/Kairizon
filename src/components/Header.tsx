import { auth, signOut } from "@/lib/auth";
import { Button } from "./ui/Button";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-black/8 bg-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-cal text-lg font-semibold text-brand-charcoal tracking-tight">
          Kairizon
        </span>
        {session && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/auth/signin" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        )}
      </div>
    </header>
  );
}
