import { createFileRoute, useNavigate, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, LogOut, Loader2, Upload, ShieldAlert, Sparkles,
  ListChecks, Users, Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — KD Cleaning Technologies" },
      { name: "description", content: "Manage KD Cleaning Technologies services." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Service = {
  id: string;
  title: string;
  slug: string;
  category: string;
  duration: string;
  description: string;
  features: string[];
  image_url: string | null;
  price: number;
  original_price: number | null;
  phone: string | null;
  whatsapp: string | null;
  display_order: number;
  is_active: boolean;
  meta_title: string | null;
  meta_description: string | null;
};

const empty: Omit<Service, "id"> = {
  title: "", slug: "", category: "Home", duration: "", description: "",
  features: [], image_url: null, price: 0, original_price: null,
  phone: "", whatsapp: "", display_order: 0, is_active: true,
  meta_title: "", meta_description: "",
};

function AdminPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setUserId(data.session.user.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
      setAuthChecked(true);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <NotAdmin userId={userId} />;
  }

  if (pathname !== "/admin") {
    return <Outlet />;
  }

  return <AdminDashboard />;
}

function NotAdmin({ userId }: { userId: string | null }) {
  return (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="max-w-lg w-full rounded-3xl glass-card p-8 text-center">
        <div className="size-14 mx-auto rounded-2xl gradient-hero text-primary-foreground grid place-items-center">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="mt-4 text-2xl font-display font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is signed in but doesn't have admin privileges yet.
          Run this SQL in your backend dashboard to grant access:
        </p>
        <pre className="mt-4 text-left text-xs bg-secondary p-3 rounded-xl overflow-auto">
{`INSERT INTO public.user_roles (user_id, role)
VALUES ('${userId ?? "<your-user-id>"}', 'admin');`}
        </pre>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | (Omit<Service, "id"> & { id?: string }) | null>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ["services-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Service[];
    },
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Service deleted");
    qc.invalidateQueries({ queryKey: ["services-admin"] });
    qc.invalidateQueries({ queryKey: ["services-public"] });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Admin Panel</span>
          </div>
          <h1 className="mt-1 text-3xl font-display font-bold">Services</h1>
          <p className="text-sm text-muted-foreground">Add, edit, and manage all cleaning packages.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing({ ...empty })}
            className="inline-flex items-center gap-2 rounded-xl gradient-hero text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-soft"
          >
            <Plus className="size-4" /> New Service
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); }}
            className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium hover:bg-secondary/80"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 border-b overflow-x-auto">
        {[
          { to: "/admin", label: "Services", icon: Briefcase, exact: true },
          { to: "/admin/tasks", label: "Tasks", icon: ListChecks, exact: true },
          { to: "/admin/workers", label: "Workers", icon: Users, exact: true },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent inline-flex items-center gap-2 whitespace-nowrap"
              activeProps={{ className: "px-4 py-2.5 text-sm font-medium text-foreground border-b-2 border-primary inline-flex items-center gap-2 whitespace-nowrap" }}
              activeOptions={{ exact: t.exact }}
            >
              <Icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : services?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No services yet — add your first one.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Service</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Price</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Status</th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {services?.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="size-10 rounded-lg object-cover" />
                      ) : (
                        <div className="size-10 rounded-lg bg-secondary" />
                      )}
                      <div>
                        <div className="font-medium">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.duration}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">{s.category}</td>
                  <td className="px-4 py-3 hidden md:table-cell">₹{Number(s.price).toLocaleString()}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {s.is_active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing(s)} className="size-8 grid place-items-center rounded-lg hover:bg-secondary inline-grid">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => remove(s.id)} className="size-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive inline-grid ml-1">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ServiceEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["services-admin"] });
            qc.invalidateQueries({ queryKey: ["services-public"] });
          }}
        />
      )}
    </div>
  );
}

function ServiceEditor({
  initial, onClose, onSaved,
}: {
  initial: Service | (Omit<Service, "id"> & { id?: string });
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [featuresText, setFeaturesText] = useState((initial.features ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("service-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("service-images").getPublicUrl(path);
      update("image_url", data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        category: form.category,
        duration: form.duration,
        description: form.description,
        features: featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
        image_url: form.image_url,
        price: Number(form.price) || 0,
        original_price: form.original_price ? Number(form.original_price) : null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      };
      if (!payload.title) throw new Error("Title is required");
      if ("id" in form && form.id) {
        const { error } = await supabase.from("services").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Service updated");
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
        toast.success("Service created");
      }
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl rounded-3xl shadow-soft my-10" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-display font-bold">
            {"id" in form && form.id ? "Edit service" : "New service"}
          </h2>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Title">
            <input className={inp} value={form.title} onChange={(e) => update("title", e.target.value)} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Slug (URL)">
              <input className={inp} value={form.slug} placeholder={slugify(form.title)} onChange={(e) => update("slug", e.target.value)} />
            </Field>
            <Field label="Category">
              <input className={inp} value={form.category} onChange={(e) => update("category", e.target.value)} />
            </Field>
          </div>
          <Field label="Duration (e.g. 3 Hours · Weekly)">
            <input className={inp} value={form.duration} onChange={(e) => update("duration", e.target.value)} />
          </Field>
          <Field label="Short description">
            <textarea className={`${inp} min-h-[80px]`} value={form.description} onChange={(e) => update("description", e.target.value)} />
          </Field>
          <Field label="Features (one per line)">
            <textarea className={`${inp} min-h-[100px]`} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
          </Field>

          <Field label="Image">
            <div className="flex items-center gap-3">
              {form.image_url && <img src={form.image_url} alt="" className="size-16 rounded-lg object-cover" />}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 cursor-pointer text-sm">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
              </label>
              <input className={inp} placeholder="…or paste image URL" value={form.image_url ?? ""} onChange={(e) => update("image_url", e.target.value || null)} />
            </div>
          </Field>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Price (₹)">
              <input type="number" className={inp} value={form.price} onChange={(e) => update("price", Number(e.target.value))} />
            </Field>
            <Field label="Original price (₹)">
              <input type="number" className={inp} value={form.original_price ?? ""} onChange={(e) => update("original_price", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Display order">
              <input type="number" className={inp} value={form.display_order} onChange={(e) => update("display_order", Number(e.target.value))} />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <input className={inp} value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp">
              <input className={inp} value={form.whatsapp ?? ""} onChange={(e) => update("whatsapp", e.target.value)} />
            </Field>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">SEO</h3>
            <div className="space-y-4">
              <Field label="Meta title (defaults to title, ~60 chars)">
                <input className={inp} maxLength={70} value={form.meta_title ?? ""} placeholder={form.title} onChange={(e) => update("meta_title", e.target.value)} />
              </Field>
              <Field label="Meta description (~160 chars)">
                <textarea className={`${inp} min-h-[70px]`} maxLength={180} value={form.meta_description ?? ""} placeholder={form.description} onChange={(e) => update("meta_description", e.target.value)} />
              </Field>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} />
            Active (visible on site)
          </label>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-secondary text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl gradient-hero text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
            {saving && <Loader2 className="size-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      {children}
    </div>
  );
}
