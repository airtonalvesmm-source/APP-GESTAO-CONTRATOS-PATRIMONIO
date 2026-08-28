import React, { useState, useMemo } from "react";
import { anoAtual } from "@/lib/dmp-utils";
import { Campo, inputCls } from "./ui";
import Indicadores from "./painel/Indicadores";
import Funil from "./painel/Funil";
import Risco from "./painel/Risco";
import Vigencia from "./painel/Vigencia";
import Fornecedores from "./painel/Fornecedores";

export default function Painel({ data, setTab }) {
  const { pca } = data;
  const anos = useMemo(() => {
    const s = new Set(pca.map(p => +p.exercicio));
    s.add(anoAtual);
    return Array.from(s).filter(Boolean).sort((a, b) => b - a);
  }, [pca]);
  const [ano, setAno] = useState(anoAtual);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-1">Painel executivo</h2>
          <p className="font-sans text-[14px] text-slate-600">Visão consolidada para a alta administração — exercício {ano}.</p>
        </div>
        <div className="min-w-[120px]">
          <Campo label="Exercício">
            <select className={inputCls} value={ano} onChange={e => setAno(+e.target.value)}>
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Campo>
        </div>
      </div>
      <Indicadores data={data} ano={ano} />
      <Funil data={data} ano={ano} />
      <Risco data={data} onVerAtas={() => setTab?.("atas")} />
      <Vigencia data={data} />
      <Fornecedores data={data} />
    </div>
  );
}