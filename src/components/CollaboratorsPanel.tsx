import React, { useState } from 'react';
import { Users, CreditCard, Plus, Calendar, BadgeEuro, UserPlus, Send, X } from 'lucide-react';
import { Collaborator } from '../types';

interface CollaboratorsPanelProps {
  collaborators: Collaborator[];
  onAddCollaborator: (col: { name: string; role: string; wage: number }) => Promise<void>;
  onTriggerPayrollWebhook: (colId: string, amount: number) => Promise<void>;
  balance: number;
}

export default function CollaboratorsPanel({
  collaborators,
  onAddCollaborator,
  onTriggerPayrollWebhook,
  balance
}: CollaboratorsPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [wage, setWage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPaying, setIsPaying] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !role || !wage) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    const wageNum = Number(wage);
    if (isNaN(wageNum) || wageNum <= 0) {
      setErrorMsg('Introduce un salario mensual válido.');
      return;
    }

    try {
      await onAddCollaborator({ name, role, wage: wageNum });
      setName('');
      setRole('');
      setWage('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error registrando colaborador.');
    }
  };

  const handlePay = async (colId: string, amount: number) => {
    if (amount > balance) {
      alert(`Saldo insuficiente (€${balance.toFixed(2)}) para liquidar la nómina de €${amount.toFixed(2)}.`);
      return;
    }
    try {
      setIsPaying(colId);
      await onTriggerPayrollWebhook(colId, amount);
    } catch (err: any) {
      alert(err.message || 'Error enviando pago.');
    } finally {
      setIsPaying(null);
    }
  };

  return (
    <div id="collaborators-panel-container" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100 font-sans tracking-tight">
              Colaboradores y Nómina
            </h3>
            <p className="text-xs text-zinc-400">
              Automatiza la liquidación y conciliación de saldos del equipo en tiempo real
            </p>
          </div>
        </div>

        <button
          id="btn-add-collaborator"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-950/20"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {showAddForm ? 'Cancelar' : 'Nuevo Miembro'}
        </button>
      </div>

      {/* Add form slider/modal in-line */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-zinc-950 border border-zinc-800 rounded-xl relative">
          <h4 className="text-xs font-bold text-zinc-200 tracking-wide uppercase mb-3 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-500" /> Registrar Nuevo Colaborador
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Nombre Completo</label>
              <input
                id="input-col-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Puesto o Rol</label>
              <input
                id="input-col-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ej. Desarrollador Web"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Salario Mensual (€)</label>
              <input
                id="input-col-wage"
                type="number"
                value={wage}
                onChange={(e) => setWage(e.target.value)}
                placeholder="Ej. 1500"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-red-400 text-xs mb-3 font-sans">{errorMsg}</p>
          )}

          <div className="flex justify-end">
            <button
              id="btn-save-collaborator"
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow"
            >
              Guardar Miembro
            </button>
          </div>
        </form>
      )}

      {/* Collaborators list */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[360px] pr-1">
        {collaborators.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs font-sans">
            No hay colaboradores registrados.
          </div>
        ) : (
          collaborators.map((col) => (
            <div key={col.id} className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-zinc-700/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-sans font-bold uppercase select-none">
                  {col.name.slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100 font-sans">{col.name}</h4>
                  <p className="text-xs text-zinc-400 font-sans mb-1">{col.role}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <BadgeEuro className="w-3.5 h-3.5 text-emerald-500/80" />
                      €{col.wage.toLocaleString('es-ES')} / mes
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      Último Pago: <strong className="text-zinc-400 font-sans">{col.lastPaymentDate}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto flex items-center justify-end">
                <button
                  id={`btn-pay-col-${col.id}`}
                  onClick={() => handlePay(col.id, col.wage)}
                  disabled={isPaying === col.id || balance < col.wage}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900 disabled:opacity-40 disabled:hover:bg-emerald-950 text-emerald-400 font-semibold text-xs rounded-xl border border-emerald-900/40 cursor-pointer transition-all uppercase tracking-wide shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isPaying === col.id ? 'Pagando...' : 'Liquidar Nómina'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
