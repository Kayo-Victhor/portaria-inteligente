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
} from "lucide-react";
import { QrScannerModal } from "../../components/QrScannerModal";
import { AxiosError } from "axios";
import { api } from "../../api/client";
import { AppLayout } from "../../components/AppLayout";
import type { Delivery, Unit, VisitorPass, VisitorType } from "../../types";

interface CheckedPassResponse {
  pass: VisitorPass;
  validation: {
    canEnter: boolean;
    isExpiredByTime: boolean;
    isTooEarly: boolean;
  };
}

interface AccessLogItem {
  id: string;
  direction: "ENTRY" | "EXIT";
  notes: string | null;
  timestamp: string;
  pass: {
    code: string;
    visitorName: string;
    visitorType: VisitorType;
    unit: { block: string; number: string };
  };
  concierge: { id: string; name: string };
}

export function ConciergeDashboard() {
  const [activeTab, setActiveTab] = useState<"access" | "deliveries">("access");

  // Estados de Validação de Acesso
  const [searchCode, setSearchCode] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [checkedData, setCheckedData] = useState<CheckedPassResponse | null>(
    null,
  );
  const [visitorDocument, setVisitorDocument] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [accessMessage, setAccessMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [logs, setLogs] = useState<AccessLogItem[]>([]);

  // Estados de Encomendas
  const [units, setUnits] = useState<Unit[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [unitId, setUnitId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [description, setDescription] = useState("");
  const [createdPinBanner, setCreatedPinBanner] = useState<{
    unitLabel: string;
    pin: string;
  } | null>(null);

  // Estados de Baixa de Encomenda
  const [pickupTarget, setPickupTarget] = useState<Delivery | null>(null);
  const [pickupPin, setPickupPin] = useState("");
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [pickupError, setPickupError] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [logsRes, unitsRes, deliveriesRes] = await Promise.all([
          api.get<{ logs: AccessLogItem[] }>("/passes/logs"),
          api.get<{ units: Unit[] }>("/units"),
          api.get<{ deliveries: Delivery[] }>("/deliveries"),
        ]);

        if (isMounted) {
          setLogs(logsRes.data.logs);
          setUnits(unitsRes.data.units);
          setDeliveries(deliveriesRes.data.deliveries);
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

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

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

  async function handleRegisterAccess(direction: "ENTRY" | "EXIT") {
    if (!checkedData) return;
    setAccessMessage(null);
    setSubmitting(true);

    try {
      await api.post("/passes/access", {
        code: checkedData.pass.code,
        direction,
        visitorDocument: visitorDocument.trim() || null,
        notes: accessNotes.trim() || null,
      });

      setAccessMessage({
        type: "success",
        text:
          direction === "ENTRY"
            ? `Entrada liberada para ${checkedData.pass.visitorName}.`
            : `Saída registrada para ${checkedData.pass.visitorName}.`,
      });
      setCheckedData(null);
      setSearchCode("");
      setVisitorDocument("");
      setAccessNotes("");
      await refreshOperationalData();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        setAccessMessage({ type: "error", text: err.response.data.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateDelivery(e: FormEvent) {
    e.preventDefault();
    setCreatedPinBanner(null);
    setSubmitting(true);

    try {
      const response = await api.post<{
        delivery: Delivery;
        pickupPin: string;
      }>("/deliveries", {
        unitId,
        carrier,
        trackingCode: trackingCode.trim() || null,
        description: description.trim() || null,
      });

      const created = response.data.delivery;
      setDeliveries((prev) => [created, ...prev]);
      setCreatedPinBanner({
        unitLabel: `${created.unit.block} - Apto ${created.unit.number}`,
        pin: response.data.pickupPin,
      });
      setCarrier("");
      setTrackingCode("");
      setDescription("");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        alert(err.response.data.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPickup(e: FormEvent) {
    e.preventDefault();
    if (!pickupTarget) return;
    setPickupError("");
    setSubmitting(true);

    try {
      const response = await api.patch<{ delivery: Delivery }>(
        `/deliveries/${pickupTarget.id}/pickup`,
        {
          pin: pickupPin,
          pickedUpBy,
        },
      );

      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === pickupTarget.id ? response.data.delivery : d,
        ),
      );
      setPickupTarget(null);
      setPickupPin("");
      setPickedUpBy("");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        setPickupError(err.response.data.message);
      } else {
        setPickupError("Erro ao confirmar retirada.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = deliveries.filter((d) => d.status === "PENDING").length;

  return (
    <AppLayout>
      <div className="mb-6 flex gap-2 border-b border-slate-200">
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
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "access" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Validador de Passe */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Validar Código de Convite
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
                  className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                    accessMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{accessMessage.text}</span>
                </div>
              )}

              {checkedData && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Documento (CPF/RG){" "}
                        {checkedData.pass.visitorType ===
                          "SERVICE_PROVIDER" && (
                          <span className="text-red-600">
                            * (Obrigatório para prestador)
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={visitorDocument}
                        onChange={(e) => setVisitorDocument(e.target.value)}
                        placeholder="Informe o CPF ou RG conferido"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Observação da Portaria (Opcional)
                      </label>
                      <input
                        type="text"
                        value={accessNotes}
                        onChange={(e) => setAccessNotes(e.target.value)}
                        placeholder="Ex: Placa ABC-1234 / Crachá 12"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={
                        !checkedData.validation.canEnter ||
                        submitting ||
                        (checkedData.pass.visitorType === "SERVICE_PROVIDER" &&
                          visitorDocument.trim().length < 5)
                      }
                      onClick={() => handleRegisterAccess("ENTRY")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Liberar Entrada</span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRegisterAccess("EXIT")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-40"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Registrar Saída</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Histórico Recente */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Movimentações Recentes
              </h2>

              {loading ? (
                <p className="text-sm text-slate-500">
                  Carregando registros...
                </p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhuma movimentação registrada na portaria.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              log.direction === "ENTRY"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {log.direction === "ENTRY" ? "ENTRADA" : "SAÍDA"}
                          </span>
                          <span className="font-medium text-slate-900">
                            {log.pass.visitorName}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({log.pass.unit.block} - {log.pass.unit.number})
                          </span>
                        </div>
                        {log.notes && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            Obs: {log.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <p>
                          {new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="font-mono">{log.pass.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Cadastro de Nova Encomenda */}
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Registrar Encomenda
              </h2>

              <form onSubmit={handleCreateDelivery} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Unidade Destino
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

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Transportadora / Origem
                  </label>
                  <input
                    type="text"
                    required
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="Ex: Mercado Livre, Correios, Amazon"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Código de Rastreio (Opcional)
                  </label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Ex: BR123456789"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Descrição do Volume (Opcional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Caixa média / Envelope"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || units.length === 0}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  <span>Registrar e Gerar PIN</span>
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Encomendas + Modal de Retirada */}
          <div className="space-y-4 lg:col-span-8">
            {createdPinBanner && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-emerald-800">
                    Encomenda Registrada ({createdPinBanner.unitLabel})
                  </p>
                  <p className="mt-1 text-sm text-emerald-900">
                    PIN de retirada enviado ao morador:{" "}
                    <strong className="ml-1 rounded bg-white px-2.5 py-0.5 font-mono text-base tracking-widest text-slate-900">
                      {createdPinBanner.pin}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedPinBanner(null)}
                  className="text-xs font-medium text-emerald-800 hover:underline"
                >
                  Fechar
                </button>
              </div>
            )}

            {pickupTarget && (
              <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">
                  Confirmar Retirada — {pickupTarget.unit.block} Apto{" "}
                  {pickupTarget.unit.number} ({pickupTarget.carrier})
                </h3>

                {pickupError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {pickupError}
                  </div>
                )}

                <form
                  onSubmit={handleConfirmPickup}
                  className="mt-3 grid gap-3 sm:grid-cols-3"
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      PIN de 4 Dígitos
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      pattern="\d{4}"
                      value={pickupPin}
                      onChange={(e) => setPickupPin(e.target.value)}
                      placeholder="0000"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tracking-widest focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Nome de Quem Retirou
                    </label>
                    <input
                      type="text"
                      required
                      value={pickedUpBy}
                      onChange={(e) => setPickedUpBy(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPickupTarget(null);
                        setPickupError("");
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Encomendas na Portaria
              </h2>

              {loading ? (
                <p className="text-sm text-slate-500">
                  Carregando encomendas...
                </p>
              ) : deliveries.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhuma encomenda registrada.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deliveries.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                            {item.unit.block} - {item.unit.number}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {item.carrier}
                          </span>
                          {item.status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <Clock className="h-3 w-3" />
                              Pendente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Retirado
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Recebido em{" "}
                          {new Date(item.receivedAt).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                          {item.description && ` · ${item.description}`}
                          {item.pickedUpBy &&
                            ` · Retirado por: ${item.pickedUpBy}`}
                        </p>
                      </div>

                      {item.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => {
                            setPickupTarget(item);
                            setPickupPin("");
                            setPickedUpBy("");
                            setPickupError("");
                          }}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-50"
                        >
                          Dar Baixa (PIN)
                        </button>
                      )}
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
