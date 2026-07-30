import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Staff } from "../types";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { isPasswordStrongEnough, isValidEmail } from "../lib/validation";
import { API_BASE_URL } from "../lib/apiConfig";

type Step = "request-otp" | "verify-otp" | "reset-password";

export default function ForgotPasswordPage({
  onBack,
  onResetSuccess,
}: {
  onBack?: () => void;
  onResetSuccess?: (user: Staff) => void;
}) {
  const [step, setStep] = useState<Step>("request-otp");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const title = useMemo(() => {
    if (step === "request-otp") return "Quên mật khẩu";
    if (step === "verify-otp") return "Xác thực OTP";
    return "Đặt lại mật khẩu";
  }, [step]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isValidEmail(email)) {
      setError("Email không hợp lệ.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || "Gửi OTP thất bại.");
        return;
      }

      setSuccess("Đã gửi OTP về email của bạn. Vui lòng kiểm tra hòm thư.");
      setStep("verify-otp");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("OTP phải gồm đúng 6 chữ số.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || "OTP không hợp lệ.");
        return;
      }

      setSuccess("OTP hợp lệ. Bạn có thể đặt lại mật khẩu.");
      setStep("reset-password");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isPasswordStrongEnough(newPassword)) {
      setError("Mật khẩu chưa đủ mạnh. Vui lòng đáp ứng các yêu cầu bên dưới ô mật khẩu.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || "Đặt lại mật khẩu thất bại.");
        return;
      }

      setSuccess("Mật khẩu đã được đặt lại thành công.");
      setStep("request-otp");
      setOtp("");
      setNewPassword("");
      setNewPasswordConfirm("");

      // Không tự đăng nhập ở đây (vì backend trả về message, không trả token).
      // Nếu bạn muốn tự đăng nhập lại, có thể gọi /api/auth/login.
      if (onResetSuccess) {
        const user: Staff = {
          id: "u_" + Date.now(),
          fullName: email.trim(),
          accountId: "CN-" + Math.floor(1000 + Math.random() * 9000),
          username: email.trim(),
          role: "Employee",
          roleId: 3,
          email: email.trim(),
          phone: "",
          avatarUrl: "",
        };
        onResetSuccess(user);
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-black">
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1x2CziFTZu3KChKqaBIQYXH_zA26pFLZV2EQKh3-fGJNRpmigUV_AFl-Z2F5UPX7RnZBdEY_YXw-vpvaCVeT1yV_Vo9Zksks-t4sJ1MhoExxsANtb2GiTBkdg5_FSHpPmNzK5NtnjCYrhhVaPFGbb4ObZGQHl24Tea_Ru6btQdKIp_wG3bp4zDUzksHD7GmyPCG5uE1Hoco0DUUj8gU1PxCXGCm0J9DqfHnoV6hzy5WuSdeFlZZQkKhVrYY7jg1TA5NmRrUGKM_oi"
          alt=""
          className="w-full h-full object-cover opacity-35 pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70" />
      </div>

      <div className="relative z-10 px-6 md:px-16 pt-6 md:pt-8">
        <button
          onClick={() => onBack?.()}
          className="text-[#e50914] font-black text-2xl md:text-3xl tracking-tighter select-none hover:opacity-90 transition-opacity"
        >
          CINENOIR
        </button>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-black/75 backdrop-blur-sm rounded-lg px-8 md:px-12 py-10 md:py-12">
            <h2 className="text-white text-3xl font-bold mb-6">{title}</h2>

            {error && (
              <div className="flex items-start gap-2 bg-[#e87c03]/15 text-[#e87c03] border border-[#e87c03]/40 px-4 py-3 rounded text-sm mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-4 py-3 rounded text-sm mb-4">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {step === "request-otp" && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email của bạn"
                  className="w-full px-5 py-4 bg-[#333] text-white text-sm rounded focus:outline-none focus:bg-[#454545] placeholder:text-[#8c8c8c] transition-colors"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#e50914] hover:bg-[#c11119] text-white font-bold text-base rounded transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Đang gửi OTP..." : "Gửi OTP"}
                </button>
              </form>
            )}

            {step === "verify-otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nhập OTP 6 chữ số"
                  className="w-full px-5 py-4 bg-[#333] text-white text-sm rounded focus:outline-none focus:bg-[#454545] placeholder:text-[#8c8c8c] transition-colors"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#e50914] hover:bg-[#c11119] text-white font-bold text-base rounded transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Đang xác thực..." : "Xác thực OTP"}
                </button>
              </form>
            )}

            {step === "reset-password" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới"
                    className="w-full px-5 py-4 bg-[#333] text-white text-sm rounded focus:outline-none focus:bg-[#454545] placeholder:text-[#8c8c8c] transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8c8c8c] hover:text-white transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={newPassword} />

                <input
                  type="password"
                  required
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Xác nhận mật khẩu mới"
                  className="w-full px-5 py-4 bg-[#333] text-white text-sm rounded focus:outline-none focus:bg-[#454545] placeholder:text-[#8c8c8c] transition-colors"
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#e50914] hover:bg-[#c11119] text-white font-bold text-base rounded transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
                </button>
              </form>
            )}

            <p className="mt-6 text-[#737373] text-xs leading-relaxed">
              OTP có hiệu lực trong 5 phút.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 text-center py-4 text-xs text-[#737373]">
        © 2026 CineNoir Cinemas. All rights reserved.
      </div>
    </div>
  );
}

