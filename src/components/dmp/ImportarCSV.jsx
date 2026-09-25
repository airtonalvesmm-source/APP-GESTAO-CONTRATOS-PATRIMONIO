import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { parsearCSV } from "@/lib/dmp-utils";
import { mapearLinhas, separarDuplicados, semVazios } from "@/lib/csv-import";
import { Modal, Btn, Campo } from "./ui";
import { Upload, FileSpreadsheet } from "lucide-react";

/**
 * Botão que abre um modal de importação CSV.
 * props: entityName, colunas [{ header, campo, tipo, obrigatorio, aliases }], refresh, label, ajuda, preProcess, data,
 *  chave (rec => string) + existentes (registros atuais) — para detectar linhas que já existem.
 */
export default function ImportarCSV({ entityName, colunas, refresh, label = "Importar CSV", ajuda, preProcess, data, chave, existentes }) {
  const [aberto, setAberto] = useState(false);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [preview, setPreview] = useState(null);
  const [pendente, setPendente] = useState(null);
  const fileRef = useRef(null);

  function reset() {
    setStatus(""); setErro(""); setPreview(null); setPendente(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function lerArquivo(e) {
    const f = e.target.files[0];
    if (!f) return;
    setErro(""); setStatus(""); setPendente(null);
    const linhas = parsearCSV(await f.text());
    if (!linhas.length) { setErro("O arquivo está vazio ou não pôde ser lido."); return; }
    setPreview({ nome: f.name, total: linhas.length, amostra: linhas.slice(0, 3) });
  }

  async function confirmar() {
    if (!fileRef.current?.files[0]) return;
    setErro(""); setStatus("");
    const linhas = parsearCSV(await fileRef.current.files[0].text());
    const { registros, ignorados } = mapearLinhas(linhas, colunas, preProcess, data);
    if (!registros.length) { setErro("Nenhuma linha válida. Verifique as colunas obrigatórias, as datas e os vínculos."); return; }
    const { novos, dups } = separarDuplicados(registros, existentes, chave);
    if (dups.length) { setPendente({ novos, dups, ignorados }); return; }
    await executar({ novos, dups: [], ignorados }, "pular");
  }

  async function executar({ novos, dups, ignorados }, modo) {
    for (let i = 0; i < novos.length; i += 100) await base44.entities[entityName].bulkCreate(novos.slice(i, i + 100));
    let atualizados = 0;
    if (modo === "atualizar") {
      for (const d of dups) { await base44.entities[entityName].update(d.id, semVazios(d.rec)); atualizados++; }
    }
    const partes = [`${novos.length} registro(s) criado(s)`];
    if (dups.length) partes.push(modo === "atualizar" ? `${atualizados} atualizado(s)` : `${dups.length} já existente(s) ignorado(s)`);
    if (ignorados.length) partes.push(`${ignorados.length} linha(s) inválida(s) ignorada(s) (linhas: ${ignorados.slice(0, 10).join(", ")}${ignorados.length > 10 ? "…" : ""})`);
    setStatus(partes.join(", ") + ".");
    setPendente(null);
    await refresh();
  }

  return (
    <>
      <Btn onClick={() => { reset(); setAberto(true); }}><Upload className="w-4 h-4 inline mr-1" />{label}</Btn>

      {aberto && (
        <Modal sobre="Importação de dados" titulo={`Importar ${entityName} via CSV`} onClose={() => setAberto(false)}
          footer={<>
            <Btn onClick={() => setAberto(false)}>Fechar</Btn>
            {!pendente && <Btn variant="forte" onClick={confirmar} disabled={!preview}>Confirmar importação</Btn>}
          </>}>
          <div className="mb-4">
            <Campo label="Arquivo CSV">
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={lerArquivo} className="text-sm" />
            </Campo>
            <p className="font-sans text-[12px] text-slate-500 mt-1.5">
              Formato esperado: CSV separado por ponto e vírgula (;), com a primeira linha como cabeçalho.
              Colunas reconhecidas: <b>{colunas.map(c => c.header).join(", ")}</b>.
              {colunas.some(c => c.obrigatorio) && <> Obrigatórias: <b>{colunas.filter(c => c.obrigatorio).map(c => c.header).join(", ")}</b>.</>}
              {" "}Datas aceitas: dd/mm/aaaa ou d/m/aaaa. Valores: 1.500,00 ou 1500.
            </p>
            {ajuda && <p className="font-sans text-[12px] text-slate-500 mt-1.5">{ajuda}</p>}
          </div>

          {preview && (
            <div className="border border-slate-300 rounded-sm p-3 mb-3 bg-stone-50">
              <p className="font-sans text-[12.5px] text-slate-700 mb-1">
                <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                <b>{preview.nome}</b> — {preview.total} linha(s) de dados.
              </p>
              <p className="font-mono text-[11px] text-slate-500">Primeiras linhas:</p>
              <pre className="font-mono text-[10.5px] text-slate-600 mt-1 overflow-auto max-h-32 bg-white border border-slate-200 rounded p-2">
{preview.amostra.map(r => JSON.stringify(r, null, 0)).join("\n")}
              </pre>
            </div>
          )}

          {pendente && (
            <div className="border border-amber-300 bg-amber-50 rounded-sm px-3 py-3 mb-3">
              <p className="font-sans text-[13px] text-amber-900 mb-2.5">
                <b>{pendente.dups.length}</b> linha(s) correspondem a registros que já existem. {pendente.novos.length} são novas.
                O que fazer com as existentes?
              </p>
              <div className="flex gap-2 flex-wrap">
                <Btn onClick={() => executar(pendente, "pular")}>Pular existentes</Btn>
                <Btn variant="forte" onClick={() => executar(pendente, "atualizar")}>Atualizar existentes</Btn>
              </div>
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