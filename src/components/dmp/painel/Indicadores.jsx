import React from "react";
import { fmtM, saldoItem } from "@/lib/dmp-utils";
import { fmtCurto, calcPlanejado, calcContratado, calcSaldoAtas, calcAPagar, atasVigentes } from "@/lib/painel-calc";

export default function Indicadores({ data, ano }) {
  const { pca, contratos, atas, pagamentos, ocorrencias } = data;
  const planejado = calcPlanejado(pca, ano);
  const contratado = calcContratado(contratos, ocorrencias, ano);
  const saldoAtas = calcSaldoAtas(atas, contratos);
  const aPagar = calcAPagar(contratos, pagamentos, ocorrencias);

  const pctContratado = planejado ? contratado / planejado * 100 : 0;
  const vig = atasVigentes(atas);
  const itensSaldo = vig.reduce((t, a) => t + (a.itens || []).reduce((s, it) => s + Math.max(0, saldoItem(a, it, contratos)), 0), 0);
  const nfAberto = pagamentos.filter(p => Number(p.valorNF || 0) > Number(p.valorPago || 0)).length;

  const cards = [
    { rotulo: `Planejado ${ano}`, valor: planejado, apoio: null },
    { rotulo: "Contratado", valor: contratado, apoio: planejado ? `${Math.round(pctContratado)}% do planejado` : null },
    { rotulo: "Saldo de ata a empenhar", valor: saldoAtas, apoio: `${itensSaldo} itens em ${vig.length} atas` },
    { rotulo: "A pagar", valor: aPagar, apoio: `${nfAberto} nota${nfAberto === 1 ? "" : "s"} fiscal${nfAberto === 1 ? "" : "is"} em aberto` }
  ];

  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
      {cards.map((c, i) => (
        <div key={i} className="bg-white border border-slate-300 rounded-sm p-4">
          <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-2">{c.rotulo}</p>
          <p className="font-mono text-[32px] font-bold text-slate-800 leading-none" title={`R$ ${fmtM(c.valor)}`}>{fmtCurto(c.valor)}</p>
          {c.apoio && <p className="font-sans text-[12px] text-slate-500 mt-2">{c.apoio}</p>}
        </div>
      ))}
    </div>
  );
}