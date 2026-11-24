import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, CheckCircle2, Clock, Plus, RotateCcw } from "lucide-react";
import { AxiosError } from "axios";
import { api } from "../api/client";
import type { Occurrence, OccurrenceCategory } from "../types";

const categoryConfig: Record<
  OccurrenceCategory,
  { label: string; badgeClass: string }
> = {
  SHIFT_HANDOFF: {
    label: "Passagem de Turno",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  MAINTENANCE: {
    label: "Manutenção",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  INCIDENT: {
    label: "Incidente / Segurança",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  GENERAL: {
    label: "Geral",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function OccurrencesBoard() {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);

  const [category, setCategory] = useState<OccurrenceCategory>("SHIFT_HANDOFF");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadOccurrences() {
      try {
        const res = await api.get<{ occurrences: Occurrence[] }>(
          "/occurrences",
        );
        if (isMounted) {
          setOccurrences(res.data.occurrences);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOccurrences();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreateOccurrence(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const res = await api.post<{ occurrence: Occurrence }>("/occurrences", {
        category,
        title,
        description,
      });

      setOccurrences((prev) => [res.data.occurrence, ...prev]);
      setTitle("");
      setDescription("");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        setFormError(
          data.issues?.[0]?.message ||
            data.message ||
            "Erro ao salvar registro.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleResolve(id: string) {
    try {
      const res = await api.patch<{ occurrence: Occurrence }>(
        `/occurrences/${id}/resolve`,
      );
      setOccurrences((prev) =>
        prev.map((item) => (item.id === id ? res.data.occurrence : item)),
      );
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  }

  const visibleOccurrences = filterPendingOnly
    ? occurrences.filter((o) => !o.isResolved)
    : occurrences;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Formulário de Novo Registro */}
      <div className="lg:col-span-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Novo Registro de Turno
            </h2>
          </div>

          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateOccurrence} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as OccurrenceCategory)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              >
                <option value="SHIFT_HANDOFF">Passagem de Turno</option>
                <option value="MAINTENANCE">Manutenção</option>
                <option value="INCIDENT">Incidente / Segurança</option>
                <option value="GENERAL">Geral</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Assunto / Título
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Portão da garagem em modo manual"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Detalhes da Ocorrência
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o ocorrido, orientações para o próximo plantão ou providências tomadas..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              <span>
                {submitting ? "Registrando..." : "Registrar no Livro"}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* Lista de Ocorrências */}
      <div className="lg:col-span-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Registros do Livro
            </h2>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={filterPendingOnly}
                onChange={(e) => setFilterPendingOnly(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Mostrar apenas pendentes</span>
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">
              Carregando livro de ocorrências...
            </p>
          ) : visibleOccurrences.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma ocorrência encontrada para o filtro selecionado.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleOccurrences.map((item) => {
                const badge = categoryConfig[item.category];

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 transition ${
                      item.isResolved
                        ? "border-slate-200 bg-slate-50/70 opacity-80"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.badgeClass}`}
                          >
                            {badge.label}
                          </span>
                          {item.isResolved ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolvido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <Clock className="h-3 w-3" />
                              Pendente
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 font-semibold text-slate-900">
                          {item.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleResolve(item.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                          item.isResolved
                            ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                      >
                        {item.isResolved ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Reabrir</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Marcar Resolvido</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                      {item.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                      <span>
                        Registrado por <strong>{item.author.name}</strong> em{" "}
                        {new Date(item.createdAt).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>

                      {item.isResolved && item.resolvedBy && (
                        <span>
                          Concluído por <strong>{item.resolvedBy.name}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
