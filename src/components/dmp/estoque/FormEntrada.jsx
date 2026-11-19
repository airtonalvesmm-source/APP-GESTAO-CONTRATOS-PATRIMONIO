import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { nQtd, norm, isoData, hoje } from "@/lib/dmp-utils";
import { Modal, Btn, Campo, Vazio, ErrosForm, inputCls } from "../ui";
import { inteiroDe } from "@/lib/validacao";
import { ChevronDown, Check, Boxes, Search, Upload } from "lucide-react";
import ImportarBensCSV from "./ImportarBensCSV";

export default function FormEntrada({ data, refresh, onClose }) {
  const { contratos, pagamentos, catalog, bens } = data;
  const [abertos, setAbertos] = useState(new Set());
  const [selecao, setSelecao] = useState({}); // contratoId -> { benId -> qtd }
  const [nfSel, setNfSel] = useState({}); // contratoId -> pagamentoId
  const [placaInicial, setPlacaInicial] = useState(() => sugestaoPlaca(bens));
  const [termo, setTermo] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [fornFiltro, setFornFiltro] = useState("");
  const [ord, setOrd] = useState("numero");
  const [importarCSV, setImportarCSV] = useState(false);
  const [modoPlaca, setModoPlaca] = useState("auto"); // "auto" | "manual"
  const [placasManuais, setPlacasManuais] = useState("");
  const [erros, setErros] = useState([]);

  function sugestaoPlaca(bens) {
    let max = 0;
    (bens || []).forEach(b => { const n = parseInt(String(b.placa).replace(/\D/g, ""), 10); if (isFinite(n) && n > max) max = n; });
    return max > 0 ? max + 1 : 1001;
  }

  const contratosEntregues = useMemo(() => {
    return (contratos || []).filter(c => c.statusEntrega === "Entregue").map(c => {
      const itens = agruparItensContrato(c, bens);
      const restantes = itens.filter(it => it.restante > 0);
      return { ...c, itens, restantes };
    }).filter(c => c.restantes.length > 0);
  }, [contratos, bens]);

  // Categorias e fornecedores disponíveis para os filtros
  const categoriasFiltro = useMemo(() => {
    const s = new Set();
    contratosEntregues.forEach(c => c.restantes.forEach(it => {
      const b = catalog.find(x => x.id === it.benId);
      if (b?.categoria) s.add(b.categoria);
    }));
    return Array.from(s).sort((a, b) => norm(a).localeCompare(norm(b), "pt-BR"));
  }, [contratosEntregues, catalog]);

  const fornecedoresFiltro = useMemo(() => {
    const s = new Set();
    contratosEntregues.forEach(c => { if (c.fornecedor) s.add(c.fornecedor); });
    return Array.from(s).sort((a, b) => norm(a).localeCompare(norm(b), "pt-BR"));
  }, [contratosEntregues]);

  const lista = useMemo(() => {
    const t = norm(termo.trim());
    let res = contratosEntregues.filter(c => {
      if (fornFiltro && c.fornecedor !== fornFiltro) return false;
      if (catFiltro) {
        const temCat = c.restantes.some(it => {
          const b = catalog.find(x => x.id === it.benId);
          return b?.categoria === catFiltro;
        });
        if (!temCat) return false;
      }
      if (t) {
        const emItens = c.restantes.some(it => {
          const b = catalog.find(x => x.id === it.benId);
          return b && norm(b.objeto).includes(t);
        });
        if (!norm(c.numero).includes(t) && !norm(c.fornecedor || "").includes(t) && !emItens) return false;
      }
      return true;
    });
    const saldo = (c) => c.restantes.reduce((acc, it) => acc + it.restante, 0);
    const ordFn = {
      numero: (a, b) => (parseInt(String(b.numero).replace(/\D/g, ""), 10) || 0) - (parseInt(String(a.numero).replace(/\D/g, ""), 10) || 0) || norm(b.numero).localeCompare(norm(a.numero)),
      fornecedor: (a, b) => norm(a.fornecedor || "").localeCompare(norm(b.fornecedor || ""), "pt-BR") || (parseInt(String(a.numero).replace(/\D/g, ""), 10) || 0) - (parseInt(String(b.numero).replace(/\D/g, ""), 10) || 0),
      saldo: (a, b) => saldo(b) - saldo(a),
      inicio: (a, b) => String(b.inicio || "").localeCompare(String(a.inicio || ""))
    }[ord];
    if (ordFn) res = res.slice().sort(ordFn);
    return res;
  }, [contratosEntregues, termo, catFiltro, fornFiltro, ord, catalog]);

  const totalSelecionado = useMemo(() => {
    let t = 0;
    Object.values(selecao).forEach(map => Object.values(map).forEach(q => t += nQtd(q)));
    return t;
  }, [selecao]);

  const base = parseInt(placaInicial, 10);
  const placaFinal = totalSelecionado > 0 && isFinite(base) ? base + totalSelecionado - 1 : base;

  function toggle(id) { setAbertos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function setQtd(contratoId, benId, qtd) {
    setSelecao(s => ({ ...s, [contratoId]: { ...(s[contratoId] || {}), [benId]: qtd } }));
  }
  function setCheck(contratoId, it, on) {
    setSelecao(s => {
      const map = { ...(s[contratoId] || {}) };
      if (on) map[it.benId] = String(it.restante); else delete map[it.benId];
      return { ...s, [contratoId]: map };
    });
  }

  async function confirmar() {
    const lista = [];
    const grupos = Object.entries(selecao).map(([contratoId, map]) => {
      const c = contratosEntregues.find(x => x.id === contratoId);
      const itens = [];
      Object.entries(map).forEach(([benId, qtdStr]) => {
        const it = c?.itens.find(x => x.benId === benId);
        const nome = catalog.find(b => b.id === benId)?.objeto || "item";
        if (String(qtdStr ?? "").trim() === "") return;
        const q = inteiroDe(qtdStr);
        if (Number.isNaN(q) || q <= 0) { lista.push(`"${nome}": informe uma quantidade inteira maior que zero.`); return; }
        if (!it || q > it.restante) { lista.push(`"${nome}": quantidade acima do saldo do contrato (máximo ${it ? it.restante : 0}).`); return; }
        itens.push({ benId, qtd: q });
      });
      return { contratoId, itens, pagamentoId: nfSel[contratoId] || "" };
    }).filter(g => g.itens.length);
    if (!grupos.length && !lista.length) lista.push("Selecione ao menos um item para registrar a entrada.");

    const total = grupos.reduce((t, g) => t + g.itens.reduce((s, i) => s + i.qtd, 0), 0);
    const placasExistentes = new Set((bens || []).map(b => String(b.placa)));
    const placasAtribuir = [];
    if (!lista.length) {
      if (modoPlaca === "auto") {
        const baseNum = inteiroDe(placaInicial);
        if (Number.isNaN(baseNum) || baseNum <= 0) lista.push("Placa inicial: informe um número inteiro positivo.");
        else {
          let prox = baseNum;
          for (let i = 0; i < total; i++) {
            let placa = String(prox++);
            while (placasExistentes.has(placa)) placa = String(prox++);
            placasExistentes.add(placa);
            placasAtribuir.push(placa);
          }
        }
      } else {
        const brutas = placasManuais.split(/[\s,;]+/).map(s => s.replace(/\D/g, "")).filter(Boolean);
        if (brutas.length !== total) lista.push(`Foram informadas ${brutas.length} placa(s), mas você selecionou ${total} bem(ns). Ajuste a lista para coincidir.`);
        else {
          const vistos = new Set();
          for (const p of brutas) {
            if (vistos.has(p)) { lista.push(`Placa duplicada na lista: ${p}.`); break; }
            if (placasExistentes.has(p)) { lista.push(`A placa ${p} já existe no estoque.`); break; }
            vistos.add(p); placasAtribuir.push(p);
          }
        }
      }
    }
    if (lista.length) { setErros(lista); return; }
    setErros([]);

    const prim = placasAtribuir[0], ult = placasAtribuir[placasAtribuir.length - 1];
    if (!confirm(`Registrar ${total} bem(ns) patrimonial(is) no estoque (placas ${prim}${modoPlaca === "auto" ? ` a ${ult}` : ""})?`)) return;

    // Cada contrato é gravado de forma atômica no servidor (bens + movimentações ou nada)
    let registrados = 0;
    const falhas = [];
    let pos = 0;
    for (const g of grupos) {
      const qtdGrupo = g.itens.reduce((s, i) => s + i.qtd, 0);
      const placasGrupo = placasAtribuir.slice(pos, pos + qtdGrupo);
      pos += qtdGrupo;
      try {
        const resp = await base44.functions.invoke("movimentarEstoque", {
          acao: "entrada", contratoId: g.contratoId, itens: g.itens, placas: placasGrupo,
          pagamentoId: g.pagamentoId, dataEntrada: isoData(hoje())
        });
        if (resp?.data?.error) falhas.push(resp.data.error);
        else registrados += resp?.data?.criados || qtdGrupo;
      } catch (e) {
        falhas.push(e?.response?.data?.error || e?.message || String(e));
      }
    }
    await refresh();
    if (falhas.length) {
      setErros([...falhas, registrados ? `${registrados} bem(ns) já foram registrados com sucesso.` : "Nenhum bem foi registrado."]);
      return;
    }
    onClose();
    alert(`${registrados} bem(ns) patrimoniado(s) com sucesso.`);
  }

  return (
    <Modal sobre="Estoque" titulo="Registrar entrada de bens" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={confirmar} disabled={totalSelecionado === 0}>Registrar {totalSelecionado > 0 ? `${totalSelecionado} bem(ns)` : "entrada"}</Btn></>}>
      <ErrosForm itens={erros} />
      <div className="mb-4 p-3.5 border border-slate-300 bg-stone-50 rounded-sm">
        <div className="flex gap-1.5 mb-3">
          <button onClick={() => setModoPlaca("auto")} aria-pressed={modoPlaca === "auto"}
            className={`inline-flex items-center gap-1.5 border rounded-sm px-3 py-1.5 font-sans font-semibold text-[12.5px] cursor-pointer transition-colors
              ${modoPlaca === "auto" ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-slate-500"}`}>
            <Boxes className="w-3.5 h-3.5" />Automática
          </button>
          <button onClick={() => setModoPlaca("manual")} aria-pressed={modoPlaca === "manual"}
            className={`inline-flex items-center gap-1.5 border rounded-sm px-3 py-1.5 font-sans font-semibold text-[12.5px] cursor-pointer transition-colors
              ${modoPlaca === "manual" ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-slate-500"}`}>
            <Check className="w-3.5 h-3.5" />Manual
          </button>
        </div>
        {modoPlaca === "auto" ? (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            <Campo label="Placa inicial" ajuda="A faixa de placas é gerada automaticamente a partir deste número.">
              <input type="number" min="1" className={inputCls} value={placaInicial} onChange={e => setPlacaInicial(e.target.value)} />
            </Campo>
            <div className="self-end">
              {totalSelecionado > 0 ? (
                <p className="font-sans text-[13px] text-slate-700">
                  Serão geradas <b>{totalSelecionado}</b> placas: <span className="font-mono">{isFinite(placaFinal) ? `${base} a ${placaFinal}` : base}</span>
                </p>
              ) : (
                <p className="font-sans text-[12.5px] text-slate-500">Selecione os itens entregues para gerar as placas.</p>
              )}
            </div>
          </div>
        ) : (
          <Campo label="Placas manuais" ajuda={`Digite as ${totalSelecionado > 0 ? totalSelecionado : ""} placas separadas por vírgula, espaço ou linha (apenas números). A quantidade deve ser igual à de bens selecionados.`}>
            <textarea className={`${inputCls} min-h-[90px] font-mono`} value={placasManuais} onChange={e => setPlacasManuais(e.target.value)}
              placeholder={totalSelecionado > 0 ? `Ex.: ${Array.from({ length: Math.min(totalSelecionado, 3) }, (_, i) => 1001 + i).join(", ")}...` : "Selecione os itens primeiro"} />
          </Campo>
        )}
      </div>

      <div className="flex gap-2 items-center flex-wrap mb-4">
        <Btn onClick={() => setImportarCSV(true)}><Upload className="w-4 h-4 inline mr-1" />Importar CSV</Btn>
        <span className="font-sans text-[12px] text-slate-500">Importa bens com placas já definidas (uma linha por unidade).</span>
      </div>

      {contratosEntregues.length === 0 ? (
        <Vazio titulo="Nenhuma entrega pendente" texto="Não há contratos com status 'Entregue' com itens aguardando patrimônio. Marque a entrega no módulo Contratos para liberar a entrada." />
      ) : (
        <>
          <div className="flex gap-2 items-end flex-wrap mb-4 p-3 bg-white border border-slate-300 rounded-sm">
            <div className="flex-1 min-w-[200px]">
              <Campo label="Busca">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input type="search" value={termo} onChange={e => setTermo(e.target.value)} className={`${inputCls} pl-8`} placeholder="Número do contrato, fornecedor ou item" />
                </div>
              </Campo>
            </div>
            <div className="min-w-[150px]"><Campo label="Categoria">
              <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} className={inputCls}>
                <option value="">Todas</option>
                {categoriasFiltro.map(c => <option key={c}>{c}</option>)}
              </select>
            </Campo></div>
            <div className="min-w-[170px]"><Campo label="Fornecedor">
              <select value={fornFiltro} onChange={e => setFornFiltro(e.target.value)} className={inputCls}>
                <option value="">Todos</option>
                {fornecedoresFiltro.map(f => <option key={f}>{f}</option>)}
              </select>
            </Campo></div>
            <div className="min-w-[150px]"><Campo label="Ordenar por">
              <select value={ord} onChange={e => setOrd(e.target.value)} className={inputCls}>
                <option value="numero">Número (maior → menor)</option>
                <option value="fornecedor">Fornecedor (A → Z)</option>
                <option value="saldo">Maior saldo pendente</option>
                <option value="inicio">Início da vigência</option>
              </select>
            </Campo></div>
            <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{lista.length} {lista.length === 1 ? "contrato" : "contratos"}</span>
          </div>

          {lista.length === 0 ? (
            <Vazio titulo="Nenhum contrato corresponde aos filtros" texto="Ajuste a busca ou limpe os filtros." />
          ) : (
            <div className="space-y-2.5">
              {lista.map(c => {
                const aberto = abertos.has(c.id);
                const nfs = (pagamentos || []).filter(p => p.contratoId === c.id && p.situacao !== "Cancelado");
                return (
                  <div key={c.id} className="border border-slate-300 rounded-sm overflow-hidden">
                    <button onClick={() => toggle(c.id)} className="w-full px-3.5 py-3 flex gap-3 items-center flex-wrap text-left hover:bg-stone-50 transition-colors">
                      <Boxes className="w-4 h-4 text-slate-500 flex-none" />
                      <span className="font-mono text-[14px] font-semibold text-slate-800">{c.tipo} nº {c.numero}</span>
                      <span className="font-sans text-[12.5px] text-slate-600">{c.fornecedor || "—"}</span>
                      <span className="font-mono text-[11px] text-slate-500 ml-auto">{c.restantes.length} item(ns) com saldo</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
                    </button>
                    {aberto && (
                      <div className="px-3.5 pb-3.5 border-t border-slate-100">
                        <Campo label="Nota fiscal de origem" className="max-w-[360px] mb-3 mt-3" ajuda="Vincula a entrada à NF do contrato. Os bens herdam número e data da nota.">
                          <select className={inputCls} value={nfSel[c.id] || ""} onChange={e => setNfSel(s => ({ ...s, [c.id]: e.target.value }))}>
                            <option value="">Sem nota fiscal vinculada</option>
                            {nfs.map(p => <option key={p.id} value={p.id}>{p.nf} — emissão {p.dataNF || "—"}</option>)}
                          </select>
                        </Campo>
                        <div className="overflow-x-auto border border-slate-200 rounded-sm">
                          <table className="w-full border-collapse text-[13px] min-w-[560px]">
                            <thead><tr className="bg-stone-50">
                              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2 w-8"></th>
                              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Item</th>
                              <th className="text-right font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Contratado</th>
                              <th className="text-right font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Patrimoniado</th>
                              <th className="text-right font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Restante</th>
                              <th className="text-right font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Entrar</th>
                            </tr></thead>
                            <tbody>
                              {c.restantes.map(it => {
                                const b = catalog.find(x => x.id === it.benId) || {};
                                const sel = selecao[c.id]?.[it.benId];
                                const on = sel != null;
                                return (
                                  <tr key={it.benId} className="border-t border-slate-100 hover:bg-stone-50">
                                    <td className="px-2.5 py-2 text-center">
                                      <button onClick={() => setCheck(c.id, it, !on)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${on ? "bg-amber-700 border-amber-700 text-white" : "bg-white border-slate-400"}`}>
                                        {on && <Check className="w-3 h-3" />}
                                      </button>
                                    </td>
                                    <td className="px-2.5 py-2"><span className="font-sans font-semibold text-[12.5px] text-slate-800">{b.objeto || "—"}</span><br /><span className="font-mono text-[11px] text-slate-500">CATMAT {b.catmat}</span></td>
                                    <td className="px-2.5 py-2 text-right font-mono">{fmtNum(it.qtd)}</td>
                                    <td className="px-2.5 py-2 text-right font-mono">{fmtNum(it.patrimoniado)}</td>
                                    <td className="px-2.5 py-2 text-right font-mono text-slate-600">{fmtNum(it.restante)}</td>
                                    <td className="px-2.5 py-2 text-right">
                                      <input type="number" min="0" max={it.restante} className={`${inputCls} w-20 text-right`} value={sel ?? ""} placeholder="0"
                                        onChange={e => { setQtd(c.id, it.benId, e.target.value); if (e.target.value && !on) setCheck(c.id, it, true); }} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
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

      {importarCSV && <ImportarBensCSV data={data} refresh={refresh} onClose={() => setImportarCSV(false)} />}
    </Modal>
  );
}

function agruparItensContrato(c, bens) {
  const porBen = new Map();
  (c.itens || []).forEach(it => {
    if (!it.benId) return;
    porBen.set(it.benId, (porBen.get(it.benId) || 0) + nQtd(it.qtd));
  });
  return Array.from(porBen.entries()).map(([benId, qtd]) => {
    const patrimoniado = (bens || []).filter(b => b.contratoId === c.id && b.benId === benId).length;
    return { benId, qtd, patrimoniado, restante: Math.max(0, qtd - patrimoniado) };
  });
}

function fmtNum(n) { return (Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 }); }