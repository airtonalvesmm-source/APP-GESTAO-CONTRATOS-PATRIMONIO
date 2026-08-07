import React from "react";
import { TRACOS } from "@/lib/dmp-data";

export function Desenho({ arte }) {
  return (
    <svg className="desenho" viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: (TRACOS[arte] || TRACOS.generico) }} />
  );
}