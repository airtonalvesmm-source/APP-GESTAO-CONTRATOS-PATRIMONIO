import React, { useState } from "react";
import { fmtM } from "@/lib/dmp-utils";
import { fmtCurto, fmtPct, calcPlanejamentoFunil, calcExecucaoAtas, calcEconomiaCobertura } from "@/lib/painel-calc";
import { inputCls } from "./ui";

function Barra({ label, valor, base, max, destaque }) {
  const pct = base ? valor / base * 100 : 0;
  const w = max ? Math.max(2, valor / max * 100) : 100;
  return (
    <div className="flex items-center gap-3">
      <span className="font-sans text-[12px] text-slate-600 w-[180px] flex-none">{label}</span>
      <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden">
        <div className={`h-full rounded-md flex items-center justify-end pr-2 ${destaque ? "bg-slate-800" : "bg-slate-600"}`} style={{ width: `${w}%` }}>
          <span className="font-sans text-[11px] text-white font-semibold whitespace-nowrap tabular-nums">{fmtCurto(valor)}</span>
        </div>
      </div>
      <span className="font-sans text-[11px] text-slate-500 w-[52px] text-right flex-none tabular-nums">{base ? fmtPct(pct) : ""}</span>
    </div>
  );
}

function BlocoA({ data, ano, setTab }) {
  const { pca, atas } = data;
  const f = calcPlanejamentoFunil(pca, atas, ano);
  const max = f.planejado || 1;
  return (
    <div className="bg-white border border-slate-300 rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500">Planejamento — PCA {ano}</h3>
        <button onClick={() => setTab?.("plano")} className="border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-md px-2.5 py-1 text-[11px] font-sans">Ver PCA</button>
      </div>
      <div className="space-y-2.5">
        <Barra label="Planejado (PCA)" valor={f.planejado} base={null} max={max} destaque />
        <Barra label="Já licitado" valor={f.licitado} base={f.planejado} max={max} />
        <Barra label="Ainda a licitar" valor={f.aLicitrar} base={f.planejado} max={max} />
      </div>
      <p className="font-sans text-[11px] text-slate-500 mt-3">{f.itensPlanejados} itens no PCA · {f.itensLicitados} já licitados</p>
    </div>
  );
}

function BlocoB({ data, setTab }) {
  const { atas, contratos, pagamentos, ocorrencias } = data;
  const [filtro, setFiltro] = useState("todas");
  const f = calcExecucaoAtas(atas, contratos, pagamentos, ocorrencias, filtro);
  const max = f.registrado || 1;
  const inconsistente = Math.abs(f.diff) > 0.01;
  return (
    <div className="bg-white border border-slate-300 rounded-md p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-slate-500">Execução das atas</h3>
        <select value={filtro} onChange={e => setFiltro(e.target.value)} className={inputCls + " w-auto"}>
          <option value="todas">Todas as atas</option>
          <option value="2026">Somente atas de 2026</option>
          <option value="vigentes">Somente atas vigentes</option>
        </select>
      </div>
      {filtro === "todas" && <p className="font-sans text-[11px] text-slate-500 mb-3">A execução de 2026 inclui atas homologadas em 2025.</p>}
      <div className="space-y-2.5">
        <Barra label="Registrado em ata" valor={f.registrado} base={null} max={max} destaque />
        <Barra label="Empenhado (contratos)" valor={f.empenhado} base={f.registrado} max={max} />
        <Barra label="Pago" valor={f.pago} base={f.registrado} max={max} />
        <Barra label="Saldo vigente" valor={f.saldoVigente} base={f.registrado} max={max} />
        <Barra label="Saldo perdido" valor={f.saldoPerdido} base={f.registrado} max={max} />
      </div>
      {inconsistente ? (
        <button onClick={() => setTab?.("atas")} className="mt-3 inline-flex items-center gap-1.5 bg-red-50 border border-red-300 text-red-800 rounded-md px-3 py-1.5 text-[12px] font-sans">
          Inconsistência de R$ {fmtM(Math.abs(f.diff))} — verificar lançamentos
        </button>
      ) : (
        <p className="font-sans text-[11px] text-emerald-700 mt-3">✓ Registrado = Empenhado + Saldo vigente + Saldo perdido</p>
      )}
    </div>
  );
}

function Economia({ data, ano, setTab }) {
  const { contratos, pca } = data;
  const eco = calcEconomiaCobertura(contratos, pca, ano);
  if (eco.cobertura < 80) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-md p-4">
        <h3 className="font-sans text-[11px] tracking-widest uppercase text-amber-800 mb-2">Economia obtida — indisponível</h3>
        <p className="font-sans text-[13px] text-amber-900 mb-1">{eco.itensSemValor} dos {eco.itensTotal} itens do PCA {ano} estão sem valor unitário estimado.</p>
        <p className="font-sans text-[12px] text-amber-800 mb-3">Sem essa informação não é possível medir a economia da licitação.</p>
        <button onClick={() => setTab?.("plano")} className="border border-amber-400 text-amber-800 hover:bg-amber-100 rounded-md px-2.5 py-1 text-[11px] font-sans">Completar valores no PCA</button>
      </div>
    );
  }
  return (
    <div className="bg-emerald-50 border border-emerald-300 rounded-md p-4">
      <h3 className="font-sans text-[11px] tracking-widest uppercase text-emerald-700 mb-2">Economia obtida</h3>
      <p className="font-sans text-[28px] font-semibold text-emerald-800 leading-none tabular-nums">{fmtCurto(eco.economia)}</p>
      <p className="font-sans text-[13px] text-emerald-700 mt-1">{fmtPct(eco.pct)} abaixo do estimado · base: {eco.pares} itens</p>
    </div>
  );
}

export default function Funil({ data, ano, setTab }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <BlocoA data={data} ano={ano} setTab={setTab} />
        <BlocoB data={data} setTab={setTab} />
      </div>
      <Economia data={data} ano={ano} setTab={setTab} />
    </div>
  );
}