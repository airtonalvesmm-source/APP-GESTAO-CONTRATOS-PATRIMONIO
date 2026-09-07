import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

export default function GraficoSerie({ serie, mediaContratado, baseSerie }) {
  const data = serie.map(s => ({ ano: String(s.ano), Planejado: s.planejado, Contratado: s.contratado }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="ano" tick={{ fontSize: 11, fontFamily: "monospace" }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(v) => Number(v).toLocaleString("pt-BR")} />
        {baseSerie !== "contratado" && <Bar dataKey="Planejado" fill="#cbd5e1" name="Planejado (PCA)" />}
        {baseSerie !== "planejado" && <Bar dataKey="Contratado" fill="#334155" name="Contratado" />}
        {baseSerie !== "planejado" && mediaContratado > 0 && (
          <ReferenceLine y={mediaContratado} stroke="#dc2626" strokeDasharray="5 5" label={{ value: "Média", fontSize: 10, fill: "#dc2626" }} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}