import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ORDEM } from "@/lib/dmp-data";
import { Desenho } from "@/components/dmp/Desenho";
import { fmtQ, fmtData, norm, baixarCSV, isoData, hoje } from "@/lib/dmp-utils";
import { sugestoesSubcategoria, agruparBensPorSubcategoria } from "@/lib/subcat-utils";
import { Modal, Btn, MiniBtn, Campo, Plaqueta, Vazio, Pill, inputCls } from "./ui";
import { TelaCab } from "./Catalogo";
import ImportarDepartamentos from "./estoque/ImportarDepartamentos";
import FormEntrada from "./estoque/FormEntrada";
import DetalheBem from "./estoque/DetalheBem";
import FormSaida from "./estoque/FormSaida";
import { Plus, LogOut, Upload, Boxes, Building2 } from "lucide-react";

export default function Estoque({ data, refresh }) {
  const { catalog, contratos, pagamentos, bens, movimentacoes, departamentos, subcategorias } = data;
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todas");
  const [subcatAtiva, setSubcatAtiva] = useState("");
  const [termo, setTermo] = useState("");
  const [situacao, setSituacao] = useState("disponivel");
  const [fichaBenId, setFichaBenId] = useState(null);
  const [entrada, setEntrada] = useState(false);
  const [saida, setSaida] = useState(false);

  const cats = useMemo(() => {
    const c = (data.categorias || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(c => c.nome);
    return c.length ? c : ORDEM;
  }, [data.categorias]);

  const bensPorBenId = useMemo(() => {
    const m = new Map();
    (bens || []).forEach(b => {
      if (!m.has(b.benId)) m.set(b.benId, []);
      m.get(b.benId).push(b);
    });
    return m;
  }, [bens]);

  const subcatsDaCatAtiva = useMemo(() => {
    if (categoriaAtiva === "Todas") return [];
    return sugestoesSubcategoria(subcategorias, catalog, categoriaAtiva);
  }, [subcategorias, catalog, categoriaAtiva]);

  const itensComEstoque = useMemo(() => {
    const t = norm(termo.trim());
    return (catalog || []).filter(b => {
      if (b.oculto) return false;
      const unidades = bensPorBenId.get(b.id) || [];
      if (!unidades.length) return false;
      const disp = unidades.filter(u => u.situacao === "em estoque").length;
      const transf = unidades.length - disp;
      if (situacao === "disponivel" && disp === 0) return false;
      if (situacao === "transferido" && transf === 0) return false;
      if (categoriaAtiva !== "Todas" && b.categoria !== categoriaAtiva) return false;
      if (subcatAtiva && (b.subcategoria || "").trim() !== subcatAtiva) return false;
      if (t) {
        const emPlaca = unidades.some(u => norm(u.placa).includes(t));
        if (!emPlaca && !norm(b.objeto).includes(t) && !String(b.catmat).includes(t) && !String(b.pdm).includes(t)) return false;
      }
      return true;
    }).slice().sort((a, b) => (a.subcategoria || "").localeCompare(b.subcategoria || "", "pt-BR") || a.objeto.localeCompare(b.objeto, "pt-BR"));
  }, [catalog, bensPorBenId, situacao, categoriaAtiva, subcatAtiva, termo]);

  const totais = useMemo(() => {
    let disp = 0, transf = 0;
    (bens || []).forEach(b => { if (b.situacao === "em estoque") disp++; else transf++; });
    return { disp, transf, total: (bens || []).length };
  }, [bens]);

  function exportCSV() {
    if (!bens.length) return alert("Não há bens patrimoniados cadastrados.");
    const l = [["Placa", "Denominação", "CATMAT", "Categoria", "Subcategoria", "Contrato", "Nota fiscal", "Emissão da NF", "Situação", "Departamento", "Entrada", "Saída"]];
    bens.forEach(u => {
      const b = catalog.find(x => x.id === u.benId) || {};
      const c = contratos.find(x => x.id === u.contratoId) || {};
      const d = departamentos.find(x => x.id === u.departamentoId);
      l.push([u.placa, b.objeto || "—", b.catmat || "—", b.categoria || "—", b.subcategoria || "", c.numero || "—", u.numeroNF || "—", fmtData(u.dataNF), u.situacao, d ? `${d.sigla || ""} ${d.nome}` : "", fmtData(u.dataEntrada), fmtData(u.dataSaida)]);
    });
    baixarCSV("estoque.csv", l);
  }

  return (
    <div>
      <TelaCab
        titulo="Estoque e patrimônio"
        desc="Bens patrimoniados entrada de contratos e notas fiscais entregues. Navegue por categoria, consulte a placa de tombamento e dê saída para os departamentos."
        direita={<>
          <ImportarDepartamentos data={data} refresh={refresh} />
          <Btn onClick={exportCSV}>Baixar CSV</Btn>
          <Btn onClick={() => setSaida(true)} disabled={totais.disp === 0 || departamentos.length === 0}><LogOut className="w-4 h-4 inline mr-1" />Dar saída</Btn>
          <Btn variant="forte" onClick={() => setEntrada(true)}><Plus className="w-4 h-4 inline mr-1" />Registrar entrada</Btn>
        </>}
      />

      {departamentos.length === 0 && (
        <div className="border border-amber-300 bg-amber-50 rounded-sm px-4 py-3 text-sm text-amber-900 mb-4 flex gap-2 items-center">
          <Building2 className="w-4 h-4 flex-none" />
          Importe os departamentos (botão "Importar CSV") antes de dar saída dos bens — eles são o destino de cada transferência.
        </div>
      )}

      {bens.length === 0 ? (
        <Vazio titulo="Nenhum bem patrimoniado" texto="Registre a entrada a partir de um contrato entregue para começar a controlar o estoque." />
      ) : (
        <>
          <div className="sticky top-0 z-20 bg-stone-100/95 backdrop-blur-sm border-b border-slate-300 -mx-5 px-5 py-2.5 mb-5">
            <div className="flex gap-2 items-center flex-wrap">
              <input type="search" value={termo} onChange={e => setTermo(e.target.value)}
                placeholder="Buscar por placa, nome ou CATMAT"
                className="flex-1 min-w-[220px] border border-slate-300 rounded-sm px-3 py-2 font-sans text-sm bg-white" />
              {["Todas", ...cats].map(c => {
                const n = c === "Todas" ? itensComEstoque.length : itensComEstoque.filter(b => b.categoria === c).length;
                return (
                  <button key={c} onClick={() => { setCategoriaAtiva(c); setSubcatAtiva(""); }} aria-pressed={categoriaAtiva === c}
                    className={`border rounded-sm px-3 py-1.5 cursor-pointer font-sans font-semibold text-[13px] flex items-center gap-1.5 transition-colors
                      ${categoriaAtiva === c ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-slate-500"}`}>
                    {c}<span className={`font-mono text-[11px] ${categoriaAtiva === c ? "text-slate-400" : "text-slate-400"}`}>{n}</span>
                  </button>
                );
              })}
              {subcatsDaCatAtiva.length > 0 && (
                <select value={subcatAtiva} onChange={e => setSubcatAtiva(e.target.value)} className="border border-slate-300 rounded-sm px-2.5 py-1.5 font-sans text-[13px] bg-white cursor-pointer text-slate-700">
                  <option value="">Todas as subcategorias</option>
                  {subcatsDaCatAtiva.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <select value={situacao} onChange={e => setSituacao(e.target.value)} className="border border-slate-300 rounded-sm px-2.5 py-1.5 font-sans text-[13px] bg-white cursor-pointer text-slate-700">
                <option value="disponivel">Em estoque ({totais.disp})</option>
                <option value="transferido">Transferidos ({totais.transf})</option>
                <option value="">Todos ({totais.total})</option>
              </select>
              <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto">
                {itensComEstoque.length} {itensComEstoque.length === 1 ? "tipo de bem" : "tipos de bem"}
              </span>
            </div>
          </div>

          {itensComEstoque.length === 0 ? (
            <Vazio titulo="Nenhum bem corresponde aos filtros" texto="Ajuste a busca ou altere o filtro de situação." />
          ) : (
            (categoriaAtiva === "Todas" ? cats : [categoriaAtiva]).map(cat => {
              const itens = itensComEstoque.filter(b => b.categoria === cat);
              if (!itens.length) return null;
              const grupos = agruparBensPorSubcategoria(itens);
              return (
                <section key={cat} className="mb-9">
                  <div className="flex items-baseline gap-3 border-b border-slate-300 pb-2 mb-4">
                    <h3 className="font-sans font-bold text-sm tracking-widest uppercase text-slate-800 flex items-center gap-2.5">
                      <span className="w-1 h-4 bg-amber-700 inline-block" />{cat}
                    </h3>
                    <span className="font-mono text-[11px] text-slate-500 ml-auto">{itens.length} {itens.length === 1 ? "tipo" : "tipos"}</span>
                  </div>
                  {grupos.map(g => (
                    <div key={g.subcategoria} className="mb-6">
                      <div className="flex items-baseline gap-2 mb-3 pl-1">
                        <span className="w-1 h-3.5 bg-slate-400 inline-block" />
                        <h4 className="font-sans font-semibold text-[12.5px] tracking-wide uppercase text-slate-600">{g.subcategoria}</h4>
                        <span className="font-mono text-[10px] text-slate-400 ml-1">{g.items.length}</span>
                      </div>
                      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
                        {g.items.map(b => {
                          const unidades = bensPorBenId.get(b.id) || [];
                          const disp = unidades.filter(u => u.situacao === "em estoque").length;
                          return <CartaoEstoque key={b.id} b={b} disp={disp} total={unidades.length} onClick={() => setFichaBenId(b.id)} />;
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })
          )}
        </>
      )}

      {fichaBenId && (
        <DetalheBem benId={fichaBenId} data={data} refresh={refresh} onClose={() => setFichaBenId(null)} />
      )}
      {entrada && <FormEntrada data={data} refresh={refresh} onClose={() => setEntrada(false)} />}
      {saida && <FormSaida data={data} refresh={refresh} onClose={() => setSaida(false)} />}
    </div>
  );
}

function CartaoEstoque({ b, disp, total, onClick }) {
  return (
    <div onClick={onClick} className="bg-white border border-slate-300 rounded-sm overflow-hidden text-left cursor-pointer flex flex-col transition-all hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5">
      <span className="aspect-[4/3] bg-[repeating-linear-gradient(45deg,#F4F6F2_0_6px,#EDF0EB_6px_12px)] border-b border-slate-200 flex items-center justify-center text-stone-500 relative">
        {b.imagem ? <img src={b.imagem} alt={b.objeto} className="w-full h-full object-cover" /> : <Desenho arte={b.arte} />}
        <span className="absolute top-2 right-2 flex gap-1">
          <Pill tipo={disp > 0 ? "ok" : "neutro"}>{disp} em estoque</Pill>
        </span>
      </span>
      <span className="p-2.5 flex flex-col gap-1.5 flex-1">
        <span className="block font-sans font-semibold text-[12.5px] leading-snug text-slate-800">{b.objeto}</span>
        {b.subcategoria && <span className="inline-block self-start font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-sm border border-slate-200 bg-slate-50 text-slate-500">{b.subcategoria}</span>}
        <span className="block text-[11.5px] leading-snug text-slate-500 line-clamp-2">{b.aplicacao}</span>
        <Plaqueta pdm={b.pdm} catmat={b.catmat} />
        <span className="font-mono text-[10.5px] tracking-wider uppercase text-slate-500 mt-0.5">{total} {total === 1 ? "unidade" : "unidades"} patrimoniada{total === 1 ? "" : "s"}</span>
      </span>
    </div>
  );
}