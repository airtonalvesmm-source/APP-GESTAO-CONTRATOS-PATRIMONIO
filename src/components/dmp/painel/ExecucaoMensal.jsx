import React from "react";
import { fmtCurto, calcExecucaoMensal } from "@/lib/painel-calc";
import { fmtM } from "@/lib/dmp-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function TooltipMes({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-300 rounded-md shadow-lg px-3 py-2 text-[12px]">
      <p className="font-sans font-semibold text-slate-700 mb-0.5">{label}</p>
      <p className="font-sans text-slate-600 tabular-nums">Empenhado: R$ {fmtM(payload[0].value)}</p>
    </div>
  );
}

export default function ExecucaoMensal({ data, ano }) {
  const { contratos, ocorrencias } = data;
  const meses = calcExecucaoMensal(contratos, ocorrencias, ano);
  const total = meses.reduce((t, v) => t + v, 0);
  const media = total / 12;
  const max = Math.max(...meses, 1);

  if (total === 0) return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Execução mensal — {ano}</h3>
      <p className="text-emerald-700 text-[13px]">✓ Nenhum contrato iniciado em {ano}.</p>
    </div>
  );

  const chartData = meses.map((v, i) => ({ name: nomesMeses[i], valor: v }));

  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Execução mensal — {ano}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<TooltipMes />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="valor" radius={[3, 3, 0, 0]} maxBarSize={36}>
            {chartData.map((d, i) => <Cell key={i} fill={d.valor >= media ? "#334155" : "#94a3b8"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="border-t border-dashed border-slate-200 mt-2 pt-2 flex items-center justify-between">
        <p className="font-sans text-[11px] text-slate-500">Total empenhado: <b className="tabular-nums text-slate-700">{fmtCurto(total)}</b></p>
        <p className="font-sans text-[11px] text-slate-500">Média mensal: <b className="tabular-nums text-slate-700">{fmtCurto(media)}</b></p>
      </div>
    </div>
  );
}