import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { ORDEM, BENS_BASE } from "@/lib/dmp-data";
import { diasAte, anoAtual } from "@/lib/dmp-utils";
import Catalogo from "@/components/dmp/Catalogo";
import PlanoAnual from "@/components/dmp/PlanoAnual";
import Licitacoes from "@/components/dmp/Licitacoes";
import Atas from "@/components/dmp/Atas";
import Contratos from "@/components/dmp/Contratos";
import Pagamentos from "@/components/dmp/Pagamentos";
import Fornecedores from "@/components/dmp/Fornecedores";

const TABS = [
  { id: "catalogo", label: "Catálogo" },
  { id: "pca", label: "Plano Anual" },
  { id: "licitacoes", label: "Licitações" },
  { id: "atas", label: "Atas" },
  { id: "contratos", label: "Contratos" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "fornecedores", label: "Fornecedores" }
];

export default function Home() {
  const [tab, setTab] = useState("catalogo");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    catalog: [], pca: [], licitacoes: [], atas: [], contratos: [],
    fornecedores: [], pagamentos: [], ocorrencias: [], dfds: []
  });

  const refresh = useCallback(async () => {
    const [catalog, pca, licitacoes, atas, contratos, fornecedores, pagamentos, ocorrencias, dfds] = await Promise.all([
      base44.entities.CatalogItem.filter({ oculto: false }, "-created_date", 500),
      base44.entities.PCAItem.list("-created_date", 500),
      base44.entities.Licitacao.list("-created_date", 500),
      base44.entities.Ata.list("-created_date", 500),
      base44.entities.Contrato.list("-created_date", 500),
      base44.entities.Fornecedor.list("-created_date", 500),
      base44.entities.Pagamento.list("-created_date", 500),
      base44.entities.Ocorrencia.list("-created_date", 500),
      base44.entities.DFD.list("-created_date", 500)
    ]);
    setData({ catalog, pca, licitacoes, atas, contratos, fornecedores, pagamentos, ocorrencias, dfds });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  // Seed catalog on first load if empty
  useEffect(() => {
    if (!loading && data.catalog.length === 0) {
      (async () => {
        const itens = BENS_BASE.map(b => ({
          objeto: b.objeto, pdm: b.pdm, catmat: b.catmat, arte: b.arte,
          unidade: b.unidade || "UNIDADE", categoria: b.categoria,
          aplicacao: b.aplicacao, descricao: b.descricao, nota: b.nota || "",
          ehProprio: false, oculto: false
        }));
        await base44.entities.CatalogItem.bulkCreate(itens);
        await refresh();
      })();
    }
  }, [loading, data.catalog.length, refresh]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-stone-100">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const noPlano = data.pca.filter(p => +p.exercicio === anoAtual).length;
  const vigentes = data.atas.filter(a => { const d = diasAte(a.fim); return d === null || d >= 0; }).length;

  return (
    <div className="min-h-screen bg-stone-100 text-slate-800 font-serif">
      {/* Cabeçalho */}
      <header className="bg-slate-800 text-stone-100 border-b-[3px] border-amber-700">
        <div className="max-w-[1200px] mx-auto px-5 pt-4 flex gap-5 items-start flex-wrap">
          <div className="font-sans flex-1 min-w-[320px]">
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-slate-400 mb-1.5">MP-PI · CAA · Divisão de Material Permanente</p>
            <h1 className="text-[clamp(21px,3vw,29px)] font-bold tracking-tight leading-tight">Catálogo de bens e controle de contratações</h1>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Selo n={data.catalog.length} label="Itens no catálogo" />
            <Selo n={noPlano} label={`No PCA ${anoAtual}`} />
            <Selo n={vigentes} label="Atas vigentes" />
          </div>
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
        {tab === "catalogo" && <Catalogo data={data} refresh={refresh} />}
        {tab === "pca" && <PlanoAnual data={data} refresh={refresh} />}
        {tab === "licitacoes" && <Licitacoes data={data} refresh={refresh} />}
        {tab === "atas" && <Atas data={data} refresh={refresh} />}
        {tab === "contratos" && <Contratos data={data} refresh={refresh} />}
        {tab === "pagamentos" && <Pagamentos data={data} refresh={refresh} />}
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

function Selo({ n, label }) {
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-sm px-3 py-1.5 min-w-[92px] text-left">
      <b className="block font-mono text-[17px] font-semibold text-stone-100 leading-tight">{n}</b>
      <span className="block font-mono text-[9px] tracking-widest uppercase text-slate-400 mt-0.5">{label}</span>
    </div>
  );
}