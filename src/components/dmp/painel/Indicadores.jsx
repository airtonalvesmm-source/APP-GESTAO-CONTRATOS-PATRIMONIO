import React from "react";
import { fmtM } from "@/lib/dmp-utils";
import { fmtCurto, calcPlanejado, calcContratado, calcSaldoAtasDetalhado, calcAPagar } from "@/lib/painel-calc";

function Card({ rotulo, valor, apoio, acao, onAcao }) {
  return (
    <div className="bg-white border border-slate-300 rounded-md p-4 flex flex-col">
      <p className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-2">{rotulo}</p>
      <p className="font-sans text-[34px] font-semibold text-slate-800 leading-none tabular-nums" title={`R$ ${fmtM(valor)}`}>{fmtCurto(valor)}</p>
      {apoio && <p className="font-sans text-[13px] text-slate-500 mt-2">{apoio}</p>}
      {acao && (
        <button onClick={onAcao} className="mt-3 self-start inline-flex items-center border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans transition-colors">
          {acao}
        </button>
      )}
    </div>
  );
}

export default function Indicadores({ data, ano, setTab }) {
  const { pca, contratos, atas, pagamentos, ocorrencias } = data;
  const planejado = calcPlanejado(pca, ano);
  const contratado = calcContratado(contratos, ocorrencias, ano);
  const saldo = calcSaldoAtasDetalhado(atas, contratos);
  const aPagar = calcAPagar(contratos, pagamentos, ocorrencias);
  const nContratos = contratos.filter(c => (c.inicio || "").slice(0, 4) === String(ano)).length;
  const nfAberto = pagamentos.filter(p => Number(p.valorNF || 0) > Number(p.valorPago || 0)).length;

  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
      <Card rotulo={`Planejado ${ano}`} valor={planejado} acao="Ver PCA" onAcao={() => setTab?.("plano")} />
      <Card rotulo={`Contratado em ${ano}`} valor={contratado}
        apoio={`${nContratos} contrato${nContratos === 1 ? "" : "s"} · inclui execução de atas de 2025`}
        acao="Ver contratos" onAcao={() => setTab?.("contratos")} />
      <Card rotulo="Saldo disponível em atas vigentes" valor={saldo.valor}
        apoio={`${saldo.itens} itens · ${saldo.unidades.toLocaleString("pt-BR")} unidades · ${saldo.atas} atas`}
        acao="Ver atas" onAcao={() => setTab?.("atas")} />
      <Card rotulo="A pagar" valor={aPagar}
        apoio={`${nfAberto} nota${nfAberto === 1 ? "" : "s"} fiscal${nfAberto === 1 ? "" : "is"} em aberto`}
        acao="Ver pagamentos" onAcao={() => setTab?.("pagamentos")} />
    </div>
  );
}