import { useEffect, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  UserPlus,
  Package,
  QrCode,
  Ban,
  RefreshCw,
  CheckCircle2,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { AxiosError } from "axios";
import { api } from "../../api/client";
import { AppLayout } from "../../components/AppLayout";
import type { Delivery, VisitorPass, VisitorType } from "../../types";

const visitorTypeLabels: Record<VisitorType, string> = {
  GUEST: "Visitante",
  SERVICE_PROVIDER: "Prestador de Serviço",
  DELIVERY_COURIER: "Entregador",
};

function toLocalDateTimeInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ResidentDashboard() {
  const [activeTab, setActiveTab] = useState<"passes" | "deliveries">("passes");

  // Estados de Convites
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [visitorName, setVisitorName] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType>("GUEST");
  const [visitorDocument, setVisitorDocument] = useState("");
  const [singleUse, setSingleUse] = useState(true);
  const [validFrom, setValidFrom] = useState(() =>
    toLocalDateTimeInput(new Date()),
  );
  const [validUntil, setValidUntil] = useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + 4 * 60 * 60 * 1000)),
  );
  const [selectedQrPass, setSelectedQrPass] = useState<VisitorPass | null>(
    null,
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Estados de Encomendas
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [generatedPinInfo, setGeneratedPinInfo] = useState<{
    deliveryId: string;
    pin: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [passesRes, deliveriesRes] = await Promise.all([
          api.get<{ passes: VisitorPass[] }>("/passes/my-unit"),
          api.get<{ deliveries: Delivery[] }>("/deliveries/my-unit"),
        ]);
        if (isMounted) {
          setPasses(passesRes.data.passes);
          setDeliveries(deliveriesRes.data.deliveries);
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

  useEffect(() => {
    async function silentRefresh() {
      if (document.hidden) return; // Não faz requisições se a aba estiver minimizada
      try {
        const [passesRes, deliveriesRes] = await Promise.all([
          api.get<{ passes: VisitorPass[] }>("/passes/my-unit"),
          api.get<{ deliveries: Delivery[] }>("/deliveries/my-unit"),
        ]);
        setPasses(passesRes.data.passes);
        setDeliveries(deliveriesRes.data.deliveries);
      } catch {
        // Ignora falhas momentâneas de rede em segundo plano
      }
    }

    const intervalId = setInterval(silentRefresh, 10000);
    window.addEventListener("focus", silentRefresh);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", silentRefresh);
    };
  }, []);

  async function handleRefresh() {
    setLoading(true);
    try {
      const [passesRes, deliveriesRes] = await Promise.all([
        api.get<{ passes: VisitorPass[] }>("/passes/my-unit"),
        api.get<{ deliveries: Delivery[] }>("/deliveries/my-unit"),
      ]);
      setPasses(passesRes.data.passes);
      setDeliveries(deliveriesRes.data.deliveries);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePass(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const response = await api.post<{ pass: VisitorPass }>("/passes", {
        visitorName,
        visitorType,
        visitorDocument: visitorDocument.trim() || null,
        singleUse,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
      });

      setPasses((prev) => [response.data.pass, ...prev]);
      setSelectedQrPass(response.data.pass);
      setVisitorName("");
      setVisitorDocument("");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        if (data.issues?.length) {
          setFormError(data.issues[0].message);
        } else {
          setFormError(data.message || "Erro ao criar convite.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokePass(passId: string) {
    try {
      await api.patch(`/passes/${passId}/revoke`);
      setPasses((prev) =>
        prev.map((p) => (p.id === passId ? { ...p, status: "REVOKED" } : p)),
      );
      if (selectedQrPass?.id === passId) {
        setSelectedQrPass(null);
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  }

  async function handleRegeneratePin(deliveryId: string) {
    try {
      const response = await api.post<{
        deliveryId: string;
        pickupPin: string;
      }>(`/deliveries/${deliveryId}/regenerate-pin`);
      setGeneratedPinInfo({
        deliveryId: response.data.deliveryId,
        pin: response.data.pickupPin,
      });
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const pendingDeliveriesCount = deliveries.filter(
    (d) => d.status === "PENDING",
  ).length;

  return (
    <AppLayout>
      {/* Navegação por Abas */}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("passes")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "passes"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>Convites de Visitantes</span>
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
          <span>Minhas Encomendas</span>
          {pendingDeliveriesCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {pendingDeliveriesCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "passes" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Formulário de Novo Convite */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Gerar Novo Convite
              </h2>

              {formError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreatePass} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Nome do Visitante
                  </label>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Tipo de Acesso
                    </label>
                    <select
                      value={visitorType}
                      onChange={(e) =>
                        setVisitorType(e.target.value as VisitorType)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    >
                      <option value="GUEST">Visitante</option>
                      <option value="SERVICE_PROVIDER">Prestador</option>
                      <option value="DELIVERY_COURIER">Entregador</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Documento (Opcional)
                    </label>
                    <input
                      type="text"
                      value={visitorDocument}
                      onChange={(e) => setVisitorDocument(e.target.value)}
                      placeholder="CPF ou RG"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Válido a partir de
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Válido até
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={singleUse}
                    onChange={(e) => setSingleUse(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span>Uso único (expira após a primeira entrada)</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting
                    ? "Gerando convite..."
                    : "Gerar Convite e QR Code"}
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Convites + Modal/Card de QR Code */}
          <div className="space-y-4 lg:col-span-7">
            {selectedQrPass && (
              <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white p-5 shadow-xs sm:flex-row">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <QRCodeSVG value={selectedQrPass.code} size={96} />
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Passe Ativo para Portaria
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedQrPass.visitorName}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-sm font-bold text-slate-900">
                        {selectedQrPass.code}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(selectedQrPass.code)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        {copiedCode === selectedQrPass.code ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedQrPass(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Fechar QR
                </button>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Convites da Unidade
              </h2>

              {loading ? (
                <p className="text-sm text-slate-500">Carregando convites...</p>
              ) : passes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhum convite gerado para esta unidade.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {passes.map((pass) => (
                    <div
                      key={pass.id}
                      className="flex flex-col justify-between gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {pass.visitorName}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {visitorTypeLabels[pass.visitorType]}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              pass.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : pass.status === "USED"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {pass.status === "ACTIVE"
                              ? "Ativo"
                              : pass.status === "USED"
                                ? "Utilizado"
                                : pass.status === "REVOKED"
                                  ? "Revogado"
                                  : "Expirado"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Código:{" "}
                          <strong className="font-mono">{pass.code}</strong> ·
                          Até{" "}
                          {new Date(pass.validUntil).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>

                      {pass.status === "ACTIVE" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedQrPass(pass)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            <span>QR Code</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokePass(pass.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>Revogar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Aba de Encomendas */
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Encomendas da Unidade
            </h2>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Atualizar</span>
            </button>
          </div>

          {generatedPinInfo && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Novo PIN de Retirada Gerado
                </p>
                <p className="mt-0.5 text-sm text-amber-900">
                  Informe este código de 4 dígitos na portaria para retirar o
                  pacote:{" "}
                  <strong className="ml-1 rounded bg-white px-2.5 py-0.5 font-mono text-base tracking-widest text-slate-900">
                    {generatedPinInfo.pin}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedPinInfo(null)}
                className="text-xs font-medium text-amber-800 hover:underline"
              >
                Ocultar
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Carregando encomendas...</p>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma encomenda registrada para esta unidade.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {delivery.carrier}
                      </span>
                      {delivery.trackingCode && (
                        <span className="font-mono text-xs text-slate-500">
                          ({delivery.trackingCode})
                        </span>
                      )}
                      {delivery.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          <Clock className="h-3 w-3" />
                          Aguardando Retirada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Retirado
                        </span>
                      )}
                    </div>

                    {delivery.description && (
                      <p className="mt-1 text-sm text-slate-600">
                        {delivery.description}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-slate-500">
                      Recebido em{" "}
                      {new Date(delivery.receivedAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {delivery.status === "PICKED_UP" &&
                        delivery.pickedUpBy && (
                          <> · Retirado por {delivery.pickedUpBy}</>
                        )}
                    </p>
                  </div>

                  {delivery.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleRegeneratePin(delivery.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Gerar Novo PIN</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
