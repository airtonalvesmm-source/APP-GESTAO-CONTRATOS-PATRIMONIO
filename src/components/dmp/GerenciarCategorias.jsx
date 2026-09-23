import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Btn, MiniBtn, Campo, Modal, inputCls } from "./ui";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function GerenciarCategorias({ categorias, subcategorias, catalog, refresh, onClose }) {
  const [novoNome, setNovoNome] = useState("");
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");

  const lista = (categorias || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || (a.nome || "").localeCompare(b.nome || "", "pt-BR"));

  function contagem(nome) {
    return (catalog || []).filter(b => !b.oculto && b.categoria === nome).length;
  }

  async function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return alert("Informe o nome da categoria.");
    if (lista.some(c => c.nome.toLowerCase() === nome.toLowerCase())) return alert("Já existe uma categoria com esse nome.");
    await base44.entities.Categoria.create({ nome, ordem: lista.length });
    setNovoNome("");
    await refresh();
  }

  function iniciarEdicao(c) { setEditId(c.id); setEditNome(c.nome); }

  async function salvarEdicao(c) {
    const nome = editNome.trim();
    if (!nome) return alert("Informe o nome.");
    if (lista.some(x => x.id !== c.id && x.nome.toLowerCase() === nome.toLowerCase())) return alert("Já existe uma categoria com esse nome.");
    const antigo = c.nome;
    if (nome !== antigo) {
      const itens = (catalog || []).filter(b => b.categoria === antigo);
      if (itens.length) await base44.entities.CatalogItem.bulkUpdate(itens.map(b => ({ id: b.id, categoria: nome })));
      const subs = (subcategorias || []).filter(s => s.categoria === antigo);
      if (subs.length) await base44.entities.Subcategoria.bulkUpdate(subs.map(s => ({ id: s.id, categoria: nome })));
    }
    await base44.entities.Categoria.update(c.id, { nome });
    setEditId(null); setEditNome("");
    await refresh();
    if (nome !== antigo) alert(`Categoria renomeada de "${antigo}" para "${nome}". Itens e subcategorias vinculados foram atualizados.`);
  }

  async function remover(c) {
    const emUso = contagem(c.nome);
    if (emUso > 0) return alert(`Há ${emUso} item(ns) do catálogo usando "${c.nome}". Reatribua esses itens a outra categoria antes de excluí-la.`);
    if (!confirm(`Remover a categoria "${c.nome}"?`)) return;
    await base44.entities.Categoria.delete(c.id);
    await refresh();
  }

  return (
    <Modal sobre="Catálogo" titulo="Gerenciar categorias" onClose={onClose}
      footer={<><Btn onClick={onClose}>Fechar</Btn></>}>
      <div className="flex gap-2 items-end mb-4">
        <div className="flex-1"><Campo label="Nova categoria"><input className={inputCls} value={novoNome} onChange={e => setNovoNome(e.target.value)} onKeyDown={e => { if (e.key === "Enter") adicionar(); }} placeholder="ex.: Informática, Limpeza" /></Campo></div>
        <Btn variant="forte" onClick={adicionar}><Plus className="w-4 h-4 inline mr-1" />Adicionar</Btn>
      </div>
      {lista.length === 0 ? (
        <p className="font-sans text-sm text-slate-500">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="border border-slate-300 rounded-sm overflow-hidden">
          {lista.map((c, i) => (
            <div key={c.id} className="flex gap-2 items-center px-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-stone-50">
              <span className="font-mono text-[11px] text-slate-400 w-6">{i + 1}.</span>
              {editId === c.id ? (
                <>
                  <input className={inputCls + " flex-1"} value={editNome} onChange={e => setEditNome(e.target.value)} autoFocus onKeyDown={e => { if (e.key === "Enter") salvarEdicao(c); if (e.key === "Escape") setEditId(null); }} />
                  <MiniBtn variant="forte" onClick={() => salvarEdicao(c)}>Salvar</MiniBtn>
                  <MiniBtn onClick={() => setEditId(null)}>Cancelar</MiniBtn>
                </>
              ) : (
                <>
                  <span className="font-sans text-[13.5px] text-slate-700 flex-1">{c.nome}</span>
                  <span className="font-mono text-[10px] text-slate-500">{contagem(c.nome)} {contagem(c.nome) === 1 ? "item" : "itens"}</span>
                  <MiniBtn onClick={() => iniciarEdicao(c)}><Pencil className="w-3 h-3 inline" /></MiniBtn>
                  <MiniBtn variant="risco" onClick={() => remover(c)}><Trash2 className="w-3 h-3 inline" /></MiniBtn>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="font-sans text-[12px] text-slate-500 mt-3">As categorias aparecem como abas no catálogo e como opções ao cadastrar itens. Renomear uma categoria atualiza automaticamente os itens e subcategorias vinculados. Não é possível excluir uma categoria com itens em uso.</p>
    </Modal>
  );
}