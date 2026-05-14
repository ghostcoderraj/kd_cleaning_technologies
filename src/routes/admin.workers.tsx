import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, ShieldCheck, Trash2, Phone, MapPin, Pencil, Power, X, Check, Search, Mail, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { searchWorkers } from "@/lib/workers.functions";

export const Route = createFileRoute("/admin/workers")({
  head: () => ({
    meta: [
      { title: "Manage Workers — KD Cleaning Technologies Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminWorkersPage,
});

type RoleRow = { id: string; user_id: string; role: string };
type WorkerProfile = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  last_seen_at: string | null;
};

function AdminWorkersPage() {
  return (
    <AdminShell title="Workers" subtitle="Grant the worker role and manage cleaning staff.">
      <GrantRoleCard />
      <WorkersList />
    </AdminShell>
  );
}

function GrantRoleCard() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const grant = useMutation({
    mutationFn: async () => {
      const e = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("Enter a valid email");

      const { data: uid, error: lookupErr } = await supabase
        .rpc("admin_get_user_id_by_email", { _email: e });
      if (lookupErr) throw lookupErr;
      if (!uid) throw new Error("No account found with that email. Ask the user to sign up at /auth first.");

      const { error: roleErr } = await supabase
        .from("user_roles").insert({ user_id: uid, role: "worker" });
      if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) throw roleErr;

      const { error: profErr } = await supabase
        .from("worker_profiles")
        .upsert({
          user_id: uid,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: e.toLowerCase(),
          is_active: true,
        }, { onConflict: "user_id" });
      if (profErr) throw profErr;
    },
    onSuccess: () => {
      toast.success("Worker added");
      setEmail(""); setFullName(""); setPhone("");
      qc.invalidateQueries({ queryKey: ["admin-workers"] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      qc.invalidateQueries({ queryKey: ["admin-workers-lite"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="rounded-2xl border bg-card p-5 mb-6">
      <h2 className="font-bold flex items-center gap-2 mb-1">
        <UserPlus className="size-4 text-primary" /> Add a worker
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        The user must first sign up at <code className="bg-secondary px-1 rounded">/auth</code> with their email and password.
        Then enter that email here to grant them worker access.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="email"
          value={email} onChange={(ev) => setEmail(ev.target.value)}
          placeholder="worker@example.com" maxLength={120}
          className="rounded-xl border bg-background px-3 py-2.5 text-sm md:col-span-3"
        />
        <input
          value={fullName} onChange={(ev) => setFullName(ev.target.value)}
          placeholder="Full name" maxLength={100}
          className="rounded-xl border bg-background px-3 py-2.5 text-sm"
        />
        <input
          value={phone} onChange={(ev) => setPhone(ev.target.value)}
          placeholder="Phone (optional)" maxLength={30}
          className="rounded-xl border bg-background px-3 py-2.5 text-sm"
        />
        <button
          onClick={() => grant.mutate()}
          disabled={grant.isPending || !email.trim() || !fullName.trim()}
          className="rounded-xl gradient-hero text-primary-foreground px-4 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {grant.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Grant Worker Role
        </button>
      </div>
    </div>
  );
}

function WorkersList() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<WorkerProfile | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 150);
    return () => clearTimeout(t);
  }, [search]);

  const searchWorkersFn = useServerFn(searchWorkers);

  const { data: searchResult, isFetching } = useQuery({
    queryKey: ["admin-workers", debounced],
    queryFn: () => searchWorkersFn({ data: { q: debounced, limit: 100 } }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
  const profiles = (searchResult?.rows ?? []) as WorkerProfile[];
  const isLoading = !searchResult && isFetching;

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id,user_id,role");
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ userId, next }: { userId: string; next: boolean }) => {
      const { error } = await supabase
        .from("worker_profiles").update({ is_active: next }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.next ? "Worker activated" : "Worker deactivated");
      qc.invalidateQueries({ queryKey: ["admin-workers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const revoke = useMutation({
    mutationFn: async (userId: string) => {
      const { error: rErr } = await supabase
        .from("user_roles").delete().eq("user_id", userId).eq("role", "worker");
      if (rErr) throw rErr;
      const { error: pErr } = await supabase
        .from("worker_profiles").update({ is_active: false }).eq("user_id", userId);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      toast.success("Worker access revoked");
      qc.invalidateQueries({ queryKey: ["admin-workers"] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const resendInvite = async (p: WorkerProfile) => {
    try {
      setResendingId(p.user_id);
      let email = p.email?.trim() || null;
      if (!email) {
        const { data, error } = await supabase.rpc("admin_get_email_by_user_id", { _user_id: p.user_id });
        if (error) throw error;
        email = (data as string | null) ?? null;
        if (email) {
          await supabase.from("worker_profiles").update({ email }).eq("user_id", p.user_id);
        }
      }
      if (!email) throw new Error("No email on file for this worker");
      const redirectTo = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      toast.success(`Invitation email sent to ${email}`);
      qc.invalidateQueries({ queryKey: ["admin-workers"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send invitation");
    } finally {
      setResendingId(null);
    }
  };

  if (isLoading) {
    return <div className="p-12 grid place-items-center rounded-2xl border bg-card"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  if (!debounced && !profiles.length) {
    return <div className="p-12 text-center text-muted-foreground text-sm rounded-2xl border bg-card">No workers yet.</div>;
  }

  const filtered = profiles;

  return (
    <>
      <div className="mb-3 relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name or phone…"
          className="w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm rounded-2xl border bg-card">
          No workers match “{search}”.
        </div>
      ) : (
      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Worker</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Phone</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Last seen</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const hasRole = roles?.some((r) => r.user_id === p.user_id && r.role === "worker");
              return (
                <tr key={p.user_id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.full_name?.trim() || "(no name)"}</div>
                    {p.email && (
                      <a href={`mailto:${p.email}`} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                        <Mail className="size-3" /> {p.email}
                      </a>
                    )}
                    <div className="text-xs text-muted-foreground font-mono">{p.user_id.slice(0, 8)}…</div>
                    {p.current_latitude && p.current_longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${p.current_latitude},${p.current_longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <MapPin className="size-3" /> live location
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {p.phone ? (
                      <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-sm hover:text-primary">
                        <Phone className="size-3.5" /> {p.phone}
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                    {p.last_seen_at ? new Date(p.last_seen_at).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {hasRole && p.is_active ? (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setEditing(p)}
                        className="size-8 grid place-items-center rounded-lg hover:bg-secondary"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => toggleActive.mutate({ userId: p.user_id, next: !p.is_active })}
                        disabled={toggleActive.isPending}
                        className={`size-8 grid place-items-center rounded-lg hover:bg-secondary ${p.is_active ? "text-emerald-600" : "text-muted-foreground"}`}
                        aria-label={p.is_active ? "Deactivate" : "Activate"}
                        title={p.is_active ? "Deactivate" : "Activate"}
                      >
                        <Power className="size-4" />
                      </button>
                      <button
                        onClick={() => resendInvite(p)}
                        disabled={resendingId === p.user_id}
                        className="size-8 grid place-items-center rounded-lg hover:bg-secondary text-primary disabled:opacity-50"
                        aria-label="Resend invitation"
                        title="Resend invitation email"
                      >
                        {resendingId === p.user_id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      </button>
                      {hasRole && (
                        <button
                          onClick={() => { if (confirm(`Revoke worker access for ${p.full_name || "this user"}?`)) revoke.mutate(p.user_id); }}
                          className="size-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"
                          aria-label="Revoke"
                          title="Revoke role"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {editing && (
        <EditWorkerDialog
          worker={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-workers"] });
          }}
        />
      )}
    </>
  );
}

function EditWorkerDialog({
  worker, onClose, onSaved,
}: { worker: WorkerProfile; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(worker.full_name ?? "");
  const [phone, setPhone] = useState(worker.phone ?? "");
  const [isActive, setIsActive] = useState(worker.is_active);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("worker_profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          is_active: isActive,
        })
        .eq("user_id", worker.user_id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Worker updated"); onSaved(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-card border shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Edit worker</h3>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-secondary"><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Full name</label>
            <input
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4"
            />
            Active
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium hover:bg-secondary/80"
          >Cancel</button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !fullName.trim()}
            className="rounded-xl gradient-hero text-primary-foreground px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
