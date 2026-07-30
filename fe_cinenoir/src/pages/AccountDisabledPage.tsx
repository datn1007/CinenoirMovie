import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { ROUTES } from "../constants/routes";

export default function AccountDisabledPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#141414] px-4 text-[#e5e2e1]">
      <div className="w-full max-w-md rounded-2xl border border-[#5e3f3b]/40 bg-[#1c1b1b] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e50914]/10 border border-[#e50914]/30">
          <ShieldAlert className="h-8 w-8 text-[#e50914]" />
        </div>
        <h1 className="text-xl font-black text-white">Tài khoản đã bị vô hiệu hóa</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#e9bcb6]/75">
          Vui lòng liên hệ admin để được hỗ trợ.
        </p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.LOGIN, { replace: true })}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-[#e50914] py-3 text-xs font-black uppercase tracking-wide text-white transition hover:brightness-110"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  );
}
