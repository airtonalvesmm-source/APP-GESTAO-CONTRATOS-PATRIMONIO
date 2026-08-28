import React from "react";
import { diasAte, fmtData, resumoAta, situacaoAta } from "@/lib/dmp-utils";
import { fmtCurto } from "@/lib/painel-calc";

export default function Vigencia({ data }) {
  const { atas, contratos } = data;
  const hoje = new Date();
  const meses = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    meses.push({ label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), idx: i });
  }

  const atasVig = atas
    .map(a => {
      const r = resumoAta(a, contratos);
      const s = situacaoAta(a);
      const d = diasAte(a.fim);
      return { a, sal: r.sal, dias: d, classe: s.classe };
    })
    .filter(x => x.sal > 0 && x.dias !== null && x.dias >= 0 && x.dias <= 365)
    .sort((a, b) => a.dias - b.dias);

  const maxSaldo = Math.max(...atasVig.map(x => x.sal), 1);
  const corBarra = { critico: "bg-red-600", aviso: "bg-amber-500", ok: "bg-emerald-600", neutro: "bg-slate-400" };

  return (
    <div className="bg-white border border-slate-300 rounded-sm p-4">
      <h3 className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-3">Régua de vigência das atas — próximos 12 meses</h3>
      {atasVig.length === 0 ? (
        <p className="font-sans text-sm text-slate-500 text-center py-8">Nenhuma ata vigente com saldo nos próximos 12 meses.</p>
      ) : (
        <div>
          <div className="flex pl-1">
            {meses.map(m => (
              <div key={m.idx} className="flex-1 text-center font-mono text-[9px] text-slate-400 border-l border-slate-100 first:border-l-0 py-1">{m.label}</div>
            ))}
          </div>
          <div className="relative h-28 border-l border-r border-slate-200 overflow-hidden">
            <div className="absolute top-0 bottom-0 w-px bg-slate-800 z-10" style={{ left: "0%" }}>
              <span className="font-mono text-[8px] text-slate-800 absolute -top-3.5 -translate-x-1/2">hoje</span>
            </div>
            {atasVig.map((x, i) => {
              const left = (x.dias / 365) * 100;
              const w = Math.max(5, Math.min(28, x.sal / maxSaldo * 28));
              const top = (i % 4) * 20 + 4;
              return (
                <div key={i}
                  className={`absolute rounded-sm ${corBarra[x.classe] || corBarra.neutro} cursor-default`}
                  style={{ left: `${left}%`, top: `${top}px`, width: `${w}px`, height: "14px" }}
                  title={`Ata ${x.a.numero} · ${x.a.fornecedor || "—"} · saldo ${fmtCurto(x.sal)} · vence ${fmtData(x.a.fim)}`}
                />
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 font-sans text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-600"></span>Vence em até 90 dias</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-600"></span>Vigente</span>
          </div>
        </div>
      )}
    </div>
  );
}