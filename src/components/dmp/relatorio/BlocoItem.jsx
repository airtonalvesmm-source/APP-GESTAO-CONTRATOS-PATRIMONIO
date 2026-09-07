import React, { useState } from "react";
import { fmtM, fmtQ, fmtData } from "@/lib/dmp-utils";
import { gerarTextoETP } from "@/lib/relatorio-calc";
import GraficoSerie from "./GraficoSerie";
import { Btn, inputCls } from "../ui";
import { Copy } from "lucide-react";

const fmt1 = (n) => (Number(n) || 0).toFixed(1).replace(".", ",");
const fmtPct = (n) => (Number(n) || 0).toFixed(1).replace(".", ",") + "%";

function corExecucao(pct) {
  if (pct >= 80 && pct <= 110) return "text-emerald-700 font-semibold";
  if ((pct >= 50 && pct < 80) || (pct > 110 && pct <= 150)) return "text-amber-700 font-semibold";
  if (pct > 0) return "text-red-800 font-semibold";
  return "text-slate-400";
}

export default function BlocoItem({ item, index, estimativa, justificativa, onEstimativaChange, onJustificativaChange, baseSerie }) {
  const [fonteAno, setFonteAno] = useState(null);
  const s = item.serie;
  const totPlan = s.reduce((t, x) => t + x.planejado, 0);
  const totContr = s.reduce((t, x) => t + x.contratado, 0);
  const totRec = s.reduce((t, x) => t + x.recebido, 0);
  const totExec = totPlan > 0 ? (totContr / totPlan) * 100 : 0;
  const totValor = s.reduce((t, x) => t + x.valorContratado, 0);
  const sc = item.statsContr, sp = item.statsPlan;

  function copiarLeitura() { navigator.clipboard.writeText(item.leitura); alert("Leitura automática copiada."); }
  function copiarETP() { navigator.clipboard.writeText(gerarTextoETP(item, estimativa, justificativa)); alert("Memória de cálculo copiada."); }

  return (
    <div className="rel-bloco-item bg-white border border-slate-300 rounded-sm p-5 mb-6">
      <div className="border-b border-slate-200 pb-3 mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-mono text-[11px] text-slate-500">Item {index + 1}</span>
          <h3 className="font-sans font-bold text-[15px] text-slate-800">{item.ben.objeto}</h3>
        </div>
        <div className="flex gap-4 flex-wrap font-mono text-[11px] text-slate-500">
          <span>CATMAT: {item.ben.catmat}</span><span>PDM: {item.ben.pdm}</span>
          <span>Unidade: {item.ben.unidade || "UNIDADE"}</span>
          {item.ben.categoria && item.ben.categoria !== "—" && <span>Categoria: {item.ben.categoria}</span>}
        </div>
        {item.ben.aplicacao && item.ben.aplicacao !== "—" && <p className="font-sans text-[12.5px] text-slate-600 mt-1.5">{item.ben.aplicacao}</p>}
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse text-[13px] min-w-[600px]">
          <thead><tr className="bg-stone-50 border-b border-slate-300">
            <Th>Exercício</Th>
            {baseSerie !== "contratado" && <Th className="text-right">Planejado (PCA)</Th>}
            {baseSerie !== "planejado" && <Th className="text-right">Contratado</Th>}
            {baseSerie !== "planejado" && <Th className="text-right">Recebido</Th>}
            {baseSerie === "comparativo" && <Th className="text-right">Execução</Th>}
            {baseSerie !== "planejado" && <Th className="text-right">Preço unit. médio</Th>}
            {baseSerie !== "planejado" && <Th className="text-right">Valor contratado</Th>}
          </tr></thead>
          <tbody>
            {s.map(x => (
              <tr key={x.ano} className="border-b border-slate-100 hover:bg-stone-50">
                <td className="px-3 py-2 font-mono text-xs">{x.ano}</td>
                {baseSerie !== "contratado" && <td className="px-3 py-2 text-right font-mono text-sm cursor-pointer hover:bg-amber-50" onClick={() => setFonteAno(f => f === x.ano ? null : x.ano)}>{fmtQ(x.planejado)}</td>}
                {baseSerie !== "planejado" && <td className="px-3 py-2 text-right font-mono text-sm cursor-pointer hover:bg-amber-50" onClick={() => setFonteAno(f => f === x.ano ? null : x.ano)}>{fmtQ(x.contratado)}</td>}
                {baseSerie !== "planejado" && <td className="px-3 py-2 text-right font-mono text-sm">{fmtQ(x.recebido)}</td>}
                {baseSerie === "comparativo" && <td className={`px-3 py-2 text-right font-mono text-sm ${corExecucao(x.execucao)}`}>{x.planejado > 0 ? fmtPct(x.execucao) : "—"}</td>}
                {baseSerie !== "planejado" && <td className="px-3 py-2 text-right font-mono text-sm">{x.precoMedio > 0 ? `R$ ${fmtM(x.precoMedio)}` : "—"}</td>}
                {baseSerie !== "planejado" && <td className="px-3 py-2 text-right font-mono text-sm">{x.valorContratado > 0 ? `R$ ${fmtM(x.valorContratado)}` : "—"}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-slate-300 bg-stone-50 font-semibold">
            <td className="px-3 py-2 font-sans text-[12px]">Total</td>
            {baseSerie !== "contratado" && <td className="px-3 py-2 text-right font-mono text-sm">{fmtQ(totPlan)}</td>}
            {baseSerie !== "planejado" && <td className="px-3 py-2 text-right font-mono text-sm">{fmtQ(totContr)}</td>}
            {baseSerie !== "planejado" && <td className="px-3 py-2 text-right font-mono text-sm">{fmtQ(totRec)}</td>}
            {baseSerie === "comparativo" && <td className={`px-3 py-2 text-right font-mono text-sm ${corExecucao(totExec)}`}>{totPlan > 0 ? fmtPct(totExec) : "—"}</td>}
            {baseSerie !== "planejado" && <td className="px-3 py-2 text-right font-mono text-sm">—</td>}
            {baseSerie !== "planejado" && <td className="px-3 py-2 text-right font-mono text-sm">{totValor > 0 ? `R$ ${fmtM(totValor)}` : "—"}</td>}
          </tr></tfoot>
        </table>
      </div>

      {fonteAno && (
        <div className="mb-4 p-3 bg-amber-50/60 border border-amber-200 rounded-sm">
          <p className="font-sans text-[10px] font-bold tracking-widest uppercase text-amber-800 mb-2">Fontes — Exercício {fonteAno}</p>
          {(() => { const f = s.find(x => x.ano === fonteAno)?.fontes || [];
            if (!f.length) return <p className="text-sm text-slate-500">Sem registros neste exercício.</p>;
            return <ul className="text-[12.5px] text-slate-700 space-y-1">{f.map((src, i) => (
              <li key={i} className="font-mono">{src.tipo === "PCA" ? `PCA — código ${src.codigo || "s/c"}: ${fmtQ(src.qtd)} un.` : `${src.contrato}${src.ne ? ` · NE ${src.ne}` : ""}: ${fmtQ(src.qtd)} un. × R$ ${fmtM(src.valor)}`}</li>
            ))}</ul>;
          })()}
        </div>
      )}

      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse text-[13px] min-w-[400px]">
          <thead><tr className="bg-stone-50 border-b border-slate-300"><Th>Medida</Th><Th className="text-right">Contratado</Th><Th className="text-right">Planejado</Th></tr></thead>
          <tbody>
            <LinhaEstat label="Nº de exercícios (n)" v1={sc.n} v2={sp.n} />
            <LinhaEstat label="Soma" v1={sc.soma} v2={sp.soma} />
            <LinhaEstat label="Média" v1={fmt1(sc.media)} v2={fmt1(sp.media)} />
            <LinhaEstat label="Mediana" v1={fmt1(sc.mediana)} v2={fmt1(sp.mediana)} />
            <LinhaEstat label="Desvio-padrão (amostral)" v1={fmt1(sc.desvio)} v2={fmt1(sp.desvio)} />
            <LinhaEstat label="Coeficiente de variação" v1={sc.cv.toFixed(0).replace(".", ",") + "%"} v2={sp.cv.toFixed(0).replace(".", ",") + "%"} />
            <LinhaEstat label="Mínimo / Máximo" v1={`${sc.min} / ${sc.max}`} v2={`${sp.min} / ${sp.max}`} />
            <LinhaEstat label="Amplitude" v1={sc.amplitude} v2={sp.amplitude} />
            <LinhaEstat label="Variação média anual" v1={sc.varMedia} v2={sp.varMedia} />
          </tbody>
        </table>
      </div>

      <div className="mb-4 p-3.5 border-l-[3px] border-amber-700 bg-amber-50/60 rounded-r-sm">
        <div className="flex items-start gap-2">
          <p className="font-sans text-[13.5px] text-amber-900 flex-1">{item.leitura}</p>
          <button onClick={copiarLeitura} className="no-print flex-none border border-amber-300 bg-white rounded-sm px-2 py-1 text-[11px] text-amber-800 hover:bg-amber-50 cursor-pointer flex items-center gap-1"><Copy className="w-3 h-3" />Copiar texto</button>
        </div>
      </div>

      <div className="mb-4"><GraficoSerie serie={s} mediaContratado={sc.media} baseSerie={baseSerie} /></div>

      <div className="mb-4 overflow-x-auto">
        <table className="w-full border-collapse text-[13px] min-w-[500px]">
          <thead><tr className="bg-stone-50 border-b border-slate-300"><Th>Método</Th><Th className="text-right">Quantidade</Th><Th>Memória de cálculo</Th></tr></thead>
          <tbody>
            <tr className="border-b border-slate-100"><td className="px-3 py-2">Média dos últimos 3 exercícios</td><td className="px-3 py-2 text-right font-mono font-semibold">{item.cenarios.media3}</td><td className="px-3 py-2 font-mono text-[11.5px] text-slate-600">{item.cenarios.mem3}</td></tr>
            <tr className="border-b border-slate-100"><td className="px-3 py-2">Mediana da série completa</td><td className="px-3 py-2 text-right font-mono font-semibold">{item.cenarios.mediana}</td><td className="px-3 py-2 font-mono text-[11.5px] text-slate-600">{item.cenarios.memMed}</td></tr>
            <tr className="border-b border-slate-100"><td className="px-3 py-2">Tendência linear</td><td className="px-3 py-2 text-right font-mono font-semibold">{item.cenarios.tendencia ?? "—"}</td><td className="px-3 py-2 font-mono text-[11.5px] text-slate-600">{item.cenarios.tendencia !== null ? "regressão simples sobre " + item.cenarios.n + " pontos" : "Não aplicável — série com menos de 4 observações."}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 [grid-template-columns:140px_1fr] mb-4 no-print">
        <div>
          <label className="font-sans text-[10px] font-semibold tracking-widest uppercase text-slate-500 block mb-1">Estimativa proposta</label>
          <input type="number" min="0" className={inputCls} value={estimativa || ""} onChange={e => onEstimativaChange(e.target.value)} placeholder="un." />
        </div>
        <div>
          <label className="font-sans text-[10px] font-semibold tracking-widest uppercase text-slate-500 block mb-1">Justificativa</label>
          <input className={inputCls} value={justificativa || ""} onChange={e => onJustificativaChange(e.target.value)} placeholder="Justificativa da estimativa escolhida" />
        </div>
      </div>
      <div className="print-only mb-4 text-[12.5px] text-slate-700"><b>Estimativa proposta:</b> {estimativa || "[não preenchido]"} un. — <b>Justificativa:</b> {justificativa || "[não preenchido]"}</div>

      <div className="flex gap-2 flex-wrap mb-4 no-print">
        <Btn onClick={copiarETP}><Copy className="w-3.5 h-3.5 inline mr-1" />Copiar memória de cálculo</Btn>
      </div>

      <div className="border-t border-slate-200 pt-3">
        {item.saldo.saldoTotal > 0 ? (
          <p className="font-sans text-[13px] text-slate-700"><b>Saldo disponível em ata vigente:</b> {fmtQ(item.saldo.saldoTotal)} un.{item.saldo.ataInfo && <> (Ata {item.saldo.ataInfo.numero}, vence em {fmtData(item.saldo.ataInfo.fim)})</>}</p>
        ) : <p className="font-sans text-[13px] text-slate-500"><b>Sem saldo em ata vigente para este item.</b></p>}
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap ${className}`}>{children}</th>;
}
function LinhaEstat({ label, v1, v2 }) {
  return <tr className="border-b border-slate-100"><td className="px-3 py-2 font-sans text-[12.5px] text-slate-700">{label}</td><td className="px-3 py-2 text-right font-mono text-sm">{v1}</td><td className="px-3 py-2 text-right font-mono text-sm">{v2}</td></tr>;
}