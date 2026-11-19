// Validações de campos — devolvem uma mensagem pronta para exibição no próprio formulário.
// Todas retornam "" quando o campo está válido.

import { parseDataBR, nValS } from "./dmp-utils";

export const vazio = (v) => v == null || String(v).trim() === "";

// Converte texto em número aceitando o padrão brasileiro; NaN quando não é número.
export function numeroDe(v) {
  const t = String(v == null ? "" : v).trim();
  if (!t) return NaN;
  if (!/^-?[\d.,]+$/.test(t)) return NaN;
  const n = nValS(t);
  return isFinite(n) ? n : NaN;
}

export function inteiroDe(v) {
  const t = String(v == null ? "" : v).trim();
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

/**
 * vNum — valida número com limites.
 * { rotulo, min, max, inteiro, obrigatorio }
 */
export function vNum(valor, { rotulo = "Valor", min = 0, max = null, inteiro = false, obrigatorio = true } = {}) {
  if (vazio(valor)) return obrigatorio ? `${rotulo}: campo obrigatório.` : "";
  const n = inteiro ? inteiroDe(valor) : numeroDe(valor);
  if (Number.isNaN(n)) {
    return inteiro
      ? `${rotulo}: informe um número inteiro (somente dígitos).`
      : `${rotulo}: informe apenas números (use vírgula para os centavos).`;
  }
  if (min != null && n < min) return `${rotulo}: o valor mínimo é ${min}.`;
  if (max != null && n > max) return `${rotulo}: o valor máximo é ${max}.`;
  return "";
}

/** vData — valida data em aaaa-mm-dd, d/m/aaaa ou d-m-aaaa. */
export function vData(valor, { rotulo = "Data", obrigatorio = false } = {}) {
  if (vazio(valor)) return obrigatorio ? `${rotulo}: campo obrigatório.` : "";
  if (!parseDataBR(valor)) return `${rotulo}: informe uma data válida (dd/mm/aaaa).`;
  return "";
}

/** vPeriodo — confere se a data final não é anterior à inicial. */
export function vPeriodo(inicio, fim, { rotuloInicio = "Data inicial", rotuloFim = "Data final" } = {}) {
  const a = parseDataBR(inicio), b = parseDataBR(fim);
  if (!a || !b) return "";
  return b < a ? `${rotuloFim}: não pode ser anterior à ${rotuloInicio.toLowerCase()}.` : "";
}

/** vTexto — valida texto obrigatório e tamanho. */
export function vTexto(valor, { rotulo = "Campo", obrigatorio = false, min = 0, max = null } = {}) {
  const t = String(valor == null ? "" : valor).trim();
  if (!t) return obrigatorio ? `${rotulo}: campo obrigatório.` : "";
  if (min && t.length < min) return `${rotulo}: informe ao menos ${min} caractere(s).`;
  if (max && t.length > max) return `${rotulo}: use no máximo ${max} caractere(s).`;
  return "";
}

/** Junta as mensagens válidas (descarta vazias e repetidas). */
export const erros = (...msgs) => Array.from(new Set(msgs.filter(Boolean)));