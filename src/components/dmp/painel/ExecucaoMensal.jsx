import React from "react";
import { fmtCurto, calcExecucaoMensal } from "@/lib/painel-calc";
import { fmtM } from "@/lib/dmp-utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function TooltipMes({ active, payload, label, dark }) {
  if (!active || !payload?.length) return null;
  const bg = dark ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300";
  const t1 = dark ? "text-slate-100" : "text-slate-700";
  const t2 = dark ? "text-slate-300" : "text-slate-600";
  return (
    <div className={`${bg} border rounded-md shadow-lg px-3 py-2 text-[12px]`}>
      <p className={`font-sans font-semibold ${t1} mb-0.5`}>{label}</p>
      <p className={`font-sans ${t2} tabular-nums`}>Empenhado: R$ {fmtM(payload[0].value)}</p>
    </div>
  );
}

export default function ExecucaoMensal({ data, ano, dark }) {
  const { contratos, ocorrencias } = data;
  const meses = calcExecucaoMensal(contratos, ocorrencias, ano);
  const total = meses.reduce((t, v) => t + v, 0);
  const media = total / 12;
  const max = Math.max(...meses, 1);
  const cardBg = dark ? "bg-slate-800/70 border-slate-700" : "bg-white border-slate-300";
  const h3 = dark ? "text-slate-400" : "text-slate-500";
  const okTxt = dark ? "text-emerald-400" : "text-emerald-700";
  const txt = dark ? "text-slate-300" : "text-slate-500";
  const strong = dark ? "text-slate-100" : "text-slate-700";
  const tick = dark ? "#94a3b8" : "#64748b";
  const axis = dark ? "#475569" : "#cbd5e1";
  const cursor = dark ? "#1e293b" : "#f1f5f9";
  const fillHi = dark ? "#38bdf8" : "#334155";
  const fillLo = dark ? "#475569" : "#94a3b8";

  if (total === 0) return (
    <div className={`${cardBg} border rounded-lg p-4`}>
      <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3} mb-3`}>Execução mensal — {ano}</h3>
      <p className={`text-[13px] ${okTxt}`}>✓ Nenhum contrato iniciado em {ano}.</p>
    </div>
  );

  const chartData = meses.map((v, i) => ({ name: nomesMeses[i], valor: v }));

  return (
    <div className={`${cardBg} border rounded-lg p-4`}>
      <h3 className={`font-sans text-[11px] tracking-widest uppercase ${h3} mb-3`}>Execução mensal — {ano}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: tick }} axisLine={{ stroke: axis }} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<TooltipMes dark={dark} />} cursor={{ fill: cursor }} />
          <Bar dataKey="valor" radius={[3, 3, 0, 0]} maxBarSize={36}>
            {chartData.map((d, i) => <Cell key={i} fill={d.valor >= media ? fillHi : fillLo} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className={`border-t border-dashed ${dark ? "border-slate-700" : "border-slate-200"} mt-2 pt-2 flex items-center justify-between`}>
        <p className={`font-sans text-[11px] ${txt}`}>Total empenhado: <b className={`tabular-nums ${strong}`}>{fmtCurto(total)}</b></p>
        <p className={`font-sans text-[11px] ${txt}`}>Média mensal: <b className={`tabular-nums ${strong}`}>{fmtCurto(media)}</b></p>
      </div>
    </div>
  );
}