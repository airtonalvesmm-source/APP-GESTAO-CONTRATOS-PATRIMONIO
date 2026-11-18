const U = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const D = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const C = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n) {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), r = n % 100;
  const partes = [];
  if (c) partes.push(C[c]);
  if (r) partes.push(r < 20 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " e " + U[r % 10] : ""));
  return partes.join(" e ");
}

function inteiro(n) {
  if (n === 0) return "zero";
  const mi = Math.floor(n / 1000000), mil = Math.floor((n % 1000000) / 1000), resto = n % 1000;
  const partes = [];
  if (mi) partes.push(ate999(mi) + (mi === 1 ? " milhão" : " milhões"));
  if (mil) partes.push(mil === 1 ? "mil" : ate999(mil) + " mil");
  if (resto) partes.push(ate999(resto));
  return partes.reduce((acc, p, i) => {
    if (i === 0) return p;
    const ultimo = i === partes.length - 1;
    return acc + (ultimo && (resto <= 100 || resto % 100 === 0) ? " e " : ", ") + p;
  }, "");
}

// Valor em reais por extenso, ex.: 63030.51 → "sessenta e três mil e trinta reais e cinquenta e um centavos"
export function valorPorExtenso(valor) {
  const cents = Math.round((Number(valor) || 0) * 100);
  const reais = Math.floor(cents / 100), cent = cents % 100;
  const partes = [];
  if (reais) partes.push(inteiro(reais) + (reais === 1 ? " real" : (reais % 1000000 === 0 ? " de reais" : " reais")));
  if (cent) partes.push(inteiro(cent) + (cent === 1 ? " centavo" : " centavos"));
  return partes.length ? partes.join(" e ") : "zero real";
}