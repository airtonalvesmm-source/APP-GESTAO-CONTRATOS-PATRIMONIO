import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { CAT_ARP, ORDEM } from "@/lib/dmp-data";
import { fmtM, fmtQ, fmtData, nQtd, nVal, norm, diasAte, saldoItem, consumido, uid, baixarCSV,
  ocorrenciasDe, aditivoValor, diasAditivados, valorItensContrato, valorEmpenhado, fimVigente, nValS } from "@/lib/dmp-utils";
import { ADITIVOS, FALTAS, TIPOS_OCORRENCIA } from "@/lib/dmp-data";
import { Btn, MiniBtn, Campo, Vazio, Pill, Barra, Modal, inputCls, textareaCls } from "./ui";
import { TelaCab } from "./Catalogo";
import ImportarCSV from "./ImportarCSV";
import { Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";

export default function Contratos({ data, refresh }) {
  const { contratos, atas, catalog, pca, ocorrencias, pagamentos } = data;
  const [editId, setEditId] = useState(null);
  const [novo, setNovo] = useState(false);
  const [ocorrContratoId, setOcorrContratoId] = useState(null);
  const [abertos, setAbertos] = useState(new Set());
  const [termo, setTermo] = useState("");
  const [cat, setCat] = useState("");
  const [ano, setAno] = useState("");
  const [ord, setOrd] = useState("recentes");

  function catDoContrato(c) { const a = atas.find(x => x.id === c.ataId); return a?.categoria || "Sem categoria"; }
  function anoDoContrato(c) { return c.inicio?.slice(0, 4) || c.fim?.slice(0, 4) || ""; }
  const anos = Array.from(new Set(contratos.map(anoDoContrato).filter(Boolean))).sort().reverse();

  const lista = useMemo(() => {
    const t = norm(termo.trim());
    let res = contratos.filter(c => {
      if (cat && catDoContrato(c) !== cat) return false;
      if (ano && String(anoDoContrato(c)) !== String(ano)) return false;
      if (t && norm([c.tipo, c.numero, c.processo, c.notaEmpenho, c.fornecedor, c.objeto, ...(c.itens || []).map(i => catalog.find(b => b.id === i.benId)?.objeto || "")].join(" ")).indexOf(t) < 0) return false;
      return true;
    });
    const ordFn = {
      recentes: (a, b) => norm(b.numero).localeCompare(norm(a.numero)),
      antigos: (a, b) => norm(a.numero).localeCompare(norm(b.numero)),
      vigencia: (a, b) => (a.fim ? new Date(a.fim) : new Date(9999)) - (b.fim ? new Date(b.fim) : new Date(9999)),
      fornecedor: (a, b) => norm(a.fornecedor || "").localeCompare(norm(b.fornecedor || ""))
    }[ord];
    if (ordFn) res = res.slice().sort(ordFn);
    return res;
  }, [contratos, termo, cat, ano, ord, atas, catalog]);

  function situacao(c) {
    const fim = fimVigente(c, ocorrencias);
    if (!fim) return { classe: "neutro", txt: "Sem vigência informada" };
    const d = diasAte(fim);
    if (d < 0) return { classe: "critico", txt: "Encerrado em " + fmtData(fim) };
    if (d <= 60) return { classe: "aviso", txt: "Vence em " + d + " dias" };
    return { classe: "ok", txt: "Vigente até " + fmtData(fim) };
  }

  function temAditivo(id) { return ocorrenciasDe(id, ocorrencias).some(o => ADITIVOS.includes(o.tipo)); }
  function temFalta(id) { return ocorrenciasDe(id, ocorrencias).some(o => FALTAS.includes(o.tipo)); }

  async function excluir(c) {
    if (!confirm("Excluir este lançamento? O saldo da ata será devolvido.")) return;
    await base44.entities.Contrato.delete(c.id);
    const ocs = ocorrencias.filter(o => o.contratoId === c.id);
    for (const o of ocs) await base44.entities.Ocorrencia.delete(o.id);
    const pgs = pagamentos.filter(p => p.contratoId === c.id);
    for (const p of pgs) await base44.entities.Pagamento.delete(p.id);
    await refresh();
    alert("Lançamento excluído: saldo devolvido, pagamentos e ocorrências removidos.");
  }

  function toggle(id) { setAbertos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function excluirOcorrencia(o) {
    if (!confirm("Excluir esta ocorrência?")) return;
    await base44.entities.Ocorrencia.delete(o.id);
    await refresh();
  }

  function exportCSV() {
    if (!contratos.length) return alert("Não há contratos lançados.");
    const l = [["Tipo", "Número", "Processo", "Nota de empenho", "Ata vinculada", "Fornecedor", "CNPJ", "Objeto", "Início da vigência", "Fim da vigência", "Qtd. de itens", "Valor dos itens"]];
    contratos.forEach(c => {
      const a = atas.find(x => x.id === c.ataId);
      const val = (c.itens || []).reduce((t, i) => t + nQtd(i.qtd) * nVal(i.valor), 0);
      l.push([c.tipo, c.numero, c.processo || "", c.notaEmpenho || "", a?.numero || "", c.fornecedor || "", c.cnpj || "", c.objeto || "", fmtData(c.inicio), fmtData(fimVigente(c, ocorrencias)), (c.itens || []).length, fmtM(val)]);
    });
    baixarCSV("contratos.csv", l);
  }

  return (
    <div>
      <TelaCab titulo="Contratos e notas de empenho" desc="Cada item lançado aqui baixa o saldo da ata correspondente."
        direita={<>
          <Btn onClick={exportCSV}>Baixar CSV</Btn>
          <ImportarCSV entityName="Contrato" refresh={refresh} data={data}
            colunas={[
              { header: "Tipo", campo: "tipo" },
              { header: "Número", campo: "numero", obrigatorio: true },
              { header: "Processo", campo: "processo" },
              { header: "Nota de empenho", campo: "notaEmpenho" },
              { header: "Número da ata", campo: "_ataNumero", obrigatorio: true },
              { header: "Objeto", campo: "objeto" },
              { header: "Início da vigência", campo: "inicio", tipo: "date" },
              { header: "Fim da vigência", campo: "fim", tipo: "date" }
            ]}
            preProcess={(rec, data) => {
              const a = (data.atas || []).find(x => norm(x.numero) === norm(rec._ataNumero));
              if (!a) return null;
              return { tipo: rec.tipo || "Contrato", numero: rec.numero, processo: rec.processo, notaEmpenho: rec.notaEmpenho, ataId: a.id, fornecedorId: a.fornecedorId || "", fornecedor: a.fornecedor, cnpj: a.cnpj, objeto: rec.objeto, inicio: rec.inicio, fim: rec.fim, itens: [] };
            }}
            ajuda="O número da ata deve já estar cadastrado. O fornecedor e CNPJ virão da ata vinculada. O contrato será criado sem itens — edite-o depois para lançar os itens (o saldo da ata será baixado). Datas no formato dd/mm/aaaa." />
          <Btn variant="forte" onClick={() => setNovo(true)} disabled={atas.length === 0}><Plus className="w-4 h-4 inline mr-1" />Cadastrar contrato</Btn>
        </>} />

      {atas.length === 0 && <div className="border border-amber-300 bg-amber-50 rounded-sm px-4 py-3 text-sm text-amber-900 mb-4">Cadastre uma ata antes de lançar contratos.</div>}

      {contratos.length === 0 ? (
        <Vazio titulo="Nenhum contrato ou empenho lançado" texto="Cadastre um contrato vinculado a uma ata para dar baixa no saldo dos itens." />
      ) : (
        <>
          <BarraFiltros termo={termo} setTermo={setTermo} cat={cat} setCat={setCat} ano={ano} setAno={setAno} ord={ord} setOrd={setOrd} anos={anos} total={lista.length} />
          {lista.length === 0 ? (
            <Vazio titulo="Nenhum contrato corresponde aos filtros" texto="Ajuste os termos ou limpe os filtros." />
          ) : (
            <div className="space-y-3.5">
              {lista.map(c => {
                const a = atas.find(x => x.id === c.ataId);
                const s = situacao(c);
                const aberto = abertos.has(c.id);
                const ocs = ocorrenciasDe(c.id, ocorrencias);
                let total = 0;
                return (
                  <div key={c.id} className="bg-white border border-slate-300 rounded-sm overflow-hidden">
                    <button onClick={() => toggle(c.id)} className="w-full px-4 py-3.5 flex gap-3.5 items-center flex-wrap text-left hover:bg-stone-50 transition-colors">
                      <span className="font-mono text-[15px] font-semibold text-slate-800">{c.tipo} {c.numero}</span>
                      <span className="font-sans text-[13px] font-semibold text-slate-600">{c.fornecedor || "—"}</span>
                      <span className="font-mono text-[11px] text-slate-500">{a ? "Ata " + a.numero : "Sem ata vinculada"}{c.notaEmpenho ? " · NE " + c.notaEmpenho : ""}</span>
                      <span className="ml-auto flex gap-2 items-center flex-wrap">
                        {temAditivo(c.id) && <Pill tipo="neutro">Aditivado</Pill>}
                        {temFalta(c.id) && <Pill tipo="critico">Descumprimento</Pill>}
                        <Pill tipo={s.classe}>{s.txt}</Pill>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
                      </span>
                    </button>
                    {aberto && (
                      <div className="px-4 pb-4 border-t border-slate-100">
                        <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Dados</p>
                        <p className="font-sans text-[13.5px] text-slate-600 mb-3">
                          Processo: {c.processo || "—"} · Nota de empenho: {c.notaEmpenho || "—"} · Vigência: {fmtData(c.inicio)} a {fmtData(fimVigente(c, ocorrencias))}
                          {diasAditivados(c.id, ocorrencias) ? ` (+${diasAditivados(c.id, ocorrencias)} dias por aditivo)` : ""}
                          {c.objeto ? <br /> : ""}{c.objeto ? "Objeto: " + c.objeto : ""}
                        </p>
                        <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Itens</p>
                        <div className="overflow-x-auto border border-slate-300 rounded-sm">
                          <table className="w-full border-collapse text-[13.5px] min-w-[480px]">
                            <thead><tr className="bg-stone-50">
                              <Th>Objeto</Th><Th className="text-right">Qtd.</Th><Th className="text-right">Vlr. unit.</Th><Th className="text-right">Total</Th>
                            </tr></thead>
                            <tbody>
                              {(c.itens || []).map((i, idx) => {
                                const b = catalog.find(x => x.id === i.benId) || { objeto: "(item removido)", catmat: "—" };
                                const t = nQtd(i.qtd) * nVal(i.valor); total += t;
                                return (
                                  <tr key={idx} className="border-b border-slate-100 hover:bg-stone-50">
                                    <td className="px-3 py-2.5"><span className="font-sans font-semibold text-[12.8px] text-slate-800">{b.objeto}</span><br /><span className="font-mono text-xs text-slate-600">CATMAT {b.catmat}</span></td>
                                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(i.qtd)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(i.valor)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(t)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot><tr className="border-t border-slate-300 bg-stone-50">
                              <td className="px-3 py-2.5 font-sans font-semibold text-[12.5px]" colSpan={3}>
                                Valor dos itens{aditivoValor(c.id, ocorrencias) ? ` · aditivos R$ ${fmtM(aditivoValor(c.id, ocorrencias))} · valor vigente R$ ${fmtM(valorEmpenhado(c, ocorrencias))}` : ""}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtM(total)}</td>
                            </tr></tfoot>
                          </table>
                        </div>

                        {ocs.length > 0 && (
                          <>
                            <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Aditivos e ocorrências</p>
                            <div className="overflow-x-auto border border-slate-300 rounded-sm">
                              <table className="w-full border-collapse text-[13.5px] min-w-[480px]">
                                <thead><tr className="bg-stone-50"><Th>Data</Th><Th>Tipo</Th><Th>Descrição</Th><Th className="text-right">Efeito</Th><Th></Th></tr></thead>
                                <tbody>
                                  {ocs.map(o => (
                                    <tr key={o.id} className="border-b border-slate-100 hover:bg-stone-50">
                                      <td className="px-3 py-2.5 font-mono text-xs">{fmtData(o.data)}</td>
                                      <td className="px-3 py-2.5"><Pill tipo={FALTAS.includes(o.tipo) ? "critico" : "neutro"}>{o.tipo}</Pill></td>
                                      <td className="px-3 py-2.5 text-sm text-slate-600 max-w-[34ch]">{o.descricao || "—"}{o.processo ? <><br /><span className="font-mono text-xs">{o.processo}</span></> : ""}</td>
                                      <td className="px-3 py-2.5 text-right font-mono text-sm">{o.tipo === "Aditivo de prazo" ? `+${fmtQ(o.dias)} dias` : (nValS(o.valor) ? `R$ ${fmtM(nValS(o.valor))}` : "—")}</td>
                                      <td className="px-3 py-2.5"><MiniBtn variant="risco" onClick={() => excluirOcorrencia(o)}>Excluir</MiniBtn></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}

                        <div className="flex gap-2 flex-wrap mt-3.5">
                          <MiniBtn onClick={() => setEditId(c.id)}><Pencil className="w-3 h-3 inline mr-1" />Editar</MiniBtn>
                          <MiniBtn onClick={() => setOcorrContratoId(c.id)}>Registrar aditivo ou ocorrência</MiniBtn>
                          <MiniBtn variant="risco" onClick={() => excluir(c)}><Trash2 className="w-3 h-3 inline mr-1" />Excluir</MiniBtn>
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

      {(novo || editId) && <FormContrato c={editId ? contratos.find(x => x.id === editId) : null} data={data} refresh={refresh} onClose={() => { setNovo(false); setEditId(null); }} />}
      {ocorrContratoId && <FormOcorrencia contratoId={ocorrContratoId} data={data} refresh={refresh} onClose={() => setOcorrContratoId(null)} />}
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap ${className}`}>{children}</th>;
}

function BarraFiltros({ termo, setTermo, cat, setCat, ano, setAno, ord, setOrd, anos, total }) {
  return (
    <div className="flex gap-2.5 items-end flex-wrap mb-5 p-3.5 bg-white border border-slate-300 rounded-sm">
      <div className="flex-1 min-w-[200px]"><Campo label="Busca"><input type="search" value={termo} onChange={e => setTermo(e.target.value)} className={inputCls} placeholder="Buscar por número, fornecedor, nota de empenho, objeto ou item" /></Campo></div>
      <div className="min-w-[132px]"><Campo label="Categoria"><select value={cat} onChange={e => setCat(e.target.value)} className={inputCls}><option value="">Todas</option>{CAT_ARP.map(c => <option key={c}>{c}</option>)}</select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Ano"><select value={ano} onChange={e => setAno(e.target.value)} className={inputCls}><option value="">Todos</option>{anos.map(a => <option key={a}>{a}</option>)}</select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Ordenar por">
        <select value={ord} onChange={e => setOrd(e.target.value)} className={inputCls}>
          <option value="recentes">Número (mais recentes)</option><option value="antigos">Número (mais antigos)</option>
          <option value="vigencia">Vencimento mais próximo</option><option value="fornecedor">Fornecedor (A → Z)</option>
        </select>
      </Campo></div>
      <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{total} {total === 1 ? "contrato" : "contratos"}</span>
    </div>
  );
}

function FormContrato({ c, data, refresh, onClose }) {
  const { atas, catalog, pca, contratos } = data;
  const ctEmEdicao = c?.id || null;
  const [form, setForm] = useState({
    tipo: c?.tipo || "Contrato", numero: c?.numero || "", processo: c?.processo || "",
    notaEmpenho: c?.notaEmpenho || "", ataId: c?.ataId || atas[0]?.id || "",
    inicio: c?.inicio || "", fim: c?.fim || "", objeto: c?.objeto || ""
  });
  const [itens, setItens] = useState(c ? (c.itens || []).map(i => ({ ...i })) : []);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function setItem(i, k, v) {
    setItens(arr => {
      const novo = arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it);
      if (k === "itemAtaId") {
        const a = atas.find(x => x.id === form.ataId);
        const x = (a?.itens || []).find(y => y.id === v);
        if (x) {
          novo[i].valor = x.valor;
          const iguais = pca.filter(p => p.benId === x.benId);
          novo[i].pcaId = iguais.length ? (iguais.find(p => +p.exercicio === +new Date().getFullYear()) || iguais[0]).id : "";
        }
      }
      return novo;
    });
  }

  function addItem() {
    const a = atas.find(x => x.id === form.ataId);
    if (!a || !(a.itens || []).length) return alert("A ata selecionada não tem itens.");
    const primeiro = a.itens[0];
    const iguais = pca.filter(p => p.benId === primeiro.benId);
    setItens(arr => [...arr, { itemAtaId: primeiro.id, qtd: "", valor: primeiro.valor, pcaId: iguais.length ? (iguais.find(p => +p.exercicio === +new Date().getFullYear()) || iguais[0]).id : "" }]);
  }
  function rmItem(i) { setItens(arr => arr.filter((_, idx) => idx !== i)); }

  async function salvar() {
    if (!form.numero.trim()) return alert("Informe o número do contrato ou empenho.");
    const a = atas.find(x => x.id === form.ataId);
    if (!a) return alert("Selecione a ata vinculada.");
    const itensVal = [];
    for (const it of itens) {
      const q = nQtd(it.qtd); if (!q) continue;
      const x = (a.itens || []).find(y => y.id === it.itemAtaId);
      if (!x) continue;
      const disp = saldoItem(a, x, contratos, ctEmEdicao);
      if (q > disp) return alert(`Quantidade acima do saldo em ${catalog.find(b => b.id === x.benId)?.objeto || "item"}: disponível ${fmtQ(disp)}.`);
      itensVal.push({ itemAtaId: x.id, benId: x.benId, qtd: q, valor: nVal(it.valor), pcaId: it.pcaId || "" });
    }
    if (!itensVal.length) return alert("Informe ao menos um item com quantidade.");
    const dados = { ...form, numero: form.numero.trim(), processo: form.processo.trim(), notaEmpenho: form.notaEmpenho.trim(),
      ataId: a.id, fornecedorId: a.fornecedorId || "", fornecedor: a.fornecedor, cnpj: a.cnpj,
      objeto: form.objeto.trim(), inicio: form.inicio, fim: form.fim, itens: itensVal };
    if (c) await base44.entities.Contrato.update(c.id, dados);
    else await base44.entities.Contrato.create(dados);
    await refresh();
    onClose();
    alert(c ? "Lançamento atualizado." : "Lançamento registrado e saldo baixado.");
  }

  function opcoesPCA(benId, sel) {
    const iguais = pca.filter(p => p.benId === benId);
    const outros = pca.filter(p => p.benId !== benId);
    return (<>
      <option value="">Sem vínculo com o plano</option>
      {iguais.length > 0 && <optgroup label="Mesmo bem">{iguais.map(p => <option key={p.id} value={p.id} selected={p.id === sel}>{(p.codigo ? p.codigo + " · " : "") + p.exercicio} — {catalog.find(b => b.id === p.benId)?.objeto || "(removido)"} ({fmtQ(p.qtd)} un.)</option>)}</optgroup>}
      {outros.length > 0 && <optgroup label="Outros itens do plano">{outros.map(p => <option key={p.id} value={p.id} selected={p.id === sel}>{(p.codigo ? p.codigo + " · " : "") + p.exercicio} — {catalog.find(b => b.id === p.benId)?.objeto || "(removido)"} ({fmtQ(p.qtd)} un.)</option>)}</optgroup>}
    </>);
  }

  const a = atas.find(x => x.id === form.ataId);

  return (
    <Modal sobre="Execução do registro de preços" titulo={c ? "Editar lançamento" : "Cadastrar contrato ou empenho"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar lançamento</Btn></>}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Tipo"><select className={inputCls} value={form.tipo} onChange={e => setF("tipo", e.target.value)}><option>Contrato</option><option>Nota de empenho</option></select></Campo>
        <Campo label="Número"><input className={inputCls} value={form.numero} onChange={e => setF("numero", e.target.value)} placeholder="ex.: 45/2026" /></Campo>
        <Campo label="Processo"><input className={inputCls} value={form.processo} onChange={e => setF("processo", e.target.value)} /></Campo>
        <Campo label="Nota de empenho"><input className={inputCls} value={form.notaEmpenho} onChange={e => setF("notaEmpenho", e.target.value)} placeholder="ex.: 2026NE000418" /></Campo>
        <Campo label="Ata vinculada"><select className={inputCls} value={form.ataId} onChange={e => { setF("ataId", e.target.value); setItens([]); }}>{atas.map(at => <option key={at.id} value={at.id}>Ata {at.numero} — {at.fornecedor || ""}</option>)}</select></Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Início da vigência"><input type="date" className={inputCls} value={form.inicio} onChange={e => setF("inicio", e.target.value)} /></Campo>
        <Campo label="Fim da vigência"><input type="date" className={inputCls} value={form.fim} onChange={e => setF("fim", e.target.value)} /></Campo>
      </div>
      <Campo label="Objeto"><textarea className={textareaCls} value={form.objeto} onChange={e => setF("objeto", e.target.value)} placeholder="ex.: aquisição de equipamentos de videomonitoramento para as promotorias de justiça do interior." /></Campo>

      <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Itens contratados</p>
      <div className="border border-slate-300 rounded-sm overflow-hidden">
        {itens.length === 0 ? (
          <div className="px-3 py-2.5 text-sm text-slate-500">Nenhum item. Use "Adicionar item".</div>
        ) : (
          itens.map((it, i) => {
            const atual = (a?.itens || []).find(x => x.id === it.itemAtaId);
            const sal = atual ? saldoItem(a, atual, contratos, ctEmEdicao) : 0;
            return (
              <div key={i} className="px-3 py-2.5 border-b border-slate-100 last:border-0 space-y-2.5">
                <div className="grid gap-2.5 [grid-template-columns:minmax(0,2fr)_minmax(0,1.7fr)_80px_105px_100px_36px] items-end">
                  <Campo label={`Item ${i + 1}`}>
                    <select className={inputCls} value={it.itemAtaId} onChange={e => setItem(i, "itemAtaId", e.target.value)}>
                      {(a?.itens || []).map(x => {
                        const b = catalog.find(bc => bc.id === x.benId) || { objeto: "(removido)" };
                        const s = saldoItem(a, x, contratos, ctEmEdicao);
                        return <option key={x.id} value={x.id}>{x.numItem ? `Item ${x.numItem} — ` : ""}{b.objeto} (saldo {fmtQ(s)})</option>;
                      })}
                    </select>
                    <span className="font-mono text-[11px] text-slate-500">Saldo disponível: {fmtQ(sal)}</span>
                  </Campo>
                  <Campo label="Qtd."><input type="number" min="0" className={inputCls} value={it.qtd} onChange={e => setItem(i, "qtd", e.target.value)} /></Campo>
                  <Campo label="Vlr. unit."><input inputMode="decimal" className={inputCls} value={it.valor} onChange={e => setItem(i, "valor", e.target.value)} /></Campo>
                  <Campo label="Total"><span className="font-mono text-[11px] text-slate-500 py-2.5 block">R$ {fmtM(nQtd(it.qtd) * nVal(it.valor))}</span></Campo>
                  <Campo label=" "><MiniBtn variant="risco" onClick={() => rmItem(i)}>×</MiniBtn></Campo>
                </div>
                <Campo label="Item do Plano Anual que está sendo executado">
                  <select className={inputCls} value={it.pcaId || ""} onChange={e => setItem(i, "pcaId", e.target.value)}>{opcoesPCA(atual?.benId || "", it.pcaId)}</select>
                </Campo>
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-2 flex-wrap mt-3.5"><Btn onClick={addItem}>Adicionar item</Btn></div>
    </Modal>
  );
}

export function FormOcorrencia({ contratoId, data, refresh, onClose, ocorr }) {
  const { contratos } = data;
  const c = contratos.find(x => x.id === contratoId);
  const [form, setForm] = useState({
    tipo: ocorr?.tipo || TIPOS_OCORRENCIA[0], data: ocorr?.data || new Date().toISOString().slice(0, 10),
    processo: ocorr?.processo || "", dias: ocorr?.dias || 0, valor: ocorr?.valor || "", descricao: ocorr?.descricao || ""
  });
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function salvar() {
    if (form.tipo === "Aditivo de prazo" && !form.dias) return alert("Informe a quantidade de dias da prorrogação.");
    if (form.tipo === "Aditivo de valor" && !nValS(form.valor)) return alert("Informe o valor do aditivo.");
    const dados = { contratoId, ...form, dias: Number(form.dias) || 0, valor: String(form.valor), processo: form.processo.trim(), descricao: form.descricao.trim() };
    if (ocorr) await base44.entities.Ocorrencia.update(ocorr.id, dados);
    else await base44.entities.Ocorrencia.create(dados);
    await refresh();
    onClose();
    alert(ocorr ? "Ocorrência atualizada." : "Ocorrência registrada.");
  }

  if (!c) return null;

  return (
    <Modal sobre={`${c.tipo} ${c.numero}`} titulo={ocorr ? "Editar ocorrência" : "Registrar aditivo ou ocorrência"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar</Btn></>}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Tipo"><select className={inputCls} value={form.tipo} onChange={e => setF("tipo", e.target.value)}>{TIPOS_OCORRENCIA.map(t => <option key={t}>{t}</option>)}</select></Campo>
        <Campo label="Data"><input type="date" className={inputCls} value={form.data} onChange={e => setF("data", e.target.value)} /></Campo>
        <Campo label="Processo"><input className={inputCls} value={form.processo} onChange={e => setF("processo", e.target.value)} /></Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Prorrogação (dias)" ajuda="Só para aditivo de prazo."><input type="number" className={inputCls} value={form.dias} onChange={e => setF("dias", e.target.value)} /></Campo>
        <Campo label="Acréscimo ou supressão (R$)" ajuda="Use sinal negativo para supressão."><input inputMode="decimal" className={inputCls} value={form.valor} onChange={e => setF("valor", e.target.value)} /></Campo>
      </div>
      <Campo label="Descrição"><textarea className={textareaCls} value={form.descricao} onChange={e => setF("descricao", e.target.value)} placeholder="ex.: entrega 45 dias após o prazo; aplicada multa de 2% sobre o valor do empenho." /></Campo>
    </Modal>
  );
}