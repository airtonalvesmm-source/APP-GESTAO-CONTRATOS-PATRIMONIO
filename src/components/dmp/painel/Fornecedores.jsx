import React from "react";
import { fmtCurto, calcTopFornecedores } from "@/lib/painel-calc";

export default function Fornecedores({ data }) {
  const { contratos, ocorrencias } = data;
  const { top, total } = calcTopFornecedores(contratos, ocorrencias);
  const top5 = top.slice(0, 5);
  const conc5 = top5.reduce((t, f) => t + f.valor, 0);
  const pct5 = total ? conc5 / total * 100 : 0;
  const maxVal = Math.max(...top5.map(f => f.valor), 1);

  return (
    <div className="bg-white border border-slate-300 rounded-sm p-4">
      <h3 className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-3">Concentração de fornecedores</h3>
      {top5.length === 0 ? (
        <p className="font-sans text-sm text-slate-500 text-center py-6">Nenhum contrato lançado.</p>
      ) : (
        <>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left font-sans text-[9px] tracking-widest uppercase text-slate-500 py-2">Fornecedor</th>
                <th className="text-right font-sans text-[9px] tracking-widest uppercase text-slate-500 py-2">Empenhado</th>
                <th className="text-right font-sans text-[9px] tracking-widest uppercase text-slate-500 py-2 w-[52px]">%</th>
                <th className="py-2 w-[140px]"></th>
              </tr>
            </thead>
            <tbody>
              {top5.map((f, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 font-sans text-[12.5px] text-slate-700 pr-2">{f.nome}</td>
                  <td className="py-2 text-right font-mono text-[13px] text-slate-800 whitespace-nowrap" title={`R$ ${f.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}>{fmtCurto(f.valor)}</td>
                  <td className="py-2 text-right font-mono text-[12px] text-slate-500">{total ? (f.valor / total * 100).toFixed(1) : "0"}%</td>
                  <td className="py-2 pl-2"><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-700 rounded-full" style={{ width: `${f.valor / maxVal * 100}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-sans text-[12px] text-slate-500 mt-3">Os 5 maiores concentram {pct5.toFixed(1)}% do valor empenhado.</p>
        </>
      )}
    </div>
  );
}