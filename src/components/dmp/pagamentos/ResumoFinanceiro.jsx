import React from "react";
import { fmtM } from "@/lib/dmp-utils";
import { Barra } from "../ui";

const TONS = {
  neutro: "border-slate-200 bg-stone-50 text-slate-800",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  aviso: "border-amber-200 bg-amber-50 text-amber-800",
  critico: "border-red-200 bg-red-50 text-red-800"
};

function Metrica({ rotulo, valor, tom = "neutro", ajuda }) {
  return (
    <div className={`border rounded-sm px-3 py-2.5 ${TONS[tom] || TONS.neutro}`}>
      <p className="font-sans text-[9px] font-bold tracking-widest uppercase opacity-70">{rotulo}</p>
      <p className="font-mono font-semibold text-[15px] mt-0.5">R$ {fmtM(valor)}</p>
      {ajuda && <p className="font-sans text-[10.5px] opacity-70 mt-0.5">{ajuda}</p>}
    </div>
  );
}

export default function ResumoFinanceiro({ t }) {
  const pct = t.empenhado ? Math.max(0, Math.min(100, (t.pago / t.empenhado) * 100)) : 0;
  return (
    <div>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(148px,1fr))]">
        <Metrica rotulo="Valor empenhado" valor={t.empenhado} ajuda="Itens do contrato + aditivos de valor" />
        <Metrica rotulo="Total das notas" valor={t.nf} ajuda="Soma das notas não canceladas" />
        <Metrica rotulo="Total pago" valor={t.pago} tom="ok" ajuda="Soma dos valores efetivamente pagos" />
        <Metrica rotulo="Saldo a pagar" valor={t.aPagar} tom={t.aPagar > 0 ? "aviso" : "neutro"} ajuda="Empenhado menos o já pago" />
        <Metrica rotulo="Total retido" valor={t.retido} tom={t.retido > 0 ? "critico" : "neutro"} ajuda="Notas com situação Retido" />
      </div>
      <div className="flex items-center gap-3 mt-2.5">
        <Barra pct={pct} classe={t.retido > 0 ? "critico" : pct >= 100 ? "" : "aviso"} />
        <span className="font-mono text-[10.5px] text-slate-500 whitespace-nowrap">{pct.toFixed(0)}% do empenhado já pago</span>
      </div>
    </div>
  );
}