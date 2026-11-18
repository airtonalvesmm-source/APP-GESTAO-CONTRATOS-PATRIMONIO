import { base44 } from "@/api/base44Client";

// Backup integral gerado no servidor — a função verifica o papel de administrador.
export async function gerarBackupCompleto(onProgress) {
  if (onProgress) onProgress({ tabela: "Banco de dados", status: "lendo" });

  const resp = await base44.functions.invoke("backupCompleto", {});
  const d = resp?.data || {};
  if (d.error) throw new Error(d.error);
  if (!d.base64) throw new Error("O servidor não retornou o arquivo do backup.");

  const binario = atob(d.base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/zip" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = d.nomeArquivo || "backup_completo.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  return {
    tabelas: d.tabelas || 0,
    registros: d.registros || 0,
    falhas: d.falhas || [],
    detalhes: d.detalhes || [],
    nomeArquivo: d.nomeArquivo,
    tamanho: d.tamanho || blob.size
  };
}