import React from "react";
import { fmtM } from "@/lib/dmp-utils";
import { fmtCurto, calcPlanejado, calcContratado, calcSaldoAtasDetalhado, calcAPagar, calcVariacao, calcContratosAPagar } from "@/lib/painel-calc";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function Setas({ pct, dark }) {
  const muted = dark ? "text-slate-500" : "text-slate-400";
  const neutro = dark ? "text-slate-400" : "text-slate-500";
  if (pct === null || !isFinite(pct)) return <span className={`font-sans text-[11px] ${muted} inline-flex items-center gap-0.5`}><Minus className="w-3 h-3" />sem exercício anterior</span>;
  const v = Math.abs(pct);
  if (v < 0.1) return <span className={`font-sans text-[11px] ${neutro} inline-flex items-center gap-0.5`}><Minus className="w-3 h-3" />estável</span>;
  const up = dark ? "text-amber-400" : "text-amber-700";
  const down = dark ? "text-emerald-400" : "text-emerald-700";
  return pct > 0
    ? <span className={`font-sans text-[11px] ${up} inline-flex items-center gap-0.5`}><TrendingUp className="w-3 h-3" />+{v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs ano anterior</span>
    : <span className={`font-sans text-[11px] ${down} inline-flex items-center gap-0.5`}><TrendingDown className="w-3 h-3" />{v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs ano anterior</span>;
}

function Card({ rotulo, valor, apoio, acao, onAcao, variacao, dark }) {
  const cardCls = dark ? "bg-slate-800/70 border-slate-700 hover:border-slate-500" : "bg-white border-slate-300 hover:border-slate-500";
  const rotuloCls = dark ? "text-slate-400" : "text-slate-500";
  const valorCls = dark ? "text-slate-50 group-hover:text-white" : "text-slate-800 group-hover:text-slate-900";
  const apoioCls = dark ? "text-slate-400" : "text-slate-500";
  const acaoCls = dark ? "border-slate-600 text-slate-300 group-hover:border-slate-400 group-hover:text-slate-100" : "border-slate-200 text-slate-500 group-hover:border-slate-400 group-hover:text-slate-700";
  return (
    <button onClick={onAcao} className={`${cardCls} border rounded-lg p-4 flex flex-col text-left hover:shadow-md transition-all cursor-pointer group`}>
      <div className="flex items-start justify-between mb-2">
        <p className={`font-sans text-[11px] tracking-widest uppercase ${rotuloCls}`}>{rotulo}</p>
        {variacao}
      </div>
      <p className={`font-sans text-[32px] font-semibold leading-none tabular-nums ${valorCls}`} title={`R$ ${fmtM(valor)}`}>{fmtCurto(valor)}</p>
      {apoio && <p className={`font-sans text-[12.5px] ${apoioCls} mt-2 leading-snug`}>{apoio}</p>}
      {acao && <span className={`mt-3 self-start inline-flex items-center border rounded-md px-2.5 py-1 text-[11px] font-sans transition-colors ${acaoCls}`}>{acao}</span>}
    </button>
  );
}

export default function Indicadores({ data, ano, setTab, dark }) {
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
      <Card rotulo={`Planejado ${ano}`} valor={planejado} acao="Ver PCA" onAcao={() => setTab?.("pca")} dark={dark}
        apoio={`${pca.filter(p => +p.exercicio === +ano).length} itens no PCA`}
        variacao={<Setas pct={varP.planejado.pct} dark={dark} />} />
      <Card rotulo={`Contratado em ${ano}`} valor={contratado} dark={dark}
        apoio={`${nContratos} contrato${nContratos === 1 ? "" : "s"} · inclui execução de atas anteriores`}
        acao="Ver contratos" onAcao={() => setTab?.("contratos")}
        variacao={<Setas pct={varP.contratado.pct} dark={dark} />} />
      <Card rotulo="Saldo em atas vigentes" valor={saldo.valor} dark={dark}
        apoio={`${saldo.itens} itens · ${saldo.unidades.toLocaleString("pt-BR")} unidades · ${saldo.atas} atas`}
        acao="Ver atas" onAcao={() => setTab?.("atas")} />
      <Card rotulo="A pagar" valor={aPagar} dark={dark}
        apoio={`${contratosAPagar.length} contrato${contratosAPagar.length === 1 ? "" : "s"} com valor a pagar`}
        acao="Ver pagamentos" onAcao={() => setTab?.("pagamentos")} />
    </div>
  );
}