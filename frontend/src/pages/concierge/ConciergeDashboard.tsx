import { useEffect, useState, type FormEvent } from "react";
import {
  Search,
  LogIn,
  LogOut,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  QrCode,
  BookOpen,
} from "lucide-react";
import { AxiosError } from "axios";
import { api } from "../../api/client";
import { AppLayout } from "../../components/AppLayout";
import { QrScannerModal } from "../../components/QrScannerModal";
import { OccurrencesBoard } from "../../components/OccurrencesBoard";

interface UnitOption {
  id: string;
  block: string;
  number: string;
}

interface CheckedPassResponse {
  pass: {
    id: string;
    code: string;
    visitorName: string;
    visitorDocument: string | null;
    visitorType: "VISITOR" | "SERVICE_PROVIDER";
    companyName?: string | null;
    status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
    validFrom: string;
    validUntil: string;
    unit: {
      block: string;
      number: string;
    };
    createdBy: {
      name: string;
    };
  };
  suggestedAction: "ENTRY" | "EXIT";
}

interface AccessLogItem {
  id: string;
  action: "ENTRY" | "EXIT";
  timestamp: string;
  pass?: {
    visitorName: string;
    visitorType: "VISITOR" | "SERVICE_PROVIDER";
    unit?: {
      block: string;
      number: string;
    };
  };
  registeredBy?: { name: string } | null;
  concierge?: { name: string } | null;
  user?: { name: string } | null;
}

interface Delivery {
  id: string;
  description: string;
  trackingCode: string | null;
  status: "PENDING" | "PICKED_UP";
  arrivedAt: string;
  pickedUpAt: string | null;
  pickedUpBy: string | null;
  unit: {
    id: string;
    block: string;
    number: string;
  };
}

export function ConciergeDashboard() {
  const [activeTab, setActiveTab] = useState<
    "access" | "deliveries" | "occurrences"
  >("access");

  // Estados de Acesso / Convites
  const [searchCode, setSearchCode] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [checkedData, setCheckedData] = useState<CheckedPassResponse | null>(
    null,
  );
  const [visitorDocument, setVisitorDocument] = useState("");
  const [accessMessage, setAccessMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [logs, setLogs] = useState<AccessLogItem[]>([]);

  // Estados de Encomendas
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryUnitId, setDeliveryUnitId] = useState("");
  const [deliveryDescription, setDeliveryDescription] = useState("");
  const [deliveryTracking, setDeliveryTracking] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Confirmação de retirada de encomenda
  const [pickupTargetId, setPickupTargetId] = useState<string | null>(null);
  const [pickupPin, setPickupPin] = useState("");
  const [pickedUpBy, setPickedUpBy] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function refreshOperationalData() {
    const [logsRes, deliveriesRes] = await Promise.all([
      api.get<{ logs: AccessLogItem[] }>("/passes/logs"),
      api.get<{ deliveries: Delivery[] }>("/deliveries"),
    ]);
    setLogs(logsRes.data.logs);
    setDeliveries(deliveriesRes.data.deliveries);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [logsRes, deliveriesRes, unitsRes] = await Promise.all([
          api.get<{ logs: AccessLogItem[] }>("/passes/logs"),
          api.get<{ deliveries: Delivery[] }>("/deliveries"),
          api.get<{ units: UnitOption[] }>("/units"),
        ]);

        if (isMounted) {
          setLogs(logsRes.data.logs);
          setDeliveries(deliveriesRes.data.deliveries);
          setUnits(unitsRes.data.units);
          if (unitsRes.data.units.length > 0) {
            setDeliveryUnitId(unitsRes.data.units[0].id);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sincronização silenciosa a cada 10s ou ao focar na janela
  useEffect(() => {
    let isMounted = true;

    async function silentRefresh() {
      if (document.hidden) return;
      try {
        const [logsRes, deliveriesRes] = await Promise.all([
          api.get<{ logs: AccessLogItem[] }>("/passes/logs"),
          api.get<{ deliveries: Delivery[] }>("/deliveries"),
        ]);
        if (isMounted) {
          setLogs(logsRes.data.logs);
          setDeliveries(deliveriesRes.data.deliveries);
        }
      } catch {
        // Ignora falhas momentâneas de rede em segundo plano
      }
    }

    const intervalId = setInterval(silentRefresh, 10000);
    window.addEventListener("focus", silentRefresh);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", silentRefresh);
    };
  }, []);

  async function verifyPassCode(rawCode: string) {
    setAccessMessage(null);
    setCheckedData(null);

    const normalized = rawCode.trim().toUpperCase();
    if (!normalized) return;

    setSubmitting(true);
    try {
      const response = await api.get<CheckedPassResponse>(
        `/passes/check/${normalized}`,
      );
      setCheckedData(response.data);
      setVisitorDocument(response.data.pass.visitorDocument || "");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        setAccessMessage({ type: "error", text: err.response.data.message });
      } else {
        setAccessMessage({ type: "error", text: "Erro ao consultar código." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckCode(e: FormEvent) {
    e.preventDefault();
    await verifyPassCode(searchCode);
  }

  function handleQrDetected(code: string) {
    setIsScannerOpen(false);
    setSearchCode(code);
    verifyPassCode(code);
  }

  async function handleRegisterAccess(action: "ENTRY" | "EXIT") {
    if (!checkedData) return;

    if (
      checkedData.pass.visitorType === "SERVICE_PROVIDER" &&
      !visitorDocument.trim()
    ) {
      setAccessMessage({
        type: "error",
        text: "Informe o CPF ou RG do prestador de serviço antes de liberar.",
      });
      return;
    }

    setSubmitting(true);
    setAccessMessage(null);

    try {
      await api.post(`/passes/${checkedData.pass.id}/register`, {
        action,
        visitorDocument: visitorDocument.trim() || undefined,
      });

      setAccessMessage({
        type: "success",
        text:
          action === "ENTRY"
            ? `Entrada registrada para ${checkedData.pass.visitorName}.`
            : `Saída registrada para ${checkedData.pass.visitorName}.`,
      });
      setCheckedData(null);
      setSearchCode("");
      setVisitorDocument("");
      await refreshOperationalData();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        setAccessMessage({ type: "error", text: err.response.data.message });
      } else {
        setAccessMessage({
          type: "error",
          text: "Erro ao registrar movimentação.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateDelivery(e: FormEvent) {
    e.preventDefault();
    setDeliveryMessage(null);
    setSubmitting(true);

    try {
      await api.post("/deliveries", {
        unitId: deliveryUnitId,
        description: deliveryDescription,
        trackingCode: deliveryTracking.trim() || undefined,
      });

      setDeliveryMessage({
        type: "success",
        text: "Encomenda registrada! O morador já pode visualizar o PIN de retirada.",
      });
      setDeliveryDescription("");
      setDeliveryTracking("");
      await refreshOperationalData();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        setDeliveryMessage({
          type: "error",
          text:
            data.issues?.[0]?.message ||
            data.message ||
            "Erro ao registrar encomenda.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPickup(e: FormEvent) {
    e.preventDefault();
    if (!pickupTargetId) return;

    setDeliveryMessage(null);
    setSubmitting(true);

    try {
      await api.patch(`/deliveries/${pickupTargetId}/pickup`, {
        pin: pickupPin.trim(),
        pickedUpBy: pickedUpBy.trim(),
      });

      setDeliveryMessage({
        type: "success",
        text: "Retirada confirmada com sucesso!",
      });
      setPickupTargetId(null);
      setPickupPin("");
      setPickedUpBy("");
      await refreshOperationalData();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        setDeliveryMessage({ type: "error", text: err.response.data.message });
      } else {
        setDeliveryMessage({
          type: "error",
          text: "Erro ao validar retirada.",
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
          onClick={() => setActiveTab("access")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "access"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Controle de Acesso</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("deliveries")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "deliveries"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Encomendas</span>
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

      {/* ABA 1: CONTROLE DE ACESSO */}
      {activeTab === "access" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Validar Convite / QR Code
              </h2>

              <form onSubmit={handleCheckCode} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  placeholder="Ex: A9F2K81B"
                  maxLength={12}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase focus:border-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  title="Ler QR Code pela câmera"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline">QR</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Verificar
                </button>
              </form>

              {isScannerOpen && (
                <QrScannerModal
                  onScanSuccess={handleQrDetected}
                  onClose={() => setIsScannerOpen(false)}
                />
              )}

              {accessMessage && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${
                    accessMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{accessMessage.text}</span>
                </div>
              )}

              {checkedData && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white">
                      {checkedData.pass.visitorType === "SERVICE_PROVIDER"
                        ? "Prestador de Serviço"
                        : "Visitante"}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      #{checkedData.pass.code}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold text-slate-900">
                    {checkedData.pass.visitorName}
                  </h3>
                  {checkedData.pass.companyName && (
                    <p className="text-xs text-slate-600">
                      Empresa: {checkedData.pass.companyName}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-700">
                    Destino:{" "}
                    <strong>
                      Bloco {checkedData.pass.unit.block} - Apto{" "}
                      {checkedData.pass.unit.number}
                    </strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    Autorizado por: {checkedData.pass.createdBy.name}
                  </p>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Documento (CPF ou RG){" "}
                      {checkedData.pass.visitorType === "SERVICE_PROVIDER"
                        ? "* (obrigatório)"
                        : "(opcional)"}
                    </label>
                    <input
                      type="text"
                      value={visitorDocument}
                      onChange={(e) => setVisitorDocument(e.target.value)}
                      placeholder="Digite o documento conferido na portaria"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRegisterAccess("ENTRY")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Registrar Entrada</span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRegisterAccess("EXIT")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Registrar Saída</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Últimas Movimentações
              </h2>

              {loading ? (
                <p className="text-sm text-slate-500">
                  Carregando registros...
                </p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhuma entrada ou saída registrada recentemente.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const operatorName =
                      log.registeredBy?.name ??
                      log.concierge?.name ??
                      log.user?.name ??
                      "Portaria";

                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {log.pass?.visitorName ?? "Visitante"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Bloco {log.pass?.unit?.block ?? "-"} - Apto{" "}
                            {log.pass?.unit?.number ?? "-"} • Porteiro:{" "}
                            {operatorName}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              log.action === "ENTRY"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {log.action === "ENTRY" ? "Entrada" : "Saída"}
                          </span>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString(
                              "pt-PT",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: ENCOMENDAS */}
      {activeTab === "deliveries" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Registrar Nova Encomenda
              </h2>

              <form onSubmit={handleCreateDelivery} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Unidade Destinatária
                  </label>
                  <select
                    value={deliveryUnitId}
                    onChange={(e) => setDeliveryUnitId(e.target.value)}
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

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Descrição / Volume
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryDescription}
                    onChange={(e) => setDeliveryDescription(e.target.value)}
                    placeholder="Ex: Caixa média Amazon"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Código de Rastreio (opcional)
                  </label>
                  <input
                    type="text"
                    value={deliveryTracking}
                    onChange={(e) => setDeliveryTracking(e.target.value)}
                    placeholder="Ex: BR123456789"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  <span>Receber na Portaria</span>
                </button>
              </form>

              {deliveryMessage && (
                <div
                  className={`mt-4 rounded-lg border px-3 py-2.5 text-xs ${
                    deliveryMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {deliveryMessage.text}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Encomendas na Portaria
              </h2>

              {deliveries.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhuma encomenda registrada.
                </p>
              ) : (
                <div className="space-y-3">
                  {deliveries.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-slate-500">
                            Bloco {item.unit.block} - Apto {item.unit.number}
                          </span>
                          <h3 className="font-medium text-slate-900">
                            {item.description}
                          </h3>
                          {item.trackingCode && (
                            <p className="font-mono text-xs text-slate-500">
                              Rastreio: {item.trackingCode}
                            </p>
                          )}
                        </div>

                        {item.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPickupTargetId(
                                pickupTargetId === item.id ? null : item.id,
                              );
                              setPickupPin("");
                              setPickedUpBy("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>Entregar com PIN</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Retirado por {item.pickedUpBy}
                          </span>
                        )}
                      </div>

                      {pickupTargetId === item.id && (
                        <form
                          onSubmit={handleConfirmPickup}
                          className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3"
                        >
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={pickupPin}
                            onChange={(e) => setPickupPin(e.target.value)}
                            placeholder="PIN de 6 dígitos"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm"
                          />
                          <input
                            type="text"
                            required
                            value={pickedUpBy}
                            onChange={(e) => setPickedUpBy(e.target.value)}
                            placeholder="Nome de quem retirou"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                          >
                            Confirmar Entrega
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: LIVRO DE OCORRÊNCIAS / PASSAGEM DE TURNO */}
      {activeTab === "occurrences" && <OccurrencesBoard />}
    </AppLayout>
  );
}
