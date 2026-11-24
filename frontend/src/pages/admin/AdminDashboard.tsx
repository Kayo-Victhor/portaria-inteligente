import { useEffect, useState, type FormEvent } from "react";
import {
  Users,
  Building2,
  UserPlus,
  Plus,
  Shield,
  BookOpen,
} from "lucide-react";
import { AxiosError } from "axios";
import { api } from "../../api/client";
import { AppLayout } from "../../components/AppLayout";
import { OccurrencesBoard } from "../../components/OccurrencesBoard";
import type { Role } from "../../types";

interface UnitItem {
  id: string;
  block: string;
  number: string;
  floor?: number | null;
  _count?: {
    residents: number;
  };
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  unit?: {
    block: string;
    number: string;
  } | null;
}

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  CONCIERGE: "Porteiro",
  RESIDENT: "Morador",
};

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"users" | "units" | "occurrences">(
    "users",
  );

  const [users, setUsers] = useState<UserItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);

  // Formulário de Usuário
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("RESIDENT");
  const [unitId, setUnitId] = useState("");
  const [userFeedback, setUserFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Formulário de Unidade
  const [block, setBlock] = useState("");
  const [number, setNumber] = useState("");
  const [unitFeedback, setUnitFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadAdminData() {
    const [usersRes, unitsRes] = await Promise.all([
      api.get<{ users: UserItem[] }>("/users"),
      api.get<{ units: UnitItem[] }>("/units"),
    ]);
    setUsers(usersRes.data.users);
    setUnits(unitsRes.data.units);
    if (!unitId && unitsRes.data.units.length > 0) {
      setUnitId(unitsRes.data.units[0].id);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const [usersRes, unitsRes] = await Promise.all([
          api.get<{ users: UserItem[] }>("/users"),
          api.get<{ units: UnitItem[] }>("/units"),
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

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setUserFeedback(null);
    setSubmitting(true);

    try {
      await api.post("/users", {
        name,
        email,
        password,
        role,
        unitId: role === "RESIDENT" ? unitId : undefined,
      });

      setUserFeedback({
        type: "success",
        text: "Usuário cadastrado com sucesso!",
      });
      setName("");
      setEmail("");
      setPassword("");
      await loadAdminData();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        setUserFeedback({
          type: "error",
          text:
            data.issues?.[0]?.message ||
            data.message ||
            "Erro ao cadastrar usuário.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleUserStatus(user: UserItem) {
    try {
      await api.patch(`/users/${user.id}/status`, {
        isActive: !user.isActive,
      });
      await loadAdminData();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  }

  async function handleCreateUnit(e: FormEvent) {
    e.preventDefault();
    setUnitFeedback(null);
    setSubmitting(true);

    try {
      await api.post("/units", {
        block: block.trim().toUpperCase(),
        number: number.trim(),
      });

      setUnitFeedback({
        type: "success",
        text: "Unidade cadastrada com sucesso!",
      });
      setBlock("");
      setNumber("");
      await loadAdminData();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        setUnitFeedback({
          type: "error",
          text:
            data.issues?.[0]?.message ||
            data.message ||
            "Erro ao cadastrar unidade.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      {/* Navegação por Abas */}
      <div className="mb-6 flex border-b border-slate-200">
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

        <button
          type="button"
          onClick={() => setActiveTab("occurrences")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "occurrences"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Livro de Turno</span>
        </button>
      </div>

      {/* ABA 1: USUÁRIOS */}
      {activeTab === "users" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-slate-700" />
                <h2 className="text-base font-semibold text-slate-900">
                  Novo Usuário
                </h2>
              </div>

              {userFeedback && (
                <div
                  className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
                    userFeedback.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {userFeedback.text}
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
                    placeholder="Ex: Ana Paula Silva"
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
                    placeholder="usuario@condominio.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Senha Inicial
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
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
                      Unidade Vinculada
                    </label>
                    <select
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          Bloco {u.block} - Apto {u.number}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {submitting ? "Salvando..." : "Cadastrar Usuário"}
                  </span>
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
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {user.name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            <Shield className="h-3 w-3" />
                            {roleLabels[user.role]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {user.email}
                          {user.unit &&
                            ` • Bloco ${user.unit.block} - Apto ${user.unit.number}`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(user)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          user.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {user.isActive ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: UNIDADES */}
      {activeTab === "units" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Nova Unidade
              </h2>

              {unitFeedback && (
                <div
                  className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
                    unitFeedback.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {unitFeedback.text}
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
                    placeholder="Ex: A"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Número do Apartamento / Casa
                  </label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Ex: 102"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Unidade</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Unidades Cadastradas ({units.length})
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
                  >
                    <p className="font-semibold text-slate-900">
                      Bloco {unit.block} - Apto {unit.number}
                    </p>
                    {unit._count && (
                      <p className="mt-1 text-xs text-slate-500">
                        {unit._count.residents} morador(es) vinculado(s)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: LIVRO DE OCORRÊNCIAS / PASSAGEM DE TURNO */}
      {activeTab === "occurrences" && <OccurrencesBoard />}
    </AppLayout>
  );
}
