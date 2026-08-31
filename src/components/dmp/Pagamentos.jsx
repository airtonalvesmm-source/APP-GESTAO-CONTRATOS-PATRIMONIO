import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { CAT_ARP } from "@/lib/dmp-data";
import { fmtM, fmtData, nVal, norm, diasAte, totaisPagamento, valorEmpenhado, fimVigente, valorItensContrato, aditivoValor,
  ocorrenciasDe, baixarCSV } from "@/lib/dmp-utils";
import { ADITIVOS, FALTAS, SITUACOES_PAGAMENTO } from "@/lib/dmp-data";
import { Btn, MiniBtn, Campo, Vazio, Pill, Barra, Modal, inputCls, textareaCls } from "./ui";
import { TelaCab } from "./Catalogo";
import ImportarCSV from "./ImportarCSV";
import { FormOcorrencia } from "./Contratos";
import { Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { GrupoAnoCategoria, agruparPorAnoCategoria, BotaoAgrupar } from "./Agrupar";

export default function Pagamentos({ data, refresh }) {
  const { contratos, ocorrencias, pagamentos, atas } = data;
  const [nfContratoId, setNfContratoId] = useState(null);
  const [editNfId, setEditNfId] = useState(null);
  const [ocorrContratoId, setOcorrContratoId] = useState(null);
  const [abertos, setAbertos] = useState(new Set());
  const [termo, setTermo] = useState("");
  const [cat, setCat] = useState("");
  const [ano, setAno] = useState("");
  const [ord, setOrd] = useState("retencao");
  const [agrupar, setAgrupar] = useState(false);
  const [situacao, setSituacao] = useState("");

  function catDoContrato(c) { const a = atas.find(x => x.id === c.ataId); return a?.categoria || "Sem categoria"; }
  function anoDoContrato(c) { return c.inicio?.slice(0, 4) || c.fim?.slice(0, 4) || ""; }
  const anos = Array.from(new Set(contratos.map(anoDoContrato).filter(Boolean))).sort().reverse();

  const lista = useMemo(() => {
    const t = norm(termo.trim());
    let res = contratos.filter(c => {
      if (cat && catDoContrato(c) !== cat) return false;
      if (ano && String(anoDoContrato(c)) !== String(ano)) return false;
      const txtPag = pagamentos.filter(p => p.contratoId === c.id).map(p => p.nf + " " + (p.motivo || "")).join(" ");
      if (t && norm([c.tipo, c.numero, c.processo, c.notaEmpenho, c.fornecedor, c.objeto, txtPag].join(" ")).indexOf(t) < 0) return false;
      if (situacao) {
        const tp = totaisPagamento(c, pagamentos, ocorrencias);
        if (situacao === "quitado" && tp.aPagar > 0) return false;
        if (situacao === "apagar" && tp.aPagar === 0) return false;
        if (situacao === "retido" && tp.retido === 0) return false;
      }
      return true;
    });
    const ordFn = {
      retencao: (a, b) => totaisPagamento(b, pagamentos, ocorrencias).retido - totaisPagamento(a, pagamentos, ocorrencias).retido,
      saldo: (a, b) => totaisPagamento(b, pagamentos, ocorrencias).aPagar - totaisPagamento(a, pagamentos, ocorrencias).aPagar,
      numero: (a, b) => norm(b.numero).localeCompare(norm(a.numero)),
      fornecedor: (a, b) => norm(a.fornecedor || "").localeCompare(norm(b.fornecedor || ""))
    }[ord];
    if (ordFn) res = res.slice().sort(ordFn);
    return res;
  }, [contratos, termo, cat, ano, ord, situacao, pagamentos, ocorrencias, atas]);

  function alertasContratos() {
    const out = [];
    contratos.forEach(c => {
      const t = totaisPagamento(c, pagamentos, ocorrencias);
      if (t.retido > 0) out.push({ txt: `<b>${c.tipo} ${c.numero}</b>: R$ ${fmtM(t.retido)} retidos em ${t.ps.filter(p => nVal(p.valorNF) > nVal(p.valorPago)).length} nota(s).` });
      if (ocorrenciasDe(c.id, ocorrencias).some(o => FALTAS.includes(o.tipo)))
        out.push({ txt: `<b>${c.tipo} ${c.numero}</b>: descumprimento registrado — ${ocorrenciasDe(c.id, ocorrencias).filter(o => FALTAS.includes(o.tipo)).map(o => o.tipo).join("; ")}.` });
      const d = diasAte(fimVigente(c, ocorrencias));
      if (d !== null && d < 0 && t.aPagar > 0)
        out.push({ txt: `<b>${c.tipo} ${c.numero}</b>: vigência encerrada em ${fmtData(fimVigente(c, ocorrencias))} com R$ ${fmtM(t.aPagar)} ainda não pagos.` });
    });
    return out;
  }

  function temAditivo(id) { return ocorrenciasDe(id, ocorrencias).some(o => ADITIVOS.includes(o.tipo)); }
  function temFalta(id) { return ocorrenciasDe(id, ocorrencias).some(o => FALTAS.includes(o.tipo)); }

  async function excluirNF(p) {
    if (!confirm("Excluir esta nota fiscal?")) return;
    await base44.entities.Pagamento.delete(p.id);
    await refresh();
  }

  async function excluirOcorrencia(o) {
    if (!confirm("Excluir esta ocorrência?")) return;
    await base44.entities.Ocorrencia.delete(o.id);
    await refresh();
  }

  function toggle(id) { setAbertos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function exportCSV() {
    if (!pagamentos.length) return alert("Não há notas fiscais lançadas.");
    const l = [["Contrato", "Nota de empenho", "Fornecedor", "CNPJ", "Valor empenhado", "Nota fiscal", "Emissão", "Valor da nota", "Valor pago", "Valor retido", "Motivo da retenção", "Data do pagamento", "Situação", "Aditivos", "Descumprimento"]];
    pagamentos.forEach(p => {
      const c = contratos.find(x => x.id === p.contratoId); if (!c) return;
      l.push([`${c.tipo} ${c.numero}`, c.notaEmpenho || "", c.fornecedor || "", c.cnpj || "", fmtM(valorEmpenhado(c, ocorrencias)), p.nf, fmtData(p.dataNF), fmtM(p.valorNF), fmtM(p.valorPago), fmtM(Math.max(0, nVal(p.valorNF) - nVal(p.valorPago))), p.motivo || "", fmtData(p.dataPagamento), p.situacao || "", temAditivo(c.id) ? "Sim" : "Não", temFalta(c.id) ? "Sim" : "Não"]);
    });
    baixarCSV("pagamentos.csv", l);
  }

  const grupos = useMemo(() => agrupar ? agruparPorAnoCategoria(lista, c => anoDoContrato(c), c => catDoContrato(c)) : [], [lista, agrupar]);

  function renderItem(c) {
    const t = totaisPagamento(c, pagamentos, ocorrencias);
    const pct = t.empenhado ? Math.max(0, Math.min(100, t.pago / t.empenhado * 100)) : 0;
    const cl = t.retido > 0 ? "critico" : (pct >= 100 ? "" : "aviso");
    const aberto = abertos.has(c.id);
    const ocs = ocorrenciasDe(c.id, ocorrencias);
    return (
      <div key={c.id} className="bg-white border border-slate-300 rounded-sm overflow-hidden">
        <button onClick={() => toggle(c.id)} className="w-full px-4 py-3.5 flex gap-3.5 items-center flex-wrap text-left hover:bg-stone-50 transition-colors">
          <span className="font-mono text-[15px] font-semibold text-slate-800">{c.tipo} {c.numero}</span>
          <span className="font-sans text-[13px] font-semibold text-slate-600">{c.fornecedor || "—"}</span>
          <span className="font-mono text-[11px] text-slate-500">Empenhado R$ {fmtM(t.empenhado)} · pago R$ {fmtM(t.pago)}</span>
          <Barra pct={pct} classe={cl} />
          <span className="ml-auto flex gap-2 items-center flex-wrap">
            {temAditivo(c.id) && <Pill tipo="neutro">Aditivado</Pill>}
            {temFalta(c.id) && <Pill tipo="critico">Descumprimento</Pill>}
            {t.retido > 0 && <Pill tipo="critico">R$ {fmtM(t.retido)} retido</Pill>}
            <Pill tipo={t.aPagar > 0 ? "aviso" : "neutro"}>{t.aPagar > 0 ? "A pagar R$ " + fmtM(t.aPagar) : "Quitado"}</Pill>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
          </span>
        </button>
        {aberto && (
          <div className="px-4 pb-4 border-t border-slate-100">
            <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Execução financeira</p>
            <p className="font-sans text-[13.5px] text-slate-600 mb-3">
              Processo: {c.processo || "—"} · Nota de empenho: {c.notaEmpenho || "—"} · Itens R$ {fmtM(valorItensContrato(c))}
              {aditivoValor(c.id, ocorrencias) ? ` · aditivos R$ ${fmtM(aditivoValor(c.id, ocorrencias))}` : ""}
              {" · valor empenhado R$ " + fmtM(t.empenhado)} · vigência até {fmtData(fimVigente(c, ocorrencias))}
            </p>
            <p className="font-sans text-[10px] tracking-widest uppercase text-slate-500 mt-4 mb-2">Notas fiscais</p>
            {t.ps.length ? (
              <div className="overflow-x-auto border border-slate-300 rounded-sm">
                <table className="w-full border-collapse text-[13.5px] min-w-[680px]">
                  <thead><tr className="bg-stone-50">
                    <Th>Nota fiscal</Th><Th>Emissão</Th><Th className="text-right">Valor da NF</Th><Th className="text-right">Pago</Th><Th className="text-right">Retido</Th><Th>Motivo da retenção</Th><Th>Pagamento</Th><Th>Situação</Th><Th></Th>
                  </tr></thead>
                  <tbody>
                    {t.ps.map(p => {
                      const ret = Math.max(0, nVal(p.valorNF) - nVal(p.valorPago));
                      return (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-stone-50">
                          <td className="px-3 py-2.5 font-mono text-xs">{p.nf}</td>
                          <td className="px-3 py-2.5 font-mono text-xs">{fmtData(p.dataNF)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(p.valorNF)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-sm">{fmtM(p.valorPago)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-sm">{ret ? <b className="text-red-800">{fmtM(ret)}</b> : "—"}</td>
                          <td className="px-3 py-2.5 text-sm text-slate-600 max-w-[34ch]">{ret ? (p.motivo || "não informado") : "—"}</td>
                          <td className="px-3 py-2.5 font-mono text-xs">{fmtData(p.dataPagamento)}</td>
                          <td className="px-3 py-2.5"><Pill tipo={p.situacao === "Pago" ? "ok" : (p.situacao === "Cancelado" ? "critico" : p.situacao === "Retido" ? "aviso" : "neutro")}>{p.situacao || "Pendente"}</Pill></td>
                          <td className="px-3 py-2.5 whitespace-nowrap"><MiniBtn onClick={() => setEditNfId(p.id)}>Editar</MiniBtn> <MiniBtn variant="risco" onClick={() => excluirNF(p)}>Excluir</MiniBtn></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-t border-slate-300 bg-stone-50">
                    <td className="px-3 py-2.5 font-sans font-semibold text-[12.5px]" colSpan={2}>Total das notas</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtM(t.nf)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtM(t.pago)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-sm">{fmtM(t.retido)}</td>
                  </tr></tfoot>
                </table>
              </div>
            ) : (
              <Vazio titulo="Sem notas fiscais lançadas" texto="Use 'Lançar nota fiscal' para registrar a execução financeira." />
            )}
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
                          <td className="px-3 py-2.5 text-sm text-slate-600 max-w-[34ch]">{o.descricao || "—"}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-sm">{o.tipo === "Aditivo de prazo" ? `+${o.dias} dias` : (nVal(o.valor) ? `R$ ${fmtM(nVal(o.valor))}` : "—")}</td>
                          <td className="px-3 py-2.5"><MiniBtn variant="risco" onClick={() => excluirOcorrencia(o)}>Excluir</MiniBtn></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="flex gap-2 flex-wrap mt-3.5">
              <Btn variant="forte" onClick={() => setNfContratoId(c.id)}>Lançar nota fiscal</Btn>
              <Btn onClick={() => setOcorrContratoId(c.id)}>Registrar aditivo ou ocorrência</Btn>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <TelaCab titulo="Pagamentos" desc="Notas fiscais de cada contrato, com valor pago, valor retido e o motivo da retenção."
        direita={<>
          <Btn onClick={exportCSV}>Baixar CSV</Btn>
          <ImportarCSV entityName="Pagamento" refresh={refresh} data={data}
            colunas={[
              { header: "Contrato", campo: "_contratoNum", obrigatorio: true },
              { header: "Nota fiscal", campo: "nf", obrigatorio: true },
              { header: "Emissão", campo: "dataNF", tipo: "date" },
              { header: "Valor da nota", campo: "valorNF", tipo: "number", obrigatorio: true },
              { header: "Valor pago", campo: "valorPago", tipo: "number" },
              { header: "Data do pagamento", campo: "dataPagamento", tipo: "date" },
              { header: "Motivo da retenção", campo: "motivo" },
              { header: "Situação", campo: "situacao" }
            ]}
            preProcess={(rec, data) => {
              const c = (data.contratos || []).find(x => norm(x.tipo + " " + x.numero) === norm(rec._contratoNum) || norm(x.numero) === norm(rec._contratoNum));
              if (!c) return null;
              return { contratoId: c.id, nf: rec.nf, dataNF: rec.dataNF, valorNF: rec.valorNF, valorPago: rec.valorPago || 0, dataPagamento: rec.dataPagamento, motivo: rec.motivo, situacao: rec.situacao || "Pendente" };
            }}
            ajuda="O campo 'Contrato' deve conter o número do contrato/empenho já cadastrado (ex.: '45/2026'). Linhas sem contrato correspondente serão ignoradas. Datas no formato dd/mm/aaaa." />
          <Btn variant="forte" onClick={() => setNfContratoId(contratos[0]?.id || null)} disabled={contratos.length === 0}><Plus className="w-4 h-4 inline mr-1" />Lançar nota fiscal</Btn>
        </>} />

      {contratos.length === 0 ? (
        <Vazio titulo="Nenhum contrato lançado" texto="Cadastre um contrato ou empenho para registrar as notas fiscais e os pagamentos." />
      ) : (
        <>
          <BarraFiltros termo={termo} setTermo={setTermo} cat={cat} setCat={setCat} ano={ano} setAno={setAno} ord={ord} setOrd={setOrd} anos={anos} total={lista.length} agrupar={agrupar} setAgrupar={setAgrupar} situacao={situacao} setSituacao={setSituacao} />
          {lista.length === 0 ? (
            <Vazio titulo="Nenhum contrato corresponde aos filtros" texto="Ajuste os termos ou limpe os filtros." />
          ) : agrupar ? (
            <GrupoAnoCategoria grupos={grupos} renderItem={renderItem} />
          ) : (
            <div className="space-y-3.5">
              {lista.map(renderItem)}
            </div>
          )}
        </>
      )}

      {(nfContratoId || editNfId) && <FormPagamento p={editNfId ? pagamentos.find(x => x.id === editNfId) : null} contratoId={nfContratoId} data={data} refresh={refresh} onClose={() => { setNfContratoId(null); setEditNfId(null); }} />}
      {ocorrContratoId && <FormOcorrencia contratoId={ocorrContratoId} data={data} refresh={refresh} onClose={() => setOcorrContratoId(null)} />}
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`font-sans text-[9.5px] tracking-widest uppercase text-slate-500 text-left border-b border-slate-300 px-3 py-2.5 bg-stone-50 whitespace-nowrap ${className}`}>{children}</th>;
}

function BarraFiltros({ termo, setTermo, cat, setCat, ano, setAno, ord, setOrd, anos, total, agrupar, setAgrupar, situacao, setSituacao }) {
  return (
    <div className="flex gap-2.5 items-end flex-wrap mb-5 p-3.5 bg-white border border-slate-300 rounded-sm">
      <div className="flex-1 min-w-[200px]"><Campo label="Busca"><input type="search" value={termo} onChange={e => setTermo(e.target.value)} className={inputCls} placeholder="Buscar por contrato, fornecedor, nota fiscal ou motivo de retenção" /></Campo></div>
      <BotaoAgrupar agrupar={agrupar} setAgrupar={setAgrupar} />
      <div className="min-w-[132px]"><Campo label="Situação"><select value={situacao} onChange={e => setSituacao(e.target.value)} className={inputCls}><option value="">Todas</option><option value="quitado">Quitados</option><option value="apagar">A pagar</option><option value="retido">Com retenção</option></select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Categoria"><select value={cat} onChange={e => setCat(e.target.value)} className={inputCls}><option value="">Todas</option>{CAT_ARP.map(c => <option key={c}>{c}</option>)}</select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Ano"><select value={ano} onChange={e => setAno(e.target.value)} className={inputCls}><option value="">Todos</option>{anos.map(a => <option key={a}>{a}</option>)}</select></Campo></div>
      <div className="min-w-[132px]"><Campo label="Ordenar por">
        <select value={ord} onChange={e => setOrd(e.target.value)} className={inputCls}>
          <option value="retencao">Maior retenção</option><option value="saldo">Maior saldo a pagar</option>
          <option value="numero">Número do contrato</option><option value="fornecedor">Fornecedor (A → Z)</option>
        </select>
      </Campo></div>
      <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500 ml-auto self-center">{total} {total === 1 ? "contrato" : "contratos"}</span>
    </div>
  );
}

function FormPagamento({ p, contratoId, data, refresh, onClose }) {
  const { contratos, pagamentos, ocorrencias } = data;
  const cid = p?.contratoId || contratoId || contratos[0]?.id;
  const [form, setForm] = useState({
    contratoId: cid, nf: p?.nf || "", dataNF: p?.dataNF || "", valorNF: p?.valorNF || 0,
    valorPago: p?.valorPago || 0, dataPagamento: p?.dataPagamento || "", motivo: p?.motivo || "",
    situacao: p?.situacao || "Pendente"
  });
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  const retido = Math.max(0, nVal(form.valorNF) - nVal(form.valorPago));
  const c = contratos.find(x => x.id === form.contratoId);
  const t = c ? totaisPagamento(c, pagamentos, ocorrencias) : null;

  async function salvar() {
    if (!form.nf.trim()) return alert("Informe o número da nota fiscal.");
    if (!nVal(form.valorNF)) return alert("Informe o valor da nota fiscal.");
    if (nVal(form.valorPago) > nVal(form.valorNF)) return alert("O valor pago não pode ser maior que o da nota.");
    if (retido > 0 && !form.motivo.trim()) return alert(`Há R$ ${fmtM(retido)} retidos: informe o motivo da retenção.`);
    const dados = { ...form, nf: form.nf.trim(), motivo: form.motivo.trim(), valorNF: nVal(form.valorNF), valorPago: nVal(form.valorPago) };
    if (p) await base44.entities.Pagamento.update(p.id, dados);
    else await base44.entities.Pagamento.create(dados);
    await refresh();
    onClose();
    alert(p ? "Nota fiscal atualizada." : "Nota fiscal lançada.");
  }

  return (
    <Modal sobre="Pagamentos" titulo={p ? "Editar nota fiscal" : "Lançar nota fiscal"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn variant="forte" onClick={salvar}>Salvar lançamento</Btn></>}>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Contrato ou empenho" ajuda={t ? `Empenhado R$ ${fmtM(t.empenhado)} · já pago R$ ${fmtM(t.pago)} · a pagar R$ ${fmtM(t.aPagar)}` : ""}>
          <select className={inputCls} value={form.contratoId} onChange={e => setF("contratoId", e.target.value)}>
            {contratos.map(c => <option key={c.id} value={c.id}>{c.tipo} {c.numero}{c.notaEmpenho ? ` · NE ${c.notaEmpenho}` : ""} — {c.fornecedor || ""}</option>)}
          </select>
        </Campo>
        <Campo label="Número da nota fiscal"><input className={inputCls} value={form.nf} onChange={e => setF("nf", e.target.value)} /></Campo>
        <Campo label="Emissão da nota"><input type="date" className={inputCls} value={form.dataNF} onChange={e => setF("dataNF", e.target.value)} /></Campo>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] mb-3">
        <Campo label="Valor da nota (R$)"><input type="number" min="0" step="0.01" className={inputCls} value={form.valorNF} onChange={e => setF("valorNF", nVal(e.target.value))} /></Campo>
        <Campo label="Valor pago (R$)"><input type="number" min="0" step="0.01" className={inputCls} value={form.valorPago} onChange={e => setF("valorPago", nVal(e.target.value))} /></Campo>
        <Campo label="Data do pagamento"><input type="date" className={inputCls} value={form.dataPagamento} onChange={e => setF("dataPagamento", e.target.value)} /></Campo>
        <Campo label="Valor retido (R$)" ajuda="Diferença entre a nota e o pago."><input readOnly className={inputCls + " bg-slate-50"} value={fmtM(retido)} /></Campo>
        <Campo label="Situação"><select className={inputCls} value={form.situacao} onChange={e => setF("situacao", e.target.value)}>{SITUACOES_PAGAMENTO.map(s => <option key={s}>{s}</option>)}</select></Campo>
      </div>
      <Campo label="Motivo da retenção"><textarea className={textareaCls} value={form.motivo} onChange={e => setF("motivo", e.target.value)} placeholder="ex.: retenção de 2% a título de multa por atraso na entrega, conforme processo de penalidade." /></Campo>
    </Modal>
  );
}