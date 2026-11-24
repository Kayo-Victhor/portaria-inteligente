import { useEffect, useState, type FormEvent } from "react";
import { Building2, Users, Trash2, UserCheck, UserX } from "lucide-react";
import { AxiosError } from "axios";
import { api } from "../../api/client";
import { AppLayout } from "../../components/AppLayout";
import type { Role, Unit, User } from "../../types";

const roleBadgeLabels: Record<Role, string> = {
  ADMIN: "Admin",
  CONCIERGE: "Portaria",
  RESIDENT: "Morador",
};

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"users" | "units">("users");

  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Formulário de Usuário
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("RESIDENT");
  const [unitId, setUnitId] = useState("");
  const [userError, setUserError] = useState("");

  // Formulário de Unidade
  const [block, setBlock] = useState("");
  const [number, setNumber] = useState("");
  const [unitError, setUnitError] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAdminData() {
      try {
        const [usersRes, unitsRes] = await Promise.all([
          api.get<{ users: User[] }>("/users"),
          api.get<{ units: Unit[] }>("/units"),
        ]);

        if (isMounted) {
          setUsers(usersRes.data.users);
          setUnits(unitsRes.data.units);
          if (unitsRes.data.units.length > 0) {
            setUnitId(unitsRes.data.units[0].id);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAdminData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setUserError("");
    setSubmitting(true);

    try {
      const response = await api.post<{ user: User }>("/users", {
        name,
        email,
        password,
        role,
        unitId: role === "RESIDENT" ? unitId : null,
      });

      setUsers((prev) => [response.data.user, ...prev]);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        setUserError(
          data.issues?.[0]?.message || data.message || "Erro ao criar usuário.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleUserStatus(target: User) {
    try {
      const response = await api.patch<{ user: User }>(
        `/users/${target.id}/status`,
        {
          isActive: !target.isActive,
        },
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? response.data.user : u)),
      );
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  }

  async function handleCreateUnit(e: FormEvent) {
    e.preventDefault();
    setUnitError("");
    setSubmitting(true);

    try {
      const response = await api.post<{ unit: Unit }>("/units", {
        block,
        number,
      });

      const createdUnit = {
        ...response.data.unit,
        _count: { residents: 0, deliveries: 0 },
      };
      setUnits((prev) => [...prev, createdUnit]);
      if (!unitId) {
        setUnitId(createdUnit.id);
      }
      setBlock("");
      setNumber("");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        setUnitError(err.response.data.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUnit(id: string) {
    try {
      await api.delete(`/units/${id}`);
      setUnits((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  }

  return (
    <AppLayout>
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "users"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Usuários</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("units")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "units"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Unidades</span>
        </button>
      </div>

      {activeTab === "users" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Novo Usuário
              </h2>

              {userError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {userError}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Senha Inicial (mín. 8 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Perfil de Acesso
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  >
                    <option value="RESIDENT">Morador</option>
                    <option value="CONCIERGE">Porteiro</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                {role === "RESIDENT" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Unidade Habitacional
                    </label>
                    <select
                      required
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.block} - Apto {u.number}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? "Salvando..." : "Cadastrar Usuário"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Usuários Cadastrados
              </h2>

              {loading ? (
                <p className="text-sm text-slate-500">Carregando usuários...</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-col justify-between gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {u.name}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {roleBadgeLabels[u.role]}
                          </span>
                          {!u.isActive && (
                            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {u.email}
                          {u.unit &&
                            ` · ${u.unit.block} - Apto ${u.unit.number}`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(u)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                          u.isActive
                            ? "border-red-200 text-red-700 hover:bg-red-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            <span>Desativar</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Reativar</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Nova Unidade
              </h2>

              {unitError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {unitError}
                </div>
              )}

              <form onSubmit={handleCreateUnit} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Bloco / Torre
                  </label>
                  <input
                    type="text"
                    required
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    placeholder="Ex: Bloco A"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Número do Apartamento
                  </label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Ex: 304"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? "Salvando..." : "Cadastrar Unidade"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Unidades Cadastradas
              </h2>

              {loading ? (
                <p className="text-sm text-slate-500">Carregando unidades...</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {units.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {u.block} - Apto {u.number}
                        </p>
                        <p className="text-xs text-slate-500">
                          {u._count?.residents ?? 0} morador(es) ·{" "}
                          {u._count?.deliveries ?? 0} encomenda(s) pendente(s)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteUnit(u.id)}
                        title="Excluir unidade"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
