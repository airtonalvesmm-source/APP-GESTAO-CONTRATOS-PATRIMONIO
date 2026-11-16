import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { CAT_ARP, MODALIDADES, STATUS_LIC } from "@/lib/dmp-data";
import { fmtM, fmtQ, nQtd, nVal, norm, cmpTexto, anoAtual, baixarCSV } from "@/lib/dmp-utils";
import { Btn, MiniBtn, Campo, Vazio, Pill, Modal, inputCls, textareaCls } from "./ui";
import { TelaCab } from "./Catalogo";
import ImportarCSV from "./ImportarCSV";
import { usePodeEditar } from "@/lib/permissoes";
import { Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { GrupoAnoCategoria, agruparPorAnoCategoria, BotaoAgrupar } from "./Agrupar";
import { LinhaAtaExpansivel, BadgeContratos } from "./ContratosDaAta";

export default function Licitacoes({ data, refresh }) {
  const podeEditar = usePodeEditar();
  const { licitacoes, atas, contratos, ocorrencias } = data;
  const [editId, setEditId] = useState(null);
  const [novo, setNovo] = useState(false);
  const [termo, setTermo] = useState("");
  const [cat, setCat] = useState("");
  const [ano, setAno] = useState("");
  const [ord, setOrd] = useState("recentes");
  const [abertos, setAbertos] = useState(new Set());
  const [atasAbertas, setAtasAbertas] = useState(new Set());
  const [agrupar, setAgrupar] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const anos = Array.from(new Set(licitacoes.filter(l => l.ano).map(l => l.ano))).sort().reverse();

  const lista = useMemo(() => {
    const t = norm(termo.trim());
    let res = licitacoes.filter(l => {
      if (cat && l.categoria !== cat) return false;
      if (ano && String(l.ano) !== String(ano)) return false;
      if (t && norm([l.numero, l.ano, l.modalidade, l.processo, l.categoria, l.status].join(" ")).indexOf(t) < 0) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      return true;
    });
    const ordFn = {
      recentes: (a, b) => cmpTexto(b.numero + "/" + b.ano, a.numero + "/" + a.ano),
      antigas: (a, b) => cmpTexto(a.numero + "/" + a.ano, b.numero + "/" + b.ano),
      valor: (a, b) => nVal(b.valorGlobal) - nVal(a.valorGlobal),
      status: (a, b) => cmpTexto(a.status, b.status)
    }[ord];
    if (ordFn) res = res.slice().sort(ordFn);
    return res;
  }, [licitacoes, termo, cat, ano, ord, statusFilter]);

  function situacao(l) {
    if (["Homologado"].includes(l.status)) return "ok";
    if (["Fracassado", "Deserto", "Revogado", "Anulado"].includes(l.status)) return "critico";
    if (["Publicado", "Em disputa", "Em julgamento"].includes(l.status)) return "aviso";
    return "neutro";
  }

  async function excluir(l) {
    if (atas.some(a => a.licitacaoId === l.id)) return alert("Há atas vinculadas a esta licitação.");
    if (!confirm("Excluir esta licitação?")) return;
    await base44.entities.Licitacao.delete(l.id);
    await refresh();
  }

  function toggle(id) {
    setAbertos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAta(id) {
    setAtasAbertas(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function exportCSV() {
    if (!licitacoes.length) return alert("Não há licitações cadastradas.");
    const l = [["Número", "Ano", "Modalidade", "Processo", "Categoria", "Registro de preços", "Situação", "Qtd. de itens", "Valor global", "Atas geradas", "Valor registrado nas atas"]];
    licitacoes.forEach(x => {
      const atasL = atas.filter(a => a.licitacaoId === x.id);
      l.push([x.numero, x.ano, x.modalidade, x.processo || "", x.categoria || "", x.srp, x.status, fmtQ(x.qtdItens), fmtM(x.valorGlobal), atasL.length, fmtM(atasL.reduce((t, a) => t + (a.itens || []).reduce((s, it) => s + nQtd(it.qtd) * nVal(it.valor), 0), 0))]);
    });
    baixarCSV("licitacoes.csv", l);
  }

  const categorias = Array.from(new Set(licitacoes.map(l => l.categoria).filter(Boolean)));
  const grupos = useMemo(() => agrupar ? agruparPorAnoCategoria(lista, l => l.ano, l => l.categoria) : [], [lista, agrupar]);

  function renderItem(l) {
    const atasL = atas.filter(a => a.licitacaoId === l.id);
    const aberto = abertos.has(l.id);
    return (
      <div key={l.id} className="bg-white border border-slate-300 rounded-sm overflow-hidden">
        <button onClick={() => toggle(l.id)} className="w-full px-4 py-3.5 flex gap-3.5 items-center flex-wrap text-left hover:bg-stone-50 transition-colors">
          <span className="font-mono text-[15px] font-semibold text-slate-800">{l.numero}/{l.ano}</span>
          <span className="font-sans text-[13px] font-semibold text-slate-600">{l.modalidade}</span>
          <span className="font-mono text-[11px] text-slate-500">{l.categoria || "—"} · {fmtQ(l.qtdItens)} itens · R$ {fmtM(l.valorGlobal)}</span>
          <span className="ml-auto flex gap-2 items-center flex-wrap">
            {l.srp === "Sim" && <Pill tipo="neutro">Registro de preços</Pill>}
            <Pill tipo={situacao(l)}>{l.status}</Pill>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
          </span>
        </button>
        {aberto && (
          <div className="px-4 pb-4 border-t border-slate-100">
            <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Dados do certame</p>
            <p className="font-sans text-[13.5px] text-slate-600 mb-3">
              Processo: {l.processo || "—"} · Registro de preços: {l.srp} · Itens: {fmtQ(l.qtdItens)} · Valor global: R$ {fmtM(l.valorGlobal)}
            </p>
            {atasL.length > 0 ? (
              <div className="border border-slate-300 rounded-sm overflow-hidden">
                <div className="bg-stone-50 px-3 py-2 flex gap-3 items-center">
                  <span className="font-sans text-[9.5px] tracking-widest uppercase text-slate-500">Atas vinculadas — clique para ver os contratos</span>
                  <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto">{atasL.length} {atasL.length === 1 ? "ata" : "atas"}</span>
                </div>
                {atasL.map(a => (
                  <LinhaAtaExpansivel
                    key={a.id}
                    ata={a}
                    contratos={contratos}
                    ocorrencias={ocorrencias}
                    aberto={atasAbertas.has(a.id)}
                    onToggle={() => toggleAta(a.id)}
                  />
                ))}
              </div>
            ) : (
              <Vazio titulo="Nenhuma ata vinculada" texto="Ao cadastrar a ata, escolha este certame em 'Licitação de origem'." />
            )}
            <div className="flex gap-2 flex-wrap mt-3.5">
              {podeEditar && <><MiniBtn onClick={() => setEditId(l.id)}><Pencil className="w-3 h-3 inline mr-1" />Editar</MiniBtn>
              <MiniBtn variant="risco" onClick={() => excluir(l)}><Trash2 className="w-3 h-3 inline mr-1" />Excluir</MiniBtn></>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <TelaCab titulo="Licitações" desc="Certames que originam as atas de registro de preços e as contratações diretas."
        direita={<>
          <Btn onClick={exportCSV}>Baixar CSV</Btn>
          <ImportarCSV entityName="Licitacao" refresh={refresh}
            existentes={licitacoes} chave={r => norm(r.numero) + "|" + String(r.ano || "").trim() + "|" + norm(r.modalidade)}
            colunas={[
              { header: "Número", campo: "numero", obrigatorio: true },
              { header: "Ano", campo: "ano", obrigatorio: true },
              { header: "Modalidade", campo: "modalidade", obrigatorio: true },
              { header: "Processo", campo: "processo" },
              { header: "Categoria", campo: "categoria" },
              { header: "Registro de preços", campo: "srp" },
              { header: "Situação", campo: "status", aliases: ["Status"] },
              { header: "Qtd. de itens", campo: "qtdItens", tipo: "number" },
              { header: "Valor global", campo: "valorGlobal", tipo: "number" }
            ]}
            ajuda="Categoria deve ser: Mobiliário, Segurança, Climatização ou Eletroeletrônicos. Status e modalidade conforme listas do sistema." />
          {podeEditar && <Btn variant="forte" onClick={() => setNovo(true)}><Plus className="w-4 h-4 inline mr-1" />Cadastrar licitação</Btn>}
        </>} />

      {licitacoes.length === 0 ? (
        <Vazio titulo="Nenhuma licitação cadastrada" texto="Cadastre o certame para vincular as atas de registro de preços a ele." />
      ) : (
        <>
          <BarraFiltros termo={termo} setTermo={setTermo} cat={cat} setCat={setCat} ano={ano} setAno={setAno} ord={ord} setOrd={setOrd} anos={anos} categorias={categorias} total={lista.length} agrupar={agrupar} setAgrupar={setAgrupar} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
          {lista.length === 0 ? (
            <Vazio titulo="Nenhuma licitação corresponde aos filtros" texto="Ajuste os termos ou limpe os filtros." />
          ) : agrupar ? (
            <GrupoAnoCategoria grupos={grupos} renderItem={renderItem} />
          ) : (
            <div className="space-y-3.5">
              {lista.map(renderItem)}
            </div>
          )}
        </>
      )}

      {(novo || editId) && <FormLicitacao l={editId ? licitacoes.find(x => x.id === editId) : null} refresh={refresh} onClose={() => { setNovo(false); setEditId(null); }} />}
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap ${className}`}>{children}</th>;
}

function BarraFiltros({ termo, setTermo, cat, setCat, ano, setAno, ord, setOrd, anos, categorias, total, agrupar, setAgrupar, statusFilter, setStatusFilter }) {
  return (
    <div className="flex gap-2.5 items-end flex-wrap mb-5 p-3.5 bg-white border border-slate-300 rounded-sm">
      <div className="flex-1 min-w-[200px]">
        <Campo label="Busca">
          <input type="search" value={termo} onChange={e => setTermo(e.target.value)} className={inputCls} placeholder="Buscar por número, modalidade, processo ou status" />
        </Campo>
      </div>
      <BotaoAgrupar agrupar={agrupar} setAgrupar={setAgrupar} />
      <div className="min-w-[132px]"><Campo label="Situação"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}><option value="">Todas</option>{STATUS_LIC.map(s => <option key={s}>{s}</option>)}</select></Campo></div>
      {categorias.length > 0 && (
        <div className="min-w-[132px]"><Campo label="Categoria"><select value={cat} onChange={e => setCat(e.target.value)} className={inputCls}><option value="">Todas</option>{categorias.map(c => <option key={c}>{c}</option>)}</select></Campo></div>
      )}
      {anos.length > 0 && (
        <div className="min-w-[132px]"><Campo label="Ano"><select value={ano} onChange={e => setAno(e.target.value)} className={inputCls}><option value="">Todos</option>{anos.map(a => <option key={a}>{a}</option>)}</select></Campo></div>
      )}
      <div className="min-w-[132px]"><Campo label="Ordenar por">
        <select value={ord} onChange={e => setOrd(e.target.value)} className={inputCls}>
          <option value="recentes">Mais recentes</option><option value="antigas">Mais antigas</option>
          <option value="valor">Maior valor global</option><option value="status">Status (A → Z)</option>
        </select>
      </Campo></div>
      <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{total} {total === 1 ? "licitação" : "licitações"}</span>
    </div>
  );
}

function FormLicitacao({ l, refresh, onClose }) {
  const [form, setForm] = useState({
    numero: l?.numero || "", ano: l?.ano || String(anoAtual), modalidade: l?.modalidade || MODALIDADES[0],
    processo: l?.processo || "", categoria: l?.categoria || CAT_ARP[0], srp: l?.srp || "Sim",
    status: l?.status || "Em planejamento", qtdItens: l?.qtdItens || 0, valorGlobal: l?.valorGlobal || 0
  });
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function salvar() {
    if (!form.numero.trim()) return alert("Informe o número da licitação.");
    const dados = { ...form, numero: form.numero.trim(), processo: form.processo.trim(), ano: String(form.ano) };
    if (l) await base44.entities.Licitacao.update(l.id, dados);
    else await base44.entities.Licitacao.create(dados);
    await refresh();
    onClose();
    alert(l ? "Licitação atualizada." : "Licitação cadastrada.");
  }

  return (
    <Modal sobre="Licitações" titulo={l ? "Editar licitação" : "Cadastrar licitação"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar licitação</Btn></>}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Número"><input className={inputCls} value={form.numero} onChange={e => set("numero", e.target.value)} placeholder="ex.: 90018" /></Campo>
        <Campo label="Ano"><input className={inputCls} type="number" value={form.ano} onChange={e => set("ano", e.target.value)} /></Campo>
        <Campo label="Modalidade"><select className={inputCls} value={form.modalidade} onChange={e => set("modalidade", e.target.value)}>{MODALIDADES.map(m => <option key={m}>{m}</option>)}</select></Campo>
        <Campo label="Número do processo"><input className={inputCls} value={form.processo} onChange={e => set("processo", e.target.value)} /></Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Categoria"><select className={inputCls} value={form.categoria} onChange={e => set("categoria", e.target.value)}>{CAT_ARP.map(c => <option key={c}>{c}</option>)}</select></Campo>
        <Campo label="Registro de preços"><select className={inputCls} value={form.srp} onChange={e => set("srp", e.target.value)}><option>Sim</option><option>Não</option></select></Campo>
        <Campo label="Situação"><select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>{STATUS_LIC.map(s => <option key={s}>{s}</option>)}</select></Campo>
        <Campo label="Quantidade de itens"><input className={inputCls} type="number" value={form.qtdItens} onChange={e => set("qtdItens", +e.target.value || 0)} /></Campo>
        <Campo label="Valor global (R$)"><input className={inputCls} inputMode="decimal" value={form.valorGlobal ? fmtM(form.valorGlobal) : ""} onChange={e => set("valorGlobal", nVal(e.target.value))} /></Campo>
      </div>
    </Modal>
  );
}