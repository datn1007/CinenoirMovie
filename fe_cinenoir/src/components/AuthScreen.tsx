import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Staff } from "../types";
import {
  AlertTriangle, ArrowRight, Calendar, Check, CheckCircle, Eye, EyeOff, Film, IdCard,
  Lock, Mail, MapPin, Phone, ShieldCheck, Star, User, Users,
} from "lucide-react";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { isBlank, isNameLike, isPasswordStrongEnough, isNotFutureDate, isValidEmail, isValidVietnamesePhone } from "../lib/validation";
import { API_BASE_URL } from "../lib/apiConfig";
import { ROUTES } from "../constants/routes";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with";
              shape?: "rectangular" | "pill" | "square" | "circle";
              logo_alignment?: "left" | "center";
              width?: string;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface AuthProps {
  mode: "login" | "register";
  onLoginSuccess: (user: Staff) => void;
  onSwitchMode: (mode: "login" | "register" | "forgot-password") => void;
  onBack?: () => void;
}

// Premium variant used only on the login card — rounded-xl, subtle border, red glow on focus.
const loginInputClass =
  "w-full px-5 py-3.5 bg-white/[0.06] text-white text-sm rounded-xl border border-white/10 focus:outline-none focus:border-[#e50914]/70 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(229,9,20,0.15)] placeholder:text-white/35 transition-all duration-300";

// Same premium treatment as loginInputClass, with room on the left for a field icon.
const registerInputClass =
  "w-full pl-11 pr-4 py-3 bg-white/[0.06] text-white text-sm rounded-xl border border-white/10 focus:outline-none focus:border-[#e50914]/70 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(229,9,20,0.15)] placeholder:text-white/35 transition-all duration-300";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">
      {children}
    </label>
  );
}

export default function AuthScreen({ mode, onLoginSuccess, onSwitchMode, onBack }: AuthProps) {
  const navigate = useNavigate();

  // Login state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regGender, setRegGender] = useState("Male");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const [regIsLoading, setRegIsLoading] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);

  // Google Sign-In
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleGoogleCredential = async (credential: string) => {
    setIsLoading(true);
    setLoginError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credential }),
      });
      if (!response.ok) {
        const text = await response.text();
        setLoginError(text || "Đăng nhập Google thất bại.");
        return;
      }
      const data = await response.json();
      localStorage.setItem("cinenoir_jwt_token", data.token);

      const user: Staff = {
        id: "s_" + Date.now(),
        fullName: data.fullName || "Google User",
        accountId: data.accountId || "",
        username: data.username || "google_user",
        role: data.roleName || "Staff",
        roleId: data.roleId ?? 1,
        email: data.email || "",
        phone: "",
        avatarUrl: "",
      };
      onLoginSuccess(user);
    } catch {
      setLoginError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "login") return;

    // Google's renderButton "width" only accepts a pixel number, not a percentage — "100%" is
    // silently ignored and it falls back to a small default, which is why the button used to
    // render noticeably narrower than the "Đăng nhập" button above it. Measure the actual
    // container width instead, and re-measure on resize so it keeps matching.
    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: "209274292743-rusvo7rnjb02sr2e400auc4gn2b6m43g.apps.googleusercontent.com",
        callback: (response) => {
          handleGoogleCredential(response.credential);
        },
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_black",
        size: "large",
        text: "signin_with",
        shape: "pill",
        width: String(googleButtonRef.current.offsetWidth || 300),
      });
    };

    // Poll for Google library to be available
    const interval = setInterval(() => {
      if (window.google?.accounts?.id && googleButtonRef.current) {
        clearInterval(interval);
        renderGoogleButton();
      }
    }, 200);

    window.addEventListener("resize", renderGoogleButton);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", renderGoogleButton);
    };
  }, [mode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        if (errorBody?.errorCode === "ACCOUNT_DISABLED") {
          navigate(ROUTES.ACCOUNT_DISABLED);
          return;
        }
        setLoginError("Tên đăng nhập hoặc mật khẩu không đúng.");
        return;
      }
      const data = await response.json();
      localStorage.setItem("cinenoir_jwt_token", data.token);
      const user: Staff = {
        id: "s_" + Date.now(),
        fullName: data.fullName || loginUsername,
        accountId: data.accountId || "",
        username: data.username || loginUsername,
        role: data.roleName || data.role || "Customer_Member",
        roleId: data.roleId ?? 3,
        email: data.email || "",
        phone: "",
        avatarUrl: "",
      };
      onLoginSuccess(user);
    } catch {
      setLoginError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (isBlank(regUsername)) {
      setRegError("Vui lòng nhập tên đăng nhập.");
      return;
    }
    if (!isPasswordStrongEnough(regPassword)) {
      setRegError("Mật khẩu chưa đủ mạnh. Vui lòng đáp ứng các yêu cầu bên dưới ô mật khẩu.");
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (isBlank(regFullName) || !isNameLike(regFullName)) {
      setRegError("Họ và tên không hợp lệ (chỉ được chứa chữ cái và khoảng trắng).");
      return;
    }
    if (isBlank(regDob)) {
      setRegError("Vui lòng chọn ngày sinh.");
      return;
    }
    if (!isNotFutureDate(regDob)) {
      setRegError("Ngày sinh không được lớn hơn ngày hiện tại.");
      return;
    }
    if (!isValidEmail(regEmail)) {
      setRegError("Email không hợp lệ.");
      return;
    }
    if (!isValidVietnamesePhone(regPhone)) {
      setRegError("Số điện thoại không hợp lệ (định dạng Việt Nam, ví dụ 0912345678).");
      return;
    }

    setRegIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          email: regEmail,
          fullName: regFullName || "User",
          phone: regPhone,
          gender: regGender,
          birthDate: regDob,
          address: regAddress,
        }),
      });
      if (!response.ok) {
        const raw = await response.text();
        let message = raw;
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.message) message = parsed.message;
        } catch {
          // Not JSON — the backend returned plain text for this error, use it as-is.
        }
        setRegError(message || "Đăng ký thất bại. Vui lòng thử lại.");
        return;
      }
      setRegSuccess(true);
      // Auto-login sau khi đăng ký để lấy accountId thật từ API
      setTimeout(async () => {
        try {
          const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: regUsername, password: regPassword }),
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            localStorage.setItem("cinenoir_jwt_token", loginData.token);
            const newUser: Staff = {
              id: "u_" + Date.now(),
              fullName: loginData.fullName || regFullName || "User",
              accountId: loginData.accountId || "",
              username: loginData.username || regUsername,
              role: loginData.roleName || "Customer_Member",
              roleId: loginData.roleId ?? 3,
              email: loginData.email || regEmail,
              phone: regPhone,
              avatarUrl: "",
              birthDate: regDob,
              gender: regGender,
              residentialAddress: regAddress,
            };
            onLoginSuccess(newUser);
          } else {
            // fallback nếu login thất bại
            const newUser: Staff = {
              id: "u_" + Date.now(),
              fullName: regFullName || "User",
              accountId: "",
              username: regUsername,
              role: "Customer_Member",
              roleId: 3,
              email: regEmail,
              phone: regPhone,
              avatarUrl: "",
              birthDate: regDob,
              gender: regGender,
              residentialAddress: regAddress,
            };
            onLoginSuccess(newUser);
          }
        } catch {
          onLoginSuccess({
            id: "u_" + Date.now(),
            fullName: regFullName || "User",
            accountId: "",
            username: regUsername,
            role: "Customer_Member",
            roleId: 3,
            email: regEmail,
            phone: regPhone,
            avatarUrl: "",
          });
        }
      }, 1500);
    } catch {
      setRegError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setRegIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-black">
      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1x2CziFTZu3KChKqaBIQYXH_zA26pFLZV2EQKh3-fGJNRpmigUV_AFl-Z2F5UPX7RnZBdEY_YXw-vpvaCVeT1yV_Vo9Zksks-t4sJ1MhoExxsANtb2GiTBkdg5_FSHpPmNzK5NtnjCYrhhVaPFGbb4ObZGQHl24Tea_Ru6btQdKIp_wG3bp4zDUzksHD7GmyPCG5uE1Hoco0DUUj8gU1PxCXGCm0J9DqfHnoV6hzy5WuSdeFlZZQkKhVrYY7jg1TA5NmRrUGKM_oi"
          alt=""
          className="w-full h-full object-cover opacity-45 pointer-events-none select-none animate-ken-burns"
        />
        <div className="absolute inset-0 bg-black/45" />
        {/* Top/bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70" />
        {/* Extra vignette toward the form side for legibility */}
        <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-transparent via-transparent to-black/50" />
      </div>

      {/* Top bar: Logo */}
      <div className="relative z-10 px-6 md:px-16 pt-6 md:pt-8">
        <button
          onClick={() => onBack?.()}
          className="text-[#e50914] font-black text-2xl md:text-3xl tracking-tighter select-none hover:opacity-90 transition-opacity"
        >
          CINENOIR
        </button>
      </div>

      {/* Form */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12 md:px-10 lg:px-16">
        <div className={`w-full grid lg:grid-cols-2 items-center ${mode === "register" ? "max-w-6xl gap-10 lg:gap-12" : "max-w-6xl gap-10 lg:gap-16"}`}>
          {mode === "login" && (
            /* ── HERO (desktop only) ── */
            <div className="hidden lg:flex flex-col justify-center animate-fade-in">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#e50914]/40 bg-[#e50914]/10 px-4 py-1.5 animate-float-slow">
                <Film className="h-3.5 w-3.5 text-[#e50914]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#e50914]">Now Showing</span>
              </div>
              <h1 className="text-5xl xl:text-6xl font-black leading-[1.05] text-white">
                Trải Nghiệm Điện Ảnh
                <br />
                <span className="text-[#e50914]">Chưa Từng Có</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/60">
                Đặt vé tức thì. Khám phá những bộ phim bom tấn. Tận hưởng trải nghiệm điện ảnh cao cấp cùng CineNoir.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-[#e9c349]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
                <span className="ml-2 text-sm text-white/50">Được yêu thích bởi hàng ngàn khán giả</span>
              </div>
              <button
                type="button"
                onClick={() => onBack?.()}
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:border-[#e50914]/60 hover:bg-[#e50914]/10 hover:scale-[1.03] active:scale-95"
              >
                Khám Phá Phim <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {mode === "register" && (
            /* ── HERO (desktop only) ── */
            <div className="hidden lg:flex flex-col justify-center animate-fade-in">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#e50914]/40 bg-[#e50914]/10 px-4 py-1.5 animate-float-slow">
                <Film className="h-3.5 w-3.5 text-[#e50914]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#e50914]">Thành Viên CineNoir</span>
              </div>
              <h1 className="text-5xl xl:text-6xl font-black leading-[1.05] text-white">
                Gia Nhập
                <br />
                <span className="text-[#e50914]">CineNoir</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/60">
                Tạo tài khoản để tận hưởng những đặc quyền dành riêng cho thành viên.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Đặt vé nhanh hơn, không cần xếp hàng",
                  "Lưu lại phim yêu thích của bạn",
                  "Ưu đãi và khuyến mãi độc quyền",
                  "Tích điểm thưởng cho mỗi lượt xem",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-sm text-white/70">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e50914]/15 text-[#e50914]">
                      <Check className="h-3 w-3" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mode === "login" ? (
            /* ── LOGIN ── */
            <div className="w-full max-w-md mx-auto lg:mx-0 rounded-3xl border border-white/10 bg-[rgba(15,15,15,0.72)] backdrop-blur-xl shadow-2xl px-8 md:px-12 py-10 md:py-12 animate-fade-in">
              <h2 className="text-white text-3xl font-bold">Đăng nhập</h2>
              <p className="mt-2 mb-8 text-sm text-white/50 leading-relaxed">
                Chào mừng trở lại. Đăng nhập để tiếp tục trải nghiệm điện ảnh.
              </p>

              <form onSubmit={handleLoginSubmit} className="space-y-4">

                {loginError && (
                  <div className="flex items-start gap-2 bg-[#e87c03]/15 text-[#e87c03] border border-[#e87c03]/40 px-4 py-3 rounded text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Tên đăng nhập hoặc email"
                  className={loginInputClass}
                />

                <div className="relative">
                  <input
                    type={showLoginPwd ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    className={loginInputClass + " pr-12"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPwd((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8c8c8c] hover:text-white transition-colors"
                  >
                    {showLoginPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#e50914] hover:bg-[#c11119] text-white font-bold text-base rounded-xl shadow-lg shadow-[#e50914]/20 transition-all duration-300 mt-2 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#e50914]/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[#737373] text-xs uppercase">hoặc</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Google Sign-In Button */}
                <div className="flex justify-center overflow-hidden rounded-full border border-white/15 transition-colors hover:border-white/30">
                  <div ref={googleButtonRef} className="w-full min-h-[40px]" />
                </div>

                <div className="flex items-center justify-between text-sm text-[#b3b3b3] mt-2">
                  <label className="group flex items-center gap-2.5 cursor-pointer select-none">
                    <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                      <input type="checkbox" className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                      <span className="pointer-events-none h-[18px] w-[18px] rounded-md border border-white/25 bg-white/5 transition-all duration-200 peer-checked:border-[#e50914] peer-checked:bg-[#e50914] peer-focus-visible:ring-2 peer-focus-visible:ring-[#e50914]/50" />
                      <Check className="pointer-events-none absolute h-3 w-3 scale-50 text-white opacity-0 transition-all duration-200 peer-checked:scale-100 peer-checked:opacity-100" />
                    </span>
                    <span className="transition-colors group-hover:text-white">Ghi nhớ đăng nhập</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onSwitchMode("forgot-password")}
                    className="hover:underline text-[#b3b3b3] hover:text-white transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

              </form>

              <p className="mt-10 text-[#737373] text-base">
                Chưa có tài khoản?{" "}
                <button
                  onClick={() => onSwitchMode("register")}
                  className="text-white hover:underline font-semibold"
                >
                  Đăng ký ngay.
                </button>
              </p>

              <p className="mt-4 text-[#737373] text-xs leading-relaxed">
                Trang này được bảo vệ bởi hệ thống xác thực CineNoir.
              </p>
            </div>
          ) : (
            /* ── REGISTER ── */
            <div className="w-full max-w-xl mx-auto lg:mx-0 rounded-3xl border border-white/10 bg-[rgba(15,15,15,0.72)] backdrop-blur-xl shadow-2xl px-8 md:px-10 py-10 animate-fade-in">
              <h2 className="text-white text-3xl font-bold">Tạo tài khoản</h2>
              <p className="mt-2 mb-7 text-sm text-white/50 leading-relaxed">
                Chỉ mất một phút để bắt đầu hành trình điện ảnh của bạn.
              </p>

              {regSuccess ? (
                <div className="py-10 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#e50914]/20 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-[#e50914]" />
                  </div>
                  <div>
                    <h3 className="text-white text-xl font-bold">Đăng ký thành công!</h3>
                    <p className="text-[#737373] text-sm mt-1">
                      Đang đăng nhập vào tài khoản của bạn...
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {regError && (
                    <div className="flex items-start gap-2 bg-[#e87c03]/15 text-[#e87c03] border border-[#e87c03]/40 px-4 py-3 rounded-xl text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="reg-username">Tên đăng nhập</FieldLabel>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                        <input
                          id="reg-username"
                          type="text"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="Tên đăng nhập"
                          className={registerInputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="reg-email">Email</FieldLabel>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                        <input
                          id="reg-email"
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="Email"
                          className={registerInputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="reg-password">Mật khẩu</FieldLabel>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                        <input
                          id="reg-password"
                          type={showRegPwd ? "text" : "password"}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Mật khẩu"
                          className={registerInputClass + " pr-11"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPwd((p) => !p)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8c8c8c] hover:text-white transition-colors"
                        >
                          {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrengthMeter password={regPassword} />
                    </div>

                    <div>
                      <FieldLabel htmlFor="reg-phone">Số điện thoại</FieldLabel>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                        <input
                          id="reg-phone"
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="Số điện thoại"
                          className={registerInputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="reg-confirm">Xác nhận mật khẩu</FieldLabel>
                      <div className="relative">
                        <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                        <input
                          id="reg-confirm"
                          type="password"
                          required
                          value={regConfirm}
                          onChange={(e) => setRegConfirm(e.target.value)}
                          placeholder="Xác nhận mật khẩu"
                          className={`${registerInputClass} ${
                            regConfirm && regPassword !== regConfirm
                              ? "border-[#e87c03]/70 bg-[#3a2a20]"
                              : regConfirm && regPassword === regConfirm
                              ? "border-emerald-500/50"
                              : ""
                          }`}
                        />
                      </div>
                      {regConfirm && regPassword !== regConfirm && (
                        <p className="mt-1.5 ml-1 text-xs text-[#e87c03]">Mật khẩu không khớp</p>
                      )}
                      {regConfirm && regPassword === regConfirm && (
                        <p className="mt-1.5 ml-1 flex items-center gap-1 text-xs text-emerald-400">
                          <Check className="h-3 w-3" />Mật khẩu khớp
                        </p>
                      )}
                    </div>

                    <div>
                      <FieldLabel htmlFor="reg-address">Địa chỉ</FieldLabel>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-white/35" />
                        <textarea
                          id="reg-address"
                          value={regAddress}
                          onChange={(e) => setRegAddress(e.target.value)}
                          placeholder="Địa chỉ"
                          rows={2}
                          className={registerInputClass + " resize-none pt-3"}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="reg-fullname">Họ và tên</FieldLabel>
                      <div className="relative">
                        <IdCard className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                        <input
                          id="reg-fullname"
                          type="text"
                          required
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="Họ và tên"
                          className={registerInputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="reg-gender">Giới tính</FieldLabel>
                      <div className="relative">
                        <Users className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                        <select
                          id="reg-gender"
                          value={regGender}
                          onChange={(e) => setRegGender(e.target.value)}
                          className={registerInputClass + " cursor-pointer"}
                          style={{ colorScheme: "dark" }}
                        >
                          <option value="Male" className="bg-[#171213] text-white">Nam</option>
                          <option value="Female" className="bg-[#171213] text-white">Nữ</option>
                          <option value="Non-binary" className="bg-[#171213] text-white">Khác</option>
                          <option value="Other" className="bg-[#171213] text-white">Không nói</option>
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <FieldLabel htmlFor="reg-dob">Ngày sinh</FieldLabel>
                      <div className="relative md:max-w-[calc(50%-0.5rem)]">
                        <Calendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                        <input
                          id="reg-dob"
                          type="date"
                          required
                          max={new Date().toISOString().slice(0, 10)}
                          value={regDob}
                          onChange={(e) => setRegDob(e.target.value)}
                          className={registerInputClass + " [color-scheme:dark]"}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={regIsLoading}
                    className="w-full py-4 bg-[#e50914] hover:bg-[#c11119] text-white font-bold text-base rounded-xl shadow-lg shadow-[#e50914]/20 transition-all duration-300 mt-2 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#e50914]/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {regIsLoading ? "Đang đăng ký..." : "Đăng ký"}
                  </button>
                </form>
              )}

              <p className="mt-6 text-[#737373] text-sm">
                Đã có tài khoản?{" "}
                <button
                  onClick={() => onSwitchMode("login")}
                  className="text-white hover:underline font-semibold"
                >
                  Đăng nhập ngay.
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="relative z-10 text-center py-4 text-xs text-[#737373]">
        © 2026 CineNoir Cinemas. All rights reserved.
      </div>
    </div>
  );
}