import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { getHomeRouteByRole } from "./utils/routes";
import { LoginPage } from "./pages/auth/LoginPage";
import { ResidentDashboard } from "./pages/resident/ResidentDashboard";
import { ConciergeDashboard } from "./pages/concierge/ConciergeDashboard";
import { AdminDashboard } from "./pages/admin/AdminDashboard";

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getHomeRouteByRole(user.role)} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute allowedRoles={["RESIDENT"]} />}>
            <Route path="/morador" element={<ResidentDashboard />} />
          </Route>

          <Route
            element={<ProtectedRoute allowedRoles={["CONCIERGE", "ADMIN"]} />}
          >
            <Route path="/portaria" element={<ConciergeDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
