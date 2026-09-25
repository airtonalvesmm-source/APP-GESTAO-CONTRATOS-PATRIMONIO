import React, { useState, useMemo } from "react";
import { fmtM, fmtQ } from "@/lib/dmp-utils";
import { fmtCurto, fmtPct, calcPlanejamentoFunil, calcExecucaoAtas, calcEconomiaCobertura, calcAindaContratar, calcPCANaoContratado, calcPrevistoVsGasto } from "@/lib/painel-calc";
import { inputCls } from "../ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { HelpCircle } from "lucide-react";

function cores(dark) {
  return dark
    ? { destaque: "#38bdf8", medio: "#818cf8", claro: "#64748b", ambar: "#fbbf24", verde: "#34d399", vermelho: "#f87171" }
    : { destaque: "#1e293b", medio: "#475569", claro: "#94a3b8", ambar: "#b45309", verde: "#047857", vermelho: "#dc2626" };
}

function TooltipPadrao({ active, payload, label, dark }) {
  if (!active || !payload?.length) return null;
  const bg = dark ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300";
  const t1 = dark ? "text-slate-100" : "text-slate-700";
  const t2 = dark ? "text-slate-300" : "text-slate-600";
  return (
    <div className={`${bg} border rounded-md shadow-lg px-3 py-2 text-[12px]`}>
      <p className={`font-sans font-semibold ${t1} mb-0.5`}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className={`font-sans ${t2} tabular-nums`}>R$ {fmtM(p.value)}</p>
      ))}
    </div>
  );
}

function cardCls(dark) { return dark ? "bg-slate-800/70 border-slate-700" : "bg-white border-slate-300"; }
function h3Cls(dark) { return dark ? "text-slate-400" : "text-slate-500"; }
function txtCls(dark) { return dark ? "text-slate-300" : "text-slate-600"; }
function strongCls(dark) { return dark ? "text-slate-100" : "text-slate-800"; }
function btnLink(dark) { return dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"; }
const tickFill = (dark) => dark ? "#94a3b8" : "#475569";
const cursorFill = (dark) => dark ? "#1e293b" : "#f1f5f9";
const labelFill = (dark) => dark ? "#e2e8f0" : "#334155";

function BlocoA({ data, ano, setTab, dark }) {
  const { pca, atas, contratos, ocorrencias } = data;
  const COR = cores(dark);
  const f = calcPlanejamentoFunil(pca, atas, ano, contratos);
  const aindaContratar = calcAindaContratar(pca, contratos, ocorrencias, ano);
  const chartData = [
    { name: "Planejado", valor: f.planejado, fill: COR.destaque },
    { name: "Já licitado", valor: f.licitado, fill: COR.medio },
    { name: "Ainda a licitar", valor: f.aLicitrar, fill: COR.claro },
    { name: "Ainda a contratar", valor: aindaContratar, fill: COR.ambar }
  ];
  return (
    <div className={`${cardCls(dark)} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3Cls(dark)}`}>Planejamento — PCA {ano}</h3>
        <button onClick={() => setTab?.("pca")} className={`border ${btnLink(dark)} rounded-md px-2.5 py-1 text-[11px] font-sans`}>Ver PCA</button>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11, fill: tickFill(dark) }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipPadrao dark={dark} />} cursor={{ fill: cursorFill(dark) }} />
          <Bar dataKey="valor" radius={[3, 3, 3, 3]} barSize={22}>
            {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            <LabelList dataKey="valor" position="right" formatter={(v) => fmtCurto(v)} style={{ fontSize: 11, fill: labelFill(dark), fontFamily: "ui-sans-serif, system-ui" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className={`font-sans text-[11px] ${txtCls(dark)} mt-2`}>{f.itensPlanejados} itens no PCA · {f.itensLicitados} já licitados</p>
    </div>
  );
}

function BlocoB({ data, ano, setTab, dark }) {
  const { atas, contratos, pagamentos, ocorrencias } = data;
  const COR = cores(dark);
  const [filtro, setFiltro] = useState("ano");
  const f = calcExecucaoAtas(atas, contratos, pagamentos, ocorrencias, filtro, ano);
  const chartData = [
    { name: "Registrado", valor: f.registrado, fill: COR.destaque },
    { name: "Empenhado", valor: f.empenhado, fill: COR.medio },
    { name: "Pago", valor: f.pago, fill: COR.verde },
    { name: "Saldo vigente", valor: f.saldoVigente, fill: COR.claro },
    { name: "Saldo perdido", valor: f.saldoPerdido, fill: COR.vermelho }
  ];
  const inconsistente = Math.abs(f.diff) > 0.01;
  const selCls = dark ? "border-slate-600 bg-slate-800 text-slate-100 rounded-sm px-2.5 py-2 font-sans text-sm w-auto focus:border-sky-500 focus:outline-none" : inputCls + " w-auto";
  return (
    <div className={`${cardCls(dark)} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3Cls(dark)}`}>Execução das atas</h3>
        <select value={filtro} onChange={e => setFiltro(e.target.value)} className={selCls}>
          <option value="ano">Atas de {ano}</option>
          <option value="todas">Todas as atas</option>
          <option value="vigentes">Somente vigentes</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11, fill: tickFill(dark) }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipPadrao dark={dark} />} cursor={{ fill: cursorFill(dark) }} />
          <Bar dataKey="valor" radius={[3, 3, 3, 3]} barSize={18}>
            {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            <LabelList dataKey="valor" position="right" formatter={(v) => fmtCurto(v)} style={{ fontSize: 11, fill: labelFill(dark), fontFamily: "ui-sans-serif, system-ui" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {inconsistente ? (
        <button onClick={() => setTab?.("atas")} className="mt-2 inline-flex items-center gap-1.5 bg-red-50 border border-red-300 text-red-800 rounded-md px-3 py-1.5 text-[12px] font-sans">
          Inconsistência de R$ {fmtM(Math.abs(f.diff))} — verificar lançamentos
        </button>
      ) : (
        <p className={`font-sans text-[11px] ${dark ? "text-emerald-400" : "text-emerald-700"} mt-2`}>✓ Registrado = Empenhado + Saldo vigente + Saldo perdido</p>
      )}
    </div>
  );
}

function Economia({ data, ano, setTab, dark }) {
  const { contratos, pca } = data;
  const eco = calcEconomiaCobertura(contratos, pca, ano);
  const [showHelp, setShowHelp] = useState(false);
  if (eco.cobertura < 80) {
    const box = dark ? "bg-amber-900/30 border-amber-700" : "bg-amber-50 border-amber-300";
    const t1 = dark ? "text-amber-300" : "text-amber-800";
    const t2 = dark ? "text-amber-200" : "text-amber-900";
    const t3 = dark ? "text-amber-300" : "text-amber-800";
    const btn = dark ? "border-amber-600 text-amber-300 hover:bg-amber-900/40" : "border-amber-400 text-amber-800 hover:bg-amber-100";
    return (
      <div className={`${box} border rounded-lg p-4`}>
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${t1} mb-2`}>Economia obtida — indisponível</h3>
        <p className={`font-sans text-[13px] ${t2} mb-1`}>{eco.itensSemValor} dos {eco.itensTotal} itens do PCA {ano} estão sem valor unitário estimado.</p>
        <p className={`font-sans text-[12px] ${t3} mb-3`}>Sem essa informação não é possível medir a economia da licitação.</p>
        <button onClick={() => setTab?.("pca")} className={`border ${btn} rounded-md px-2.5 py-1 text-[11px] font-sans`}>Completar valores no PCA</button>
      </div>
    );
  }
  const box = dark ? "bg-emerald-900/30 border-emerald-700" : "bg-emerald-50 border-emerald-300";
  const t1 = dark ? "text-emerald-300" : "text-emerald-700";
  const t2 = dark ? "text-emerald-200" : "text-emerald-800";
  const t3 = dark ? "text-emerald-300" : "text-emerald-700";
  const helpBox = dark ? "bg-emerald-900/40 text-emerald-200" : "bg-emerald-100/60 text-emerald-800";
  return (
    <div className={`${box} border rounded-lg p-4`}>
      <div className="flex items-center gap-1.5 mb-2">
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${t1}`}>Economia obtida na licitação</h3>
        <button onClick={() => setShowHelp(s => !s)} className={t1}><HelpCircle className="w-3.5 h-3.5" /></button>
      </div>
      {showHelp && (
        <p className={`font-sans text-[11.5px] ${helpBox} rounded-md px-2.5 py-2 mb-2 leading-relaxed`}>
          Compara o preço unitário estimado no PCA com o preço efetivamente licitado (homologado). A economia é a diferença entre o que se previu gastar e o que se vai gastar.
        </p>
      )}
      <p className={`font-sans text-[28px] font-semibold ${t2} leading-none tabular-nums`}>{fmtCurto(eco.economia)}</p>
      <p className={`font-sans text-[13px] ${t3} mt-1`}>{fmtPct(eco.pct)} abaixo do estimado · base: {eco.pares} itens casados</p>
      <div className={`flex gap-4 mt-2.5 text-[12px] ${t3}`}>
        <span>Estimado: <b className="tabular-nums">{fmtCurto(eco.planejadoLicitado)}</b></span>
        <span>Homologado: <b className="tabular-nums">{fmtCurto(eco.homologado)}</b></span>
      </div>
    </div>
  );
}

function PCANaoContratado({ data, ano, setTab, dark }) {
  const { pca, contratos, catalog } = data;
  const lista = useMemo(() => calcPCANaoContratado(pca, contratos, catalog, ano), [pca, contratos, catalog, ano]);
  const total = lista.reduce((t, x) => t + x.valor, 0);
  if (!lista.length) return (
    <div className={`${cardCls(dark)} border rounded-lg p-4`}>
      <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3Cls(dark)} mb-2`}>PCA não contratado — {ano}</h3>
      <p className={`text-[13px] ${dark ? "text-emerald-400" : "text-emerald-700"}`}>✓ Todos os itens do PCA {ano} já foram contratados.</p>
    </div>
  );
  const thCls = dark ? "bg-slate-700/60 text-slate-400" : "bg-stone-50 text-slate-500";
  const rowB = dark ? "border-slate-700" : "border-slate-100";
  const rowH = dark ? "hover:bg-slate-700/40" : "hover:bg-stone-50";
  const itemT = dark ? "text-slate-100" : "text-slate-800";
  const catT = "text-slate-500";
  return (
    <div className={`${cardCls(dark)} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3Cls(dark)}`}>PCA não contratado — {ano}</h3>
        <button onClick={() => setTab?.("pca")} className={`border ${btnLink(dark)} rounded-md px-2.5 py-1 text-[11px] font-sans`}>Ver PCA</button>
      </div>
      <p className={`font-sans text-[12.5px] ${txtCls(dark)} mb-3`}>{lista.length} {lista.length === 1 ? "item" : "itens"} do PCA com status não iniciado · total de <b className={`${strongCls(dark)} tabular-nums`}>{fmtCurto(total)}</b></p>
      <div className={`overflow-x-auto max-h-[220px] overflow-y-auto border ${dark ? "border-slate-700" : "border-slate-200"} rounded-md`}>
        <table className="w-full text-[12.5px]">
          <thead className="sticky top-0">
            <tr className={`${thCls} border-b ${dark ? "border-slate-700" : "border-slate-200"}`}>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase px-3 py-2">Item</th>
              <th className="text-right font-sans text-[9.5px] tracking-widest uppercase px-3 py-2">Qtd.</th>
              <th className="text-right font-sans text-[9.5px] tracking-widest uppercase px-3 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {lista.slice(0, 15).map((x, i) => (
              <tr key={i} className={`border-b ${rowB} last:border-0 ${rowH}`}>
                <td className="px-3 py-2"><span className={`font-sans font-semibold text-[12px] ${itemT}`}>{x.ben?.objeto || "(removido)"}</span><br /><span className={`font-mono text-[10px] ${catT}`}>CATMAT {x.ben?.catmat || "—"}</span></td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${txtCls(dark)}`}>{fmtQ(x.qtd)}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${txtCls(dark)}`}>{fmtM(x.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lista.length > 15 && <p className={`font-sans text-[11px] ${dark ? "text-slate-500" : "text-slate-400"} mt-2`}>+ {lista.length - 15} outros itens</p>}
    </div>
  );
}

function PrevistoVsGasto({ data, ano, dark }) {
  const { pca, contratos, pagamentos, ocorrencias } = data;
  const r = calcPrevistoVsGasto(pca, contratos, pagamentos, ocorrencias, ano);
  const pctGauge = Math.min(100, r.pct);
  const track = dark ? "#334155" : "#e2e8f0";
  const fill = dark ? "#34d399" : "#047857";
  const pctTxt = dark ? "text-emerald-400" : "text-emerald-700";
  return (
    <div className={`${cardCls(dark)} border rounded-lg p-4`}>
      <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3Cls(dark)} mb-3`}>Previsto vs. gasto — {ano}</h3>
      <div className="flex items-center gap-4">
        <div className="relative w-[88px] h-[88px] flex-none">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 0 1 0-31" fill="none" stroke={track} strokeWidth="3.2" />
            <path d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 0 1 0-31" fill="none" stroke={fill} strokeWidth="3.2" strokeDasharray={`${pctGauge}, 100`} strokeLinecap="round" />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center font-sans text-[15px] font-semibold ${pctTxt} tabular-nums`}>{fmtPct(r.pct)}</span>
        </div>
        <div className="flex-1 space-y-1.5">
          <p className={`font-sans text-[12.5px] ${txtCls(dark)}`}>Previsto no PCA: <b className={`${strongCls(dark)} tabular-nums`}>{fmtCurto(r.planejado)}</b></p>
          <p className={`font-sans text-[12.5px] ${txtCls(dark)}`}>Empenhado: <b className={`${strongCls(dark)} tabular-nums`}>{fmtCurto(r.empenhado)}</b></p>
          <p className={`font-sans text-[12.5px] ${txtCls(dark)}`}>Pago: <b className={`${pctTxt} tabular-nums`}>{fmtCurto(r.pago)}</b></p>
          <p className={`font-sans text-[12.5px] ${dark ? "text-slate-400" : "text-slate-500"}`}>Saldo a executar: <b className="tabular-nums">{fmtCurto(r.saldo)}</b></p>
        </div>
      </div>
    </div>
  );
}

export default function Funil({ data, ano, setTab, dark }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <BlocoA data={data} ano={ano} setTab={setTab} dark={dark} />
        <BlocoB data={data} ano={ano} setTab={setTab} dark={dark} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PrevistoVsGasto data={data} ano={ano} dark={dark} />
        <Economia data={data} ano={ano} setTab={setTab} dark={dark} />
      </div>
      <PCANaoContratado data={data} ano={ano} setTab={setTab} dark={dark} />
    </div>
  );
}