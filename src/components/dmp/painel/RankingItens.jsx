import React, { useState, useMemo, useEffect } from "react";
import { fmtQ, fmtM, nQtd, nVal } from "@/lib/dmp-utils";
import { fmtCurto } from "@/lib/painel-calc";
import { CAT_ARP } from "@/lib/dmp-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

function TooltipItem({ active, payload, dark }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const bg = dark ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300";
  const t1 = dark ? "text-slate-100" : "text-slate-700";
  const t2 = dark ? "text-slate-400" : "text-slate-500";
  const t3 = dark ? "text-slate-300" : "text-slate-600";
  return (
    <div className={`${bg} border rounded-md shadow-lg px-3 py-2 text-[12px]`}>
      <p className={`font-sans font-semibold ${t1} mb-0.5`}>{d.ben.objeto}</p>
      <p className={`font-mono text-[10px] ${t2} mb-0.5`}>CATMAT {d.ben.catmat}</p>
      <p className={`font-sans ${t3} tabular-nums`}>{fmtQ(d.qtd)} unidades · R$ {fmtM(d.valor)}</p>
    </div>
  );
}

export default function RankingItens({ data, ano, setTab, dark }) {
  const { contratos, catalog } = data;
  const anos = useMemo(() => {
    const s = new Set();
    contratos.forEach(c => { const y = (c.inicio || "").slice(0, 4); if (y) s.add(+y); });
    if (ano) s.add(+ano);
    return Array.from(s).filter(Boolean).sort((a, b) => b - a);
  }, [contratos, ano]);

  const [cat, setCat] = useState("Todas");
  const [anoLocal, setAnoLocal] = useState(ano);
  const [metrica, setMetrica] = useState("qtd");
  useEffect(() => { setAnoLocal(ano); }, [ano]);

  const top = useMemo(() => {
    let contratosF = contratos;
    if (anoLocal !== "Todos") contratosF = contratosF.filter(c => (c.inicio || "").slice(0, 4) === String(anoLocal));
    const map = {};
    contratosF.forEach(c => (c.itens || []).forEach(i => {
      const b = catalog.find(x => x.id === i.benId);
      if (!b) return;
      if (cat !== "Todas" && b.categoria !== cat) return;
      if (!map[b.id]) map[b.id] = { ben: b, qtd: 0, valor: 0 };
      map[b.id].qtd += nQtd(i.qtd);
      map[b.id].valor += nQtd(i.qtd) * nVal(i.valor);
    }));
    return Object.values(map).sort((a, b) => metrica === "valor" ? b.valor - a.valor : b.qtd - a.qtd);
  }, [contratos, catalog, cat, anoLocal, metrica]);

  const cardBg = dark ? "bg-slate-800/70 border-slate-700" : "bg-white border-slate-300";
  const h3 = dark ? "text-slate-400" : "text-slate-500";
  const okTxt = dark ? "text-emerald-400" : "text-emerald-700";
  const footTxt = dark ? "text-slate-400" : "text-slate-500";
  const strong = dark ? "text-slate-100" : "text-slate-700";
  const btn = dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50";
  const selCls = dark ? "border-slate-600 bg-slate-800 text-slate-100 rounded-sm px-2.5 py-1.5 font-sans text-[12px] focus:border-sky-500 focus:outline-none" : "border border-slate-300 rounded-sm px-2.5 py-1.5 font-sans text-[12px] bg-white text-slate-700 focus:border-slate-600 focus:outline-none";
  const tick = dark ? "#94a3b8" : "#475569";
  const cursor = dark ? "#1e293b" : "#f1f5f9";
  const barFill = dark ? "#38bdf8" : "#334155";
  const labelFill = dark ? "#e2e8f0" : "#334155";

  const titulo = `Itens mais adquiridos — ${anoLocal === "Todos" ? "todos os anos" : anoLocal}${cat !== "Todas" ? ` · ${cat}` : ""}`;

  if (!top.length) return (
    <div className={`${cardBg} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3}`}>{titulo}</h3>
        <div className="flex gap-2 items-center">
          <div className={`inline-flex rounded-sm border overflow-hidden ${dark ? "border-slate-600" : "border-slate-300"}`}>
            <button onClick={() => setMetrica("qtd")} className={`px-2.5 py-1.5 font-sans text-[12px] ${metrica === "qtd" ? (dark ? "bg-sky-600 text-white" : "bg-slate-800 text-white") : (dark ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600")}`}>Quantidade</button>
            <button onClick={() => setMetrica("valor")} className={`px-2.5 py-1.5 font-sans text-[12px] ${metrica === "valor" ? (dark ? "bg-sky-600 text-white" : "bg-slate-800 text-white") : (dark ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600")}`}>Gastos</button>
          </div>
          <select value={cat} onChange={e => setCat(e.target.value)} className={selCls}>
            <option value="Todas">Todas as categorias</option>
            {CAT_ARP.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={anoLocal} onChange={e => setAnoLocal(e.target.value === "Todos" ? "Todos" : +e.target.value)} className={selCls}>
            <option value="Todos">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <p className={`text-[13px] ${okTxt}`}>✓ Nenhum contrato iniciado{anoLocal !== "Todos" ? ` em ${anoLocal}` : ""}{cat !== "Todas" ? ` em ${cat}` : ""}.</p>
    </div>
  );

  const top10 = top.slice(0, 10);
  const totalVal = top10.reduce((t, x) => t + x.valor, 0);
  const chartData = top10.map(x => ({
    name: x.ben.objeto.length > 28 ? x.ben.objeto.slice(0, 26) + "…" : x.ben.objeto,
    qtd: x.qtd, valor: x.valor, ben: x.ben
  }));

  return (
    <div className={`${cardBg} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3}`}>{titulo}</h3>
        <div className="flex gap-2 items-center">
          <div className={`inline-flex rounded-sm border overflow-hidden ${dark ? "border-slate-600" : "border-slate-300"}`}>
            <button onClick={() => setMetrica("qtd")} className={`px-2.5 py-1.5 font-sans text-[12px] ${metrica === "qtd" ? (dark ? "bg-sky-600 text-white" : "bg-slate-800 text-white") : (dark ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600")}`}>Quantidade</button>
            <button onClick={() => setMetrica("valor")} className={`px-2.5 py-1.5 font-sans text-[12px] ${metrica === "valor" ? (dark ? "bg-sky-600 text-white" : "bg-slate-800 text-white") : (dark ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600")}`}>Gastos</button>
          </div>
          <select value={cat} onChange={e => setCat(e.target.value)} className={selCls}>
            <option value="Todas">Todas as categorias</option>
            {CAT_ARP.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={anoLocal} onChange={e => setAnoLocal(e.target.value === "Todos" ? "Todos" : +e.target.value)} className={selCls}>
            <option value="Todos">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, top10.length * 28 + 20)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10.5, fill: tick }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipItem dark={dark} />} cursor={{ fill: cursor }} />
          <Bar dataKey={metrica === "valor" ? "valor" : "qtd"} radius={[3, 3, 3, 3]} barSize={18} fill={barFill}>
            <LabelList dataKey={metrica === "valor" ? "valor" : "qtd"} position="right" formatter={metrica === "valor" ? (v) => "R$ " + fmtM(v) : (v) => fmtQ(v) + " un."} style={{ fontSize: 10.5, fill: labelFill, fontFamily: "ui-sans-serif, system-ui" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
        <p className={`font-sans text-[11px] ${footTxt}`}>Top {top10.length} itens por {metrica === "valor" ? "valor" : "quantidade"} contratada · total <b className={`tabular-nums ${strong}`}>{fmtCurto(totalVal)}</b></p>
        <button onClick={() => setTab?.("contratos")} className={`border ${btn} rounded-md px-2.5 py-1 text-[11px] font-sans`}>Ver contratos</button>
      </div>
    </div>
  );
}