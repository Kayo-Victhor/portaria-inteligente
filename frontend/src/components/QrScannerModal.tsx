import { useEffect, useRef, useState } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  type CameraDevice,
} from "html5-qrcode";
import { Camera, Flashlight, RefreshCw, X } from "lucide-react";

interface QrScannerModalProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function QrScannerModal({
  onScanSuccess,
  onClose,
}: QrScannerModalProps) {
  const [cameraError, setCameraError] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    let cancelled = false;
    let hasScanned = false;

    const container = document.getElementById("qr-reader-container");
    if (container) {
      container.innerHTML = "";
    }

    const html5QrCode = new Html5Qrcode("qr-reader-container", {
      verbose: false,
      useBarCodeDetectorIfSupported: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    });
    scannerRef.current = html5QrCode;

    const cameraSource: string | { facingMode: string } = selectedCameraId ?? {
      facingMode: "environment",
    };

    const startPromise = html5QrCode
      .start(
        cameraSource,
        {
          fps: 10,
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (cancelled || hasScanned) return;
          hasScanned = true;

          const cleanCode = decodedText.trim().toUpperCase();
          html5QrCode
            .stop()
            .catch(() => {})
            .finally(() => {
              if (!cancelled) {
                onScanSuccessRef.current(cleanCode);
              }
            });
        },
        () => {},
      )
      .then(() => {
        if (cancelled) {
          return html5QrCode.stop().catch(() => {});
        }

        setIsInitializing(false);
        setCameraError("");

        Html5Qrcode.getCameras()
          .then((devices) => {
            if (!cancelled) setCameras(devices);
          })
          .catch(() => {});

        try {
          const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
          setTorchSupported(
            Boolean(capabilities.torchFeature()?.isSupported()),
          );
        } catch {
          setTorchSupported(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsInitializing(false);
          setCameraError(
            "Não foi possível acessar a câmera. Verifique as permissões do navegador.",
          );
        }
      });

    return () => {
      cancelled = true;
      startPromise
        .then(() => {
          if (html5QrCode.isScanning) {
            return html5QrCode.stop();
          }
        })
        .catch(() => {})
        .finally(() => {
          try {
            html5QrCode.clear();
          } catch {
            // Ignora caso o DOM já tenha sido desmontado
          }
        });
    };
  }, [selectedCameraId]);

  async function handleToggleTorch() {
    const scanner = scannerRef.current;
    if (!scanner || !torchSupported) return;

    try {
      const torchFeature = scanner
        .getRunningTrackCameraCapabilities()
        .torchFeature();
      const nextState = !torchOn;
      await torchFeature.apply(nextState);
      setTorchOn(nextState);
    } catch {
      // Ignora caso o aparelho bloqueie o flash
    }
  }

  function handleSwitchCamera() {
    if (cameras.length <= 1) return;
    setIsInitializing(true);
    setTorchOn(false);

    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-semibold tracking-wide">
              Escanear Passe do Visitante
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar câmera"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Área da Câmera */}
        <div className="relative aspect-square w-full bg-black">
          <div
            id="qr-reader-container"
            className="h-full w-full [&>#qr-shaded-region]:!hidden [&_img]:!hidden [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
          />

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {cameraError}
              </p>
            </div>
          )}

          {isInitializing && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-xs text-slate-300">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
              <span>Iniciando câmera...</span>
            </div>
          )}

          {!isInitializing && !cameraError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-56 w-56 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]">
                <span className="absolute -top-0.5 -left-0.5 h-7 w-7 rounded-tl-xl border-t-4 border-l-4 border-emerald-400" />
                <span className="absolute -top-0.5 -right-0.5 h-7 w-7 rounded-tr-xl border-t-4 border-r-4 border-emerald-400" />
                <span className="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
                <span className="absolute -right-0.5 -bottom-0.5 h-7 w-7 rounded-br-xl border-r-4 border-b-4 border-emerald-400" />
              </div>
            </div>
          )}

          {!isInitializing &&
            !cameraError &&
            (torchSupported || cameras.length > 1) && (
              <div className="absolute right-3 bottom-3 left-3 flex items-center justify-center gap-3">
                {torchSupported && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium backdrop-blur-md transition ${
                      torchOn
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-900/80 text-white hover:bg-slate-800"
                    }`}
                  >
                    <Flashlight className="h-3.5 w-3.5" />
                    <span>{torchOn ? "Lanterna Ligada" : "Lanterna"}</span>
                  </button>
                )}

                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-slate-800"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Trocar Câmera</span>
                  </button>
                )}
              </div>
            )}
        </div>

        {/* Rodapé */}
        <div className="bg-slate-900 px-4 py-3 text-center text-xs text-slate-400">
          Centralize o QR Code dentro da moldura para validar automaticamente
        </div>
      </div>
    </div>
  );
}
