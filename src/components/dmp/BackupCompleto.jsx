import React, { useState } from "react";
import { gerarBackupCompleto } from "@/lib/backup-completo";
import { usePodeEditar } from "@/lib/permissoes";
import { Modal, Btn } from "./ui";
import { Download, CheckCircle2, XCircle, Loader2, Database } from "lucide-react";

export default function BackupCompleto() {
  const podeEditar = usePodeEditar();
  const [aberto, setAberto] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [log, setLog] = useState([]);

  function abrir() {
    setAberto(true);
    setResultado(null);
    setLog([]);
    setRodando(false);
  }

  async function executar() {
    setRodando(true);
    setResultado(null);
    setLog([]);
    try {
      const res = await gerarBackupCompleto();
      setResultado(res);
      setLog((res.detalhes || []).map(d => ({
        tabela: d.tabela,
        count: d.registros,
        status: d.ok ? "ok" : "erro",
        erro: d.erro
      })));
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || String(e);
      setResultado({ erro: msg, tabelas: 0, registros: 0, falhas: [{ tabela: "geral", erro: msg }] });
    } finally {
      setRodando(false);
    }
  }

  // Backup integral do banco: exclusivo para administradores
  if (!podeEditar) return null;

  return (
    <>
      <button onClick={abrir}
        className="inline-flex items-center gap-1.5 border border-slate-600 bg-slate-700 text-stone-100 rounded-sm px-3 py-1.5 font-sans font-semibold text-[12px] hover:bg-slate-600 cursor-pointer transition-colors"
        title="Exportar todas as tabelas para um arquivo ZIP com CSVs">
        <Database className="w-3.5 h-3.5" />Baixar backup completo
      </button>

      {aberto && (
        <Modal sobre="Backup completo" titulo="Baixar backup do banco de dados" onClose={() => !rodando && setAberto(false)}
          footer={
            rodando ? (
              <span className="font-sans text-[12px] text-slate-500 inline-flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />Processando...
              </span>
            ) : (
              <>
                <Btn onClick={() => setAberto(false)}>Fechar</Btn>
                {!resultado && <Btn variant="forte" onClick={executar}><Download className="w-4 h-4 inline mr-1" />Iniciar backup</Btn>}
              </>
            )
          }>
          <div className="mb-4 border-l-[3px] border-slate-700 bg-slate-50 px-3 py-2.5 rounded-r-sm">
            <p className="font-sans text-[13px] text-slate-700">
              Exporta todas as <b>tabelas</b> do banco de dados para um único arquivo <b>ZIP</b> contendo um CSV por tabela. A exportação é gerada no servidor e exige perfil de administrador.
            </p>
            <p className="font-sans text-[11.5px] text-slate-500 mt-1">
              Preserva IDs originais, campos de relacionamento e todos os registros. A entidade User é exportada apenas com campos seguros (id, nome, e-mail, papel) — sem segredos. Nenhum registro é alterado ou excluído.
            </p>
          </div>

          {rodando && (
            <div className="mb-4 flex items-center gap-2 border border-slate-200 rounded-sm px-3 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
              <span className="font-sans text-[12.5px] text-slate-600">Gerando o backup no servidor. Pode levar alguns instantes…</span>
            </div>
          )}

          {log.length > 0 && (
            <div className="mb-4 border border-slate-200 rounded-sm max-h-[280px] overflow-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead className="sticky top-0"><tr className="bg-stone-50">
                  <th className="text-left font-sans text-[9px] tracking-widest uppercase text-slate-500 px-2.5 py-1.5">Tabela</th>
                  <th className="text-right font-sans text-[9px] tracking-widest uppercase text-slate-500 px-2.5 py-1.5">Registros</th>
                  <th className="text-left font-sans text-[9px] tracking-widest uppercase text-slate-500 px-2.5 py-1.5">Status</th>
                </tr></thead>
                <tbody>
                  {log.map((l, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2.5 py-1.5 font-sans text-slate-700">{l.tabela}</td>
                      <td className="px-2.5 py-1.5 font-mono text-right text-slate-600">{l.count ?? (l.status === "lendo" ? "..." : "—")}</td>
                      <td className="px-2.5 py-1.5">
                        {l.status === "ok" && <span className="inline-flex items-center gap-1 text-emerald-700 font-sans text-[11px]"><CheckCircle2 className="w-3 h-3" />OK</span>}
                        {l.status === "lendo" && <span className="inline-flex items-center gap-1 text-slate-500 font-sans text-[11px]"><Loader2 className="w-3 h-3 animate-spin" />Lendo...</span>}
                        {l.status === "erro" && <span className="inline-flex items-center gap-1 text-red-700 font-sans text-[11px]" title={l.erro}><XCircle className="w-3 h-3" />Falha</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resultado && (
            <div className="border border-slate-300 rounded-sm bg-white px-4 py-3">
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))] mb-3">
                <div>
                  <p className="font-mono text-[9px] tracking-widest uppercase text-slate-500">Tabelas exportadas</p>
                  <p className="font-mono font-bold text-xl text-slate-800">{resultado.tabelas}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-widest uppercase text-slate-500">Total de registros</p>
                  <p className="font-mono font-bold text-xl text-slate-800">{resultado.registros.toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-widest uppercase text-slate-500">Tamanho do ZIP</p>
                  <p className="font-mono font-bold text-xl text-slate-800">{(resultado.tamanho / 1024).toFixed(1)} KB</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-widest uppercase text-slate-500">Falhas</p>
                  <p className={`font-mono font-bold text-xl ${resultado.falhas.length ? "text-red-700" : "text-emerald-700"}`}>{resultado.falhas.length}</p>
                </div>
              </div>
              {resultado.falhas.length > 0 && (
                <div className="border-t border-slate-200 pt-2.5">
                  <p className="font-sans text-[11px] font-semibold text-red-800 mb-1">Tabelas com falha:</p>
                  <ul className="text-[11.5px] text-slate-600 space-y-0.5">
                    {resultado.falhas.map((f, i) => (
                      <li key={i}><b>{f.tabela}</b>: {f.erro}</li>
                    ))}
                  </ul>
                </div>
              )}
              {resultado.erro && (
                <div className="border-t border-slate-200 pt-2.5">
                  <p className="font-sans text-[12px] text-red-700"><b>Erro geral:</b> {resultado.erro}</p>
                </div>
              )}
              {resultado.nomeArquivo && !resultado.erro && (
                <div className="border-t border-slate-200 pt-2.5 mt-2.5">
                  <p className="font-sans text-[12px] text-emerald-700 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Arquivo <b>{resultado.nomeArquivo}</b> baixado com sucesso.
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}