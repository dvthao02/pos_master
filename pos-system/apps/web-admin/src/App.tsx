import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CrmAdminPage } from "./pages/CrmAdminPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { LoginPage } from "./pages/LoginPage";
import { StoreDashboardPage } from "./pages/StoreDashboardPage";
import { StoreSalesPage } from "./pages/StoreSalesPage";
import { useAuthStore } from "./store/authStore";

function HomeRedirect() {
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={session.loginZone === "platform" ? "/crm-admin" : "/store-dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/login"
        element={
          <LoginPage
            zone="tenant"
            pageTitle="Dang nhap cua hang"
            heroTitle="Van hanh ban hang hang ngay tren mot man hinh"
            heroDescription="Danh cho chu cua hang, thu ngan va nhan su van hanh theo tung cua hang."
            altLink={{ to: "/admin.login", label: "Can dang nhap quan tri he thong? Vao /admin.login" }}
          />
        }
      />
      <Route
        path="/admin.login"
        element={
          <LoginPage
            zone="platform"
            pageTitle="Dang nhap quan tri he thong"
            heroTitle="Quan tri cua hang va phan quyen tap trung tren mot nen tang"
            heroDescription="Danh rieng cho vai tro quan tri nen tang va ho tro he thong."
            altLink={{ to: "/login", label: "Can dang nhap cua hang? Vao /login" }}
          />
        }
      />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      <Route
        element={
          <ProtectedRoute
            allowedZone="platform"
            allowedRoles={["SUPER_ADMIN", "PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_STORE_CREATOR"]}
            loginPath="/admin.login"
          />
        }
      >
        <Route path="/crm-admin" element={<CrmAdminPage />} />
        <Route path="/admin/tenants/:tenantCode" element={<CrmAdminPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedZone="tenant" />}>
        <Route path="/store-dashboard" element={<StoreDashboardPage />} />
        <Route path="/store/:storeCode/sales" element={<StoreSalesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
