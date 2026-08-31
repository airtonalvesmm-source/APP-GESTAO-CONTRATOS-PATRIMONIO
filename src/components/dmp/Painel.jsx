import React, { useState, useMemo } from "react";
import { anoAtual } from "@/lib/dmp-utils";
import { Btn, Campo, inputCls } from "./ui";
import Indicadores from "./painel/Indicadores";
import Funil from "./painel/Funil";
import Risco from "./painel/Risco";
import Vigencia from "./painel/Vigencia";
import ExecucaoMensal from "./painel/ExecucaoMensal";
import Fornecedores from "./painel/Fornecedores";
import { gerarRelatorioPDF } from "./painel/Relatorio";
import { ChevronDown, HelpCircle, RefreshCw, FileText } from "lucide-react";

export default function Painel({ data, setTab }) {
  const { pca } = data;
  const anos = useMemo(() => {
    const s = new Set(pca.map(p => +p.exercicio));
    s.add(anoAtual);
    return Array.from(s).filter(Boolean).sort((a, b) => b - a);
  }, [pca]);
  const [ano, setAno] = useState(anoAtual);
  const [ajuda, setAjuda] = useState(false);

  const hoje = new Date();
  const dataExt = hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-1">Painel executivo</h2>
        <p className="font-sans text-[18px] font-semibold text-slate-800">Contratações de material permanente — DMP/CAA · MP-PI</p>
        <p className="font-sans text-[13px] text-slate-500 mt-0.5">Posição em {dataExt} · exercício {ano}</p>
      </div>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <button onClick={() => setAjuda(a => !a)} className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700">
          <HelpCircle className="w-3.5 h-3.5" />Como ler este painel
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ajuda ? "rotate-180" : ""}`} />
        </button>
        <div className="flex gap-2 items-end">
          <div className="min-w-[120px]">
            <Campo label="Exercício">
              <select className={inputCls} value={ano} onChange={e => setAno(+e.target.value)}>
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Campo>
          </div>
          <Btn onClick={() => window.location.reload()}><RefreshCw className="w-3.5 h-3.5 inline mr-1" />Atualizar</Btn>
          <Btn variant="forte" onClick={() => gerarRelatorioPDF(data, ano)}><FileText className="w-3.5 h-3.5 inline mr-1" />Gerar relatório PDF</Btn>
        </div>
      </div>
      {ajuda && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-2">
          <p className="font-sans text-[12.5px] text-slate-600"><b className="text-slate-800">Ata de registro de preços</b> — resultado da licitação; fixa preço e quantidade máxima por 12 meses, mas não obriga a comprar.</p>
          <p className="font-sans text-[12.5px] text-slate-600"><b className="text-slate-800">Empenho</b> — o momento em que a compra efetivamente ocorre e o recurso é reservado.</p>
          <p className="font-sans text-[12.5px] text-slate-600"><b className="text-slate-800">Saldo de ata</b> — quantidade já licitada que ainda pode ser comprada pelo preço registrado, até o vencimento da ata.</p>
        </div>
      )}
      <Indicadores data={data} ano={ano} setTab={setTab} />
      <Funil data={data} ano={ano} setTab={setTab} />
      <Risco data={data} setTab={setTab} />
      <Vigencia data={data} setTab={setTab} />
      <ExecucaoMensal data={data} ano={ano} />
      <Fornecedores data={data} setTab={setTab} />
    </div>
  );
}