// Utilidades para reservas de estoque

import { nQtd } from "./dmp-utils";

// Soma a quantidade reservada ativa por benId
export function reservadoPorItem(reservas, benId) {
  return (reservas || [])
    .filter(r => r.benId === benId && r.situacao === "ativa")
    .reduce((t, r) => t + nQtd(r.quantidade), 0);
}

// Mapa benId -> quantidade reservada ativa
export function mapaReservado(reservas) {
  const m = new Map();
  (reservas || []).forEach(r => {
    if (r.situacao !== "ativa") return;
    m.set(r.benId, (m.get(r.benId) || 0) + nQtd(r.quantidade));
  });
  return m;
}

// Saldo livre de um item: unidades em estoque - reservado ativo
export function saldoLivre(bens, reservas, benId) {
  const emEstoque = (bens || []).filter(b => b.benId === benId && b.situacao === "em estoque").length;
  const res = reservadoPorItem(reservas, benId);
  return Math.max(0, emEstoque - res);
}