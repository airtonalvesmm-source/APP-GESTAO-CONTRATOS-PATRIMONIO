import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ORDEM } from "@/lib/dmp-data";
import { Btn, MiniBtn, Campo, Modal, inputCls } from "./ui";
import { subcatsDeCategoria } from "@/lib/subcat-utils";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function GerenciarSubcategorias({ subcategorias, categorias, catalog, refresh, onClose }) {
  const catsOpts = (() => {
    const c = (categorias || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(c => c.nome);
    return c.length ? c : ORDEM;
  })();
  const [catAtiva, setCatAtiva] = useState(catsOpts[0] || "");
  const [novoNome, setNovoNome] = useState("");
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");

  const daCat = (subcategorias || []).filter(s => s.categoria === catAtiva).sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || a.nome.localeCompare(b.nome));
  const usadasNoCatalogo = subcatsDeCategoria(catalog, catAtiva);

  async function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return alert("Informe o nome da subcategoria.");
    if (daCat.some(s => s.nome.toLowerCase() === nome.toLowerCase())) return alert("Já existe uma subcategoria com esse nome nesta categoria.");
    await base44.entities.Subcategoria.create({ categoria: catAtiva, nome, ordem: daCat.length });
    setNovoNome("");
    await refresh();
  }

  async function remover(s) {
    const emUso = (catalog || []).filter(b => !b.oculto && b.categoria === catAtiva && (b.subcategoria || "").trim().toLowerCase() === s.nome.trim().toLowerCase());
    if (emUso.length) {
      if (!confirm(`Há ${emUso.length} item(ns) do catálogo usando "${s.nome}". A sugestão será removida, mas os itens manterão a subcategoria. Continuar?`)) return;
    } else {
      if (!confirm(`Remover a sugestão "${s.nome}"?`)) return;
    }
    await base44.entities.Subcategoria.delete(s.id);
    await refresh();
  }

  function iniciarEdicao(s) { setEditId(s.id); setEditNome(s.nome); }
  async function salvarEdicao(s) {
    const nome = editNome.trim();
    if (!nome) return alert("Informe o nome.");
    if (daCat.some(x => x.id !== s.id && x.nome.toLowerCase() === nome.toLowerCase())) return alert("Já existe uma subcategoria com esse nome.");
    await base44.entities.Subcategoria.update(s.id, { nome });
    setEditId(null); setEditNome("");
    await refresh();
  }

  return (
    <Modal sobre="Catálogo" titulo="Gerenciar subcategorias" onClose={onClose}
      footer={<><Btn onClick={onClose}>Fechar</Btn></>}>
      <div className="flex gap-1.5 flex-wrap mb-4 border-b border-slate-200 pb-3">
        {catsOpts.map(c => (
          <button key={c} onClick={() => { setCatAtiva(c); setEditId(null); }}
            className={`border rounded-sm px-3 py-1.5 cursor-pointer font-sans font-semibold text-[12.5px] transition-colors
              ${catAtiva === c ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-slate-500"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-end mb-4">
        <div className="flex-1"><Campo label="Nova subcategoria"><input className={inputCls} value={novoNome} onChange={e => setNovoNome(e.target.value)} onKeyDown={e => { if (e.key === "Enter") adicionar(); }} placeholder="ex.: Armários, Cadeiras, Mesas" /></Campo></div>
        <Btn variant="forte" onClick={adicionar}><Plus className="w-4 h-4 inline mr-1" />Adicionar</Btn>
      </div>

      {daCat.length === 0 ? (
        <p className="font-sans text-sm text-slate-500">Nenhuma sugestão cadastrada para {catAtiva}. Itens podem usar subcategorias livres mesmo sem cadastro aqui.</p>
      ) : (
        <div className="border border-slate-300 rounded-sm overflow-hidden">
          {daCat.map((s, i) => (
            <div key={s.id} className="flex gap-2 items-center px-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-stone-50">
              <span className="font-mono text-[11px] text-slate-400 w-6">{i + 1}.</span>
              {editId === s.id ? (
                <>
                  <input className={inputCls + " flex-1"} value={editNome} onChange={e => setEditNome(e.target.value)} autoFocus onKeyDown={e => { if (e.key === "Enter") salvarEdicao(s); if (e.key === "Escape") setEditId(null); }} />
                  <MiniBtn variant="forte" onClick={() => salvarEdicao(s)}>Salvar</MiniBtn>
                  <MiniBtn onClick={() => setEditId(null)}>Cancelar</MiniBtn>
                </>
              ) : (
                <>
                  <span className="font-sans text-[13.5px] text-slate-700 flex-1">{s.nome}</span>
                  {usadasNoCatalogo.includes(s.nome) && <span className="font-mono text-[10px] text-emerald-700">em uso</span>}
                  <MiniBtn onClick={() => iniciarEdicao(s)}><Pencil className="w-3 h-3 inline" /></MiniBtn>
                  <MiniBtn variant="risco" onClick={() => remover(s)}><Trash2 className="w-3 h-3 inline" /></MiniBtn>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="font-sans text-[12px] text-slate-500 mt-3">As sugestões aparecem como autocomplete ao cadastrar itens. Mesmo sem cadastro aqui, você pode digitar uma subcategoria livremente no formulário do item — ela passa a valer a partir do primeiro uso.</p>
    </Modal>
  );
}