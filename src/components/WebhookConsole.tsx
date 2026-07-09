import React, { useState, useEffect } from 'react';
import { Terminal, Play, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Info, Code, FileCode } from 'lucide-react';
import { WebhookLog, Collaborator } from '../types';

interface WebhookConsoleProps {
  collaborators: Collaborator[];
  onInjectWebhook: (payload: any) => Promise<void>;
  webhookLogs: WebhookLog[];
  onReset: () => Promise<void>;
  statusMessage?: { type: 'success' | 'error', text: string } | null;
}

export default function WebhookConsole({
  collaborators,
  onInjectWebhook,
  webhookLogs,
  onReset,
  statusMessage
}: WebhookConsoleProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('stripe-success');
  const [jsonPayload, setJsonPayload] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'logs'>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payload templates generator
  const getTemplatePayload = (type: string): any => {
    // Pick first collaborator ID if available, otherwise default
    const colId = collaborators.length > 0 ? collaborators[0].id : 'col-1';
    const colWage = collaborators.length > 0 ? collaborators[0].wage : 1500;

    switch (type) {
      case 'stripe-success':
        return {
          event: "payout.paid",
          data: {
            id: `po_str_${Math.floor(100000 + Math.random() * 900000)}`,
            amount: 150000, // €1,500.00 in Stripe cents
            currency: "eur",
            arrival_date: Math.floor(Date.now() / 1000)
          }
        };
      case 'stripe-failed':
        return {
          event: "payout.failed",
          data: {
            id: `po_str_${Math.floor(100000 + Math.random() * 900000)}`,
            amount: 120000, // €1,200.00 in Stripe cents
            failure_code: "insufficient_funds",
            failure_message: "Rechazado por fondos insuficientes en la cuenta de origen."
          }
        };
      case 'custom-success':
        return {
          event: "payout_status_update",
          reference: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
          status: "completed",
          amount: 850.00
        };
      case 'payroll-confirmed':
        return {
          event: "collaborator_payment_confirmed",
          collaboratorId: colId,
          amount: colWage
        };
      default:
        return {};
    }
  };

  // Update editor when template changes
  useEffect(() => {
    const payload = getTemplatePayload(selectedTemplate);
    setJsonPayload(JSON.stringify(payload, null, 2));
    setJsonError(null);
  }, [selectedTemplate, collaborators]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJsonPayload(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleTriggerWebhook = async () => {
    try {
      const parsed = JSON.parse(jsonPayload);
      setIsSubmitting(true);
      await onInjectWebhook(parsed);
      // Switch to logs tab automatically to show the event processing
      setActiveTab('logs');
    } catch (err: any) {
      setJsonError("Error de validación JSON antes de enviar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="webhook-console-container" className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Console Header */}
      <div className="bg-zinc-900 px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 font-sans">
              Consola Simuladora de Webhooks (Receptor API)
            </h3>
            <p className="text-xs text-zinc-400">
              Prueba la sincronización de la base de datos inyectando cargas útiles reales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset state */}
          <button
            id="btn-reset-system"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-lg border border-zinc-700 transition-all cursor-pointer"
            title="Restablecer datos de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            Reiniciar
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="bg-zinc-900/40 px-5 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex gap-4">
          <button
            id="tab-webhook-editor"
            onClick={() => setActiveTab('editor')}
            className={`py-3 text-xs font-semibold tracking-wide uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Editor de Payload
          </button>
          <button
            id="tab-webhook-logs"
            onClick={() => setActiveTab('logs')}
            className={`py-3 text-xs font-semibold tracking-wide uppercase border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Historial de Auditoría
            {webhookLogs.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-950 border border-emerald-800/40 text-emerald-400 rounded-full font-mono">
                {webhookLogs.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'editor' && (
          <div className="flex items-center gap-2 py-1">
            <span className="text-[11px] text-zinc-500">Plantilla:</span>
            <select
              id="select-payload-template"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="stripe-success">Stripe: Pago Exitoso (payout.paid)</option>
              <option value="stripe-failed">Stripe: Pago Fallido (payout.failed)</option>
              <option value="custom-success">API Custom: Éxito (payout_status_update)</option>
              <option value="payroll-confirmed">Nómina: Pago Confirmado</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Console Area */}
      <div className="flex-1 min-h-[300px] flex flex-col bg-zinc-950 font-mono text-sm relative">
        {activeTab === 'editor' ? (
          <div className="flex-1 flex flex-col p-4">
            {/* Editor Textarea */}
            <div className="flex-1 relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/60 focus-within:border-emerald-500/50 transition-all flex flex-col min-h-[180px]">
              <div className="bg-zinc-900/80 px-3 py-1.5 border-b border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5 text-zinc-400" /> payload.json</span>
                {jsonError ? (
                  <span className="text-red-400 font-semibold text-[10px]">JSON Inválido</span>
                ) : (
                  <span className="text-emerald-400 font-semibold text-[10px]">JSON Válido</span>
                )}
              </div>
              <textarea
                id="webhook-payload-textarea"
                value={jsonPayload}
                onChange={handleJsonChange}
                className="flex-1 w-full p-4 bg-transparent text-zinc-300 focus:outline-none resize-none text-xs font-mono font-medium leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Error banner */}
            {jsonError && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span><strong>Sintaxis JSON incorrecta:</strong> {jsonError}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Info className="w-3 h-3 text-zinc-400" /> El endpoint escucha peticiones POST reales en <code className="text-zinc-300 bg-zinc-900 px-1 py-0.5 rounded">/api/webhook</code>
              </span>
              
              <button
                id="btn-inject-webhook"
                onClick={handleTriggerWebhook}
                disabled={!!jsonError || isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-950/10 uppercase tracking-wider shrink-0"
              >
                <Play className="w-3.5 h-3.5 text-white" />
                Inyectar Webhook
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-4 overflow-y-auto max-h-[360px] flex flex-col gap-3">
            {/* Logs List */}
            {webhookLogs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-zinc-500">
                <FileCode className="w-10 h-10 mb-3 text-zinc-600 stroke-[1.5]" />
                <p className="text-xs font-sans">No se han registrado transacciones ni eventos de webhook aún.</p>
                <p className="text-[11px] mt-1 font-sans">¡Inyecta un evento desde el editor para ver la respuesta del sistema!</p>
              </div>
            ) : (
              webhookLogs.map((log) => (
                <div key={log.id} className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-4 transition-all hover:bg-zinc-900/50">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      {log.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-xs font-semibold text-zinc-200">
                        {log.type}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded font-sans uppercase ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-950 border border-emerald-900/30 text-emerald-400'
                          : 'bg-red-950 border border-red-900/30 text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                  </div>

                  <p className="text-xs text-zinc-300 mb-3 leading-relaxed font-sans">
                    {log.message}
                  </p>

                  <details className="group">
                    <summary className="text-[10px] text-emerald-400/90 hover:text-emerald-300 font-semibold cursor-pointer select-none transition-all list-none flex items-center gap-1 font-sans">
                      <span>▶</span> Ver Payload JSON Sincronizado
                    </summary>
                    <pre className="mt-2 bg-zinc-950 border border-zinc-800/80 p-3 rounded-lg text-[11px] text-zinc-400 overflow-x-auto leading-relaxed max-h-[140px]">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Internal Status Banner */}
      {statusMessage && (
        <div className={`p-3 border-t text-xs font-sans flex items-center gap-2 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400'
            : 'bg-red-950/20 border-red-900/30 text-red-400'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 text-red-500" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
