import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ORDEM, UNIDADES_ORCAMENTARIAS, SITUACOES_OBJETO, URGENCIAS } from "@/lib/dmp-data";
import { fmtM, fmtQ, fmtData, nQtd, nVal, norm, cmpTexto, anoAtual, baixarCSV, contratoAtivo } from "@/lib/dmp-utils";
import { agruparBensPorSubcategoria } from "@/lib/subcat-utils";
import { Btn, MiniBtn, Campo, Vazio, Pill, Barra, Modal, inputCls, textareaCls } from "./ui";
import { TelaCab } from "./Catalogo";
import ImportarCSV from "./ImportarCSV";
import Cadeia from "./Cadeia";
import { Plus, Pencil, Trash2, FileText, Printer, Sparkles } from "lucide-react";

export default function PlanoAnual({ data, refresh }) {
  const { pca, catalog, contratos, dfds } = data;
  const [exercicio, setExercicio] = useState(anoAtual);
  const [modo, setModo] = useState("plan"); // plan, exec, dfd
  const [editId, setEditId] = useState(null);
  const [novo, setNovo] = useState(false);
  const [dfdEditId, setDfdEditId] = useState(null);
  const [dfdNovo, setDfdNovo] = useState(false);
  const [dfdVisualizar, setDfdVisualizar] = useState(null);
  const [cadeiaBenId, setCadeiaBenId] = useState(null);
  const [sobrestarId, setSobrestarId] = useState(null);
  const [termo, setTermo] = useState("");
  const [ord, setOrd] = useState("alfa");

  const anos = useMemo(() => {
    const s = new Set(pca.map(p => +p.exercicio));
    [anoAtual, anoAtual + 1, anoAtual + 2].forEach(a => s.add(a));
    s.add(+exercicio);
    return Array.from(s).filter(Boolean).sort((a, b) => a - b);
  }, [pca, exercicio]);

  function bem(id) { return catalog.find(b => b.id === id) || { objeto: "(item removido)", catmat: "—", unidade: "—", pdm: "—" }; }

  function sobrestamentoDoItem(p) {
    const sob = nQtd(p.qtdSobrestada);
    if (!sob || sob <= 0) return { tipo: "nenhum", qtd: 0, classe: "neutro", txt: "" };
    if (sob >= nQtd(p.qtd)) return { tipo: "total", qtd: sob, classe: "critico", txt: "Sobrestado (total)" };
    return { tipo: "parcial", qtd: sob, classe: "aviso", txt: `Sobrestado (${sob}/${nQtd(p.qtd)})` };
  }
  function qtdEfetiva(p) { return Math.max(0, nQtd(p.qtd) - nQtd(p.qtdSobrestada)); }

  function execucaoDoItem(p) {
    let qtd = 0, valor = 0; const lanc = [];
    contratos.filter(contratoAtivo).forEach(c => (c.itens || []).forEach(i => {
      if (i.pcaId !== p.id) return;
      qtd += nQtd(i.qtd); valor += nQtd(i.qtd) * nVal(i.valor);
      lanc.push(c.tipo + " " + c.numero);
    }));
    return { qtd, valor, lanc: Array.from(new Set(lanc)) };
  }

  function itensSemVinculo() {
    const fora = [];
    contratos.forEach(c => (c.itens || []).forEach(i => {
      const p = i.pcaId ? pca.find(x => x.id === i.pcaId) : null;
      if (!p) fora.push({ c, i });
    }));
    return fora;
  }

  const itensExercicio = pca.filter(p => +p.exercicio === +exercicio);
  const filtrados = useMemo(() => {
    const t = norm(termo.trim());
    let res = itensExercicio.filter(p => {
      if (t && norm([p.codigo, bem(p.benId).objeto, bem(p.benId).catmat, bem(p.benId).pdm, p.justificativa].join(" ")).indexOf(t) < 0) return false;
      return true;
    });
    const ordFn = {
      alfa: (a, b) => cmpTexto(bem(a.benId).objeto, bem(b.benId).objeto),
      codigo: (a, b) => cmpTexto(a.codigo, b.codigo),
      qtd: (a, b) => nQtd(b.qtd) - nQtd(a.qtd),
      valor: (a, b) => (nQtd(b.qtd) * nVal(b.valor)) - (nQtd(a.qtd) * nVal(a.valor))
    }[ord];
    if (ordFn) res = res.slice().sort(ordFn);
    return res;
  }, [itensExercicio, termo, ord, catalog]);

  const temJust = filtrados.some(p => p.justificativa && p.justificativa.trim());

  async function excluirItem(p) {
    const cts = contratos.filter(c => (c.itens || []).some(i => i.pcaId === p.id)).map(c => `${c.tipo} ${c.numero}`);
    const dfdsV = dfds.filter(d => (d.itensIds || []).includes(p.id)).map(d => `DFD ${d.processo || "(sem processo)"}`);
    if (cts.length || dfdsV.length) return alert(`Este item não pode ser excluído porque está vinculado a:\n\n${[...cts, ...dfdsV].join("\n")}\n\nRemova o vínculo nesses lançamentos/DFDs antes, ou use "Sobrestar" para retirá-lo do plano.`);
    if (!confirm("Excluir este item do Plano Anual?")) return;
    await base44.entities.PCAItem.delete(p.id);
    await refresh();
    alert("Item excluído do plano.");
  }

  function csvPlano() {
    if (!itensExercicio.length) return alert("Não há itens no exercício selecionado.");
    const l = [["Código PCA", "Exercício", "Objeto", "PDM", "CATMAT", "Categoria", "Unidade", "Quantidade", "Qtd. sobrestada", "Qtd. efetiva", "Status", "Valor unitário", "Valor total", "Aplicação", "Justificativa", "Motivo do sobrestamento", "Data do sobrestamento"]];
    itensExercicio.forEach(p => {
      const b = bem(p.benId);
      const sob = sobrestamentoDoItem(p);
      const qE = qtdEfetiva(p);
      const status = sob.tipo === "nenhum" ? "Ativo" : sob.tipo === "total" ? "Sobrestado (total)" : "Sobrestado (parcial)";
      l.push([p.codigo || "", p.exercicio, b.objeto, b.pdm, b.catmat, b.categoria, b.unidade, fmtQ(p.qtd), fmtQ(nQtd(p.qtdSobrestada)), fmtQ(qE), status, fmtM(p.valor), fmtM(qE * nVal(p.valor)), b.aplicacao, p.justificativa || "", p.motivoSobrestamento || "", fmtData(p.dataSobrestamento)]);
    });
    baixarCSV(`pca-${exercicio}.csv`, l);
  }

  function csvExecucao() {
    if (!itensExercicio.length) return alert("Não há itens no exercício selecionado.");
    const l = [["Código PCA", "Objeto", "CATMAT", "Unidade", "Qtd. autorizada", "Qtd. sobrestada", "Qtd. efetiva", "Valor planejado", "Qtd. contratada", "Valor contratado", "% executado", "Qtd. a contratar", "Status", "Lançamentos"]];
    itensExercicio.forEach(p => {
      const b = bem(p.benId), e = execucaoDoItem(p);
      const sob = sobrestamentoDoItem(p);
      const qE = qtdEfetiva(p);
      const status = sob.tipo === "nenhum" ? (e.qtd === 0 ? "Não iniciado" : (qE - e.qtd > 0 ? "Parcial" : "Concluído")) : (sob.tipo === "total" ? "Sobrestado (total)" : "Sobrestado (parcial)");
      l.push([p.codigo || "", b.objeto, b.catmat, b.unidade, fmtQ(p.qtd), fmtQ(nQtd(p.qtdSobrestada)), fmtQ(qE), fmtM(qE * nVal(p.valor)), fmtQ(e.qtd), fmtM(e.valor), qE ? fmtQ(Math.round(e.qtd / qE * 100)) : "0", fmtQ(Math.max(0, qE - e.qtd)), status, e.lanc.join(" | ")]);
    });
    baixarCSV(`execucao-pca-${exercicio}.csv`, l);
  }

  return (
    <div>
      <TelaCab titulo="Plano Anual de Contratações" desc="Monte o pedido do exercício item a item, com código do PCA, quantidade e justificativa da necessidade."
        direita={<>
          <div className="min-w-[120px]"><Campo label="Exercício"><select className={inputCls} value={exercicio} onChange={e => setExercicio(+e.target.value)}>{anos.map(a => <option key={a} value={a}>{a}</option>)}</select></Campo></div>
          <ModoBtn ativo={modo === "plan"} onClick={() => setModo("plan")}>Planejamento</ModoBtn>
          <ModoBtn ativo={modo === "exec"} onClick={() => setModo("exec")}>Execução</ModoBtn>
          <ModoBtn ativo={modo === "dfd"} onClick={() => setModo("dfd")}>DFDs</ModoBtn>
          {modo === "plan" && <Btn variant="forte" onClick={() => setNovo(true)}><Plus className="w-4 h-4 inline mr-1" />Incluir item</Btn>}
          {modo === "dfd" && <Btn variant="forte" onClick={() => setDfdNovo(true)}><Plus className="w-4 h-4 inline mr-1" />Emitir novo DFD</Btn>}
          {modo !== "dfd" && <Btn onClick={() => modo === "exec" ? csvExecucao() : csvPlano()}>Baixar CSV</Btn>}
          {modo === "plan" && <ImportarCSV entityName="PCAItem" refresh={refresh} data={data}
            existentes={pca} chave={r => r.benId + "|" + (+r.exercicio)}
            colunas={[
              { header: "Código PCA", campo: "codigo" },
              { header: "CATMAT", campo: "_catmat", obrigatorio: true },
              { header: "Exercício", campo: "exercicio", tipo: "number", obrigatorio: true },
              { header: "Quantidade", campo: "qtd", tipo: "number", obrigatorio: true, aliases: ["Qtd. autorizada"] },
              { header: "Valor unitário", campo: "valor", tipo: "number" },
              { header: "Justificativa", campo: "justificativa" }
            ]}
            preProcess={(rec, data) => {
              const b = (data.catalog || []).find(x => String(x.catmat) === String(rec._catmat));
              if (!b) return null;
              return { benId: b.id, codigo: rec.codigo, exercicio: rec.exercicio, qtd: rec.qtd, valor: rec.valor, justificativa: rec.justificativa };
            }}
            ajuda="O CATMAT é usado para vincular ao item do catálogo. Linhas com CATMAT inexistente no catálogo serão ignoradas." />}
          {modo !== "dfd" && <Btn onClick={() => window.print()}>Imprimir</Btn>}
        </>} />

      {modo === "dfd" ? (
        <DFDList dfds={dfds} pca={pca} catalog={catalog} refresh={refresh}
          onEdit={(id) => setDfdEditId(id)} onVisualizar={(id) => setDfdVisualizar(id)} />
      ) : modo === "exec" ? (
        <ExecucaoView itens={itensExercicio} bem={bem} execucaoDoItem={execucaoDoItem} itensSemVinculo={itensSemVinculo} exercicio={exercicio} />
      ) : (
        <>
          {itensExercicio.length === 0 ? (
            <Vazio titulo={`Nenhum item no plano de ${exercicio}`} texto="Use 'Incluir item' ou abra um bem no catálogo e escolha 'Incluir no Plano Anual'." />
          ) : (
            <>
              <div className="flex gap-2.5 items-end flex-wrap mb-5 p-3.5 bg-white border border-slate-300 rounded-sm">
                <div className="flex-1 min-w-[200px]"><Campo label="Busca"><input type="search" value={termo} onChange={e => setTermo(e.target.value)} className={inputCls} placeholder="Buscar por item, código do PCA, CATMAT ou justificativa" /></Campo></div>
                <div className="min-w-[132px]"><Campo label="Ordenar por">
                  <select value={ord} onChange={e => setOrd(e.target.value)} className={inputCls}>
                    <option value="alfa">Nome do item (A → Z)</option><option value="codigo">Código do PCA</option>
                    <option value="qtd">Maior quantidade</option><option value="valor">Maior valor total</option>
                  </select>
                </Campo></div>
                <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{filtrados.length} {filtrados.length === 1 ? "item" : "itens"}</span>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-sm bg-white">
                <table className="w-full border-collapse text-[13.5px] min-w-[680px]">
                  <thead><tr className="bg-stone-50">
                    <Th>Código PCA</Th><Th>Item</Th><Th>Unid.</Th><Th className="text-right">Qtd.</Th><Th className="text-right">Vlr. unit.</Th><Th className="text-right">Total</Th><Th>Status</Th>{temJust && <Th>Justificativa</Th>}<Th></Th>
                  </tr></thead>
                  <tbody>
                    {ORDEM.concat(["Sem categoria"]).map(cat => {
                      const doGrupo = filtrados.filter(p => (bem(p.benId).categoria || "Sem categoria") === cat);
                      if (!doGrupo.length) return null;
                      let total = 0;
                      return (
                        <React.Fragment key={cat}>
                          <tr><td colSpan={9} className="bg-stone-50 px-3 py-2 font-sans text-[10px] tracking-widest uppercase text-slate-500 font-semibold">{cat}</td></tr>
                          {doGrupo.map(p => {
                            const b = bem(p.benId);
                            const t = nQtd(p.qtd) * nVal(p.valor); total += t;
                            const sob = sobrestamentoDoItem(p);
                            const qtdEft = qtdEfetiva(p);
                            return (
                              <tr key={p.id} className={`border-b border-slate-100 hover:bg-stone-50 ${sob.tipo !== "nenhum" ? "bg-amber-50/40" : ""}`}>
                                <td className="px-3 py-2.5 font-mono text-xs">{p.codigo || "—"}</td>
                                <td className="px-3 py-2.5"><span className="font-sans font-semibold text-[12.8px] text-slate-800">{b.objeto}</span><br /><span className="font-mono text-xs text-slate-600">CATMAT {b.catmat}</span></td>
                                <td className="px-3 py-2.5 font-mono text-xs">{b.unidade}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(p.qtd)}{sob.tipo !== "nenhum" && <><br /><span className="font-mono text-[11px] text-amber-700">efetiva: {fmtQ(qtdEft)}</span></>}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(p.valor)}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(t)}</td>
                                <td className="px-3 py-2.5">{sob.tipo === "nenhum" ? <Pill tipo="ok">Ativo</Pill> : <Pill tipo={sob.classe}>{sob.txt}</Pill>}</td>
                                {temJust && <td className="px-3 py-2.5 text-sm text-slate-500 max-w-[34ch]">{p.justificativa || "—"}</td>}
                                <td className="px-3 py-2.5 whitespace-nowrap"><MiniBtn onClick={() => setCadeiaBenId(p.benId)}>Cadeia</MiniBtn> <MiniBtn onClick={() => setSobrestarId(p.id)}>Sobrestar</MiniBtn> <MiniBtn onClick={() => setEditId(p.id)}>Editar</MiniBtn> <MiniBtn variant="risco" onClick={() => excluirItem(p)}>Excluir</MiniBtn></td>
                              </tr>
                            );
                          })}
                          <tr className="border-t border-slate-300 bg-stone-50">
                            <td className="px-3 py-2.5 font-sans font-semibold text-[12.5px]" colSpan={5}>Subtotal {cat}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtM(total)}</td>
                            <td colSpan={temJust ? 3 : 2}></td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {(novo || editId) && <FormPCA r={editId ? pca.find(x => x.id === editId) : null} data={data} exercicio={exercicio} refresh={refresh} onClose={() => { setNovo(false); setEditId(null); }} />}
      {sobrestarId && <FormSobrestamento p={pca.find(x => x.id === sobrestarId)} refresh={refresh} onClose={() => setSobrestarId(null)} />}
      {(dfdNovo || dfdEditId) && <FormDFD f={dfdEditId ? dfds.find(x => x.id === dfdEditId) : null} data={data} refresh={refresh} onClose={() => { setDfdNovo(false); setDfdEditId(null); }} />}
      {dfdVisualizar && <VisualizarDFD f={dfds.find(x => x.id === dfdVisualizar)} data={data} onClose={() => setDfdVisualizar(null)} />}
      {cadeiaBenId && <Cadeia benId={cadeiaBenId} data={data} onClose={() => setCadeiaBenId(null)} />}
    </div>
  );
}

function ModoBtn({ ativo, onClick, children }) {
  return <button onClick={onClick} aria-pressed={ativo} className={`border rounded-sm px-3 py-1.5 cursor-pointer font-sans font-semibold text-[13px] transition-colors ${ativo ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-slate-500"}`}>{children}</button>;
}

function Th({ children, className = "" }) {
  return <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap ${className}`}>{children}</th>;
}

function FormPCA({ r, data, exercicio, refresh, onClose }) {
  const { catalog, pca } = data;
  const [form, setForm] = useState({
    benId: r?.benId || catalog[0]?.id || "", exercicio: r?.exercicio || exercicio,
    codigo: r?.codigo || "", qtd: r?.qtd || "", valor: r?.valor ? fmtM(r.valor) : "", justificativa: r?.justificativa || ""
  });
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  const b = catalog.find(x => x.id === form.benId);

  async function salvar() {
    if (!nQtd(form.qtd)) return alert("Informe uma quantidade maior que zero.");
    if (r && nQtd(r.qtdSobrestada) > nQtd(form.qtd)) return alert(`A quantidade autorizada (${fmtQ(nQtd(form.qtd))}) não pode ser menor que a quantidade sobrestada (${fmtQ(nQtd(r.qtdSobrestada))}). Remova ou ajuste o sobrestamento primeiro.`);
    const dados = { benId: form.benId, exercicio: +form.exercicio || anoAtual, codigo: form.codigo.trim(), qtd: nQtd(form.qtd), valor: nVal(form.valor), justificativa: form.justificativa.trim() };
    const repetido = pca.find(p => p.id !== r?.id && p.benId === dados.benId && +p.exercicio === dados.exercicio);
    if (repetido && !confirm(`Este bem já está no plano de ${dados.exercicio}${repetido.codigo ? ` (código ${repetido.codigo})` : ""}. Incluir mesmo assim como item separado?`)) return;
    if (r) {
      await base44.entities.PCAItem.update(r.id, { ...dados, qtdSobrestada: nQtd(r.qtdSobrestada), motivoSobrestamento: r.motivoSobrestamento || "", dataSobrestamento: r.dataSobrestamento || "" });
    } else {
      await base44.entities.PCAItem.create(dados);
    }
    await refresh();
    onClose();
    alert(r ? "Item atualizado." : "Item incluído no plano de " + dados.exercicio + ".");
  }

  function opcoesBens() {
    return ORDEM.map(c => {
      const daCat = catalog.filter(b => b.categoria === c);
      const grupos = agruparBensPorSubcategoria(daCat);
      return <optgroup key={c} label={c}>{grupos.map(g => (
        <optgroup key={c + "/" + g.subcategoria} label={g.subcategoria}>
          {g.items.map(b => <option key={b.id} value={b.id} selected={b.id === form.benId}>{b.objeto}</option>)}
        </optgroup>
      ))}</optgroup>;
    });
  }

  return (
    <Modal sobre="Plano Anual de Contratações" titulo={r ? "Editar item do plano" : "Incluir item no plano"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar item</Btn></>}>
      <div className="grid gap-3 md:grid-cols-2 mb-3">
        <Campo label="Item do catálogo"><select className={inputCls} value={form.benId} onChange={e => setF("benId", e.target.value)}>{opcoesBens()}</select></Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Exercício"><input type="number" min="2020" max="2099" className={inputCls} value={form.exercicio} onChange={e => setF("exercicio", e.target.value)} /></Campo>
        <Campo label="Código do PCA"><input className={inputCls} value={form.codigo} onChange={e => setF("codigo", e.target.value)} placeholder="ex.: 2027.0031" /></Campo>
        <Campo label="Quantidade"><input type="number" min="1" className={inputCls} value={form.qtd} onChange={e => setF("qtd", e.target.value)} /></Campo>
        <Campo label="Valor unitário estimado (R$)"><input inputMode="decimal" className={inputCls} value={form.valor} onChange={e => setF("valor", e.target.value)} onBlur={e => setF("valor", e.target.value.trim() ? fmtM(nVal(e.target.value)) : "")} placeholder="ex.: 1.500,00" /></Campo>
      </div>
      <Campo label="Justificativa da necessidade"><textarea className={textareaCls} value={form.justificativa} onChange={e => setF("justificativa", e.target.value)} placeholder="ex.: manutenção do sistema de videomonitoramento das sedes das promotorias de justiça do interior." /></Campo>
      {b && <p className="font-sans text-sm text-slate-600 mt-3"><b>Aplicação:</b> {b.aplicacao}</p>}
    </Modal>
  );
}

function FormSobrestamento({ p, refresh, onClose }) {
  const [qtdSobrestada, setQtdSobrestada] = useState(nQtd(p.qtdSobrestada) || 0);
  const [motivo, setMotivo] = useState(p.motivoSobrestamento || "");
  const [dataSobrestamento, setDataSobrestamento] = useState(p.dataSobrestamento || new Date().toISOString().slice(0, 10));
  const qtdTotal = nQtd(p.qtd);
  const qtdEft = Math.max(0, qtdTotal - nQtd(qtdSobrestada));
  const tipoSob = nQtd(qtdSobrestada) <= 0 ? "nenhum" : (nQtd(qtdSobrestada) >= qtdTotal ? "total" : "parcial");

  async function salvar() {
    const sob = nQtd(qtdSobrestada);
    if (sob < 0) return alert("Quantidade sobrestada inválida.");
    if (sob > qtdTotal) return alert(`Quantidade sobrestada não pode ser maior que a autorizada (${fmtQ(qtdTotal)}).`);
    if (sob > 0 && !motivo.trim()) return alert("Informe o motivo do sobrestamento.");
    await base44.entities.PCAItem.update(p.id, {
      qtdSobrestada: sob,
      motivoSobrestamento: motivo.trim(),
      dataSobrestamento: sob > 0 ? dataSobrestamento : ""
    });
    await refresh();
    onClose();
    alert(sob > 0 ? "Sobrestamento registrado." : "Sobrestamento removido — item reativado.");
  }

  async function remover() {
    if (!confirm("Remover o sobrestamento e reativar o item?")) return;
    await base44.entities.PCAItem.update(p.id, { qtdSobrestada: 0, motivoSobrestamento: "", dataSobrestamento: "" });
    await refresh();
    onClose();
    alert("Item reativado.");
  }

  return (
    <Modal sobre="Sobrestamento de item" titulo="Sobrestar item do Plano Anual" onClose={onClose}
      footer={<>
        {nQtd(p.qtdSobrestada) > 0 && <Btn variant="risco" onClick={remover}>Remover sobrestamento</Btn>}
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="forte" onClick={salvar}>Salvar</Btn>
      </>}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Quantidade autorizada"><input readOnly className={inputCls + " bg-slate-50"} value={fmtQ(qtdTotal)} /></Campo>
        <Campo label="Quantidade a sobrestar" ajuda="Quantidade que não será contratada neste exercício.">
          <input type="number" min="0" max={qtdTotal} className={inputCls} value={qtdSobrestada}
            onChange={e => setQtdSobrestada(nQtd(e.target.value))} />
        </Campo>
        <Campo label="Quantidade efetiva" ajuda="Quantidade que segue para contratação.">
          <input readOnly className={inputCls + " bg-slate-50"} value={fmtQ(qtdEft)} />
        </Campo>
        <Campo label="Data da decisão"><input type="date" className={inputCls} value={dataSobrestamento} onChange={e => setDataSobrestamento(e.target.value)} /></Campo>
      </div>
      <div className="mb-3">
        {tipoSob === "nenhum" ? <Pill tipo="ok">Item ativo — nenhuma quantidade sobrestada</Pill>
          : tipoSob === "total" ? <Pill tipo="critico">Sobrestamento total — item não será contratado</Pill>
          : <Pill tipo="aviso">Sobrestamento parcial — {fmtQ(qtdEft)} un. seguem para contratação</Pill>}
      </div>
      <Campo label="Motivo do sobrestamento" ajuda="Registre a decisão (ex.: deliberação de reunião, readequação orçamentária).">
        <textarea className={textareaCls} value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="ex.: Em reunião de 15/09/2026 foi decidido reduzir a aquisição para 5 unidades, mantendo as demais para o exercício seguinte." />
      </Campo>
    </Modal>
  );
}

function ExecucaoView({ itens, bem, execucaoDoItem, itensSemVinculo, exercicio }) {
  const [termo, setTermo] = useState("");
  const [status, setStatus] = useState("");
  const statusNomes = { nao: "Não iniciado", parcial: "Parcial", concluido: "Concluído", acima: "Acima do plano", sobrestado: "Sobrestado" };
  function qtdEft(p) { return Math.max(0, nQtd(p.qtd) - nQtd(p.qtdSobrestada)); }
  function statusDoItem(p) {
    if (nQtd(p.qtdSobrestada) >= nQtd(p.qtd) && nQtd(p.qtd) > 0) return "sobrestado";
    const e = execucaoDoItem(p);
    const falta = qtdEft(p) - e.qtd;
    if (e.qtd === 0) return "nao";
    if (falta > 0) return "parcial";
    if (falta === 0) return "concluido";
    return "acima";
  }
  const filtrados = itens.filter(p => {
    const b = bem(p.benId);
    const t = norm(termo.trim());
    if (t && norm([p.codigo, b.objeto, b.catmat, b.pdm].join(" ")).indexOf(t) < 0) return false;
    if (status && statusDoItem(p) !== status) return false;
    return true;
  });
  let plQ = 0, plV = 0, exQ = 0, exV = 0;
  return (
    <>
      {itens.length === 0 && itensSemVinculo.length === 0 ? (
        <Vazio titulo={`Nada a comparar no exercício de ${exercicio}`} texto="Inclua itens no plano e vincule os itens dos contratos ao código do PCA." />
      ) : (
        <>
          <div className="flex gap-2.5 items-end flex-wrap mb-5 p-3.5 bg-white border border-slate-300 rounded-sm">
            <div className="flex-1 min-w-[200px]"><Campo label="Busca"><input type="search" value={termo} onChange={e => setTermo(e.target.value)} className={inputCls} placeholder="Buscar por item, código do PCA ou CATMAT" /></Campo></div>
            <div className="min-w-[160px]"><Campo label="Status"><select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}><option value="">Todos</option>{Object.entries(statusNomes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo></div>
            <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{filtrados.length} {filtrados.length === 1 ? "item" : "itens"}</span>
          </div>
          {filtrados.length === 0 ? (
            <Vazio titulo="Nenhum item corresponde aos filtros" texto="Ajuste a busca ou o status." />
          ) : (
          <div className="overflow-x-auto border border-slate-300 rounded-sm bg-white">
            <table className="w-full border-collapse text-[13.5px] min-w-[680px]">
              <thead><tr className="bg-stone-50">
                <Th>Código PCA</Th><Th>Item</Th><Th className="text-right">Planejado</Th><Th className="text-right">Contratado</Th><Th className="text-right">Execução</Th><Th className="text-right">A contratar</Th><Th>Lançamentos</Th><Th></Th>
              </tr></thead>
              <tbody>
                {filtrados.map(p => {
                  const b = bem(p.benId);
                  const e = execucaoDoItem(p);
                  const qE = qtdEft(p);
                  const sob = nQtd(p.qtdSobrestada);
                  const planV = qE * nVal(p.valor);
                  plQ += qE; plV += planV; exQ += e.qtd; exV += e.valor;
                  const pct = qE ? e.qtd / qE * 100 : 0;
                  const falta = qE - e.qtd;
                  const sit = sob >= nQtd(p.qtd) && nQtd(p.qtd) > 0 ? { c: "critico", t: "Sobrestado (total)" }
                    : sob > 0 ? { c: "aviso", t: `Sobrestado (${sob}/${nQtd(p.qtd)})` }
                    : e.qtd === 0 ? { c: "neutro", t: "Não iniciado" }
                    : (falta > 0 ? { c: "aviso", t: "Parcial" }
                    : (falta === 0 ? { c: "neutro", t: "Concluído" } : { c: "critico", t: "Acima do plano" }));
                  return (
                    <tr key={p.id} className={`border-b border-slate-100 hover:bg-stone-50 ${sob > 0 ? "bg-amber-50/40" : ""}`}>
                      <td className="px-3 py-2.5 font-mono text-xs">{p.codigo || "—"}</td>
                      <td className="px-3 py-2.5"><span className="font-sans font-semibold text-[12.8px] text-slate-800">{b.objeto}</span><br /><span className="font-mono text-xs text-slate-600">CATMAT {b.catmat}</span></td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(qE)}{sob > 0 && <><br /><span className="font-mono text-[11px] text-amber-700">de {fmtQ(p.qtd)}</span></>}<br /><span className="font-mono text-xs text-slate-600">R$ {fmtM(planV)}</span></td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(e.qtd)}<br /><span className="font-mono text-xs text-slate-600">R$ {fmtM(e.valor)}</span></td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(Math.round(pct))}%<Barra pct={pct} classe={sit.c === "ok" ? "" : (sit.c === "critico" ? "critico" : "aviso")} /></td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(Math.max(0, falta))}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-500 max-w-[34ch]">{e.lanc.length ? e.lanc.join("; ") : "—"}</td>
                      <td className="px-3 py-2.5"><Pill tipo={sit.c}>{sit.t}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="border-t border-slate-300 bg-stone-50">
                <td className="px-3 py-2.5 font-sans font-semibold text-[12.5px]" colSpan={2}>Exercício {exercicio} — {filtrados.length} {filtrados.length === 1 ? "item" : "itens"} do plano</td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtQ(plQ)}<br /><span className="font-mono text-xs">R$ {fmtM(plV)}</span></td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtQ(exQ)}<br /><span className="font-mono text-xs">R$ {fmtM(exV)}</span></td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{plQ ? fmtQ(Math.round(exQ / plQ * 100)) : "0"}%</td>
                <td colSpan={3}></td>
              </tr></tfoot>
            </table>
          </div>
          )}
          {itensSemVinculo.length > 0 && (
            <div className="mt-5">
              <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mb-2">Contratações sem vínculo com o plano</p>
              <div className="overflow-x-auto border border-slate-300 rounded-sm bg-white">
                <table className="w-full border-collapse text-[13.5px] min-w-[480px]">
                  <thead><tr className="bg-stone-50"><Th>Lançamento</Th><Th>Objeto</Th><Th className="text-right">Qtd.</Th><Th className="text-right">Valor</Th></tr></thead>
                  <tbody>
                    {itensSemVinculo.map((x, i) => {
                      const b = bem(x.i.benId);
                      return (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-3 py-2.5 font-mono text-xs">{x.c.tipo} {x.c.numero}</td>
                          <td className="px-3 py-2.5 font-sans font-semibold text-[12.8px] text-slate-800">{b.objeto}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(x.i.qtd)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(nQtd(x.i.qtd) * nVal(x.i.valor))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="font-sans text-[12px] text-slate-500 mt-2">Abra o contrato, edite o item e escolha o código do PCA para que ele passe a contar na execução.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function DFDList({ dfds, pca, catalog, refresh, onEdit, onVisualizar }) {
  const [abertos, setAbertos] = useState(new Set());
  function bem(id) { return catalog.find(b => b.id === id) || { objeto: "(removido)", catmat: "—" }; }
  function totalDFD(itensIds) {
    let qtd = 0, valor = 0;
    itensIds.forEach(id => { const p = pca.find(x => x.id === id); if (!p) return; qtd += nQtd(p.qtd); valor += nQtd(p.qtd) * nVal(p.valor); });
    return { qtd, valor };
  }
  function uoPor(sigla) { return UNIDADES_ORCAMENTARIAS.find(u => u.sigla === sigla) || UNIDADES_ORCAMENTARIAS[0]; }
  function toggle(id) { setAbertos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function excluir(f) {
    if (!confirm("Excluir este DFD?")) return;
    await base44.entities.DFD.delete(f.id);
    await refresh();
  }

  if (!dfds.length) return <Vazio titulo="Nenhum DFD emitido" texto="Use 'Emitir novo DFD' para formalizar uma demanda a partir dos itens do Plano Anual." />;

  return (
    <div className="space-y-3.5">
      {dfds.slice().sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")).map(f => {
        const t = totalDFD(f.itensIds || []);
        const aberto = abertos.has(f.id);
        return (
          <div key={f.id} className="bg-white border border-slate-300 rounded-sm overflow-hidden">
            <button onClick={() => toggle(f.id)} className="w-full px-4 py-3.5 flex gap-3.5 items-center flex-wrap text-left hover:bg-stone-50 transition-colors">
              <span className="font-mono text-[15px] font-semibold text-slate-800">{f.processo || "(sem número de processo)"}</span>
              <span className="font-sans text-[13px] font-semibold text-slate-600">{f.unidadeRequisitante || "—"}</span>
              <span className="font-mono text-[11px] text-slate-500">{(f.itensIds || []).length} itens · R$ {fmtM(t.valor)} · exercício {f.exercicio}</span>
              <span className="ml-auto"><Pill tipo="neutro">{uoPor(f.uoSigla).sigla}</Pill></span>
            </button>
            {aberto && (
              <div className="px-4 pb-4 border-t border-slate-100">
                <p className="font-sans text-[13.5px] text-slate-600 mt-3 mb-3">
                  Unidade requisitante: {f.unidadeRequisitante || "—"} · Responsável: {f.responsavelNome || "—"} · Emitido em {fmtQ(f.created_date?.slice(0, 10) || "")}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Btn variant="forte" onClick={() => onVisualizar(f.id)}><Printer className="w-4 h-4 inline mr-1" />Pré-visualizar e imprimir</Btn>
                  <Btn onClick={() => onEdit(f.id)}><Pencil className="w-4 h-4 inline mr-1" />Editar</Btn>
                  <Btn variant="risco" onClick={() => excluir(f)}><Trash2 className="w-4 h-4 inline mr-1" />Excluir</Btn>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FormDFD({ f, data, refresh, onClose }) {
  const { pca, catalog } = data;
  const [exercicioSel, setExercicioSel] = useState(f?.exercicio || anoAtual);
  const [selecionados, setSelecionados] = useState(f?.itensIds || []);
  const [form, setForm] = useState({
    processo: f?.processo || "", unidadeRequisitante: f?.unidadeRequisitante || "Divisão de Material Permanente (DMP) / Coordenadoria de Apoio Administrativo",
    responsavelNome: f?.responsavelNome || "", responsavelCargo: f?.responsavelCargo || "", responsavelEmail: f?.responsavelEmail || "",
    uoSigla: f?.uoSigla || "PGJ", urgencia: f?.urgencia || "Médio", situacaoObjeto: f?.situacaoObjeto || SITUACOES_OBJETO[0],
    necessidadeCorrelata: f?.necessidadeCorrelata || "nao", unidadeBeneficiaria: f?.unidadeBeneficiaria || "Todas as sedes do MP-PI",
    inicio: f?.inicio || "", fim: f?.fim || "",
    equipeNome: f?.equipeNome || "Airton Alves Mendes de Moura", equipeEmail: f?.equipeEmail || "airton.mendes@mppi.mp.br",
    equipeSetor: f?.equipeSetor || "Coordenadoria de Apoio Administrativo — Divisão de Material Permanente", equipeRamal: f?.equipeRamal || "8041",
    fiscalNome: f?.fiscalNome || "Airton Alves Mendes de Moura", fiscalEmail: f?.fiscalEmail || "airton.mendes@mppi.mp.br", fiscalRamal: f?.fiscalRamal || "8041",
    objetivosEstrategicos: f?.objetivosEstrategicos || "", alinhamentoPDTIC: f?.alinhamentoPDTIC || "Não se aplica", alinhamentoPCA: f?.alinhamentoPCA || "",
    necessidade: f?.necessidade || "", justificativa: f?.justificativa || "",
    resultadoObjetivo: f?.resultadoObjetivo || "", resultadoMeta: f?.resultadoMeta || "", resultadoIndicador: f?.resultadoIndicador || "",
    respPreenchimentoNome: f?.respPreenchimentoNome || "Airton Alves Mendes de Moura", respPreenchimentoCargo: f?.respPreenchimentoCargo || "Chefe de Divisão"
  });
  const [iaStatus, setIaStatus] = useState("");
  const [iaLoading, setIaLoading] = useState(false);

  function setF(k, v) { setForm(x => ({ ...x, [k]: v })); }
  function bem(id) { return catalog.find(b => b.id === id) || { objeto: "(removido)", catmat: "—" }; }

  const itensPCA = pca.filter(p => +p.exercicio === +exercicioSel);
  const anos = Array.from(new Set(pca.map(p => +p.exercicio))).sort();
  const totalSel = selecionados.reduce((t, id) => { const p = pca.find(x => x.id === id); return t + (p ? nQtd(p.qtd) * nVal(p.valor) : 0); }, 0);

  function toggleItem(id) { setSelecionados(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); }

  async function preencherIA() {
    if (!selecionados.length) { setIaStatus("Selecione ao menos um item da demanda antes de preencher com IA."); return; }
    const camposComTexto = ["necessidade", "justificativa", "objetivosEstrategicos", "resultadoObjetivo", "resultadoMeta", "resultadoIndicador"].some(k => form[k]?.trim());
    if (camposComTexto && !confirm("Já há texto nesses campos. A sugestão da IA vai substituir o conteúdo atual. Continuar?")) return;
    setIaLoading(true); setIaStatus("");
    const itensInfo = selecionados.map(id => {
      const p = pca.find(x => x.id === id);
      const b = p ? bem(p.benId) : null;
      return b ? { objeto: b.objeto, categoria: b.categoria, aplicacao: b.aplicacao, qtd: p.qtd } : null;
    }).filter(Boolean);
    const listaItens = itensInfo.map(i => `- ${i.objeto} (quantidade ${i.qtd}) — categoria ${i.categoria}${i.aplicacao ? `; aplicação típica: ${i.aplicacao}` : ""}`).join("\n");
    const prompt = `Você é servidor da Divisão de Material Permanente do Ministério Público do Estado do Piauí, preenchendo um Documento de Formalização da Demanda (DFD) para abertura de processo de contratação pública, conforme a Lei nº 14.133/2021.\n\nDados da demanda:\n- Unidade requisitante: ${form.unidadeRequisitante || "não informada"}\n- Situação do objeto: ${form.situacaoObjeto}\n- Grau de urgência: ${form.urgencia}\n- Itens da contratação:\n${listaItens}\n\nRedija, em português formal de documento administrativo público brasileiro, textos específicos aos itens listados acima — evite frases genéricas. Responda SOMENTE com um objeto JSON válido, sem markdown, com exatamente estas chaves:\n{"necessidade":"uma frase objetiva, até 30 palavras","justificativa":"2 a 3 parágrafos curtos, até 160 palavras","objetivosEstrategicos":"até 3 linhas curtas separadas por quebra de linha","resultadoObjetivo":"uma frase, até 25 palavras","resultadoMeta":"uma frase curta, até 15 palavras","resultadoIndicador":"uma frase curta, até 20 palavras"}`;
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt, response_json_schema: {
          type: "object", properties: {
            necessidade: { type: "string" }, justificativa: { type: "string" }, objetivosEstrategicos: { type: "string" },
            resultadoObjetivo: { type: "string" }, resultadoMeta: { type: "string" }, resultadoIndicador: { type: "string" }
          }
        }
      });
      setForm(x => ({
        ...x,
        necessidade: resp.necessidade || x.necessidade, justificativa: resp.justificativa || x.justificativa,
        objetivosEstrategicos: resp.objetivosEstrategicos || x.objetivosEstrategicos,
        resultadoObjetivo: resp.resultadoObjetivo || x.resultadoObjetivo,
        resultadoMeta: resp.resultadoMeta || x.resultadoMeta,
        resultadoIndicador: resp.resultadoIndicador || x.resultadoIndicador
      }));
      setIaStatus("Textos gerados. Revise com atenção antes de emitir o DFD — é um rascunho, não a versão final.");
    } catch (e) {
      setIaStatus("Não foi possível gerar com IA agora. Preencha os campos manualmente.");
    } finally {
      setIaLoading(false);
    }
  }

  async function salvar() {
    if (!form.processo.trim()) return alert("Informe o número do processo SEI.");
    if (!selecionados.length) return alert("Selecione ao menos um item do Plano Anual.");
    const dados = { ...form, processo: form.processo.trim(), exercicio: +exercicioSel, itensIds: selecionados };
    if (f) await base44.entities.DFD.update(f.id, dados);
    else await base44.entities.DFD.create(dados);
    await refresh();
    onClose();
    alert(f ? "DFD atualizado." : "DFD emitido. Use 'Pré-visualizar e imprimir' para gerar o documento.");
  }

  return (
    <Modal sobre="Formalização da demanda" titulo={f ? "Editar DFD" : "Emitir novo DFD"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar</Btn></>}>
      <Bloco titulo="Identificação do processo">
        <div className="grid gap-3 md:grid-cols-2 mb-3">
          <Campo label="Processo SEI"><input className={inputCls} value={form.processo} onChange={e => setF("processo", e.target.value)} placeholder="19.21.0000.0000000/2026-00" /></Campo>
          <Campo label="Unidade requisitante"><input className={inputCls} value={form.unidadeRequisitante} onChange={e => setF("unidadeRequisitante", e.target.value)} /></Campo>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
          <Campo label="Responsável pela demanda"><input className={inputCls} value={form.responsavelNome} onChange={e => setF("responsavelNome", e.target.value)} /></Campo>
          <Campo label="Cargo / função"><input className={inputCls} value={form.responsavelCargo} onChange={e => setF("responsavelCargo", e.target.value)} /></Campo>
          <Campo label="E-mail"><input className={inputCls} value={form.responsavelEmail} onChange={e => setF("responsavelEmail", e.target.value)} /></Campo>
        </div>
      </Bloco>

      <Bloco titulo="Informações gerais da contratação">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
          <Campo label="Unidade orçamentária"><select className={inputCls} value={form.uoSigla} onChange={e => setF("uoSigla", e.target.value)}>{UNIDADES_ORCAMENTARIAS.map(u => <option key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</option>)}</select></Campo>
          <Campo label="Grau de urgência"><select className={inputCls} value={form.urgencia} onChange={e => setF("urgencia", e.target.value)}>{URGENCIAS.map(u => <option key={u}>{u}</option>)}</select></Campo>
          <Campo label="Situação do objeto"><select className={inputCls} value={form.situacaoObjeto} onChange={e => setF("situacaoObjeto", e.target.value)}>{SITUACOES_OBJETO.map(s => <option key={s}>{s}</option>)}</select></Campo>
          <Campo label="Contratação correlata?"><select className={inputCls} value={form.necessidadeCorrelata} onChange={e => setF("necessidadeCorrelata", e.target.value)}><option value="nao">Não</option><option value="sim">Sim, já realizado</option></select></Campo>
          <Campo label="Unidade beneficiária"><input className={inputCls} value={form.unidadeBeneficiaria} onChange={e => setF("unidadeBeneficiaria", e.target.value)} /></Campo>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
          <Campo label="Previsão de início"><input type="date" className={inputCls} value={form.inicio} onChange={e => setF("inicio", e.target.value)} /></Campo>
          <Campo label="Previsão de término"><input type="date" className={inputCls} value={form.fim} onChange={e => setF("fim", e.target.value)} /></Campo>
        </div>
      </Bloco>

      <Bloco titulo="Equipe de planejamento">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
          <Campo label="Nome"><input className={inputCls} value={form.equipeNome} onChange={e => setF("equipeNome", e.target.value)} /></Campo>
          <Campo label="E-mail"><input className={inputCls} value={form.equipeEmail} onChange={e => setF("equipeEmail", e.target.value)} /></Campo>
          <Campo label="Setor"><input className={inputCls} value={form.equipeSetor} onChange={e => setF("equipeSetor", e.target.value)} /></Campo>
          <Campo label="Ramal"><input className={inputCls} value={form.equipeRamal} onChange={e => setF("equipeRamal", e.target.value)} /></Campo>
        </div>
      </Bloco>

      <Bloco titulo="Fiscalização do objeto">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
          <Campo label="Nome"><input className={inputCls} value={form.fiscalNome} onChange={e => setF("fiscalNome", e.target.value)} /></Campo>
          <Campo label="E-mail"><input className={inputCls} value={form.fiscalEmail} onChange={e => setF("fiscalEmail", e.target.value)} /></Campo>
          <Campo label="Ramal"><input className={inputCls} value={form.fiscalRamal} onChange={e => setF("fiscalRamal", e.target.value)} /></Campo>
        </div>
      </Bloco>

      <Bloco titulo="Itens da demanda">
        <div className="mb-3"><Campo label="Exercício do PCA"><select className={inputCls} value={exercicioSel} onChange={e => setExercicioSel(+e.target.value)}>{anos.map(a => <option key={a} value={a}>{a}</option>)}</select></Campo></div>
        {itensPCA.length === 0 ? (
          <p className="font-sans text-sm text-slate-500">Não há itens no Plano Anual de {exercicioSel}.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-300 rounded-sm">
            <table className="w-full border-collapse text-[13.5px]">
              <thead><tr className="bg-stone-50"><Th></Th><Th>Código PCA</Th><Th>Item</Th><Th className="text-right">Qtd.</Th><Th className="text-right">Vlr. unit.</Th><Th className="text-right">Vlr. total</Th></tr></thead>
              <tbody>
                {itensPCA.map(p => {
                  const b = bem(p.benId);
                  return (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="px-3 py-2.5"><input type="checkbox" checked={selecionados.includes(p.id)} onChange={() => toggleItem(p.id)} /></td>
                      <td className="px-3 py-2.5 font-mono text-xs">{p.codigo || "—"}</td>
                      <td className="px-3 py-2.5"><span className="font-sans font-semibold text-[12.8px] text-slate-800">{b.objeto}</span><br /><span className="font-mono text-xs text-slate-600">CATMAT {b.catmat}</span></td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtQ(p.qtd)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(p.valor)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(nQtd(p.qtd) * nVal(p.valor))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="font-sans text-sm text-slate-500 mt-2">{selecionados.length} item(ns) selecionado(s) — total estimado R$ {fmtM(totalSel)}</p>
      </Bloco>

      <Bloco titulo="Preenchimento assistido por IA">
        <p className="font-sans text-[12px] text-slate-500 mb-2.5">Com base nos itens marcados acima, a IA sugere textos para necessidade, motivação/justificativa, alinhamento estratégico e resultados esperados. É um rascunho — revise sempre antes de emitir o DFD.</p>
        <Btn variant="forte" onClick={preencherIA} disabled={iaLoading}><Sparkles className="w-4 h-4 inline mr-1" />{iaLoading ? "Gerando com IA…" : "Preencher com IA"}</Btn>
        {iaStatus && <p className="font-sans text-sm text-slate-600 mt-2">{iaStatus}</p>}
      </Bloco>

      <Bloco titulo="Alinhamento aos planos estratégicos">
        <div className="mb-3"><Campo label="Objetivos estratégicos, conforme redação do PCA vigente"><textarea className={textareaCls} value={form.objetivosEstrategicos} onChange={e => setF("objetivosEstrategicos", e.target.value)} /></Campo></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Campo label="Alinhamento ao PDTIC"><input className={inputCls} value={form.alinhamentoPDTIC} onChange={e => setF("alinhamentoPDTIC", e.target.value)} /></Campo>
          <Campo label="Alinhamento ao PCA vigente"><input className={inputCls} value={form.alinhamentoPCA} onChange={e => setF("alinhamentoPCA", e.target.value)} /></Campo>
        </div>
      </Bloco>

      <Bloco titulo="Fundamentação da contratação">
        <div className="mb-3"><Campo label="Necessidade"><textarea className={textareaCls} style={{ minHeight: 70 }} value={form.necessidade} onChange={e => setF("necessidade", e.target.value)} /></Campo></div>
        <Campo label="Motivação / justificativa"><textarea className={textareaCls} style={{ minHeight: 140 }} value={form.justificativa} onChange={e => setF("justificativa", e.target.value)} /></Campo>
      </Bloco>

      <Bloco titulo="Resultados a serem alcançados">
        <div className="mb-3"><Campo label="Objetivo da contratação"><textarea className={textareaCls} value={form.resultadoObjetivo} onChange={e => setF("resultadoObjetivo", e.target.value)} /></Campo></div>
        <div className="mb-3"><Campo label="Meta a ser alcançada"><textarea className={textareaCls} value={form.resultadoMeta} onChange={e => setF("resultadoMeta", e.target.value)} /></Campo></div>
        <Campo label="Indicador (resultado alcançado)"><textarea className={textareaCls} value={form.resultadoIndicador} onChange={e => setF("resultadoIndicador", e.target.value)} /></Campo>
      </Bloco>

      <Bloco titulo="Responsável pelo preenchimento do DFD">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
          <Campo label="Nome"><input className={inputCls} value={form.respPreenchimentoNome} onChange={e => setF("respPreenchimentoNome", e.target.value)} /></Campo>
          <Campo label="Cargo / função"><input className={inputCls} value={form.respPreenchimentoCargo} onChange={e => setF("respPreenchimentoCargo", e.target.value)} /></Campo>
        </div>
      </Bloco>
    </Modal>
  );
}

function Bloco({ titulo, children }) {
  return (
    <div className="mb-5">
      <h4 className="font-sans text-[10.5px] font-bold tracking-widest uppercase text-slate-500 mb-2">{titulo}</h4>
      {children}
    </div>
  );
}

function VisualizarDFD({ f, data, onClose }) {
  const { pca, catalog } = data;
  function bem(id) { return catalog.find(b => b.id === id) || { objeto: "(removido)", catmat: "—", pdm: "—", unidade: "—" }; }
  function uoPor(sigla) { return UNIDADES_ORCAMENTARIAS.find(u => u.sigla === sigla) || UNIDADES_ORCAMENTARIAS[0]; }
  const itens = (f.itensIds || []).map(id => pca.find(p => p.id === id)).filter(Boolean);
  const total = itens.reduce((t, p) => t + nQtd(p.qtd) * nVal(p.valor), 0);

  function imprimir() {
    const conteudo = document.querySelector(".dfd-doc")?.outerHTML || "";
    if (!conteudo) return;
    const w = window.open("", "_blank");
    if (!w) return alert("O navegador bloqueou a nova aba. Permita pop-ups para imprimir.");
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>DFD — ${f.processo}</title>
      <style>
        body { font-family: Georgia, serif; color: #1B2430; max-width: 900px; margin: 0 auto; padding: 14mm; }
        h2 { font-family: Arial, sans-serif; font-size: 16px; text-align: center; }
        table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        th, td { border: 1px solid #C7CCC3; padding: 6px 8px; vertical-align: top; text-align: left; }
        th { background: #F7F9F5; font-family: Arial, sans-serif; font-weight: bold; font-size: 10.5px; text-transform: uppercase; }
        .secao { margin-bottom: 18px; page-break-inside: avoid; }
        .secao > div:first-child { font-family: Arial, sans-serif; font-weight: bold; font-size: 12.5px; background: #EDEFEA; border: 1px solid #C7CCC3; padding: 6px 9px; }
        p { margin: 0 0 4px; font-size: 12.5px; }
        .whitespace-pre-wrap { white-space: pre-wrap; }
      </style></head><body>${conteudo}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  }

  return (
    <Modal sobre="Pré-visualização" titulo={`DFD — Processo ${f.processo}`} onClose={onClose}
      footer={<><Btn onClick={onClose}>Fechar</Btn><Btn variant="forte" onClick={imprimir}><Printer className="w-4 h-4 inline mr-1" />Imprimir / salvar como PDF</Btn></>}>
      <div className="border border-slate-300 rounded p-4 bg-white dfd-doc">
        <h2 className="font-sans text-base text-center mb-1">DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA — DFD</h2>
        <p className="font-mono text-xs text-center text-slate-500 mb-5">PROCESSO SEI Nº {f.processo}</p>

        <Secao num="1" titulo="IDENTIFICAÇÃO DA UNIDADE REQUISITANTE">
          <table className="w-full border-collapse text-[12.5px]">
            <tbody>
              <tr><Th2>Unidade requisitante</Th2><Th2>Responsável pela demanda</Th2><Th2>E-mail</Th2></tr>
              <tr><Td>{f.unidadeRequisitante}</Td><Td>{f.responsavelNome}{f.responsavelCargo ? <><br /><span className="text-slate-500">{f.responsavelCargo}</span></> : ""}</Td><Td>{f.responsavelEmail}</Td></tr>
            </tbody>
          </table>
        </Secao>

        <Secao num="2" titulo="INFORMAÇÕES GERAIS DA CONTRATAÇÃO">
          <table className="w-full border-collapse text-[12.5px]">
            <tbody>
              <tr><Th2>Unidade orçamentária</Th2><Th2>Situação do objeto</Th2></tr>
              <tr><Td>{UNIDADES_ORCAMENTARIAS.map(u => <div key={u.sigla}>{(f.uoSigla === u.sigla ? "(X) " : "( ) ")}{u.sigla} — {u.nome}</div>)}</Td><Td>{SITUACOES_OBJETO.map(s => <div key={s}>{(f.situacaoObjeto === s ? "(X) " : "( ) ")}{s}</div>)}</Td></tr>
              <tr><Th2>Contratação correlata</Th2><Th2>Grau de urgência</Th2></tr>
              <tr><Td>{f.necessidadeCorrelata === "sim" ? "(X) Sim, já realizado ( ) Não" : "( ) Sim, já realizado (X) Não"}</Td><Td>{URGENCIAS.map(u => (f.urgencia === u ? "(X) " : "( ) ") + u).join(" ")}</Td></tr>
              <tr><Th2>Previsão de início</Th2><Th2>Previsão de término</Th2></tr>
              <tr><Td>{fmtData(f.inicio)}</Td><Td>{fmtData(f.fim)}</Td></tr>
            </tbody>
          </table>
        </Secao>

        <Secao num="3" titulo="EQUIPE DE PLANEJAMENTO DA CONTRATAÇÃO">
          <table className="w-full border-collapse text-[12.5px]">
            <tbody><tr><Th2>Nome</Th2><Th2>E-mail</Th2><Th2>Setor</Th2><Th2>Ramal</Th2></tr>
            <tr><Td>{f.equipeNome}</Td><Td>{f.equipeEmail}</Td><Td>{f.equipeSetor}</Td><Td>{f.equipeRamal}</Td></tr></tbody>
          </table>
        </Secao>

        <Secao num="4" titulo="FISCALIZAÇÃO DO OBJETO DA CONTRATAÇÃO">
          <table className="w-full border-collapse text-[12.5px]">
            <tbody><tr><Th2>Nome</Th2><Th2>E-mail</Th2><Th2>Ramal</Th2></tr>
            <tr><Td>{f.fiscalNome}</Td><Td>{f.fiscalEmail}</Td><Td>{f.fiscalRamal}</Td></tr></tbody>
          </table>
        </Secao>

        <Secao num="5" titulo="IDENTIFICAÇÃO DA DEMANDA">
          <table className="w-full border-collapse text-[12px]">
            <thead><tr><Th2>Item</Th2><Th2>Cód. PCA</Th2><Th2>Descrição</Th2><Th2>CATMAT</Th2><Th2>Unid.</Th2><Th2 className="text-right">Qtd.</Th2><Th2 className="text-right">V. unit.</Th2><Th2 className="text-right">V. total</Th2></tr></thead>
            <tbody>
              {itens.map((p, i) => {
                const b = bem(p.benId);
                return <tr key={i}><Td>{i + 1}</Td><Td>{p.codigo || "—"}</Td><Td>{b.objeto}</Td><Td>{b.catmat}</Td><Td>{b.unidade}</Td><Td className="text-right">{fmtQ(p.qtd)}</Td><Td className="text-right">R$ {fmtM(p.valor)}</Td><Td className="text-right">R$ {fmtM(nQtd(p.qtd) * nVal(p.valor))}</Td></tr>;
              })}
            </tbody>
            <tfoot><tr><td className="border border-slate-300 px-2 py-1.5 text-right font-sans font-bold" colSpan={7}>TOTAL</td><td className="border border-slate-300 px-2 py-1.5 text-right font-sans font-bold">R$ {fmtM(total)}</td></tr></tfoot>
          </table>
        </Secao>

        <Secao num="6" titulo="IDENTIFICAÇÃO DA UNIDADE BENEFICIÁRIA"><p>{f.unidadeBeneficiaria}</p></Secao>
        <Secao num="7" titulo="ALINHAMENTO AOS PLANOS ESTRATÉGICOS">
          <Rotulo>Objetivos estratégicos</Rotulo><p className="whitespace-pre-wrap">{f.objetivosEstrategicos || "—"}</p>
          <Rotulo>Alinhamento ao PDTIC</Rotulo><p>{f.alinhamentoPDTIC || "Não se aplica"}</p>
          <Rotulo>Alinhamento ao PCA vigente</Rotulo><p>{f.alinhamentoPCA || "—"}</p>
        </Secao>
        <Secao num="8" titulo="FUNDAMENTAÇÃO DA CONTRATAÇÃO">
          <Rotulo>Necessidade</Rotulo><p className="whitespace-pre-wrap">{f.necessidade || "—"}</p>
          <Rotulo>Motivação / justificativa</Rotulo><p className="whitespace-pre-wrap">{f.justificativa || "—"}</p>
        </Secao>
        <Secao num="9" titulo="RESULTADO(S) A SER(EM) ALCANÇADO(S)">
          <table className="w-full border-collapse text-[12.5px]">
            <tbody>
              <tr><Th2>1</Th2><Td>Objetivo da contratação</Td><Td>{f.resultadoObjetivo || "—"}</Td></tr>
              <tr><Th2>2</Th2><Td>Meta a ser alcançada</Td><Td>{f.resultadoMeta || "—"}</Td></tr>
              <tr><Th2>3</Th2><Td>Indicador (resultado alcançado)</Td><Td>{f.resultadoIndicador || "—"}</Td></tr>
            </tbody>
          </table>
        </Secao>
        <Secao num="10" titulo="RESPONSÁVEL PELO PREENCHIMENTO DO DFD">
          <p>Nos termos do art. 17, VIII, do Decreto Estadual nº 21.872/2023, e art. 11, § 1º do Ato PGJ nº 1381/2024, que regulamenta o PCA, as demandas constantes neste DFD já foram aprovadas previamente no PCA vigente, ficando autorizada a abertura dos respectivos processos de licitação ou contratação direta pelas Unidades Requisitantes deste Parquet.</p>
        </Secao>

        <div className="text-center mt-6">
          <div className="border-t border-slate-800 w-[280px] mx-auto mb-1"></div>
          <b>{f.respPreenchimentoNome}</b><br /><span className="text-slate-500">{f.respPreenchimentoCargo}</span>
        </div>
      </div>
    </Modal>
  );
}

function Secao({ num, titulo, children }) {
  return (
    <div className="mb-4">
      <div className="font-sans font-bold text-[12.5px] bg-stone-100 border border-slate-300 px-2 py-1.5">{num}. {titulo}</div>
      <div className="pt-2">{children}</div>
    </div>
  );
}
function Th2({ children, className = "" }) {
  return <th className={`border border-slate-300 px-2 py-1.5 bg-stone-50 font-sans font-bold text-[10.5px] uppercase tracking-wide text-left ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`border border-slate-300 px-2 py-1.5 align-top text-[12.5px] ${className}`}>{children}</td>;
}
function Rotulo({ children }) {
  return <span className="font-sans font-bold text-[10px] uppercase tracking-wide text-slate-500 block mb-1">{children}</span>;
}