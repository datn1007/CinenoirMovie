import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ROUTES } from "./constants/routes";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordRoute from "./pages/ForgotPasswordRoute";
import AccountDisabledPage from "./pages/AccountDisabledPage";
import BookingPage from "./pages/BookingPage";
import ProfilePage from "./pages/ProfilePage";
import WatchMoviePage from "./pages/WatchMoviePage";

import AdminLayout from "./pages/AdminLayout";
import AdminDashboard from "./components/AdminDashboard";
import MovieScheduleManagement from "./components/MovieScheduleManagement";
import ScheduleManagement from "./components/ScheduleManagement";
import AdminRoomsPage from "./pages/admin/AdminRoomsPage";
import StaffManagement from "./components/StaffManagement";
import VoucherManagement from "./components/VoucherManagement";
import UserManagement from "./components/UserManagement";
import AdminInvoicesPage from "./pages/admin/AdminInvoicesPage";

import StaffLayout from "./pages/StaffLayout";
import StaffTicketSelling from "./components/StaffTicketSelling";
import StaffProfilePage from "./pages/staff/StaffProfilePage";

// Trang chủ mặc định tuỳ theo vai trò — dùng cho URL trống lúc mới mở localhost và cho
// mọi đường dẫn không khớp route nào. Admin/staff không bao giờ nên rơi vào trang chủ
// khách hàng (/home), họ có khu vực riêng của mình.
function IndexRedirect() {
  const { isAdmin, isStaff } = useAuth();
  if (isAdmin) return <Navigate to={ROUTES.ADMIN} replace />;
  if (isStaff) return <Navigate to={ROUTES.STAFF} replace />;
  return <Navigate to={ROUTES.HOME} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.HOME_NOW_SHOWING} element={<HomePage />} />
        <Route path={ROUTES.HOME_COMING_SOON} element={<HomePage />} />
        <Route path={ROUTES.HOME_PROMOTIONS} element={<HomePage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordRoute />} />
        <Route path={ROUTES.ACCOUNT_DISABLED} element={<AccountDisabledPage />} />

        <Route
          path={ROUTES.ADMIN}
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="movies" element={<MovieScheduleManagement />} />
          <Route path="showtimes" element={<ScheduleManagement />} />
          <Route path="rooms" element={<AdminRoomsPage />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="vouchers" element={<VoucherManagement />} />
          <Route path="members" element={<UserManagement />} />
          <Route path="invoices" element={<AdminInvoicesPage />} />
        </Route>

        <Route
          path={ROUTES.STAFF}
          element={
            <ProtectedRoute requiredRole="staff">
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffTicketSelling />} />
          <Route path="profile" element={<StaffProfilePage />} />
        </Route>

        <Route
          path={ROUTES.BOOKING}
          element={
            <ProtectedRoute requiredRole="any">
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PROFILE}
          element={
            <ProtectedRoute requiredRole="any">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.WATCH}
          element={
            <ProtectedRoute requiredRole="any">
              <WatchMoviePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<IndexRedirect />} />
      </Routes>
    </AuthProvider>
  );
}
