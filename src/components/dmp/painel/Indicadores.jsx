import React from "react";
import { fmtM } from "@/lib/dmp-utils";
import { fmtCurto, calcPlanejado, calcContratado, calcSaldoAtasDetalhado, calcAPagar, calcVariacao, calcContratosAPagar } from "@/lib/painel-calc";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function Setas({ pct }) {
  if (pct === null || !isFinite(pct)) return <span className="font-sans text-[11px] text-slate-400 inline-flex items-center gap-0.5"><Minus className="w-3 h-3" />sem exercício anterior</span>;
  const v = Math.abs(pct);
  if (v < 0.1) return <span className="font-sans text-[11px] text-slate-500 inline-flex items-center gap-0.5"><Minus className="w-3 h-3" />estável</span>;
  return pct > 0
    ? <span className="font-sans text-[11px] text-amber-700 inline-flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs ano anterior</span>
    : <span className="font-sans text-[11px] text-emerald-700 inline-flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs ano anterior</span>;
}

function Card({ rotulo, valor, apoio, acao, onAcao, variacao }) {
  return (
    <button onClick={onAcao} className="bg-white border border-slate-300 rounded-lg p-4 flex flex-col text-left hover:border-slate-500 hover:shadow-md transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-2">
        <p className="font-sans text-[11px] tracking-widest uppercase text-slate-500">{rotulo}</p>
        {variacao}
      </div>
      <p className="font-sans text-[32px] font-semibold text-slate-800 leading-none tabular-nums group-hover:text-slate-900" title={`R$ ${fmtM(valor)}`}>{fmtCurto(valor)}</p>
      {apoio && <p className="font-sans text-[12.5px] text-slate-500 mt-2 leading-snug">{apoio}</p>}
      {acao && <span className="mt-3 self-start inline-flex items-center border border-slate-200 text-slate-500 group-hover:border-slate-400 group-hover:text-slate-700 rounded-md px-2.5 py-1 text-[11px] font-sans transition-colors">{acao}</span>}
    </button>
  );
}

export default function Indicadores({ data, ano, setTab }) {
  const { pca, contratos, atas, pagamentos, ocorrencias } = data;
  const planejado = calcPlanejado(pca, ano);
  const contratado = calcContratado(contratos, ocorrencias, ano);
  const saldo = calcSaldoAtasDetalhado(atas, contratos);
  const aPagar = calcAPagar(contratos, pagamentos, ocorrencias);
  const nContratos = contratos.filter(c => (c.inicio || "").slice(0, 4) === String(ano)).length;
  const contratosAPagar = calcContratosAPagar(contratos, pagamentos, ocorrencias);
  const varP = calcVariacao(pca, contratos, ocorrencias, ano);

  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
      <Card rotulo={`Planejado ${ano}`} valor={planejado} acao="Ver PCA" onAcao={() => setTab?.("pca")}
        apoio={`${pca.filter(p => +p.exercicio === +ano).length} itens no PCA`}
        variacao={<Setas pct={varP.planejado.pct} />} />
      <Card rotulo={`Contratado em ${ano}`} valor={contratado}
        apoio={`${nContratos} contrato${nContratos === 1 ? "" : "s"} · inclui execução de atas anteriores`}
        acao="Ver contratos" onAcao={() => setTab?.("contratos")}
        variacao={<Setas pct={varP.contratado.pct} />} />
      <Card rotulo="Saldo em atas vigentes" valor={saldo.valor}
        apoio={`${saldo.itens} itens · ${saldo.unidades.toLocaleString("pt-BR")} unidades · ${saldo.atas} atas`}
        acao="Ver atas" onAcao={() => setTab?.("atas")} />
      <Card rotulo="A pagar" valor={aPagar}
        apoio={`${contratosAPagar.length} contrato${contratosAPagar.length === 1 ? "" : "s"} com valor a pagar`}
        acao="Ver pagamentos" onAcao={() => setTab?.("pagamentos")} />
    </div>
  );
}