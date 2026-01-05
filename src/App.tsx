import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ReloginProvider, useRelogin } from "./contexts/reloginContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";
import LockScreen from "./components/LockScreen";
import ReLoginScreen from "./components/reLoginScreen";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import InvoicePage from "./pages/InvoicePage";
import InvoiceRedirect from "./pages/invoiceRedirect";
import { ThemeProvider } from "./contexts/ThemeContext";

function AppContent() {
  const { user, isLocked, unlock, loading } = useAuth();
  const { isReloginOpen } = useRelogin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && isLocked) {
    return <LockScreen userEmail={user.email || ""} onUnlock={unlock} />;
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/invoice/:id" element={<InvoicePage />} />
        <Route path="/invoice" element={<InvoiceRedirect />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      {user && isReloginOpen && <ReLoginScreen userEmail={user.email || ""} />}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReloginProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </ToastProvider>
        </ReloginProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
