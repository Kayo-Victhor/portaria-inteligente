import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut, Building2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import type { Role } from "../types";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administração",
  CONCIERGE: "Portaria",
  RESIDENT: "Morador",
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-slate-900">
                Portaria Inteligente
              </h1>
              {user && (
                <span className="text-xs font-medium text-slate-500">
                  {roleLabels[user.role]}
                </span>
              )}
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-800">
                  {user.name}
                </p>
                <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                  {user.unit ? (
                    <>
                      <Building2 className="h-3.5 w-3.5" />
                      {user.unit.block} - Apto {user.unit.number}
                    </>
                  ) : (
                    user.email
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
