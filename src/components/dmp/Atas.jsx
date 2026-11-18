import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { CAT_ARP, ORDEM } from "@/lib/dmp-data";
import { fmtM, fmtQ, fmtData, nQtd, nVal, norm, diasAte, consumido, saldoItem, resumoAta, situacaoAta, uid, baixarCSV, parsearCSV } from "@/lib/dmp-utils";
import { opcoesBensAgrupadas, opcoesAgrupadas, opcoesBensTodasCategorias } from "@/lib/subcat-utils";
import { Btn, MiniBtn, Campo, Vazio, Pill, Barra, Modal, inputCls, textareaCls } from "./ui";
import { TelaCab } from "./Catalogo";
import ImportarCSV from "./ImportarCSV";
import { usePodeEditar } from "@/lib/permissoes";
import { Plus, ChevronDown, Pencil, Trash2, Sparkles, Upload } from "lucide-react";
import { GrupoAnoCategoria, agruparPorAnoCategoria, BotaoAgrupar } from "./Agrupar";
import { BadgeContratos, TabelaContratosDaAta } from "./ContratosDaAta";

export default function Atas({ data, refresh }) {
  const podeEditar = usePodeEditar();
  const { atas, contratos, catalog, licitacoes, fornecedores } = data;
  const [editId, setEditId] = useState(null);
  const [novo, setNovo] = useState(false);
  const [abertos, setAbertos] = useState(new Set());
  const [termo, setTermo] = useState("");
  const [cat, setCat] = useState("");
  const [ano, setAno] = useState("");
  const [ord, setOrd] = useState("vigencia");
  const [agrupar, setAgrupar] = useState(true);
  const [vigencia, setVigencia] = useState("vigente");

  const anos = Array.from(new Set(atas.map(a => a.inicio?.slice(0, 4) || a.fim?.slice(0, 4) || "").filter(Boolean))).sort().reverse();
  const categorias = CAT_ARP;

  function anoDaAta(a) { return a.inicio?.slice(0, 4) || a.fim?.slice(0, 4) || ""; }
  function catDaAta(a) { return a?.categoria || "Sem categoria"; }

  const lista = useMemo(() => {
    const t = norm(termo.trim());
    let res = atas.filter(a => {
      if (cat && catDaAta(a) !== cat) return false;
      if (ano && String(anoDaAta(a)) !== String(ano)) return false;
      if (vigencia) {
        const sv = situacaoAta(a);
        if (vigencia === "vigente" && !(sv.dias !== null && sv.dias >= 0)) return false;
        if (vigencia === "vencido" && !(sv.dias !== null && sv.dias < 0)) return false;
      }
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
  }, [atas, termo, cat, ano, ord, contratos, catalog, vigencia]);

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
    const l = [["Número da ata", "Processo", "Órgão gerenciador", "Categoria", "CNPJ do fornecedor", "Início da vigência", "Fim da vigência", "Prazo de entrega (dias)", "Local de entrega", "Observação da entrega"]];
    atas.forEach(a => {
      l.push([a.numero, a.processo || "", a.gerenciador || "", a.categoria || "", a.cnpj || "", fmtData(a.inicio), fmtData(a.fim), a.prazoEntrega || "", a.localEntrega || "", a.observacaoEntrega || ""]);
    });
    baixarCSV("atas.csv", l);
  }

  const grupos = useMemo(() => agrupar ? agruparPorAnoCategoria(lista, a => anoDaAta(a), a => catDaAta(a)) : [], [lista, agrupar]);

  function renderItem(a) {
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
            <BadgeContratos ata={a} contratos={contratos} />
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
            <p className="font-sans text-[13.5px] text-slate-600 mb-3">
              Prazo de entrega: {a.prazoEntrega ? `${fmtQ(a.prazoEntrega)} dias` : "—"} · Local de entrega: {a.localEntrega || "—"}
              {a.observacaoEntrega ? ` · Observação: ${a.observacaoEntrega}` : ""}
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
            <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-5 mb-2">Contratos vinculados</p>
            <TabelaContratosDaAta ata={a} contratos={contratos} ocorrencias={data.ocorrencias} />
            <div className="flex gap-2 flex-wrap mt-3.5">
              {podeEditar && <><MiniBtn onClick={() => setEditId(a.id)}><Pencil className="w-3 h-3 inline mr-1" />Editar ata</MiniBtn>
              <MiniBtn variant="risco" onClick={() => excluir(a)}><Trash2 className="w-3 h-3 inline mr-1" />Excluir</MiniBtn></>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <TelaCab titulo="Atas de registro de preços" desc="Cadastre as atas vigentes e acompanhe o saldo de cada item conforme os contratos e empenhos lançados."
        direita={<>
          <Btn onClick={exportCSV}>Baixar CSV</Btn>
          <ImportarCSV entityName="Ata" refresh={refresh} data={data}
            existentes={atas} chave={r => norm(r.numero)}
            colunas={[
              { header: "Número da ata", campo: "numero", obrigatorio: true },
              { header: "Processo", campo: "processo" },
              { header: "Órgão gerenciador", campo: "gerenciador" },
              { header: "Categoria", campo: "categoria", obrigatorio: true },
              { header: "CNPJ do fornecedor", campo: "_cnpj", obrigatorio: true },
              { header: "Início da vigência", campo: "inicio", tipo: "date" },
              { header: "Fim da vigência", campo: "fim", tipo: "date" }
            ]}
            preProcess={(rec, data) => {
              const f = (data.fornecedores || []).find(x => norm(x.cnpj) === norm(rec._cnpj));
              if (!f) return null;
              return { numero: rec.numero, processo: rec.processo, gerenciador: rec.gerenciador, categoria: rec.categoria, fornecedorId: f.id, fornecedor: f.razao, cnpj: f.cnpj, inicio: rec.inicio, fim: rec.fim, itens: [] };
            }}
            ajuda="O CNPJ do fornecedor deve já estar cadastrado em Fornecedores. A ata será criada sem itens — edite-a depois para registrar os itens e quantidades. Datas no formato dd/mm/aaaa." />
          {podeEditar && <Btn variant="forte" onClick={() => setNovo(true)} disabled={fornecedores.length === 0}><Plus className="w-4 h-4 inline mr-1" />Cadastrar ata</Btn>}
        </>} />

      {fornecedores.length === 0 && <div className="border border-amber-300 bg-amber-50 rounded-sm px-4 py-3 text-sm text-amber-900 mb-4">Cadastre um fornecedor antes de registrar atas.</div>}

      {atas.length === 0 ? (
        <Vazio titulo="Nenhuma ata cadastrada" texto="Cadastre a ata com fornecedor, vigência e itens registrados para o sistema controlar o saldo." />
      ) : (
        <>
          <BarraFiltros termo={termo} setTermo={setTermo} cat={cat} setCat={setCat} ano={ano} setAno={setAno} ord={ord} setOrd={setOrd} anos={anos} total={lista.length} agrupar={agrupar} setAgrupar={setAgrupar} vigencia={vigencia} setVigencia={setVigencia} />
          {lista.length === 0 ? (
            <Vazio titulo="Nenhuma ata corresponde aos filtros" texto="Ajuste os termos ou limpe os filtros." />
          ) : agrupar ? (
            <GrupoAnoCategoria grupos={grupos} renderItem={renderItem} />
          ) : (
            <div className="space-y-3.5">
              {lista.map(renderItem)}
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

function BarraFiltros({ termo, setTermo, cat, setCat, ano, setAno, ord, setOrd, anos, total, agrupar, setAgrupar, vigencia, setVigencia }) {
  return (
    <div className="flex gap-2.5 items-end flex-wrap mb-5 p-3.5 bg-white border border-slate-300 rounded-sm">
      <div className="flex-1 min-w-[200px]"><Campo label="Busca"><input type="search" value={termo} onChange={e => setTermo(e.target.value)} className={inputCls} placeholder="Buscar por número, processo, fornecedor ou item" /></Campo></div>
      <div className="min-w-[132px]"><Campo label="Situação"><select value={vigencia} onChange={e => setVigencia(e.target.value)} className={inputCls}><option value="">Todas</option><option value="vigente">Vigentes</option><option value="vencido">Vencidas</option></select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Categoria"><select value={cat} onChange={e => setCat(e.target.value)} className={inputCls}><option value="">Todas</option>{CAT_ARP.map(c => <option key={c}>{c}</option>)}</select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Ano"><select value={ano} onChange={e => setAno(e.target.value)} className={inputCls}><option value="">Todos</option>{anos.map(a => <option key={a}>{a}</option>)}</select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Ordenar por">
        <select value={ord} onChange={e => setOrd(e.target.value)} className={inputCls}>
          <option value="vigencia">Vencimento mais próximo</option><option value="numero">Número da ata</option>
          <option value="saldo">Maior saldo</option><option value="fornecedor">Fornecedor (A → Z)</option>
        </select>
      </Campo></div>
      <BotaoAgrupar agrupar={agrupar} setAgrupar={setAgrupar} />
      <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{total} {total === 1 ? "ata" : "atas"}</span>
    </div>
  );
}

function FormAta({ a, data, refresh, onClose }) {
  const { catalog, licitacoes, fornecedores, contratos, atas } = data;
  const catCatalog = (cat) => cat;
  // Fornecedor sugerido pela IA — só é cadastrado quando a ata for salva
  const [fornNovo, setFornNovo] = useState(null);
  const [form, setForm] = useState({
    numero: a?.numero || "", processo: a?.processo || "", gerenciador: a?.gerenciador || "Ministério Público do Estado do Piauí",
    categoria: a?.categoria || CAT_ARP[0], licitacaoId: a?.licitacaoId || "", fornecedorId: a?.fornecedorId || "",
    inicio: a?.inicio || "", fim: a?.fim || "",
    prazoEntrega: a?.prazoEntrega ?? "", localEntrega: a?.localEntrega || "", observacaoEntrega: a?.observacaoEntrega || ""
  });
  const [itens, setItens] = useState(a ? (a.itens || []).map(it => ({ ...it })) : [{ id: uid(), benId: catalog.filter(b => !b.oculto && b.categoria === catCatalog(a?.categoria || CAT_ARP[0]))[0]?.id || catalog.filter(b => !b.oculto)[0]?.id || catalog[0]?.id || "", numItem: "1", qtd: "", valor: "" }]);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaStatus, setIaStatus] = useState("");

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function handleInicio(v) {
    setForm(f => {
      const novo = { ...f, inicio: v };
      if (v) {
        const [y, m, d] = v.split("-");
        let ano = Number(y) + 1;
        let dia = d;
        if (m === "02" && d === "29") dia = "28";
        novo.fim = `${ano}-${m}-${dia}`;
      }
      return novo;
    });
  }
  function setItem(i, k, v) { setItens(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it)); }
  function addItem() {
    let daCat = catalog.filter(b => !b.oculto && b.categoria === catCatalog(form.categoria));
    if (!daCat.length) daCat = catalog.filter(b => !b.oculto);
    if (!daCat.length) daCat = catalog;
    setItens(arr => [...arr, { id: uid(), benId: daCat[0]?.id || "", numItem: String(arr.length + 1), qtd: "", valor: "" }]);
  }
  function rmItem(i) { setItens(arr => arr.filter((_, idx) => idx !== i)); }
  const [csvStatus, setCsvStatus] = useState("");
  async function importarItensCSV(file) {
    if (!file) return;
    try {
      const texto = await file.text();
      const linhas = parsearCSV(texto);
      if (!linhas.length) { setCsvStatus("Arquivo vazio."); return; }
      const novos = [];
      let matched = 0, unmatched = 0;
      linhas.forEach((row, idx) => {
        const catmat = String(row["CATMAT"] || "").trim();
        const bem = catmat ? catalog.find(b => String(b.catmat || "").trim() === catmat) : null;
        if (!bem) { unmatched++; return; }
        matched++;
        novos.push({ id: uid(), benId: bem.id, numItem: String(row["Nº na ata"] || row["Item"] || idx + 1).trim(), qtd: row["Qtd."] || row["Quantidade"] || "", valor: row["Vlr. unit."] || row["Valor unitário"] || "" });
      });
      if (novos.length) setItens(arr => [...arr, ...novos]);
      setCsvStatus(`${matched} itens importados${unmatched > 0 ? `, ${unmatched} sem CATMAT correspondente ignorados` : ""}.`);
    } catch (e) {
      setCsvStatus("Erro: " + (e.message || e));
    }
  }

  async function importarComIA(file) {
    if (!file || iaLoading) return;
    setIaLoading(true); setIaStatus("Enviando arquivo…");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setIaStatus("Extraindo dados da ata com IA…");
      const resp = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            numero: { type: "string" },
            processo: { type: "string" },
            gerenciador: { type: "string" },
            categoria: { type: "string" },
            fornecedor: { type: "string" },
            cnpj: { type: "string" },
            inicio: { type: "string" },
            fim: { type: "string" },
            itens: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  numItem: { type: "string" },
                  descricao: { type: "string" },
                  catmat: { type: "string" },
                  qtd: { type: "number" },
                  valor: { type: "number" }
                }
              }
            }
          }
        }
      });
      if (resp.status !== "success" || !resp.output) { setIaStatus("Não foi possível extrair dados do arquivo."); return; }
      const d = resp.output;
      function parseData(s) {
        if (!s) return "";
        s = String(s).trim();
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
        const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m2) return `${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
        return "";
      }
      const cleanCnpj = (s) => String(s || "").replace(/\D/g, "");
      let fornId = form.fornecedorId;
      const cnpjNum = cleanCnpj(d.cnpj);
      if (cnpjNum) {
        const existente = fornecedores.find(f => cleanCnpj(f.cnpj) === cnpjNum);
        if (existente) { fornId = existente.id; setFornNovo(null); }
        else if (d.fornecedor) {
          setFornNovo({ razao: d.fornecedor, cnpj: d.cnpj || "" });
          fornId = "__novo__";
        }
      }
      const catExtraida = d.categoria ? CAT_ARP.find(c => norm(c) === norm(d.categoria)) : null;
      const itensExtraidos = (d.itens || []).map(it => {
        const catmatStr = it.catmat ? String(it.catmat).trim() : "";
        const bem = catmatStr ? catalog.find(b => String(b.catmat || "").trim() === catmatStr) : null;
        return { id: uid(), benId: bem ? bem.id : "", numItem: String(it.numItem || ""), qtd: it.qtd || "", valor: it.valor || "", _match: !!bem, _descricao: it.descricao || "" };
      });
      const matched = itensExtraidos.filter(i => i._match).length;
      const unmatched = itensExtraidos.length - matched;
      setForm(f => ({
        ...f,
        numero: d.numero || f.numero,
        processo: d.processo || f.processo,
        gerenciador: d.gerenciador || f.gerenciador,
        categoria: catExtraida || f.categoria,
        fornecedorId: fornId,
        inicio: parseData(d.inicio) || f.inicio,
        fim: parseData(d.fim) || f.fim
      }));
      if (itensExtraidos.length) setItens(itensExtraidos.map(({ _match, ...rest }) => rest));
      let msg = `${itensExtraidos.length} itens extraídos (${matched} vinculados ao catálogo`;
      if (unmatched > 0) msg += `, ${unmatched} sem CATMAT correspondente — marcados em vermelho, escolha o item do catálogo`;
      msg += "). Revise os dados antes de salvar.";
      if (fornId === "__novo__") msg += ` Fornecedor novo (${d.fornecedor}) será cadastrado somente ao salvar a ata.`;
      setIaStatus(msg);
    } catch (e) {
      setIaStatus("Erro ao processar o arquivo: " + (e.message || e));
    } finally {
      setIaLoading(false);
    }
  }

  async function salvar() {
    if (!form.numero.trim()) return alert("Informe o número da ata.");
    if (atas.some(x => x.id !== a?.id && norm(x.numero) === norm(form.numero))) return alert(`Já existe uma ata com o número ${form.numero.trim()}.`);
    const semBem = itens.filter(it => nQtd(it.qtd) > 0 && !it.benId);
    if (semBem.length) return alert(`${semBem.length} item(ns) sem correspondência no catálogo (marcados em vermelho). Escolha o item do catálogo ou remova a linha.`);
    const itensVal = itens.filter(it => nQtd(it.qtd) > 0).map(it => ({ id: it.id || uid(), benId: it.benId, numItem: String(it.numItem || "").trim(), qtd: nQtd(it.qtd), valor: nVal(it.valor) }));
    if (!itensVal.length) return alert("Registre ao menos um item com quantidade.");
    if (!form.fornecedorId) return alert("Selecione o fornecedor.");
    if (a) {
      // Todo item original já usado em contratos precisa continuar na ata com quantidade suficiente
      for (const orig of a.itens || []) {
        const c = consumido(a.id, orig.id, contratos);
        if (c <= 0) continue;
        const novo = itensVal.find(x => x.id === orig.id);
        const nome = catalog.find(b => b.id === orig.benId)?.objeto || "item";
        if (!novo) return alert(`O item "${nome}" já foi usado em contratos (${fmtQ(c)} un. consumidas) e não pode ser removido nem zerado.`);
        if (novo.qtd < c) return alert(`Quantidade menor que o já consumido em "${nome}" (${fmtQ(c)} un.).`);
        if (novo.benId !== orig.benId) return alert(`O item "${nome}" já foi usado em contratos e não pode ter o bem trocado.`);
      }
    }
    let fornecedorId = form.fornecedorId;
    if (fornecedorId === "__novo__" && fornNovo) {
      const criado = await base44.entities.Fornecedor.create({ razao: fornNovo.razao, cnpj: fornNovo.cnpj, categoria: form.categoria });
      fornecedorId = criado.id;
    }
    const f = fornecedorId === form.fornecedorId ? (fornecedores.find(x => x.id === fornecedorId) || {}) : { razao: fornNovo.razao, cnpj: fornNovo.cnpj };
    const dados = {
      ...form, fornecedorId, numero: form.numero.trim(), processo: form.processo.trim(),
      prazoEntrega: Number(form.prazoEntrega) || 0,
      localEntrega: form.localEntrega.trim(), observacaoEntrega: form.observacaoEntrega.trim(),
      fornecedor: f.razao || "", cnpj: f.cnpj || "", itens: itensVal
    };
    if (a) {
      await base44.entities.Ata.update(a.id, dados);
    } else {
      await base44.entities.Ata.create(dados);
    }
    await refresh();
    onClose();
    alert(a ? "Ata atualizada." : "Ata cadastrada.");
  }

  function opcoesBens(sel) {
    const catBase = catCatalog(form.categoria);
    const daCategoria = catalog.filter(b => !b.oculto && b.categoria === catBase);
    // Se a categoria tem itens, agrupa por subcategoria dela; senão, mostra todos os bens agrupados
    if (daCategoria.length) return opcoesBensAgrupadas(catalog, catBase, sel);
    return opcoesBensTodasCategorias(catalog, sel);
  }

  return (
    <Modal sobre="Registro de preços" titulo={a ? "Editar ata" : "Cadastrar ata"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar ata</Btn></>}>
      <div className="mb-4 p-3.5 border border-amber-300 bg-amber-50/60 rounded-sm">
        <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-amber-800 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />Importar ata com IA
        </h4>
        <p className="font-sans text-[12px] text-amber-900 mb-2.5">Carregue o PDF ou imagem da ata de registro de preços. A IA extrai número, processo, fornecedor, vigência e itens, e vincula os itens ao catálogo pelo CATMAT.</p>
        <div className="flex gap-2 items-center flex-wrap">
          <Btn variant="forte">
            <label className="cursor-pointer flex items-center">
              <Upload className="w-4 h-4 inline mr-1" />{iaLoading ? "Processando…" : "Carregar arquivo"}
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) importarComIA(f); e.target.value = ""; }} />
            </label>
          </Btn>
          {iaStatus && <span className="font-sans text-[12px] text-amber-900">{iaStatus}</span>}
        </div>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Número da ata"><input className={inputCls} value={form.numero} onChange={e => setF("numero", e.target.value)} placeholder="ex.: 12/2026" /></Campo>
        <Campo label="Processo"><input className={inputCls} value={form.processo} onChange={e => setF("processo", e.target.value)} /></Campo>
        <Campo label="Categoria"><select className={inputCls} value={form.categoria} onChange={e => { setF("categoria", e.target.value); setF("fornecedorId", ""); }}>{CAT_ARP.map(c => <option key={c}>{c}</option>)}</select></Campo>
        <Campo label="Órgão gerenciador"><input className={inputCls} value={form.gerenciador} onChange={e => setF("gerenciador", e.target.value)} /></Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Licitação de origem" ajuda={licitacoes.length ? "Certame que gerou esta ata." : "Nenhuma licitação cadastrada."}>
          <select className={inputCls} value={form.licitacaoId} onChange={e => setF("licitacaoId", e.target.value)}>
            {opcoesAgrupadas({
              items: licitacoes,
              grupoFns: [l => String(l.ano || "Sem ano"), l => l.categoria || "Sem categoria"],
              optionFn: l => <option key={l.id} value={l.id}>{l.modalidade} nº {l.numero}/{l.ano}</option>,
              extraOption: <option value="">Sem licitação vinculada</option>,
              sortItems: (a, b) => String(b.ano || "").localeCompare(String(a.ano || "")) || (a.categoria || "").localeCompare(b.categoria || "", "pt-BR") || (a.modalidade || "").localeCompare(b.modalidade || "", "pt-BR")
            })}
          </select>
        </Campo>
        <Campo label="Fornecedor" ajuda="Apenas fornecedores da categoria selecionada (ou sem categoria).">
          <select className={inputCls} value={form.fornecedorId} onChange={e => setF("fornecedorId", e.target.value)} disabled={fornecedores.length === 0}>
            {(() => {
              const fs = fornecedores.filter(f => !f.categoria || f.categoria === form.categoria);
              const extraNovo = fornNovo ? <option value="__novo__">Novo: {fornNovo.razao}{fornNovo.cnpj ? ` — ${fornNovo.cnpj}` : ""} (cadastrado ao salvar)</option> : <option value="">Selecione o fornecedor</option>;
              if (!fs.length) return <>{extraNovo}{!fornNovo && <option value="" disabled>Nenhum fornecedor da categoria</option>}</>;
              return opcoesAgrupadas({
                items: fs,
                extraOption: extraNovo,
                grupoFns: [f => f.categoria || "Sem categoria"],
                optionFn: f => <option key={f.id} value={f.id}>{f.razao}{f.cnpj ? ` — ${f.cnpj}` : ""}</option>,
                sortItems: (a, b) => (a.categoria || "").localeCompare(b.categoria || "", "pt-BR") || (a.razao || "").localeCompare(b.razao || "", "pt-BR")
              });
            })()}
          </select>
        </Campo>
        <Campo label="Início da vigência"><input type="date" className={inputCls} value={form.inicio} onChange={e => handleInicio(e.target.value)} /></Campo>
        <Campo label="Fim da vigência" ajuda="Preenchido automaticamente com 12 meses após o início — edite se necessário."><input type="date" className={inputCls} value={form.fim} onChange={e => setF("fim", e.target.value)} /></Campo>
      </div>
      <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Informações de entrega</p>
      <div className="grid gap-3 [grid-template-columns:minmax(140px,180px)_minmax(0,1fr)] mb-3">
        <Campo label="Prazo de entrega (dias)" ajuda="Os contratos desta ata herdam este prazo.">
          <input type="number" min="0" className={inputCls} value={form.prazoEntrega} onChange={e => setF("prazoEntrega", e.target.value)} placeholder="ex.: 30" />
        </Campo>
        <Campo label="Local de entrega" ajuda="Endereço que constará nas ordens de fornecimento dos contratos.">
          <input className={inputCls} value={form.localEntrega} onChange={e => setF("localEntrega", e.target.value)} placeholder="ex.: Sede do MP-PI — Rua Desembargador Freitas, Teresina/PI" />
        </Campo>
      </div>
      <div className="mb-3">
        <Campo label="Observação sobre a entrega" ajuda="Texto herdado pelas ordens de fornecimento (ex.: horário, agendamento, condições de recebimento).">
          <textarea className={textareaCls} value={form.observacaoEntrega} onChange={e => setF("observacaoEntrega", e.target.value)} />
        </Campo>
      </div>
      <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Itens registrados</p>
      <div className="border border-slate-300 rounded-sm overflow-hidden">
        {itens.map((it, i) => (
          <div key={i} className={`grid gap-2.5 px-3 py-2.5 border-b border-slate-100 last:border-0 [grid-template-columns:minmax(0,2.4fr)_90px_110px_120px_36px] items-end ${!it.benId ? "bg-red-50" : ""}`}>
            <Campo label={`Item ${i + 1}`} ajuda={!it.benId ? `Sem CATMAT correspondente${it._descricao ? `: "${it._descricao.slice(0, 80)}"` : ""} — escolha o item do catálogo.` : ""}>
              <select className={`${inputCls} ${!it.benId ? "border-red-400" : ""}`} value={it.benId} onChange={e => setItem(i, "benId", e.target.value)}>
                {!it.benId && <option value="">— Selecione o item do catálogo —</option>}
                {opcoesBens(it.benId)}
              </select>
            </Campo>
            <Campo label="Nº na ata"><input className={inputCls} value={it.numItem} onChange={e => setItem(i, "numItem", e.target.value)} /></Campo>
            <Campo label="Qtd."><input type="number" min="0" className={inputCls} value={it.qtd} onChange={e => setItem(i, "qtd", e.target.value)} /></Campo>
            <Campo label="Vlr. unit. (R$)"><input inputMode="decimal" className={inputCls} value={it.valor} onChange={e => setItem(i, "valor", e.target.value)} /></Campo>
            <Campo label=" "><MiniBtn variant="risco" onClick={() => rmItem(i)}>×</MiniBtn></Campo>
          </div>
        ))}
      </div>
      <Campo label="Adicionar itens" ajuda="Use 'Adicionar item' para incluir manualmente, ou 'Importar itens (CSV)' para carregar vários de uma vez. O CSV deve ter as colunas: Nº na ata, CATMAT, Qtd. e Vlr. unit. — os itens são vinculados ao catálogo pelo CATMAT.">
        <div className="flex gap-2 flex-wrap items-center">
          <Btn onClick={addItem}>Adicionar item</Btn>
          <Btn>
            <label className="cursor-pointer flex items-center">
              <Upload className="w-4 h-4 inline mr-1" />Importar itens (CSV)
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) importarItensCSV(f); e.target.value = ""; }} />
            </label>
          </Btn>
          {csvStatus && <span className="font-sans text-[12px] text-slate-500">{csvStatus}</span>}
        </div>
      </Campo>
    </Modal>
  );
}