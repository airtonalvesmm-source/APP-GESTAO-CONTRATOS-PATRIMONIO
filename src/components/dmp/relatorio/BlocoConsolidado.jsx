import React, { useState, useMemo } from "react";
import { fmtM, fmtQ } from "@/lib/dmp-utils";

const fmt1 = (n) => (Number(n) || 0).toFixed(1).replace(".", ",");
const fmtPct0 = (n) => (Number(n) || 0).toFixed(0).replace(".", ",");

export default function BlocoConsolidado({ resultados }) {
  const [sortCol, setSortCol] = useState("total");
  const [sortDir, setSortDir] = useState("desc");

  const anos = resultados[0]?.serie.map(s => s.ano) || [];

  const linhas = useMemo(() => resultados.map(r => {
    const totContr = r.serie.reduce((t, s) => t + s.contratado, 0);
    const linha = {
      id: r.ben.id || r._pdm,
      item: r.ben.objeto, catmat: r.ben.catmat,
      total: totContr, media: r.statsContr.media, mediana: r.statsContr.mediana,
      cv: r.statsContr.cv,
      precoAtual: [...r.serie].reverse().find(s => s.precoMedio > 0)?.precoMedio || 0,
      saldo: r.saldo.saldoTotal, semContratacao: totContr === 0
    };
    r.serie.forEach(s => { linha[String(s.ano)] = s.contratado; });
    return linha;
  }), [resultados]);

  const sorted = useMemo(() => [...linhas].sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (va == null) va = 0; if (vb == null) vb = 0;
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb, "pt-BR") : vb.localeCompare(va, "pt-BR");
    return sortDir === "asc" ? va - vb : vb - va;
  }), [linhas, sortCol, sortDir]);

  function toggleSort(col) { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("desc"); } }

  const totalGeralUn = linhas.reduce((t, l) => t + l.total, 0);
  const totalGeralRS = linhas.reduce((t, l) => t + l.total * l.precoAtual, 0);
  const semContratacao = linhas.filter(l => l.semContratacao).length;

  return (
    <div className="bg-white border border-slate-300 rounded-sm p-5 mb-6 rel-bloco-item">
      <h3 className="font-sans font-bold text-sm tracking-widest uppercase text-slate-800 mb-4 flex items-center gap-2.5">
        <span className="w-1 h-4 bg-amber-700 inline-block" />Bloco consolidado
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px] min-w-[700px]">
          <thead><tr className="bg-stone-50 border-b border-slate-300">
            <ThSort col="item" {...{ sortCol, sortDir, toggleSort }}>Item</ThSort>
            <ThSort col="catmat" {...{ sortCol, sortDir, toggleSort }}>CATMAT</ThSort>
            {anos.map(a => <ThSort key={a} col={String(a)} {...{ sortCol, sortDir, toggleSort }} className="text-right">{a}</ThSort>)}
            <ThSort col="total" {...{ sortCol, sortDir, toggleSort }} className="text-right">Total</ThSort>
            <ThSort col="media" {...{ sortCol, sortDir, toggleSort }} className="text-right">Média</ThSort>
            <ThSort col="mediana" {...{ sortCol, sortDir, toggleSort }} className="text-right">Mediana</ThSort>
            <ThSort col="cv" {...{ sortCol, sortDir, toggleSort }} className="text-right">CV</ThSort>
            <ThSort col="precoAtual" {...{ sortCol, sortDir, toggleSort }} className="text-right">Preço unit. atual</ThSort>
            <ThSort col="saldo" {...{ sortCol, sortDir, toggleSort }} className="text-right">Saldo em ata</ThSort>
          </tr></thead>
          <tbody>
            {sorted.map(l => (
              <tr key={l.id} className={`border-b border-slate-100 hover:bg-stone-50 ${l.semContratacao ? "bg-red-50/30" : ""}`}>
                <td className="px-3 py-2 font-sans text-[12px] text-slate-800 max-w-[24ch]">{l.item}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{l.catmat}</td>
                {anos.map(a => <td key={a} className="px-3 py-2 text-right font-mono text-sm">{l[String(a)] > 0 ? fmtQ(l[String(a)]) : "—"}</td>)}
                <td className="px-3 py-2 text-right font-mono font-semibold text-sm">{fmtQ(l.total)}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{fmt1(l.media)}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{fmt1(l.mediana)}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{fmtPct0(l.cv)}%</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{l.precoAtual > 0 ? `R$ ${fmtM(l.precoAtual)}` : "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{l.saldo > 0 ? fmtQ(l.saldo) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 p-3 bg-stone-50 border border-slate-200 rounded-sm text-[13px] text-slate-700 space-y-1">
        <p><b>Total geral contratado no período:</b> {fmtQ(totalGeralUn)} un. {totalGeralRS > 0 ? `· R$ ${fmtM(totalGeralRS)}` : ""}</p>
        <p><b>Itens sem nenhuma contratação no período:</b> {semContratacao} {semContratacao === 1 ? "item (candidato a exclusão do PCA)" : "itens (candidatos a exclusão do PCA)"}</p>
      </div>
    </div>
  );
}

function ThSort({ children, className = "", col, sortCol, sortDir, toggleSort }) {
  return (
    <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap cursor-pointer hover:text-slate-800 select-none ${className}`}
      onClick={() => toggleSort(col)}>
      {children}{sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );
}