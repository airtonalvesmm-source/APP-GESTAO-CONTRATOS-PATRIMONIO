import { useAuth } from "@/lib/AuthContext";

// Perfil de consulta: usuários comuns leem e exportam, mas não alteram registros.
export const ehAdmin = (user) => user?.role === "admin";

export function usePodeEditar() {
  const { user } = useAuth();
  return ehAdmin(user);
}