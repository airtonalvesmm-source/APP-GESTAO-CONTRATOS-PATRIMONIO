import React from "react";
import { nVal } from "@/lib/dmp-utils";
import { fmtCurto, calcFunil, calcEconomia } from "@/lib/painel-calc";

export default function Funil({ data, ano }) {
  const { pca, contratos } = data;
  const f = calcFunil(ano, data);
  const eco = calcEconomia(contratos, pca, ano);
  const itensComValor = pca.filter(p => +p.exercicio === +ano && nVal(p.valor) > 0).length;
  const itensTotal = pca.filter(p => +p.exercicio === +ano).length;
  const itensSemValor = itensTotal - itensComValor;

  const barras = [
    { label: "Planejado (PCA)", valor: f.planejado, base: null },
    { label: "Licitado (homologado)", valor: f.licitado, base: f.planejado },
    { label: "Registrado em ata", valor: f.registrado, base: f.licitado },
    { label: "Contratado/empenhado", valor: f.contratado, base: f.registrado },
    { label: "Pago", valor: f.pago, base: f.contratado }
  ];
  const max = Math.max(...barras.map(b => b.valor), 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="bg-white border border-slate-300 rounded-sm p-4">
        <h3 className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-3">Funil de execução — {ano}</h3>
        <div className="space-y-2.5">
          {barras.map((b, i) => {
            const pct = b.base ? (b.base ? b.valor / b.base * 100 : 0) : 100;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="font-sans text-[12px] text-slate-600 w-[170px] flex-none">{b.label}</span>
                <div className="flex-1 h-7 bg-slate-100 rounded-sm overflow-hidden">
                  <div className="h-full bg-slate-700 rounded-sm flex items-center justify-end pr-2" style={{ width: `${Math.max(2, b.valor / max * 100)}%` }}>
                    <span className="font-mono text-[11px] text-white font-semibold whitespace-nowrap">{fmtCurto(b.valor)}</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-500 w-[48px] text-right flex-none">{b.base ? `${Math.round(pct)}%` : "100%"}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-emerald-50 border border-emerald-300 rounded-sm p-4">
        <h3 className="font-sans text-[10px] tracking-widest uppercase text-emerald-700 mb-2">Economia obtida</h3>
        <p className="font-mono text-[28px] font-bold text-emerald-800 leading-none">{fmtCurto(eco.economia)}</p>
        <p className="font-mono text-[14px] text-emerald-700 mt-1">{eco.planejadoLicitado ? `${eco.pct.toFixed(1)}%` : "—"} do valor planejado</p>
        {itensSemValor > 0 && <p className="font-sans text-[11px] text-emerald-700 mt-3 leading-snug">Cálculo sobre {itensComValor} de {itensTotal} itens do PCA — os demais estão sem valor unitário estimado.</p>}
      </div>
    </div>
  );
}