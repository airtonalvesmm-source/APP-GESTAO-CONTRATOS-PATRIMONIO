import React, { useState, useMemo } from "react";
import { fmtM, fmtQ, fmtData } from "@/lib/dmp-utils";
import { fmtCurto, fmtPct, calcPlanejamentoFunil, calcExecucaoAtas, calcEconomiaCobertura, calcAindaContratar, calcPCANaoContratado, calcPrevistoVsGasto } from "@/lib/painel-calc";
import { inputCls } from "../ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { HelpCircle } from "lucide-react";

const COR = { destaque: "#1e293b", medio: "#475569", claro: "#94a3b8", ambar: "#b45309", verde: "#047857" };

function TooltipPadrao({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-300 rounded-md shadow-lg px-3 py-2 text-[12px]">
      <p className="font-sans font-semibold text-slate-700 mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-sans text-slate-600 tabular-nums">R$ {fmtM(p.value)}</p>
      ))}
    </div>
  );
}

function BlocoA({ data, ano, setTab }) {
  const { pca, atas, contratos, ocorrencias, catalog } = data;
  const f = calcPlanejamentoFunil(pca, atas, ano);
  const aindaContratar = calcAindaContratar(pca, contratos, ocorrencias, ano);
  const chartData = [
    { name: "Planejado", valor: f.planejado, fill: COR.destaque },
    { name: "Já licitado", valor: f.licitado, fill: COR.medio },
    { name: "Ainda a licitar", valor: f.aLicitrar, fill: COR.claro },
    { name: "Ainda a contratar", valor: aindaContratar, fill: COR.ambar }
  ];
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500">Planejamento — PCA {ano}</h3>
        <button onClick={() => setTab?.("pca")} className="border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans">Ver PCA</button>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipPadrao />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="valor" radius={[3, 3, 3, 3]} barSize={22}>
            {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            <LabelList dataKey="valor" position="right" formatter={(v) => fmtCurto(v)} style={{ fontSize: 11, fill: "#334155", fontFamily: "ui-sans-serif, system-ui" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="font-sans text-[11px] text-slate-500 mt-2">{f.itensPlanejados} itens no PCA · {f.itensLicitados} já licitados</p>
    </div>
  );
}

function BlocoB({ data, ano, setTab }) {
  const { atas, contratos, pagamentos, ocorrencias } = data;
  const [filtro, setFiltro] = useState("ano");
  const f = calcExecucaoAtas(atas, contratos, pagamentos, ocorrencias, filtro, ano);
  const chartData = [
    { name: "Registrado", valor: f.registrado, fill: COR.destaque },
    { name: "Empenhado", valor: f.empenhado, fill: COR.medio },
    { name: "Pago", valor: f.pago, fill: COR.verde },
    { name: "Saldo vigente", valor: f.saldoVigente, fill: COR.claro },
    { name: "Saldo perdido", valor: f.saldoPerdido, fill: "#dc2626" }
  ];
  const inconsistente = Math.abs(f.diff) > 0.01;
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500">Execução das atas</h3>
        <select value={filtro} onChange={e => setFiltro(e.target.value)} className={inputCls + " w-auto"}>
          <option value="ano">Atas de {ano}</option>
          <option value="todas">Todas as atas</option>
          <option value="vigentes">Somente vigentes</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipPadrao />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="valor" radius={[3, 3, 3, 3]} barSize={18}>
            {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            <LabelList dataKey="valor" position="right" formatter={(v) => fmtCurto(v)} style={{ fontSize: 11, fill: "#334155", fontFamily: "ui-sans-serif, system-ui" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {inconsistente ? (
        <button onClick={() => setTab?.("atas")} className="mt-2 inline-flex items-center gap-1.5 bg-red-50 border border-red-300 text-red-800 rounded-md px-3 py-1.5 text-[12px] font-sans">
          Inconsistência de R$ {fmtM(Math.abs(f.diff))} — verificar lançamentos
        </button>
      ) : (
        <p className="font-sans text-[11px] text-emerald-700 mt-2">✓ Registrado = Empenhado + Saldo vigente + Saldo perdido</p>
      )}
    </div>
  );
}

function Economia({ data, ano, setTab }) {
  const { contratos, pca } = data;
  const eco = calcEconomiaCobertura(contratos, pca, ano);
  const [showHelp, setShowHelp] = useState(false);
  if (eco.cobertura < 80) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-amber-800 mb-2">Economia obtida — indisponível</h3>
        <p className="font-sans text-[13px] text-amber-900 mb-1">{eco.itensSemValor} dos {eco.itensTotal} itens do PCA {ano} estão sem valor unitário estimado.</p>
        <p className="font-sans text-[12px] text-amber-800 mb-3">Sem essa informação não é possível medir a economia da licitação.</p>
        <button onClick={() => setTab?.("pca")} className="border border-amber-400 text-amber-800 hover:bg-amber-100 rounded-md px-2.5 py-1 text-[11px] font-sans">Completar valores no PCA</button>
      </div>
    );
  }
  return (
    <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-emerald-700">Economia obtida na licitação</h3>
        <button onClick={() => setShowHelp(s => !s)} className="text-emerald-700 hover:text-emerald-900"><HelpCircle className="w-3.5 h-3.5" /></button>
      </div>
      {showHelp && (
        <p className="font-sans text-[11.5px] text-emerald-800 bg-emerald-100/60 rounded-md px-2.5 py-2 mb-2 leading-relaxed">
          Compara o preço unitário estimado no PCA com o preço efetivamente licitado (homologado). A economia é a diferença entre o que se previu gastar e o que se vai gastar.
        </p>
      )}
      <p className="font-sans text-[28px] font-semibold text-emerald-800 leading-none tabular-nums">{fmtCurto(eco.economia)}</p>
      <p className="font-sans text-[13px] text-emerald-700 mt-1">{fmtPct(eco.pct)} abaixo do estimado · base: {eco.pares} itens casados</p>
      <div className="flex gap-4 mt-2.5 text-[12px] text-emerald-700">
        <span>Estimado: <b className="tabular-nums">{fmtCurto(eco.planejadoLicitado)}</b></span>
        <span>Homologado: <b className="tabular-nums">{fmtCurto(eco.homologado)}</b></span>
      </div>
    </div>
  );
}

function PCANaoContratado({ data, ano, setTab }) {
  const { pca, contratos, catalog } = data;
  const lista = useMemo(() => calcPCANaoContratado(pca, contratos, catalog, ano), [pca, contratos, catalog, ano]);
  const total = lista.reduce((t, x) => t + x.valor, 0);
  if (!lista.length) return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-2">PCA não contratado — {ano}</h3>
      <p className="text-emerald-700 text-[13px]">✓ Todos os itens do PCA {ano} já foram contratados.</p>
    </div>
  );
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500">PCA não contratado — {ano}</h3>
        <button onClick={() => setTab?.("pca")} className="border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans">Ver PCA</button>
      </div>
      <p className="font-sans text-[12.5px] text-slate-500 mb-3">{lista.length} item{lista.length === 1 ? "" : "ns"} do PCA ainda sem contrato ou empenho · total de <b className="text-slate-700 tabular-nums">{fmtCurto(total)}</b></p>
      <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-slate-200 rounded-md">
        <table className="w-full text-[12.5px]">
          <thead className="sticky top-0">
            <tr className="bg-stone-50 border-b border-slate-200">
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Item</th>
              <th className="text-right font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Qtd.</th>
              <th className="text-right font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-3 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {lista.slice(0, 15).map((x, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-stone-50">
                <td className="px-3 py-2"><span className="font-sans font-semibold text-[12px] text-slate-800">{x.ben?.objeto || "(removido)"}</span><br /><span className="font-mono text-[10px] text-slate-500">CATMAT {x.ben?.catmat || "—"}</span></td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtQ(x.qtd)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtM(x.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lista.length > 15 && <p className="font-sans text-[11px] text-slate-400 mt-2">+ {lista.length - 15} outros itens</p>}
    </div>
  );
}

function PrevistoVsGasto({ data, ano }) {
  const { pca, contratos, pagamentos, ocorrencias } = data;
  const r = calcPrevistoVsGasto(pca, contratos, pagamentos, ocorrencias, ano);
  const pctGauge = Math.min(100, r.pct);
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Previsto vs. gasto — {ano}</h3>
      <div className="flex items-center gap-4">
        <div className="relative w-[88px] h-[88px] flex-none">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 0 1 0-31" fill="none" stroke="#e2e8f0" strokeWidth="3.2" />
            <path d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 0 1 0-31" fill="none" stroke="#047857" strokeWidth="3.2" strokeDasharray={`${pctGauge}, 100`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-sans text-[15px] font-semibold text-emerald-700 tabular-nums">{fmtPct(r.pct)}</span>
        </div>
        <div className="flex-1 space-y-1.5">
          <p className="font-sans text-[12.5px] text-slate-600">Previsto no PCA: <b className="text-slate-800 tabular-nums">{fmtCurto(r.planejado)}</b></p>
          <p className="font-sans text-[12.5px] text-slate-600">Empenhado: <b className="text-slate-800 tabular-nums">{fmtCurto(r.empenhado)}</b></p>
          <p className="font-sans text-[12.5px] text-slate-600">Pago: <b className="text-emerald-700 tabular-nums">{fmtCurto(r.pago)}</b></p>
          <p className="font-sans text-[12.5px] text-slate-500">Saldo a executar: <b className="tabular-nums">{fmtCurto(r.saldo)}</b></p>
        </div>
      </div>
    </div>
  );
}

export default function Funil({ data, ano, setTab }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <BlocoA data={data} ano={ano} setTab={setTab} />
        <BlocoB data={data} ano={ano} setTab={setTab} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PrevistoVsGasto data={data} ano={ano} />
        <Economia data={data} ano={ano} setTab={setTab} />
      </div>
      <PCANaoContratado data={data} ano={ano} setTab={setTab} />
    </div>
  );
}