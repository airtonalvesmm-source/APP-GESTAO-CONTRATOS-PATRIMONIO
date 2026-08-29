import React, { useState, useMemo, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { calcTodosAlertas } from "@/lib/painel-calc";

export default function CentralAlertas({ data }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const alertas = useMemo(() => calcTodosAlertas(data), [data]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const criticos = alertas.filter(a => a.severidade === "critico");
  const avisos = alertas.filter(a => a.severidade === "aviso");

  return (
    <div className="relative flex-none" ref={ref}>
      <button onClick={() => setAberto(a => !a)}
        className="relative border border-slate-600 bg-slate-700 hover:bg-slate-600 text-stone-100 rounded-sm w-[38px] h-[38px] flex items-center justify-center cursor-pointer transition-colors"
        aria-label="Central de alertas">
        <Bell className="w-[18px] h-[18px]" />
        {alertas.length > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-mono text-[10px] font-bold text-white ${criticos.length > 0 ? "bg-red-600" : "bg-amber-500"}`}>
            {alertas.length}
          </span>
        )}
      </button>
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[460px] overflow-auto bg-white border border-slate-300 rounded-sm shadow-xl z-50">
          <div className="px-4 py-3 border-b border-slate-200 bg-stone-50">
            <h3 className="font-sans font-bold text-sm text-slate-800">Central de alertas</h3>
            <p className="font-sans text-[11px] text-slate-500 mt-0.5">{alertas.length} ponto{alertas.length === 1 ? "" : "s"} de atenção — {criticos.length} crítico{criticos.length === 1 ? "" : "s"}, {avisos.length} aviso{avisos.length === 1 ? "" : "s"}.</p>
          </div>
          {alertas.length === 0 ? (
            <p className="px-4 py-6 font-sans text-sm text-slate-500 text-center">Nenhum alerta no momento.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alertas.map((a, i) => (
                <li key={i} className="px-4 py-2.5 flex gap-2.5 items-start">
                  <span className={`inline-block w-2 h-2 rounded-full mt-1.5 flex-none ${a.severidade === "critico" ? "bg-red-600" : "bg-amber-500"}`}></span>
                  <span className="font-sans text-[12.5px] text-slate-600 leading-snug">{a.txt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}