import React, { useState, useEffect, useCallback } from "react";
import { carregarDados } from "@/lib/carregar-dados";
import Catalogo from "@/components/dmp/Catalogo";
import PlanoAnual from "@/components/dmp/PlanoAnual";
import Licitacoes from "@/components/dmp/Licitacoes";
import Atas from "@/components/dmp/Atas";
import Contratos from "@/components/dmp/Contratos";
import Pagamentos from "@/components/dmp/Pagamentos";
import Fornecedores from "@/components/dmp/Fornecedores";
import Painel from "@/components/dmp/Painel";
import CentralAlertas from "@/components/dmp/CentralAlertas";
import Estoque from "@/components/dmp/Estoque";

const TABS = [
  { id: "painel", label: "Painel" },
  { id: "catalogo", label: "Catálogo" },
  { id: "pca", label: "Plano Anual" },
  { id: "licitacoes", label: "Licitações" },
  { id: "atas", label: "Atas" },
  { id: "contratos", label: "Contratos" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "estoque", label: "Estoque" },
  { id: "fornecedores", label: "Fornecedores" }
];

export default function Home() {
  const [tab, setTab] = useState("painel");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    catalog: [], pca: [], licitacoes: [], atas: [], contratos: [],
    fornecedores: [], pagamentos: [], ocorrencias: [], dfds: [], subcategorias: [], categorias: [],
    departamentos: [], bens: [], movimentacoes: []
  });

  const [erro, setErro] = useState("");

  const refresh = useCallback(async () => {
    setData(await carregarDados());
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true); setErro("");
    try { await refresh(); }
    catch (e) { setErro(e?.message || String(e)); }
    finally { setLoading(false); }
  }, [refresh]);

  useEffect(() => { carregar(); }, [carregar]);

  if (erro) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-stone-100 p-6">
        <div className="max-w-md bg-white border border-red-300 rounded-sm p-6 text-center font-sans">
          <p className="text-[15px] font-semibold text-red-800 mb-2">Não foi possível carregar os dados</p>
          <p className="text-[13px] text-slate-600 mb-4">Verifique a conexão e tente novamente. Nenhum dado foi alterado. ({erro})</p>
          <button onClick={carregar} className="border border-slate-800 bg-slate-800 text-white rounded-sm px-4 py-2 text-[13px] font-semibold">Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-stone-100">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-slate-800 font-serif">
      {/* Cabeçalho */}
      <header className="bg-slate-800 text-stone-100 border-b-[3px] border-amber-700">
        <div className="max-w-[1200px] mx-auto px-5 pt-4 flex gap-5 items-start flex-wrap">
          <div className="font-sans flex-1 min-w-[320px]">
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-slate-400 mb-1.5">MP-PI · CAA · Divisão de Material Permanente</p>
            <h1 className="text-[clamp(21px,3vw,29px)] font-bold tracking-tight leading-tight">Catálogo de bens e controle de contratações</h1>
          </div>
          <CentralAlertas data={data} />
        </div>
        <nav className="max-w-[1200px] mx-auto px-5 pt-3.5 flex gap-0.5 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`border-b-[3px] px-3.5 py-2.5 cursor-pointer font-sans font-semibold text-[13px] tracking-tight transition-colors -mb-[3px]
                ${tab === t.id ? "text-white border-amber-600" : "text-slate-400 border-transparent hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 pb-20">
        {tab === "painel" && <Painel data={data} setTab={setTab} />}
        {tab === "catalogo" && <Catalogo data={data} refresh={refresh} />}
        {tab === "pca" && <PlanoAnual data={data} refresh={refresh} />}
        {tab === "licitacoes" && <Licitacoes data={data} refresh={refresh} />}
        {tab === "atas" && <Atas data={data} refresh={refresh} />}
        {tab === "contratos" && <Contratos data={data} refresh={refresh} />}
        {tab === "pagamentos" && <Pagamentos data={data} refresh={refresh} />}
        {tab === "estoque" && <Estoque data={data} refresh={refresh} />}
        {tab === "fornecedores" && <Fornecedores data={data} refresh={refresh} />}
      </main>

      <footer className="border-t border-slate-300 bg-stone-200">
        <div className="max-w-[1200px] mx-auto px-5 py-5 text-slate-500 text-[13px]">
          DMP/CAA · MP-PI — Catálogo de bens permanentes, Plano Anual de Contratações, atas de registro de preços e contratos.
        </div>
      </footer>
    </div>
  );
}