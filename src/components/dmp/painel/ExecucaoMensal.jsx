import React from "react";
import { fmtCurto, calcExecucaoMensal } from "@/lib/painel-calc";

export default function ExecucaoMensal({ data, ano }) {
  const { contratos, ocorrencias } = data;
  const meses = calcExecucaoMensal(contratos, ocorrencias, ano);
  const total = meses.reduce((t, v) => t + v, 0);
  const media = total / 12;
  const max = Math.max(...meses, media, 1);
  const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  if (total === 0) return (
    <div className="bg-white border border-slate-300 rounded-md p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Execução mensal — {ano}</h3>
      <p className="text-emerald-700 text-[13px]">✓ Nenhum contrato iniciado em {ano}.</p>
    </div>
  );

  return (
    <div className="bg-white border border-slate-300 rounded-md p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Execução mensal — {ano}</h3>
      <div className="flex items-end gap-1.5 h-40 relative">
        {meses.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="w-full bg-slate-600 rounded-t-sm min-h-[2px] transition-all" style={{ height: `${(v / max) * 100}%` }} title={fmtCurto(v)} />
          </div>
        ))}
        <div className="absolute left-0 right-0 border-t border-dashed border-slate-400 pointer-events-none" style={{ bottom: `${(media / max) * 100}%` }}>
          <span className="font-sans text-[9px] text-slate-500 absolute -top-4 right-0 bg-white px-1">média {fmtCurto(media)}</span>
        </div>
      </div>
      <div className="flex gap-1.5 mt-1">
        {nomesMeses.map((m, i) => <div key={i} className="flex-1 text-center font-sans text-[9px] text-slate-400">{m}</div>)}
      </div>
      <p className="font-sans text-[11px] text-slate-500 mt-3">
        Total empenhado: <b className="tabular-nums">{fmtCurto(total)}</b> · média mensal: <b className="tabular-nums">{fmtCurto(media)}</b>
      </p>
    </div>
  );
}