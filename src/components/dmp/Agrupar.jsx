import React from "react";

export function agruparPorAnoCategoria(itens, anoFn, catFn) {
  const map = {};
  itens.forEach(item => {
    const a = String(anoFn(item) || "Sem ano");
    const c = catFn(item) || "Sem categoria";
    (map[a] = map[a] || {})[c] = (map[a][c] || []).concat(item);
  });
  return Object.keys(map).sort((x, y) => y.localeCompare(x)).map(a => {
    const categorias = Object.keys(map[a]).sort().map(c => ({ cat: c, itens: map[a][c] }));
    return { ano: a, categorias, total: categorias.reduce((t, c) => t + c.itens.length, 0) };
  });
}

export function GrupoAnoCategoria({ grupos, renderItem }) {
  return (
    <div className="space-y-6">
      {grupos.map(g => (
        <div key={g.ano}>
          <div className="flex items-baseline gap-3 border-b border-slate-300 pb-2 mb-3.5">
            <h3 className="font-sans font-bold text-sm tracking-widest uppercase text-slate-800 flex items-center gap-2.5">
              <span className="w-1 h-4 bg-amber-700 inline-block" />{g.ano}
            </h3>
            <span className="font-mono text-[11px] text-slate-500 ml-auto">{g.total} {g.total === 1 ? "item" : "itens"}</span>
          </div>
          {g.categorias.map(c => (
            <div key={c.cat} className="mb-5">
              <h4 className="font-sans font-semibold text-[12px] tracking-wider uppercase text-slate-600 mb-2.5 flex items-center gap-2">
                <span className="w-1 h-3 bg-amber-700" />{c.cat} <span className="font-mono text-[10px] text-slate-400">· {c.itens.length}</span>
              </h4>
              <div className="space-y-3.5">
                {c.itens.map(renderItem)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function BotaoAgrupar({ agrupar, setAgrupar }) {
  return (
    <button onClick={() => setAgrupar(a => !a)} aria-pressed={agrupar}
      className={`border rounded-sm px-3 py-1.5 cursor-pointer font-sans font-semibold text-[13px] self-center whitespace-nowrap ${agrupar ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-slate-500"}`}>
      Agrupar por ano/categoria
    </button>
  );
}