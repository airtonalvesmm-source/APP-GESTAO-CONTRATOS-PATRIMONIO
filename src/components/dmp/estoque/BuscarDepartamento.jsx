import React, { useState, useRef, useEffect, useMemo } from "react";
import { norm } from "@/lib/dmp-utils";
import { optgroupsDepartamentos } from "@/lib/departamentos";
import { inputCls } from "../ui";
import { Search, ChevronDown, Check } from "lucide-react";

// Combobox pesquisável de departamentos com hierarquia (optgroups).
// Substitui o <select> nativo mantendo a mesma API value/onChange/disabled.
export default function BuscarDepartamento({ departamentos, value, onChange, disabled, placeholder = "Selecione o departamento" }) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const grupos = useMemo(() => optgroupsDepartamentos(departamentos), [departamentos]);

  const sel = useMemo(() => {
    return (departamentos || []).find(d => d.id === value) || null;
  }, [departamentos, value]);

  const filtrados = useMemo(() => {
    const t = norm(termo.trim());
    if (!t) return grupos;
    return grupos
      .map(g => ({
        ...g,
        items: g.items.filter(d => norm(d.nome).includes(t) || norm(d.sigla || "").includes(t))
      }))
      .filter(g => g.items.length > 0);
  }, [grupos, termo]);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function escolher(id) {
    onChange(id);
    setTermo("");
    setAberto(false);
  }

  function onFocus() {
    setAberto(true);
    setTermo("");
  }

  const exibir = sel ? `${sel.sigla ? sel.sigla + " — " : ""}${sel.nome}` : "";

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        {aberto ? (
          <>
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              autoFocus
              value={termo}
              onChange={e => setTermo(e.target.value)}
              onFocus={onFocus}
              disabled={disabled}
              placeholder="Digite para buscar..."
              className={`${inputCls} pl-8 pr-8`}
            />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { if (!disabled) { setAberto(true); setTimeout(() => inputRef.current?.focus(), 0); } }}
              disabled={disabled}
              className={`${inputCls} text-left flex items-center justify-between ${!exibir ? "text-slate-400" : "text-slate-800"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span className="truncate">{exibir || placeholder}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 flex-none ml-2" />
            </button>
          </>
        )}
      </div>

      {aberto && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-auto bg-white border border-slate-300 rounded-sm shadow-lg">
          {filtrados.length === 0 ? (
            <p className="px-3 py-2.5 font-sans text-[12.5px] text-slate-500">Nenhum departamento encontrado.</p>
          ) : (
            filtrados.map(g => (
              <div key={g.label}>
                <div className="px-3 py-1.5 font-sans text-[9.5px] font-bold tracking-widest uppercase text-slate-500 bg-stone-50 sticky top-0">
                  {g.label}
                </div>
                {g.items.map(d => {
                  const on = d.id === value;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => escolher(d.id)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 font-sans text-[12.5px] transition-colors ${on ? "bg-amber-50 text-amber-900" : "text-slate-700 hover:bg-stone-50"}`}
                    >
                      <span className="flex-1 truncate">{d.sigla ? d.sigla + " — " : ""}{d.nome}</span>
                      {on && <Check className="w-3.5 h-3.5 text-amber-700 flex-none" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}