import React, { useState, useMemo, useEffect } from "react";
import { anoAtual } from "@/lib/dmp-utils";
import { Campo, inputCls } from "./ui";
import Indicadores from "./painel/Indicadores";
import GaugePCA from "./painel/GaugePCA";
import Funil from "./painel/Funil";
import Risco from "./painel/Risco";
import Vigencia from "./painel/Vigencia";
import ExecucaoMensal from "./painel/ExecucaoMensal";
import Fornecedores from "./painel/Fornecedores";
import RankingItens from "./painel/RankingItens";
import { gerarRelatorioPDF } from "./painel/Relatorio";
import { ChevronDown, HelpCircle, RefreshCw, FileText, Moon, Sun } from "lucide-react";

const DARK_KEY = "dmp-painel-dark";

export default function Painel({ data, setTab }) {
  const { pca } = data;
  const anos = useMemo(() => {
    const s = new Set(pca.map(p => +p.exercicio));
    s.add(anoAtual);
    return Array.from(s).filter(Boolean).sort((a, b) => b - a);
  }, [pca]);
  const [ano, setAno] = useState(anoAtual);
  const [ajuda, setAjuda] = useState(false);
  const [dark, setDark] = useState(() => {
    try { return sessionStorage.getItem(DARK_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(DARK_KEY, dark ? "1" : "0"); } catch {}
  }, [dark]);

  const hoje = new Date();
  const dataExt = hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const wrapCls = dark ? "bg-slate-950 -mx-5 px-5 py-6 space-y-5" : "space-y-5";
  const tituloCls = dark ? "text-slate-100" : "text-slate-800";
  const subCls = dark ? "text-slate-400" : "text-slate-500";
  const ajudaBoxCls = dark ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200";
  const ajudaTxtCls = dark ? "text-slate-300" : "text-slate-600";
  const ajudaB = dark ? "text-slate-100" : "text-slate-800";
  const selCls = dark ? "border-slate-600 bg-slate-800 text-slate-100 rounded-sm px-2.5 py-2 font-sans text-sm w-full focus:border-sky-500 focus:outline-none" : inputCls;
  const btnBase = "border rounded-sm px-3 py-2 font-sans font-semibold text-[12.5px] cursor-pointer transition-colors inline-flex items-center";
  const btnClr = dark ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500";
  const btnForte = dark ? "border-sky-600 bg-sky-600 text-white hover:bg-sky-500" : "border-slate-800 bg-slate-800 text-white hover:bg-slate-700";
  const ajudaLink = dark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700";

  return (
    <div className={wrapCls}>
      <div>
        <h2 className={`font-sans text-[11px] tracking-widest uppercase ${subCls} mb-1`}>Painel executivo</h2>
        <p className={`font-sans text-[18px] font-semibold ${tituloCls}`}>Contratações de material permanente — DMP/CAA · MP-PI</p>
        <p className={`font-sans text-[13px] ${subCls} mt-0.5`}>Posição em {dataExt} · exercício {ano}</p>
      </div>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <button onClick={() => setAjuda(a => !a)} className={`inline-flex items-center gap-1.5 text-[12px] ${ajudaLink}`}>
          <HelpCircle className="w-3.5 h-3.5" />Como ler este painel
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ajuda ? "rotate-180" : ""}`} />
        </button>
        <div className="flex gap-2 items-end">
          <button onClick={() => setDark(d => !d)} className={`${btnBase} ${btnClr}`} title={dark ? "Tema claro" : "Tema escuro"}>
            {dark ? <Sun className="w-3.5 h-3.5 inline mr-1" /> : <Moon className="w-3.5 h-3.5 inline mr-1" />}
            {dark ? "Claro" : "Escuro"}
          </button>
          <div className="min-w-[120px]">
            <Campo label="Exercício">
              <select className={selCls} value={ano} onChange={e => setAno(+e.target.value)}>
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Campo>
          </div>
          <button onClick={() => window.location.reload()} className={`${btnBase} ${btnClr}`}><RefreshCw className="w-3.5 h-3.5 inline mr-1" />Atualizar</button>
          <button onClick={() => gerarRelatorioPDF(data, ano)} className={`${btnBase} ${btnForte}`}><FileText className="w-3.5 h-3.5 inline mr-1" />Gerar relatório PDF</button>
        </div>
      </div>
      {ajuda && (
        <div className={`${ajudaBoxCls} border rounded-md p-4 space-y-2`}>
          <p className={`font-sans text-[12.5px] ${ajudaTxtCls}`}><b className={ajudaB}>Ata de registro de preços</b> — resultado da licitação; fixa preço e quantidade máxima por 12 meses, mas não obriga a comprar.</p>
          <p className={`font-sans text-[12.5px] ${ajudaTxtCls}`}><b className={ajudaB}>Empenho</b> — o momento em que a compra efetivamente ocorre e o recurso é reservado.</p>
          <p className={`font-sans text-[12.5px] ${ajudaTxtCls}`}><b className={ajudaB}>Saldo de ata</b> — quantidade já licitada que ainda pode ser comprada pelo preço registrado, até o vencimento da ata.</p>
        </div>
      )}
      <GaugePCA data={data} ano={ano} dark={dark} />
      <Indicadores data={data} ano={ano} setTab={setTab} dark={dark} />
      <Funil data={data} ano={ano} setTab={setTab} dark={dark} />
      <Risco data={data} setTab={setTab} dark={dark} />
      <Vigencia data={data} setTab={setTab} dark={dark} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ExecucaoMensal data={data} ano={ano} dark={dark} />
        <Fornecedores data={data} setTab={setTab} dark={dark} />
      </div>
      <RankingItens data={data} ano={ano} setTab={setTab} dark={dark} />
    </div>
  );
}