import React from "react";
import { fmtQ, fmtM } from "@/lib/dmp-utils";
import { fmtCurto, calcTopItensPorAno } from "@/lib/painel-calc";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

function TooltipItem({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-300 rounded-md shadow-lg px-3 py-2 text-[12px]">
      <p className="font-sans font-semibold text-slate-700 mb-0.5">{d.ben.objeto}</p>
      <p className="font-mono text-[10px] text-slate-500 mb-0.5">CATMAT {d.ben.catmat}</p>
      <p className="font-sans text-slate-600 tabular-nums">{fmtQ(d.qtd)} unidades · R$ {fmtM(d.valor)}</p>
    </div>
  );
}

export default function RankingItens({ data, ano, setTab }) {
  const { contratos, catalog } = data;
  const top = calcTopItensPorAno(contratos, catalog, ano).slice(0, 10);
  if (!top.length) return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Itens mais adquiridos — {ano}</h3>
      <p className="text-emerald-700 text-[13px]">✓ Nenhum contrato iniciado em {ano}.</p>
    </div>
  );
  const maxQtd = Math.max(...top.map(x => x.qtd), 1);
  const chartData = top.map(x => ({
    name: x.ben.objeto.length > 28 ? x.ben.objeto.slice(0, 26) + "…" : x.ben.objeto,
    qtd: x.qtd, valor: x.valor, ben: x.ben
  }));

  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500">Itens mais adquiridos — {ano}</h3>
        <button onClick={() => setTab?.("contratos")} className="border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans">Ver contratos</button>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, top.length * 28 + 20)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10.5, fill: "#475569" }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipItem />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="qtd" radius={[3, 3, 3, 3]} barSize={18} fill="#334155">
            <LabelList dataKey="qtd" position="right" formatter={(v) => fmtQ(v) + " un."} style={{ fontSize: 10.5, fill: "#334155", fontFamily: "ui-sans-serif, system-ui" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="font-sans text-[11px] text-slate-500 mt-2">Top {top.length} itens por quantidade contratada em {ano} · total <b className="tabular-nums">{fmtCurto(top.reduce((t, x) => t + x.valor, 0))}</b></p>
    </div>
  );
}