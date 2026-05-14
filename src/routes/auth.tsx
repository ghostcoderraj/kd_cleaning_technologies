import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — KD Cleaning Technologies Admin" },
      { name: "description", content: "Sign in to manage KD Cleaning Technologies services." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"admin" | "worker">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const routeForUser = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    const set = new Set((roles ?? []).map((r) => r.role));
    if (set.has("admin") || set.has("manager")) return "/admin" as const;
    if (set.has("worker") || set.has("supervisor")) return "/worker" as const;
    return role === "worker" ? ("/worker" as const) : ("/admin" as const);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) navigate({ to: await routeForUser(data.session.user.id) });
    });
     
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const dest = role === "worker" ? "/worker" : "/admin";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${dest}` },
        });
        if (error) throw error;
        toast.success("Account created. You can now sign in.");
        setMode("signin");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        const dest = await routeForUser(data.user!.id);
        navigate({ to: dest });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl glass-card shadow-soft p-8">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg justify-center">
          <span className="grid place-items-center size-9 rounded-xl gradient-hero text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          KD Cleaning Technologies
        </Link>
        <h1 className="mt-6 text-2xl font-display font-bold text-center">
          {mode === "signin"
            ? role === "worker" ? "Worker sign in" : "Admin sign in"
            : role === "worker" ? "Create worker account" : "Create admin account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">
          {role === "worker" ? "Access your assigned tasks." : "Manage services, pricing and content."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`rounded-lg py-2 text-sm font-medium transition ${role === "admin" ? "bg-background shadow-soft" : "text-muted-foreground"}`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setRole("worker")}
            className={`rounded-lg py-2 text-sm font-medium transition ${role === "worker" ? "bg-background shadow-soft" : "text-muted-foreground"}`}
          >
            Worker
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl gradient-hero text-primary-foreground font-semibold py-2.5 shadow-soft hover:shadow-glow transition-shadow disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
