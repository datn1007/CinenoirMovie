import { Check, X } from "lucide-react";
import { checkPassword, getPasswordStrength, PASSWORD_STRENGTH_LABEL } from "../lib/validation";

const STRENGTH_COLOR: Record<string, string> = {
  empty: "bg-[#333]",
  weak: "bg-[#e50914]",
  medium: "bg-[#e87c03]",
  strong: "bg-[#e9c349]",
  "very-strong": "bg-[#2ecc71]",
};

const STRENGTH_TEXT_COLOR: Record<string, string> = {
  empty: "text-[#8c8c8c]",
  weak: "text-[#e50914]",
  medium: "text-[#e87c03]",
  strong: "text-[#e9c349]",
  "very-strong": "text-[#2ecc71]",
};

const STRENGTH_BARS: Record<string, number> = {
  empty: 0,
  weak: 1,
  medium: 2,
  strong: 3,
  "very-strong": 4,
};

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] ${met ? "text-[#2ecc71]" : "text-[#8c8c8c]"}`}>
      {met ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
      <span>{label}</span>
    </div>
  );
}

export default function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const checks = checkPassword(password);
  const filledBars = STRENGTH_BARS[strength];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i < filledBars ? STRENGTH_COLOR[strength] : "bg-[#333]"}`}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold shrink-0 ${STRENGTH_TEXT_COLOR[strength]}`}>
          {PASSWORD_STRENGTH_LABEL[strength]}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <Requirement met={checks.minLength} label="Ít nhất 8 ký tự" />
        <Requirement met={checks.hasUpper} label="Chữ hoa (A-Z)" />
        <Requirement met={checks.hasLower} label="Chữ thường (a-z)" />
        <Requirement met={checks.hasNumber} label="Số (0-9)" />
        <Requirement met={checks.hasSpecial} label="Ký tự đặc biệt (!@#$...)" />
      </div>
    </div>
  );
}
