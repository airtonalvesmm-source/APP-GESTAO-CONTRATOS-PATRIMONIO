import React from "react";
import { diasAte, fmtData, resumoAta, fmtM } from "@/lib/dmp-utils";
import { fmtCurto, fmtPct, calcTimelineVigencia, calcAtasVigentesDetalhado } from "@/lib/painel-calc";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

function TooltipTimeline({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const cor = d.tipo === "ata" ? "text-amber-700" : "text-slate-700";
  return (
    <div className="bg-white border border-slate-300 rounded-md shadow-lg px-3 py-2 text-[12px]">
      <p className={`font-sans font-semibold ${cor} mb-0.5`}>{d.tipo === "ata" ? "Ata" : "Contrato"} {d.numero}</p>
      <p className="font-sans text-slate-600">{d.fornecedor}</p>
      <p className="font-sans text-slate-600 tabular-nums">Valor: R$ {fmtM(d.valor)}</p>
      <p className="font-sans text-slate-600">Vence em {fmtData(d.fim)} · {d.dias} dia{d.dias === 1 ? "" : "s"}</p>
    </div>
  );
}

function Timeline({ data, setTab }) {
  const { atas, contratos, pagamentos, ocorrencias } = data;
  const itens = calcTimelineVigencia(atas, contratos, pagamentos, ocorrencias);
  if (!itens.length) return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Vigência — atas e contratos</h3>
      <p className="text-emerald-700 text-[13px]">✓ Nenhuma ata ou contrato vigente com saldo.</p>
    </div>
  );
  const maxDias = Math.max(...itens.map(x => x.dias), 1);
  // jitter Y para evitar sobreposição
  const atasData = itens.filter(x => x.tipo === "ata").map((x, i) => ({ ...x, y: (i % 3) * 1.2 + 0.5 }));
  const contratosData = itens.filter(x => x.tipo === "contrato").map((x, i) => ({ ...x, y: (i % 3) * 1.2 + 0.5 }));
  const corAta = "#b45309";
  const corContrato = "#334155";

  function onClickAta(e) { if (e?.payload?.id) setTab?.("atas"); }
  function onClickContrato(e) { if (e?.payload?.id) setTab?.("contratos"); }

  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500">Vigência — atas e contratos</h3>
        <div className="flex gap-3 font-sans text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: corAta }} />Atas</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: corContrato }} />Contratos</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 18 }}>
          <XAxis type="number" dataKey="dias" domain={[0, maxDias]} tick={{ fontSize: 10, fill: "#64748b" }}
            tickFormatter={(v) => v === 0 ? "hoje" : `${v}d`} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
          <YAxis type="number" dataKey="y" domain={[0, 4]} hide />
          <ZAxis type="number" dataKey="valor" range={[40, 400]} />
          <ReferenceLine x={0} stroke="#1e293b" strokeWidth={1.5} label={{ value: "hoje", position: "top", fill: "#1e293b", fontSize: 10 }} />
          <Tooltip content={<TooltipTimeline />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={atasData} fill={corAta} onClick={onClickAta} />
          <Scatter data={contratosData} fill={corContrato} onClick={onClickContrato} />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="font-sans text-[11px] text-slate-500 mt-1">Passe o mouse para detalhes · clique para abrir a aba · tamanho do ponto proporcional ao valor</p>
    </div>
  );
}

function AtasVigentes({ data, setTab }) {
  const { atas, contratos } = data;
  const lista = calcAtasVigentesDetalhado(atas, contratos);
  if (!lista.length) return null;
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500 mb-3">Atas vigentes — {lista.length}</h3>
      <div className="space-y-3">
        {lista.map((x, i) => {
          const corBarra = x.pctConsumido > 80 ? "bg-amber-500"
            : (x.dias !== null && x.dias < 90 && x.pctConsumido < 50 ? "bg-red-500" : "bg-emerald-500");
          return (
            <div key={i} className="border border-slate-200 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-sans text-[13px] font-semibold text-slate-800">Ata {x.a.numero}</span>
                <span className="font-sans text-[12px] text-slate-500">{(x.a.fornecedor || "—").toUpperCase()}</span>
                {x.a.categoria && <span className="font-sans text-[10px] tracking-wider uppercase text-slate-400 ml-auto">{x.a.categoria}</span>}
              </div>
              <p className="font-sans text-[12px] text-slate-500 mb-1.5">
                Registrado <b className="tabular-nums">{fmtCurto(x.reg)}</b> · consumido <b className="tabular-nums">{fmtCurto(x.cons)}</b>
              </p>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${Math.min(100, x.pctConsumido)}%` }} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sans text-[11px] text-slate-500">{fmtPct(x.pctConsumido)} consumido</span>
                <span className="font-sans text-[11px] text-slate-500">·</span>
                <span className="font-sans text-[11px] text-slate-500">Saldo <b className="tabular-nums">{fmtCurto(x.sal)}</b> · {x.itens} itens</span>
                <span className="font-sans text-[11px] text-slate-500">·</span>
                <span className="font-sans text-[11px] text-slate-500">vence {fmtData(x.a.fim)} · {x.dias} dias</span>
                <button onClick={() => setTab?.("atas")} className="ml-auto border border-slate-300 text-slate-500 hover:bg-slate-50 rounded px-2 py-0.5 text-[10px] font-sans">Abrir ata</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Vigencia({ data, setTab }) {
  const { atas, contratos } = data;
  const vig = atas.filter(a => { const d = diasAte(a.fim); return d === null || d >= 0; }).filter(a => resumoAta(a, contratos).sal > 0);
  return (
    <div className="space-y-4">
      <Timeline data={data} setTab={setTab} />
      {vig.length > 0 && vig.length < 6 && <AtasVigentes data={data} setTab={setTab} />}
    </div>
  );
}