import React, { useState } from "react";
import { Info } from "lucide-react";
import { calcExecucaoPCA, fmtPct } from "@/lib/painel-calc";
import GaugeArco from "./GaugeArco";
import MetricasPCA from "./MetricasPCA";

export default function GaugePCA({ data, ano, dark }) {
  const { pca, contratos } = data;
  const { total, executados, naoIniciados, sobrestados, pct } = calcExecucaoPCA(pca, contratos, ano);
  const [hover, setHover] = useState(false);
  const [fixo, setFixo] = useState(false);
  const aberto = hover || fixo;

  const cardBg = dark ? "bg-slate-800/70 border-slate-700" : "bg-white border-slate-300";
  const h3 = dark ? "text-slate-400" : "text-slate-500";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const tip = dark ? "bg-slate-900 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700";

  return (
    <div className={`${cardBg} border rounded-lg p-4 sm:p-5 flex flex-col`}>
      <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3}`}>Execução do PCA — exercício {ano}</h3>
      <div className="relative flex-1 flex items-center justify-center py-3 sm:py-4">
        <button type="button" className="w-full cursor-pointer focus:outline-none" aria-label="Detalhes da execução do PCA"
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => setFixo(f => !f)} onBlur={() => setFixo(false)}>
          <GaugeArco pct={pct} dark={dark} />
        </button>
        {aberto && (
          <div className={`absolute z-20 top-2 left-1/2 -translate-x-1/2 w-[250px] border rounded-md shadow-lg px-3 py-2.5 text-[12px] font-sans ${tip}`}>
            <p className="font-semibold tabular-nums mb-1">{fmtPct(pct)} de execução</p>
            <p className="tabular-nums">{executados} executados</p>
            <p className="tabular-nums">{naoIniciados} não iniciados</p>
            {sobrestados > 0 && <p className="tabular-nums">{sobrestados} sobrestados</p>}
            <p className="tabular-nums">{total} itens no plano</p>
            <p className={`mt-1.5 text-[11px] leading-snug ${muted}`}>Percentual de itens do PCA que possuem contrato ou empenho vinculado.</p>
          </div>
        )}
      </div>
      <MetricasPCA executados={executados} naoIniciados={naoIniciados} total={total} dark={dark} />
      <p className={`flex items-center justify-center gap-1.5 font-sans text-[11.5px] mt-3 text-center ${muted}`}>
        <Info className="w-3.5 h-3.5 flex-none" />
        Itens do PCA com contrato ou empenho vinculado
      </p>
    </div>
  );
}