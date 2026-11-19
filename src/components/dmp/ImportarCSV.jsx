import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { parsearCSV } from "@/lib/dmp-utils";
import { mapearLinhas, separarDuplicados, semVazios, colunasDetectadas } from "@/lib/csv-import";
import { Modal, Btn, Campo } from "./ui";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { usePodeEditar } from "@/lib/permissoes";

/**
 * Botão que abre um modal de importação CSV.
 * props: entityName, colunas [{ header, campo, tipo, obrigatorio, aliases }], refresh, label, ajuda, preProcess, data,
 *  chave (rec => string) + existentes (registros atuais) — para detectar linhas que já existem.
 */
export default function ImportarCSV({ entityName, colunas, refresh, label = "Importar CSV", ajuda, preProcess, data, chave, existentes }) {
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [analise, setAnalise] = useState(null);
  const [executando, setExecutando] = useState(false);
  const fileRef = useRef(null);
  // Importação cria/altera registros: disponível apenas para administradores.
  const podeEditar = usePodeEditar();
  if (!podeEditar) return null;

  function reset() {
    setStatus(""); setErro(""); setAnalise(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function lerArquivo(e) {
    const f = e.target.files[0];
    if (!f) return;
    setErro(""); setStatus(""); setAnalise(null);
    const linhas = parsearCSV(await f.text());
    if (!linhas.length) { setErro("O arquivo está vazio ou não pôde ser lido. Verifique se há uma linha de cabeçalho e ao menos uma linha de dados."); return; }
    const colunasArquivo = colunasDetectadas(linhas, colunas);
    const faltando = colunasArquivo.filter(c => c.obrigatorio && !c.encontrado).map(c => c.header);
    if (faltando.length) {
      setErro(`O cabeçalho não tem a(s) coluna(s) obrigatória(s): ${faltando.join(", ")}. Colunas encontradas no arquivo: ${Object.keys(linhas[0]).join(", ")}.`);
      return;
    }
    const { registros, ignorados } = mapearLinhas(linhas, colunas, preProcess, data);
    const { novos, dups, repetidos } = separarDuplicados(registros, existentes, chave);
    const invalidas = [
      ...ignorados,
      ...repetidos.map(r => ({ linha: r.linha, motivo: "registro repetido no próprio arquivo" }))
    ].sort((a, b) => a.linha - b.linha);
    setAnalise({ nome: f.name, total: linhas.length, novos, dups, invalidas, colunasArquivo, amostra: linhas.slice(0, 3) });
  }

  async function executar(modo) {
    if (!analise) return;
    const { novos, dups } = analise;
    if (!novos.length && !(modo === "atualizar" && dups.length)) {
      setErro("Não há linhas a importar.");
      return;
    }
    setExecutando(true); setErro(""); setStatus("");
    let criados = 0, atualizados = 0, falha = "";
    try {
      for (let i = 0; i < novos.length; i += 100) {
        const lote = novos.slice(i, i + 100);
        await base44.entities[entityName].bulkCreate(lote);
        criados += lote.length;
      }
      if (modo === "atualizar") {
        for (const d of dups) {
          await base44.entities[entityName].update(d.id, semVazios(d.rec));
          atualizados++;
        }
      }
    } catch (e) {
      falha = e?.response?.data?.error || e?.message || String(e);
    } finally {
      setExecutando(false);
    }
    const partes = [];
    if (criados) partes.push(`${criados} criado(s)`);
    if (atualizados) partes.push(`${atualizados} atualizado(s)`);
    if (dups.length && modo !== "atualizar") partes.push(`${dups.length} já existente(s) mantido(s)`);
    if (analise.invalidas.length) partes.push(`${analise.invalidas.length} linha(s) inválida(s) ignorada(s)`);
    if (falha) {
      setErro(`A importação foi interrompida: ${falha}${partes.length ? ` Já gravado: ${partes.join(", ")}.` : " Nenhum registro foi gravado."}`);
    } else {
      setStatus((partes.join(", ") || "Nada a importar") + ".");
    }
    await refresh();
  }

  return (
    <>
      <Btn onClick={() => { reset(); setAberto(true); }}><Upload className="w-4 h-4 inline mr-1" />{label}</Btn>

      {aberto && (
        <Modal sobre="Importação de dados" titulo={`Importar ${entityName} via CSV`} onClose={() => !executando && setAberto(false)}
          footer={<>
            <Btn onClick={() => setAberto(false)} disabled={executando}>Fechar</Btn>
            {analise && !status && !executando && !analise.dups.length && (
              <Btn variant="forte" onClick={() => executar("pular")} disabled={!analise.novos.length}>
                Criar {analise.novos.length} registro(s)
              </Btn>
            )}
            {analise && !status && !executando && analise.dups.length > 0 && (
              <>
                <Btn onClick={() => executar("pular")} disabled={!analise.novos.length}>Criar novas e pular existentes</Btn>
                <Btn variant="forte" onClick={() => executar("atualizar")}>Criar novas e atualizar existentes</Btn>
              </>
            )}
            {executando && <span className="font-sans text-[12px] text-slate-500 self-center">Gravando registros…</span>}
          </>}>
          <div className="mb-4">
            <Campo label="Arquivo CSV">
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={lerArquivo} className="text-sm" disabled={executando} />
            </Campo>
            <p className="font-sans text-[12px] text-slate-500 mt-1.5">
              Formato esperado: CSV separado por ponto e vírgula (;), vírgula (,) ou tabulação, com a primeira linha como cabeçalho.
              Campos entre aspas podem conter o separador, quebras de linha e aspas duplicadas ("").
              Colunas reconhecidas: <b>{colunas.map(c => c.header).join(", ")}</b>.
              {colunas.some(c => c.obrigatorio) && <> Obrigatórias: <b>{colunas.filter(c => c.obrigatorio).map(c => c.header).join(", ")}</b>.</>}
              {" "}Datas aceitas: dd/mm/aaaa ou d/m/aaaa. Valores: 1.500,00 ou 1500.
            </p>
            {ajuda && <p className="font-sans text-[12px] text-slate-500 mt-1.5">{ajuda}</p>}
          </div>

          {analise && (
            <div className="border border-slate-300 rounded-sm p-3 mb-3 bg-stone-50">
              <p className="font-sans text-[12.5px] text-slate-700 mb-2">
                <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                <b>{analise.nome}</b> — {analise.total} linha(s) de dados no arquivo.
              </p>
              <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))] mb-3">
                <div className="border border-emerald-300 bg-emerald-50 rounded-sm px-2.5 py-2">
                  <p className="font-mono text-[9px] tracking-widest uppercase text-emerald-700">Novas</p>
                  <p className="font-mono font-bold text-lg text-emerald-800">{analise.novos.length}</p>
                </div>
                <div className="border border-amber-300 bg-amber-50 rounded-sm px-2.5 py-2">
                  <p className="font-mono text-[9px] tracking-widest uppercase text-amber-700">Já existentes</p>
                  <p className="font-mono font-bold text-lg text-amber-800">{analise.dups.length}</p>
                </div>
                <div className="border border-red-300 bg-red-50 rounded-sm px-2.5 py-2">
                  <p className="font-mono text-[9px] tracking-widest uppercase text-red-700">Inválidas</p>
                  <p className="font-mono font-bold text-lg text-red-800">{analise.invalidas.length}</p>
                </div>
              </div>

              {analise.invalidas.length > 0 && (
                <div className="border border-red-200 bg-white rounded-sm px-2.5 py-2 mb-2 max-h-40 overflow-auto">
                  <p className="font-sans text-[11.5px] font-semibold text-red-800 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                    Linhas que serão ignoradas:
                  </p>
                  <ul className="text-[11.5px] text-slate-700 space-y-0.5 list-disc pl-4">
                    {analise.invalidas.slice(0, 12).map((i, k) => (
                      <li key={k}><b>Linha {i.linha}</b>: {i.motivo}</li>
                    ))}
                  </ul>
                  {analise.invalidas.length > 12 && <p className="font-sans text-[11px] text-slate-500 mt-1">…e mais {analise.invalidas.length - 12} linha(s).</p>}
                </div>
              )}

              {analise.dups.length > 0 && (
                <p className="font-sans text-[11.5px] text-amber-900 mb-2">
                  {analise.dups.length} linha(s) correspondem a registros já cadastrados. Escolha abaixo se devem ser puladas ou atualizadas.
                </p>
              )}

              <details className="mt-1">
                <summary className="font-sans text-[11.5px] text-slate-600 cursor-pointer">Prévia das primeiras linhas</summary>
                <pre className="font-mono text-[10.5px] text-slate-600 mt-1 overflow-auto max-h-32 bg-white border border-slate-200 rounded p-2">
{analise.amostra.map(r => JSON.stringify(r, null, 0)).join("\n")}
                </pre>
              </details>
            </div>
          )}

          {status && <div className="border border-emerald-300 bg-emerald-50 rounded-sm px-3 py-2 text-sm text-emerald-800 mb-3">{status}</div>}
          {erro && <div className="border border-red-300 bg-red-50 rounded-sm px-3 py-2 text-sm text-red-800 mb-3">{erro}</div>}

          <p className="font-sans text-[11.5px] text-slate-500">
            Dica: exporte o CSV pelo botão "Baixar CSV" para obter um modelo com as colunas corretas. O CSV não substitui o backup — para cópia completa, use a exportação de dados do painel do app.
          </p>
        </Modal>
      )}
    </>
  );
}