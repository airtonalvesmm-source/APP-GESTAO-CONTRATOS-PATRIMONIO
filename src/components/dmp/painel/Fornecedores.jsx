import React from "react";
import { fmtM } from "@/lib/dmp-utils";
import { fmtCurto, fmtPct, calcTopFornecedores } from "@/lib/painel-calc";

export default function Fornecedores({ data, setTab, dark }) {
  const { contratos, ocorrencias } = data;
  const { top, total } = calcTopFornecedores(contratos, ocorrencias);
  const top5 = top.slice(0, 5);
  const conc5 = top5.reduce((t, f) => t + f.valor, 0);
  const pct5 = total ? conc5 / total * 100 : 0;
  const maxVal = Math.max(...top5.map(f => f.valor), 1);

  const cardBg = dark ? "bg-slate-800/70 border-slate-700" : "bg-white border-slate-300";
  const h3 = dark ? "text-slate-400" : "text-slate-500";
  const okTxt = dark ? "text-emerald-400" : "text-emerald-700";
  const th = dark ? "text-slate-400" : "text-slate-500";
  const tdNome = dark ? "text-slate-200" : "text-slate-700";
  const tdVal = dark ? "text-slate-100" : "text-slate-800";
  const tdPct = dark ? "text-slate-400" : "text-slate-500";
  const rowB = dark ? "border-slate-700" : "border-slate-100";
  const rowH = dark ? "border-slate-200" : "border-slate-200";
  const track = dark ? "bg-slate-700" : "bg-slate-100";
  const bar = dark ? "bg-sky-500" : "bg-slate-700";
  const footTxt = dark ? "text-slate-400" : "text-slate-500";
  const btn = dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50";

  if (!top5.length) return (
    <div className={`${cardBg} border rounded-md p-4`}>
      <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3} mb-3`}>Concentração de fornecedores</h3>
      <p className={`text-[13px] ${okTxt}`}>✓ Nenhum contrato lançado.</p>
    </div>
  );

  return (
    <div className={`${cardBg} border rounded-md p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3}`}>Concentração de fornecedores</h3>
        <button onClick={() => setTab?.("fornecedores")} className={`border ${btn} rounded-md px-2.5 py-1 text-[11px] font-sans`}>Ver todos</button>
      </div>
      <table className="w-full text-[14px]">
        <thead>
          <tr className={`border-b ${rowH}`}>
            <th className={`text-left font-sans text-[9px] tracking-widest uppercase ${th} py-2`}>Fornecedor</th>
            <th className={`text-right font-sans text-[9px] tracking-widest uppercase ${th} py-2`}>Empenhado</th>
            <th className={`text-right font-sans text-[9px] tracking-widest uppercase ${th} py-2 w-[52px]`}>%</th>
            <th className="py-2 w-[140px]"></th>
          </tr>
        </thead>
        <tbody>
          {top5.map((f, i) => (
            <tr key={i} className={`border-b ${rowB} last:border-0`}>
              <td className={`py-2 font-sans text-[12.5px] ${tdNome} pr-2`}>{f.nome}</td>
              <td className={`py-2 text-right font-sans tabular-nums text-[13px] ${tdVal} whitespace-nowrap`} title={`R$ ${fmtM(f.valor)}`}>R$ {fmtM(f.valor)}</td>
              <td className={`py-2 text-right font-sans tabular-nums text-[12px] ${tdPct}`}>{fmtPct(total ? f.valor / total * 100 : 0)}</td>
              <td className="py-2 pl-2"><div className={`h-2 ${track} rounded-full overflow-hidden`}><div className={`h-full ${bar} rounded-full`} style={{ width: `${f.valor / maxVal * 100}%` }} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`font-sans text-[12px] ${footTxt} mt-3`}>Os 5 maiores concentram {fmtPct(pct5)} do valor empenhado.</p>
    </div>
  );
}