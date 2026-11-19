import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { carregarDados } from "@/lib/carregar-dados";
import { calcularRelatorio, agruparPorPDM, agruparPorSubcategoria } from "@/lib/relatorio-calc";
import { fmtData, csvLinha } from "@/lib/dmp-utils";
import { Btn, inputCls } from "@/components/dmp/ui";
import BlocoItem from "@/components/dmp/relatorio/BlocoItem";
import BlocoConsolidado from "@/components/dmp/relatorio/BlocoConsolidado";
import { ArrowLeft, Printer, Download, Layers } from "lucide-react";

const ANO_ATUAL = new Date().getFullYear();
const ANOS_OPTS = Array.from({ length: 12 }, (_, i) => ANO_ATUAL - 8 + i);

export default function RelatorioEstatistico() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ catalog: [], pca: [], licitacoes: [], atas: [], contratos: [], fornecedores: [], pagamentos: [], ocorrencias: [], dfds: [] });
  const [anoInicio, setAnoInicio] = useState(ANO_ATUAL - 3);
  const [anoFim, setAnoFim] = useState(ANO_ATUAL);
  const [baseSerie, setBaseSerie] = useState("comparativo");
  const [agruparPDM, setAgruparPDM] = useState(false);
  const [agruparSub, setAgruparSub] = useState(false);
  const [estimativas, setEstimativas] = useState({});
  const [justificativas, setJustificativas] = useState({});

  const urlParams = new URLSearchParams(window.location.search);
  const itemIds = (urlParams.get("items") || "").split(",").filter(Boolean);

  const refresh = useCallback(async () => {
    setData(await carregarDados());
  }, []);

  useEffect(() => { (async () => { try { await refresh(); } finally { setLoading(false); } })(); }, [refresh]);

  const ai = Math.min(anoInicio, anoFim), af = Math.max(anoInicio, anoFim);
  const resultados = useMemo(() => calcularRelatorio(itemIds, data, ai, af), [itemIds, data, ai, af]);
  const blocos = useMemo(() => agruparPDM ? agruparPorPDM(resultados) : agruparSub ? agruparPorSubcategoria(resultados) : resultados, [resultados, agruparPDM, agruparSub]);
  const chaveBloco = (b) => agruparPDM ? (b._pdm || b.ben.pdm) : agruparSub ? (b._sub || b.ben.subcategoria) : b.ben.id;

  function exportCSV() {
    const anos = []; for (let a = ai; a <= af; a++) anos.push(a);
    const l = [["Item", "CATMAT", ...anos, "Total", "Média", "Mediana", "CV%", "Preço atual", "Saldo ata"]];
    resultados.forEach(r => {
      const tot = r.serie.reduce((t, s) => t + s.contratado, 0);
      const preco = [...r.serie].reverse().find(s => s.precoMedio > 0)?.precoMedio || 0;
      l.push([r.ben.objeto, r.ben.catmat, ...r.serie.map(s => s.contratado), tot, r.statsContr.media.toFixed(1), r.statsContr.mediana.toFixed(1), r.statsContr.cv.toFixed(0), preco, r.saldo.saldoTotal]);
    });
    // csvLinha preserva o conteúdo (aspas, quebras de linha) e prefixa fórmulas com apóstrofo
    const csv = csvLinha(l);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "relatorio-estatistico.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  if (loading) return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" /></div>;
  if (!itemIds.length) return <div className="max-w-[600px] mx-auto py-20 text-center"><p className="text-slate-600 mb-4">Nenhum item selecionado.</p><Btn variant="forte" onClick={() => navigate("/")}>Voltar ao catálogo</Btn></div>;
  if (!resultados.length) return <div className="max-w-[600px] mx-auto py-20 text-center"><p className="text-slate-600 mb-4">Nenhum item válido encontrado. Volte ao catálogo e selecione novamente.</p><Btn variant="forte" onClick={() => navigate("/")}>Voltar ao catálogo</Btn></div>;

  return (
    <div className="min-h-screen bg-stone-100 font-serif">
      <div className="no-print sticky top-0 z-30 bg-slate-800 text-white px-5 py-3 flex gap-3 items-center flex-wrap shadow-lg">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 border border-slate-500 rounded-sm px-3 py-1.5 font-sans font-semibold text-[12.5px] hover:bg-slate-700 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />Catálogo
        </button>
        <div className="flex gap-2 items-end flex-wrap ml-auto">
          <div>
            <label className="block font-sans text-[9px] font-semibold tracking-widest uppercase text-slate-400 mb-0.5">Início</label>
            <select value={anoInicio} onChange={e => setAnoInicio(+e.target.value)} className={inputCls + " w-[72px]"}>{ANOS_OPTS.map(a => <option key={a} value={a}>{a}</option>)}</select>
          </div>
          <div>
            <label className="block font-sans text-[9px] font-semibold tracking-widest uppercase text-slate-400 mb-0.5">Fim</label>
            <select value={anoFim} onChange={e => setAnoFim(+e.target.value)} className={inputCls + " w-[72px]"}>{ANOS_OPTS.map(a => <option key={a} value={a}>{a}</option>)}</select>
          </div>
          <div>
            <label className="block font-sans text-[9px] font-semibold tracking-widest uppercase text-slate-400 mb-0.5">Base</label>
            <select value={baseSerie} onChange={e => setBaseSerie(e.target.value)} className={inputCls + " w-[130px]"}>
              <option value="comparativo">Comparativo</option><option value="contratado">Contratado</option><option value="planejado">Planejado (PCA)</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-[12.5px] font-sans font-semibold text-slate-200 px-2 py-1.5">
            <input type="checkbox" checked={agruparPDM} onChange={e => { setAgruparPDM(e.target.checked); if (e.target.checked) setAgruparSub(false); }} className="accent-amber-600" />
            <Layers className="w-3.5 h-3.5" />Agrupar por PDM
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[12.5px] font-sans font-semibold text-slate-200 px-2 py-1.5">
            <input type="checkbox" checked={agruparSub} onChange={e => { setAgruparSub(e.target.checked); if (e.target.checked) setAgruparPDM(false); }} className="accent-amber-600" />
            <Layers className="w-3.5 h-3.5" />Agrupar por subcategoria
          </label>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-amber-700 border-amber-700 rounded-sm px-3 py-1.5 font-sans font-semibold text-[12.5px] text-white hover:bg-amber-600 cursor-pointer">
            <Printer className="w-4 h-4" />Imprimir / PDF
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 border border-slate-500 rounded-sm px-3 py-1.5 font-sans font-semibold text-[12.5px] text-white hover:bg-slate-700 cursor-pointer">
            <Download className="w-4 h-4" />Exportar
          </button>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-5 pt-8 pb-4">
        <p className="font-sans text-[11px] tracking-widest uppercase text-slate-500 text-center">Ministério Público do Estado do Piauí</p>
        <p className="font-sans text-[11px] tracking-widest uppercase text-slate-500 text-center">Coordenadoria de Apoio Administrativo · Divisão de Material Permanente</p>
        <h1 className="font-sans font-bold text-[17px] text-center text-slate-800 mt-3 mb-1">RELATÓRIO ESTATÍSTICO DE CONSUMO DE MATERIAL PERMANENTE</h1>
        <p className="font-sans text-[12.5px] text-center text-slate-500 mb-3">Subsídio à estimativa de quantidades — art. 18, §1º, IV, Lei nº 14.133/2021</p>
        <div className="flex justify-center gap-6 font-mono text-[11px] text-slate-600 border-y border-slate-200 py-2">
          <span>Itens analisados: {resultados.length}</span><span>Período: {ai} a {af}</span><span>Emitido em: {fmtData(new Date().toISOString().slice(0, 10))}</span>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-5 pb-12">
        {blocos.map((b, i) => {
          const key = chaveBloco(b);
          return <BlocoItem key={key} item={b} index={i} baseSerie={baseSerie}
            estimativa={estimativas[key] || ""} justificativa={justificativas[key] || ""}
            onEstimativaChange={v => setEstimativas(s => ({ ...s, [key]: v }))}
            onJustificativaChange={v => setJustificativas(s => ({ ...s, [key]: v }))} />;
        })}
        {resultados.length >= 2 && !agruparPDM && !agruparSub && <BlocoConsolidado resultados={resultados} />}
        {blocos.length >= 2 && (agruparPDM || agruparSub) && <BlocoConsolidado resultados={blocos} />}
      </div>
    </div>
  );
}