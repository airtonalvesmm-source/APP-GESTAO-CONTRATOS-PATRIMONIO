import React, { useEffect, useRef, useState } from "react";
import { X, ChevronDown } from "lucide-react";

export function Pill({ tipo, children }) {
  const classes = {
    ok: "text-emerald-700 border-emerald-300 bg-emerald-50",
    aviso: "text-amber-700 border-amber-300 bg-amber-50",
    critico: "text-red-800 border-red-300 bg-red-50",
    neutro: "text-slate-600 border-slate-300 bg-slate-50"
  };
  return (
    <span className={`inline-flex items-center whitespace-nowrap font-mono text-[9.5px] tracking-wider uppercase px-2 py-0.5 rounded-sm border ${classes[tipo] || classes.neutro}`}>
      {children}
    </span>
  );
}

export function Barra({ pct, classe }) {
  const cores = { critico: "bg-red-700", aviso: "bg-amber-600", "": "bg-slate-700" };
  return (
    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden min-w-[70px] mt-1">
      <div className={`h-full rounded-full ${cores[classe] || cores[""]}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Plaqueta({ pdm, catmat }) {
  return (
    <span className="mt-auto flex gap-3.5 px-1 py-1.5 rounded-sm border border-stone-300 bg-gradient-to-b from-stone-50 to-stone-200 shadow-inner relative">
      <span className="pl-1">
        <span className="block font-mono text-[8.5px] font-semibold tracking-widest uppercase text-stone-600">PDM</span>
        <span className="block font-mono text-[13px] font-semibold tracking-wider text-stone-700">{pdm}</span>
      </span>
      <span>
        <span className="block font-mono text-[8.5px] font-semibold tracking-widest uppercase text-stone-600">CATMAT</span>
        <span className="block font-mono text-[13px] font-semibold tracking-wider text-stone-700">{catmat}</span>
      </span>
    </span>
  );
}

export function Vazio({ titulo, texto }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-sm py-10 px-6 text-center text-slate-500 font-sans text-sm">
      <b className="block text-base text-slate-800 mb-1.5 font-semibold">{titulo}</b>
      {texto}
    </div>
  );
}

export function Modal({ sobre, titulo, onClose, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const firstInput = ref.current?.querySelector("input,select,textarea,button");
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-slate-900/55 z-[60] flex items-end md:items-center justify-center md:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="bg-white w-full max-w-[880px] max-h-[92vh] overflow-auto rounded-t-md md:rounded-md border border-slate-300 shadow-xl">
        <header className="flex gap-4 items-start px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="min-w-0 flex-1">
            {sobre && <p className="font-mono text-[10px] tracking-widest uppercase text-amber-700 mb-1">{sobre}</p>}
            <h3 className="font-bold text-lg leading-snug text-slate-800">{titulo}</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            className="flex-none border border-slate-300 bg-slate-50 w-[34px] h-[34px] rounded-sm flex items-center justify-center text-slate-600 hover:border-slate-500">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex gap-2 justify-end flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Btn({ children, variant = "default", ...props }) {
  const variants = {
    default: "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
    forte: "bg-slate-800 border-slate-800 text-white hover:bg-slate-700",
    risco: "border-slate-300 bg-white text-red-800 hover:border-red-500"
  };
  return (
    <button {...props}
      className={`border rounded-sm px-3 py-2 font-sans font-semibold text-[12.5px] cursor-pointer transition-colors ${variants[variant]} ${props.className || ""}`}>
      {children}
    </button>
  );
}

export function MiniBtn({ children, variant = "default", ...props }) {
  return <Btn variant={variant} {...props} className={`px-2 py-1 text-[11.5px] ${props.className || ""}`}>{children}</Btn>;
}

export function Campo({ label, children, ajuda, className = "" }) {
  return (
    <div className={`grid gap-1 ${className}`}>
      {label && <label className="font-sans text-[10px] font-semibold tracking-widest uppercase text-slate-500">{label}</label>}
      {children}
      {ajuda && <span className="font-sans text-[11.5px] text-slate-500">{ajuda}</span>}
    </div>
  );
}

export const inputCls = "border border-slate-300 rounded-sm px-2.5 py-2 font-sans text-sm bg-white text-slate-800 w-full focus:border-slate-600 focus:outline-none";
export const textareaCls = inputCls + " font-serif text-[14.5px] min-h-[74px] resize-y";

export function Alertas({ itens }) {
  const [aberto, setAberto] = useState(true);
  if (!itens.length) return null;
  return (
    <div className="border border-amber-300 bg-amber-50 rounded-sm px-4 py-3.5 mb-5">
      <button onClick={() => setAberto(a => !a)} className="w-full flex items-center justify-between m-0 font-sans text-[11px] tracking-widest uppercase text-amber-700 cursor-pointer">
        <span>{itens.length} ponto{itens.length === 1 ? "" : "s"} de atenção</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <ul className="m-0 pl-4 text-sm text-amber-900 space-y-1 mt-2">
          {itens.map((a, i) => <li key={i} dangerouslySetInnerHTML={{ __html: a.txt }} />)}
        </ul>
      )}
    </div>
  );
}