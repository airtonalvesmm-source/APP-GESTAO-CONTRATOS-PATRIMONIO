import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { CAT_ARP, ORDEM } from "@/lib/dmp-data";
import { fmtM, fmtQ, fmtData, nQtd, nVal, norm, diasAte, consumido, saldoItem, resumoAta, situacaoAta, uid, baixarCSV } from "@/lib/dmp-utils";
import { Btn, MiniBtn, Campo, Vazio, Pill, Barra, Modal, Alertas, inputCls, textareaCls } from "./ui";
import { TelaCab } from "./Catalogo";
import { Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";

export default function Atas({ data, refresh }) {
  const { atas, contratos, catalog, licitacoes, fornecedores } = data;
  const [editId, setEditId] = useState(null);
  const [novo, setNovo] = useState(false);
  const [abertos, setAbertos] = useState(new Set());
  const [termo, setTermo] = useState("");
  const [cat, setCat] = useState("");
  const [ano, setAno] = useState("");
  const [ord, setOrd] = useState("vigencia");

  const anos = Array.from(new Set(atas.map(a => a.inicio?.slice(0, 4) || a.fim?.slice(0, 4) || "").filter(Boolean))).sort().reverse();
  const categorias = CAT_ARP;

  function anoDaAta(a) { return a.inicio?.slice(0, 4) || a.fim?.slice(0, 4) || ""; }
  function catDaAta(a) { return a?.categoria || "Sem categoria"; }

  const lista = useMemo(() => {
    const t = norm(termo.trim());
    let res = atas.filter(a => {
      if (cat && catDaAta(a) !== cat) return false;
      if (ano && String(anoDaAta(a)) !== String(ano)) return false;
      if (t && norm([a.numero, a.processo, a.fornecedor, a.cnpj, a.categoria, ...(a.itens || []).map(it => catalog.find(b => b.id === it.benId)?.objeto || "")].join(" ")).indexOf(t) < 0) return false;
      return true;
    });
    const ordFn = {
      vigencia: (a, b) => (a.fim ? new Date(a.fim) : new Date(9999)) - (b.fim ? new Date(b.fim) : new Date(9999)),
      numero: (a, b) => norm(b.numero).localeCompare(norm(a.numero)),
      saldo: (a, b) => resumoAta(b, contratos).sal - resumoAta(a, contratos).sal,
      fornecedor: (a, b) => norm(a.fornecedor || "").localeCompare(norm(b.fornecedor || ""))
    }[ord];
    if (ordFn) res = res.slice().sort(ordFn);
    return res;
  }, [atas, termo, cat, ano, ord, contratos, catalog]);

  function alertasAtas() {
    const out = [];
    atas.forEach(a => {
      const s = situacaoAta(a), r = resumoAta(a, contratos);
      const qtdSaldo = (a.itens || []).reduce((t, it) => t + Math.max(0, saldoItem(a, it, contratos)), 0);
      if (s.dias !== null && s.dias < 0 && qtdSaldo > 0)
        out.push({ txt: `<b>${a.numero}</b> venceu em ${fmtData(a.fim)} com saldo de ${fmtQ(qtdSaldo)} un. (R$ ${fmtM(r.sal)}).` });
      else if (s.dias !== null && s.dias >= 0 && s.dias <= 90 && qtdSaldo > 0)
        out.push({ txt: `<b>${a.numero}</b> vence em ${s.dias} dia${s.dias === 1 ? "" : "s"} com ${fmtQ(qtdSaldo)} un. em saldo (R$ ${fmtM(r.sal)}).` });
    });
    return out;
  }

  async function excluir(a) {
    if (contratos.some(c => c.ataId === a.id)) return alert("Há contratos vinculados a esta ata. Exclua-os primeiro.");
    if (!confirm("Excluir esta ata e seus itens?")) return;
    await base44.entities.Ata.delete(a.id);
    await refresh();
  }

  function toggle(id) { setAbertos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function exportCSV() {
    if (!atas.length) return alert("Não há atas cadastradas.");
    const l = [["Ata", "Fornecedor", "Fim da vigência", "Dias restantes", "Item da ata", "Objeto", "CATMAT", "Unidade", "Qtd. registrada", "Qtd. consumida", "Saldo", "Valor unitário", "Valor do saldo"]];
    atas.forEach(a => (a.itens || []).forEach(it => {
      const b = catalog.find(x => x.id === it.benId) || {};
      const c = consumido(a.id, it.id, contratos), s = nQtd(it.qtd) - c, d = diasAte(a.fim);
      l.push([a.numero, a.fornecedor || "", fmtData(a.fim), d === null ? "" : d, it.numItem || "", b.objeto || "", b.catmat || "", b.unidade || "", fmtQ(it.qtd), fmtQ(c), fmtQ(s), fmtM(it.valor), fmtM(s * nVal(it.valor))]);
    }));
    baixarCSV("saldos-atas.csv", l);
  }

  return (
    <div>
      <TelaCab titulo="Atas de registro de preços" desc="Cadastre as atas vigentes e acompanhe o saldo de cada item conforme os contratos e empenhos lançados."
        direita={<>
          <Btn onClick={exportCSV}>Baixar saldos (CSV)</Btn>
          <Btn variant="forte" onClick={() => setNovo(true)} disabled={fornecedores.length === 0}><Plus className="w-4 h-4 inline mr-1" />Cadastrar ata</Btn>
        </>} />

      {fornecedores.length === 0 && <div className="border border-amber-300 bg-amber-50 rounded-sm px-4 py-3 text-sm text-amber-900 mb-4">Cadastre um fornecedor antes de registrar atas.</div>}

      <Alertas itens={alertasAtas()} />

      {atas.length === 0 ? (
        <Vazio titulo="Nenhuma ata cadastrada" texto="Cadastre a ata com fornecedor, vigência e itens registrados para o sistema controlar o saldo." />
      ) : (
        <>
          <BarraFiltros termo={termo} setTermo={setTermo} cat={cat} setCat={setCat} ano={ano} setAno={setAno} ord={ord} setOrd={setOrd} anos={anos} total={lista.length} />
          {lista.length === 0 ? (
            <Vazio titulo="Nenhuma ata corresponde aos filtros" texto="Ajuste os termos ou limpe os filtros." />
          ) : (
            <div className="space-y-3.5">
              {lista.map(a => {
                const s = situacaoAta(a), r = resumoAta(a, contratos);
                const aberto = abertos.has(a.id);
                return (
                  <div key={a.id} className="bg-white border border-slate-300 rounded-sm overflow-hidden">
                    <button onClick={() => toggle(a.id)} className="w-full px-4 py-3.5 flex gap-3.5 items-center flex-wrap text-left hover:bg-stone-50 transition-colors">
                      <span className="font-mono text-[15px] font-semibold text-slate-800">Ata {a.numero}</span>
                      <span className="font-sans text-[13px] font-semibold text-slate-600">{a.fornecedor || "Fornecedor não informado"}</span>
                      <span className="font-mono text-[11px] text-slate-500">{(a.itens || []).length} itens · saldo R$ {fmtM(r.sal)}</span>
                      <span className="ml-auto flex gap-2 items-center flex-wrap">
                        {a.categoria && <Pill tipo="neutro">{a.categoria}</Pill>}
                        <Pill tipo={s.classe}>{s.txt}</Pill>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
                      </span>
                    </button>
                    {aberto && (
                      <div className="px-4 pb-4 border-t border-slate-100">
                        <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Dados da ata</p>
                        <p className="font-sans text-[13.5px] text-slate-600 mb-3">
                          Processo: {a.processo || "—"} · CNPJ: {a.cnpj || "—"} · Gerenciador: {a.gerenciador || "—"} · Vigência: {fmtData(a.inicio)} a {fmtData(a.fim)}
                        </p>
                        <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Itens e saldos</p>
                        {(a.itens || []).length ? (
                          <div className="overflow-x-auto border border-slate-300 rounded-sm">
                            <table className="w-full border-collapse text-[13.5px] min-w-[680px]">
                              <thead><tr className="bg-stone-50">
                                <Th>Item</Th><Th>Objeto</Th><Th className="text-right">Registrado</Th><Th className="text-right">Consumido</Th><Th className="text-right">Saldo</Th><Th className="text-right">Vlr. unit.</Th><Th className="text-right">Saldo (R$)</Th>
                              </tr></thead>
                              <tbody>
                                {a.itens.map(it => {
                                  const b = catalog.find(x => x.id === it.benId) || { objeto: "(item removido)", catmat: "—", unidade: "—" };
                                  const c = consumido(a.id, it.id, contratos), sal = nQtd(it.qtd) - c;
                                  const pct = nQtd(it.qtd) ? Math.max(0, Math.min(100, sal / nQtd(it.qtd) * 100)) : 0;
                                  const cl = sal <= 0 ? "critico" : (pct <= 25 ? "aviso" : "");
                                  return (
                                    <tr key={it.id} className="border-b border-slate-100 hover:bg-stone-50">
                                      <td className="px-3 py-2.5 font-mono text-xs">{it.numItem || "—"}</td>
                                      <td className="px-3 py-2.5"><span className="font-sans font-semibold text-[12.8px] text-slate-800">{b.objeto}</span><br /><span className="font-mono text-xs text-slate-600">CATMAT {b.catmat} · {b.unidade}</span></td>
                                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(it.qtd)}</td>
                                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(c)}</td>
                                      <td className="px-3 py-2.5 text-right font-mono text-sm"><b>{fmtQ(sal)}</b><Barra pct={pct} classe={cl} /></td>
                                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(it.valor)}</td>
                                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(sal * nVal(it.valor))}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot><tr className="border-t border-slate-300 bg-stone-50">
                                <td className="px-3 py-2.5 font-sans font-semibold text-[12.5px]" colSpan={5}>Valor registrado R$ {fmtM(r.reg)} · consumido R$ {fmtM(r.cons)}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtM(r.sal)}</td>
                              </tr></tfoot>
                            </table>
                          </div>
                        ) : (
                          <Vazio titulo="Ata sem itens" texto="Edite a ata para registrar os itens e as quantidades." />
                        )}
                        <div className="flex gap-2 flex-wrap mt-3.5">
                          <MiniBtn onClick={() => setEditId(a.id)}><Pencil className="w-3 h-3 inline mr-1" />Editar ata</MiniBtn>
                          <MiniBtn variant="risco" onClick={() => excluir(a)}><Trash2 className="w-3 h-3 inline mr-1" />Excluir</MiniBtn>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {(novo || editId) && <FormAta a={editId ? atas.find(x => x.id === editId) : null} data={data} refresh={refresh} onClose={() => { setNovo(false); setEditId(null); }} />}
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap ${className}`}>{children}</th>;
}

function BarraFiltros({ termo, setTermo, cat, setCat, ano, setAno, ord, setOrd, anos, total }) {
  return (
    <div className="flex gap-2.5 items-end flex-wrap mb-5 p-3.5 bg-white border border-slate-300 rounded-sm">
      <div className="flex-1 min-w-[200px]"><Campo label="Busca"><input type="search" value={termo} onChange={e => setTermo(e.target.value)} className={inputCls} placeholder="Buscar por número, processo, fornecedor ou item" /></Campo></div>
      <div className="min-w-[132px]"><Campo label="Categoria"><select value={cat} onChange={e => setCat(e.target.value)} className={inputCls}><option value="">Todas</option>{CAT_ARP.map(c => <option key={c}>{c}</option>)}</select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Ano"><select value={ano} onChange={e => setAno(e.target.value)} className={inputCls}><option value="">Todos</option>{anos.map(a => <option key={a}>{a}</option>)}</select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Ordenar por">
        <select value={ord} onChange={e => setOrd(e.target.value)} className={inputCls}>
          <option value="vigencia">Vencimento mais próximo</option><option value="numero">Número da ata</option>
          <option value="saldo">Maior saldo</option><option value="fornecedor">Fornecedor (A → Z)</option>
        </select>
      </Campo></div>
      <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{total} {total === 1 ? "ata" : "atas"}</span>
    </div>
  );
}

function FormAta({ a, data, refresh, onClose }) {
  const { catalog, licitacoes, fornecedores, contratos } = data;
  const [form, setForm] = useState({
    numero: a?.numero || "", processo: a?.processo || "", gerenciador: a?.gerenciador || "Ministério Público do Estado do Piauí",
    categoria: a?.categoria || CAT_ARP[0], licitacaoId: a?.licitacaoId || "", fornecedorId: a?.fornecedorId || "",
    inicio: a?.inicio || "", fim: a?.fim || ""
  });
  const [itens, setItens] = useState(a ? (a.itens || []).map(it => ({ ...it })) : [{ id: uid(), benId: catalog[0]?.id || "", numItem: "1", qtd: "", valor: "" }]);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function setItem(i, k, v) { setItens(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it)); }
  function addItem() { setItens(arr => [...arr, { id: uid(), benId: catalog[0]?.id || "", numItem: String(arr.length + 1), qtd: "", valor: "" }]); }
  function rmItem(i) { setItens(arr => arr.filter((_, idx) => idx !== i)); }

  async function salvar() {
    if (!form.numero.trim()) return alert("Informe o número da ata.");
    const itensVal = itens.filter(it => nQtd(it.qtd) > 0).map(it => ({ id: it.id || uid(), benId: it.benId, numItem: String(it.numItem || "").trim(), qtd: nQtd(it.qtd), valor: nVal(it.valor) }));
    if (!itensVal.length) return alert("Registre ao menos um item com quantidade.");
    if (!form.fornecedorId) return alert("Selecione o fornecedor.");
    const f = fornecedores.find(x => x.id === form.fornecedorId) || {};
    const dados = { ...form, numero: form.numero.trim(), processo: form.processo.trim(), fornecedor: f.razao || "", cnpj: f.cnpj || "", itens: itensVal };
    if (a) {
      for (const it of itensVal) {
        const c = consumido(a.id, it.id, contratos);
        if (it.qtd < c) return alert(`Quantidade menor que o já consumido em ${catalog.find(b => b.id === it.benId)?.objeto || "item"} (${fmtQ(c)}).`);
      }
      await base44.entities.Ata.update(a.id, dados);
    } else {
      await base44.entities.Ata.create(dados);
    }
    await refresh();
    onClose();
    alert(a ? "Ata atualizada." : "Ata cadastrada.");
  }

  function opcoesBens(sel) {
    return ORDEM.map(c => (
      <optgroup key={c} label={c}>
        {catalog.filter(b => b.categoria === c).map(b => <option key={b.id} value={b.id} selected={b.id === sel}>{b.objeto}</option>)}
      </optgroup>
    ));
  }

  return (
    <Modal sobre="Registro de preços" titulo={a ? "Editar ata" : "Cadastrar ata"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar ata</Btn></>}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Número da ata"><input className={inputCls} value={form.numero} onChange={e => setF("numero", e.target.value)} placeholder="ex.: 12/2026" /></Campo>
        <Campo label="Processo"><input className={inputCls} value={form.processo} onChange={e => setF("processo", e.target.value)} /></Campo>
        <Campo label="Categoria"><select className={inputCls} value={form.categoria} onChange={e => setF("categoria", e.target.value)}>{CAT_ARP.map(c => <option key={c}>{c}</option>)}</select></Campo>
        <Campo label="Órgão gerenciador"><input className={inputCls} value={form.gerenciador} onChange={e => setF("gerenciador", e.target.value)} /></Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Licitação de origem" ajuda={licitacoes.length ? "Certame que gerou esta ata." : "Nenhuma licitação cadastrada."}>
          <select className={inputCls} value={form.licitacaoId} onChange={e => setF("licitacaoId", e.target.value)}>
            <option value="">Sem licitação vinculada</option>
            {licitacoes.map(l => <option key={l.id} value={l.id}>{l.modalidade} nº {l.numero}/{l.ano}{l.categoria ? ` — ${l.categoria}` : ""}</option>)}
          </select>
        </Campo>
        <Campo label="Fornecedor">
          <select className={inputCls} value={form.fornecedorId} onChange={e => setF("fornecedorId", e.target.value)} disabled={fornecedores.length === 0}>
            {fornecedores.length ? fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao}{f.cnpj ? ` — ${f.cnpj}` : ""}</option>) : <option value="">Nenhum fornecedor cadastrado</option>}
          </select>
        </Campo>
        <Campo label="Início da vigência"><input type="date" className={inputCls} value={form.inicio} onChange={e => setF("inicio", e.target.value)} /></Campo>
        <Campo label="Fim da vigência"><input type="date" className={inputCls} value={form.fim} onChange={e => setF("fim", e.target.value)} /></Campo>
      </div>
      <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Itens registrados</p>
      <div className="border border-slate-300 rounded-sm overflow-hidden">
        {itens.map((it, i) => (
          <div key={i} className="grid gap-2.5 px-3 py-2.5 border-b border-slate-100 last:border-0 [grid-template-columns:minmax(0,2.4fr)_90px_110px_120px_36px] items-end">
            <Campo label={`Item ${i + 1}`}><select className={inputCls} value={it.benId} onChange={e => setItem(i, "benId", e.target.value)}>{opcoesBens(it.benId)}</select></Campo>
            <Campo label="Nº na ata"><input className={inputCls} value={it.numItem} onChange={e => setItem(i, "numItem", e.target.value)} /></Campo>
            <Campo label="Qtd."><input type="number" min="0" className={inputCls} value={it.qtd} onChange={e => setItem(i, "qtd", e.target.value)} /></Campo>
            <Campo label="Vlr. unit. (R$)"><input inputMode="decimal" className={inputCls} value={it.valor} onChange={e => setItem(i, "valor", e.target.value)} /></Campo>
            <Campo label=" "><MiniBtn variant="risco" onClick={() => rmItem(i)}>×</MiniBtn></Campo>
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mt-3.5"><Btn onClick={addItem}>Adicionar item</Btn></div>
    </Modal>
  );
}