import React, { useState } from 'react';
import { Download, Copy, Check, QrCode, Smartphone, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DownloadCardProps {
  appUrl?: string;
}

export default function DownloadCard({ appUrl }: DownloadCardProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const finalUrl = appUrl || window.location.origin || "https://invergrow.com";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(finalUrl)}&color=059669&bgcolor=09090b`;

  const APK_URL = "https://github.com/joanakar3dmoon/Invergrow/releases/download/latest-debug/invergrow-debug.apk";

  const handleCopy = () => {
    navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadApk = () => {
    const link = document.createElement('a');
    link.href = APK_URL;
    link.download = "InverGrow-v1.0.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="download-card-container" className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/40">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-5 -mt-5" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-zinc-800/10 rounded-full blur-2xl" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4 max-w-xl">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 shrink-0">
            <Smartphone className="w-6 h-6" id="smartphone-icon" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-medium text-zinc-100 font-sans tracking-tight">
                Llevar InverGrow al Movil Real
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 rounded-full">
                Disponible
              </span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Descarga la APK real compilada y lista para instalar en Android. Activa la instalacion de fuentes desconocidas en tu movil antes de instalar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            id="btn-download-apk"
            onClick={handleDownloadApk}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-sm rounded-xl cursor-pointer transition-all shadow-md shadow-emerald-950/20"
          >
            <Download className="w-4 h-4" />
            DESCARGAR APK
          </button>

          <button
            id="btn-scan-qr"
            onClick={() => setShowQR(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-xl cursor-pointer transition-all border border-zinc-700/50"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            Escanear QR
          </button>

          <button
            id="btn-copy-link"
            onClick={handleCopy}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700 rounded-xl border border-zinc-700/50 cursor-pointer transition-all group"
            title="Copiar enlace"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-zinc-300 group-hover:text-zinc-100" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-zinc-950/50 border border-zinc-800/40 rounded-xl">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">Nota:</span> Activa <strong className="text-zinc-300">"Instalar apps desconocidas"</strong> en Ajustes de Android antes de instalar. Version debug para pruebas.
        </div>
      </div>

      <AnimatePresence>
        {showQR && (
          <div id="qr-modal-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative"
            >
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <h4 className="text-lg font-medium text-zinc-100 mb-1">
                  Escanea para abrir en movil
                </h4>
                <p className="text-xs text-zinc-400 mb-6 px-4">
                  Apunta la camara de tu movil al codigo QR para abrir InverGrow directamente.
                </p>
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800/60 inline-block mb-6 relative">
                  <img
                    src={qrCodeUrl}
                    alt="InverGrow QR"
                    className="w-48 h-48 rounded-lg select-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800/80 px-3 py-2 rounded-lg break-all text-xs text-zinc-400 font-mono mb-6 max-w-xs mx-auto flex items-center justify-between gap-2">
                  <span className="truncate">{finalUrl}</span>
                  <button onClick={handleCopy} className="text-emerald-400 hover:text-emerald-300 shrink-0">
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <button
                  id="btn-close-qr"
                  onClick={() => setShowQR(false)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-xl cursor-pointer transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
