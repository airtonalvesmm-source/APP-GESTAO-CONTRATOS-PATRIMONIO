import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ORDEM, NOMES_ARTE, TRACOS } from "@/lib/dmp-data";
import { Desenho } from "@/components/dmp/Desenho";
import { fmtQ, nVal, norm, cmpTexto, cmpNum, uid } from "@/lib/dmp-utils";
import { Modal, Btn, MiniBtn, Campo, Plaqueta, Vazio, inputCls, textareaCls } from "./ui";
import { Plus, Upload } from "lucide-react";

const ORD_CATALOGO = {
  alfa: (a, b) => cmpTexto(a.objeto, b.objeto),
  alfaDesc: (a, b) => cmpTexto(b.objeto, a.objeto),
  catmat: (a, b) => cmpNum(a.catmat, b.catmat),
  pdm: (a, b) => cmpNum(a.pdm, b.pdm) || cmpTexto(a.objeto, b.objeto)
};

export default function Catalogo({ data, refresh }) {
  const { catalog } = data;
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todas");
  const [termo, setTermo] = useState("");
  const [ord, setOrd] = useState("alfa");
  const [fichaId, setFichaId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showOcultos, setShowOcultos] = useState(false);

  const filtrados = useMemo(() => {
    const t = norm(termo.trim());
    return catalog.filter(b => {
      if (categoriaAtiva !== "Todas" && b.categoria !== categoriaAtiva) return false;
      if (!t) return true;
      return norm(b.objeto).includes(t) || String(b.catmat).includes(t) || String(b.pdm).includes(t) ||
        norm(b.aplicacao).includes(t) || norm(b.descricao).includes(t);
    }).slice().sort(ORD_CATALOGO[ord] || ORD_CATALOGO.alfa);
  }, [catalog, categoriaAtiva, termo, ord]);

  const ocultos = data.catalog.filter(b => b.oculto);

  async function excluirItem(b) {
    const usos = [];
    data.pca.forEach(p => { if (p.benId === b.id) usos.push("Plano Anual de " + p.exercicio); });
    data.atas.forEach(a => (a.itens || []).forEach(it => { if (it.benId === b.id) usos.push("ata " + a.numero); }));
    data.contratos.forEach(c => (c.itens || []).forEach(it => { if (it.benId === b.id) usos.push(c.tipo + " " + c.numero); }));
    if (usos.length) return alert("Item em uso em: " + Array.from(new Set(usos)).join(", ") + ". Remova esses lançamentos antes de excluir.");
    if (!confirm(`Excluir "${b.objeto}" do catálogo?`)) return;
    await base44.entities.CatalogItem.update(b.id, { oculto: true });
    await refresh();
    setFichaId(null);
  }

  async function restaurarOcultos() {
    if (!confirm(`Restaurar os ${ocultos.length} itens excluídos?`)) return;
    await base44.asServiceRole.entities.CatalogItem.updateMany({ oculto: true }, { $set: { oculto: false } });
    await refresh();
  }

  return (
    <div>
      <TelaCab
        titulo="Catálogo de bens permanentes"
        desc="Cada item traz PDM, CATMAT, aplicação e especificação técnica. A ilustração pode ser trocada por foto real a qualquer momento."
        direita={<>
          <Btn variant="forte" onClick={() => setEditId("novo")}><Plus className="w-4 h-4 inline mr-1" />Adicionar item</Btn>
        </>}
      />

      <div className="sticky top-0 z-20 bg-stone-100/95 backdrop-blur-sm border-b border-slate-300 -mx-5 px-5 py-2.5 mb-5">
        <div className="flex gap-2 items-center flex-wrap">
          <input type="search" value={termo} onChange={e => setTermo(e.target.value)}
            placeholder="Buscar por nome, aplicação, PDM ou CATMAT"
            className="flex-1 min-w-[220px] border border-slate-300 rounded-sm px-3 py-2 font-sans text-sm bg-white" />
          {["Todas", ...ORDEM].map(c => {
            const n = c === "Todas" ? catalog.length : catalog.filter(b => b.categoria === c).length;
            return (
              <button key={c} onClick={() => setCategoriaAtiva(c)} aria-pressed={categoriaAtiva === c}
                className={`border rounded-sm px-3 py-1.5 cursor-pointer font-sans font-semibold text-[13px] flex items-center gap-1.5 transition-colors
                  ${categoriaAtiva === c ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-slate-500"}`}>
                {c}<span className={`font-mono text-[11px] ${categoriaAtiva === c ? "text-slate-400" : "text-slate-400"}`}>{n}</span>
              </button>
            );
          })}
          <div className="min-w-[132px]">
            <Campo label="Ordenar por">
              <select value={ord} onChange={e => setOrd(e.target.value)} className={inputCls}>
                <option value="alfa">Nome (A → Z)</option>
                <option value="alfaDesc">Nome (Z → A)</option>
                <option value="catmat">CATMAT crescente</option>
                <option value="pdm">PDM crescente</option>
              </select>
            </Campo>
          </div>
          {ocultos.length > 0 && (
            <MiniBtn onClick={restaurarOcultos}>{ocultos.length} item(ns) excluído(s) — restaurar</MiniBtn>
          )}
          <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto">
            {filtrados.length} {filtrados.length === 1 ? "item" : "itens"}
          </span>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <Vazio titulo="Nenhum item corresponde à busca" texto="Confira o código digitado ou volte o filtro para 'Todas'." />
      ) : (
        (categoriaAtiva === "Todas" ? ORDEM : [categoriaAtiva]).map(cat => {
          const itens = filtrados.filter(b => b.categoria === cat);
          if (!itens.length) return null;
          return (
            <section key={cat} className="mb-9">
              <div className="flex items-baseline gap-3 border-b border-slate-300 pb-2 mb-4">
                <h3 className="font-sans font-bold text-sm tracking-widest uppercase text-slate-800 flex items-center gap-2.5">
                  <span className="w-1 h-4 bg-amber-700 inline-block" />{cat}
                </h3>
                <span className="font-mono text-[11px] text-slate-500 ml-auto">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
              </div>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(232px,1fr))]">
                {itens.map(b => <Cartao key={b.id} b={b} onClick={() => setFichaId(b.id)} />)}
              </div>
            </section>
          );
        })
      )}

      {fichaId && <Ficha b={data.catalog.find(x => x.id === fichaId)} data={data} refresh={refresh}
        onClose={() => setFichaId(null)} onEdit={() => { setFichaId(null); setEditId(fichaId); }}
        onExcluir={excluirItem} />}
      {editId && <FormItem idEdicao={editId === "novo" ? null : editId} data={data} refresh={refresh} onClose={() => setEditId(null)} />}
    </div>
  );
}

function Cartao({ b, onClick }) {
  return (
    <button onClick={onClick}
      className="bg-white border border-slate-300 rounded-sm overflow-hidden text-left cursor-pointer flex flex-col transition-all hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5">
      <span className="aspect-[4/3] bg-[repeating-linear-gradient(45deg,#F4F6F2_0_6px,#EDF0EB_6px_12px)] border-b border-slate-200 flex items-center justify-center text-stone-500">
        {b.imagem ? <img src={b.imagem} alt={b.objeto} className="w-full h-full object-cover" /> : <Desenho arte={b.arte} />}
      </span>
      <span className="p-3 flex flex-col gap-2 flex-1">
        <span className="block font-sans font-semibold text-[13.5px] leading-snug text-slate-800">{b.objeto}</span>
        <span className="block text-[12.5px] leading-snug text-slate-500 line-clamp-3">{b.aplicacao}</span>
        <Plaqueta pdm={b.pdm} catmat={b.catmat} />
      </span>
    </button>
  );
}

function Ficha({ b, data, refresh, onClose, onEdit, onExcluir }) {
  const [desc, setDesc] = useState(b.descricao || "");
  const [imgUrl, setImgUrl] = useState(b.imagem || "");
  const [arteSel, setArteSel] = useState(b.arte || "generico");
  const [showArte, setShowArte] = useState(false);

  const noPCA = data.pca.filter(p => p.benId === b.id);
  const emAtas = [];
  data.atas.forEach(a => (a.itens || []).forEach(it => {
    if (it.benId === b.id) emAtas.push({ a, it });
  }));

  async function salvarDesc() {
    await base44.entities.CatalogItem.update(b.id, { descricao: desc.trim() });
    await refresh();
    alert("Especificação salva.");
  }
  async function restaurarDesc() {
    setDesc(b.descricao || "");
    await base44.entities.CatalogItem.update(b.id, { descricao: b.descricao || "" });
    await refresh();
    alert("Texto original restaurado.");
  }
  async function uploadFoto(e) {
    const f = e.target.files[0]; if (!f) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    await base44.entities.CatalogItem.update(b.id, { imagem: file_url });
    setImgUrl(file_url);
    await refresh();
    alert("Imagem gravada.");
  }
  async function removerImg() {
    await base44.entities.CatalogItem.update(b.id, { imagem: "", arte: b.arte || "generico" });
    setImgUrl("");
    await refresh();
    alert("Imagem padrão restaurada.");
  }
  async function trocarArte(novaArte) {
    await base44.entities.CatalogItem.update(b.id, { arte: novaArte });
    setArteSel(novaArte);
    setShowArte(false);
    await refresh();
    alert("Ilustração alterada para " + (NOMES_ARTE[novaArte] || novaArte) + ".");
  }

  return (
    <Modal sobre={b.categoria} titulo={b.objeto} onClose={onClose}
      footer={<>
        <Btn variant="risco" onClick={() => onExcluir(b)}>Excluir do catálogo</Btn>
        <Btn onClick={onEdit}>Editar dados</Btn>
        <Btn variant="forte" onClick={onClose}>Fechar</Btn>
      </>}>
      <div className="grid gap-5 md:grid-cols-[290px_minmax(0,1fr)]">
        <div>
          <div className="aspect-[4/3] border border-slate-300 rounded-sm overflow-hidden bg-[repeating-linear-gradient(45deg,#F4F6F2_0_6px,#EDF0EB_6px_12px)] flex items-center justify-center text-stone-500">
            {imgUrl ? <img src={imgUrl} alt={b.objeto} className="w-full h-full object-cover" /> : <Desenho arte={arteSel} />}
          </div>
          <div className="flex gap-2 flex-wrap mt-2">
            {imgUrl ? (
              <>
                <MiniBtn><label className="cursor-pointer">Trocar foto<input type="file" accept="image/*" onChange={uploadFoto} className="hidden" /></label></MiniBtn>
                <MiniBtn onClick={() => setShowArte(true)}>Trocar ilustração</MiniBtn>
                <MiniBtn onClick={removerImg}>Restaurar padrão</MiniBtn>
              </>
            ) : (
              <>
                <MiniBtn><label className="cursor-pointer">Enviar foto<input type="file" accept="image/*" onChange={uploadFoto} className="hidden" /></label></MiniBtn>
                <MiniBtn onClick={() => setShowArte(true)}>Trocar ilustração</MiniBtn>
              </>
            )}
          </div>
          <p className="font-sans text-[12px] text-slate-500 mt-2">
            {imgUrl ? "Foto enviada por você." : "Ilustração padrão: " + (NOMES_ARTE[arteSel] || "genérica") + "."}
          </p>
          <div className="mt-4">
            <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Identificação</h4>
            <Plaqueta pdm={b.pdm} catmat={b.catmat} />
            <div className="flex gap-2 flex-wrap mt-2">
              <MiniBtn onClick={() => { navigator.clipboard.writeText(b.catmat); alert("CATMAT " + b.catmat + " copiado."); }}>Copiar CATMAT</MiniBtn>
              <span className="inline-flex items-center font-mono text-[9.5px] tracking-wider uppercase px-2 py-0.5 rounded-sm border border-slate-300 bg-slate-50 text-slate-600 self-center">Unidade: {b.unidade}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="mb-5">
            <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Aplicação</h4>
            <p className="border-l-[3px] border-amber-700 bg-amber-50/60 px-3 py-2.5 text-sm text-amber-900 rounded-r-sm">{b.aplicacao}</p>
          </div>
          <div className="mb-5">
            <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Especificação técnica</h4>
            <textarea className={textareaCls} style={{ minHeight: 130 }} value={desc} onChange={e => setDesc(e.target.value)} />
            <div className="flex gap-2 flex-wrap mt-3">
              <Btn onClick={salvarDesc}>Salvar especificação</Btn>
              <Btn onClick={restaurarDesc}>Restaurar original</Btn>
            </div>
          </div>
          {b.nota && (
            <div className="mb-5">
              <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Ressalva de catalogação</h4>
              <p className="border-l-[3px] border-red-800 bg-red-50 px-3 py-2.5 text-[13.5px] text-red-900 rounded-r-sm">{b.nota}</p>
            </div>
          )}
          {noPCA.length > 0 && (
            <div className="mb-5">
              <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">No Plano Anual</h4>
              <p className="font-sans text-[13.5px] text-slate-600">
                {noPCA.map(p => `Exercício ${p.exercicio}: ${fmtQ(p.qtd)} un.${p.codigo ? ` (código ${p.codigo})` : ""}`).join(" · ")}
              </p>
            </div>
          )}
          {emAtas.length > 0 && (
            <div>
              <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">Saldo em ata</h4>
              <p className="font-sans text-[13.5px] text-slate-600">
                {emAtas.map(x => `Ata ${x.a.numero}: ${fmtQ(x.it.qtd)} un. registradas`).join(" · ")}
              </p>
            </div>
          )}
        </div>
      </div>

      {showArte && (
        <div className="fixed inset-0 bg-slate-900/55 z-[70] flex items-center justify-center p-6" onClick={(e) => { if (e.target === e.currentTarget) setShowArte(false); }}>
          <div className="bg-white rounded-md border border-slate-300 max-w-2xl w-full max-h-[80vh] overflow-auto p-5">
            <h3 className="font-bold text-lg mb-3">Escolher ilustração</h3>
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(104px,1fr))]">
              {Object.keys(TRACOS).map(k => (
                <button key={k} onClick={() => trocarArte(k)} aria-pressed={arteSel === k}
                  className={`bg-white border rounded-sm px-1.5 py-2 cursor-pointer flex flex-col items-center gap-1.5 transition-colors
                    ${arteSel === k ? "border-amber-700 shadow-inner" : "border-slate-300 hover:border-slate-500"}`}>
                  <Desenho arte={k} />
                  <span className="font-sans text-[10.5px] leading-tight text-slate-500 text-center">{NOMES_ARTE[k]}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4"><Btn onClick={() => setShowArte(false)}>Voltar à ficha</Btn></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function FormItem({ idEdicao, data, refresh, onClose }) {
  const b = idEdicao ? data.catalog.find(x => x.id === idEdicao) : null;
  const [form, setForm] = useState({
    objeto: b?.objeto || "", categoria: b?.categoria || ORDEM[0], pdm: b?.pdm || "",
    catmat: b?.catmat || "", unidade: b?.unidade || "UNIDADE", arte: b?.arte || "generico",
    aplicacao: b?.aplicacao || "", descricao: b?.descricao || ""
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function salvar() {
    if (!form.objeto.trim()) return alert("Informe a denominação do bem.");
    if (!form.catmat.trim()) return alert("Informe o CATMAT.");
    const dados = {
      objeto: form.objeto.trim(), categoria: form.categoria, pdm: form.pdm.trim(),
      catmat: form.catmat.trim(), unidade: form.unidade.trim() || "UNIDADE",
      arte: form.arte, aplicacao: form.aplicacao.trim(), descricao: form.descricao.trim(),
      ehProprio: b?.ehProprio || (b ? b.ehProprio : true), oculto: false
    };
    if (b) await base44.entities.CatalogItem.update(b.id, dados);
    else await base44.entities.CatalogItem.create(dados);
    await refresh();
    onClose();
    alert(b ? "Item atualizado." : "Item adicionado ao catálogo.");
  }

  return (
    <Modal sobre="Catálogo" titulo={idEdicao ? "Editar item" : "Adicionar item ao catálogo"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar item</Btn></>}>
      <div className="grid gap-3 md:grid-cols-2 mb-3">
        <Campo label="Denominação do bem" className="md:col-span-2">
          <input className={inputCls} value={form.objeto} onChange={e => set("objeto", e.target.value)} placeholder="ex.: ARMÁRIO ALTO 2 PORTAS" />
        </Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Categoria">
          <select className={inputCls} value={form.categoria} onChange={e => set("categoria", e.target.value)}>
            {ORDEM.map(c => <option key={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo label="PDM"><input className={inputCls} value={form.pdm} onChange={e => set("pdm", e.target.value)} /></Campo>
        <Campo label="CATMAT"><input className={inputCls} value={form.catmat} onChange={e => set("catmat", e.target.value)} /></Campo>
        <Campo label="Unidade"><input className={inputCls} value={form.unidade} onChange={e => set("unidade", e.target.value)} /></Campo>
      </div>
      <div className="mb-3">
        <Campo label="Ilustração" ajuda="Pode ser trocada depois, ou substituída por foto na ficha do item.">
          <select className={inputCls} value={form.arte} onChange={e => set("arte", e.target.value)}>
            {Object.keys(TRACOS).map(k => <option key={k} value={k}>{NOMES_ARTE[k]}</option>)}
          </select>
        </Campo>
      </div>
      <div className="mb-3">
        <Campo label="Aplicação">
          <textarea className={textareaCls} value={form.aplicacao} onChange={e => set("aplicacao", e.target.value)} placeholder="Para que serve e onde é usado." />
        </Campo>
      </div>
      <Campo label="Especificação técnica">
        <textarea className={textareaCls} style={{ minHeight: 120 }} value={form.descricao} onChange={e => set("descricao", e.target.value)} />
      </Campo>
    </Modal>
  );
}

export function TelaCab({ titulo, desc, direita }) {
  return (
    <div className="flex gap-3.5 items-end flex-wrap py-6 pb-3.5">
      <div>
        <h2 className="font-sans text-[15px] font-bold tracking-widest uppercase text-slate-800 flex items-center gap-2.5">
          <span className="w-1 h-[18px] bg-amber-700" />{titulo}
        </h2>
        <p className="mt-1 text-sm text-slate-500 max-w-[62ch]">{desc}</p>
      </div>
      {direita && <div className="ml-auto flex gap-2 flex-wrap">{direita}</div>}
    </div>
  );
}