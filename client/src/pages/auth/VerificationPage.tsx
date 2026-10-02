import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import gsap from "gsap";
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  KeyRound,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import toast from "react-hot-toast";

export const VerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    pendingEmail,
    currentOtp,
    verifyOtp,
    sendOtp,
    isAuthenticated,
  } = useAuth();

  const email = searchParams.get("email") || pendingEmail || "student@campus.edu";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState<number>(30);
  const canResend = countdown === 0;

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // GSAP animation refs
  const pageRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const digitsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Entrance animations matching HeroSection
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        tagRef.current,
        { opacity: 0, y: -15 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.1 },
      )
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.3",
        )
        .fromTo(
          subtitleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.5",
        )
        .fromTo(
          cardRef.current,
          { opacity: 0, y: 25, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.1)" },
          "-=0.4",
        );

      if (digitsRef.current) {
        tl.fromTo(
          digitsRef.current.children,
          { opacity: 0, y: 15, scale: 0.85 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            stagger: 0.05,
            duration: 0.5,
            ease: "back.out(1.4)",
          },
          "-=0.4",
        );
      }
    }, pageRef);

    // Initial focus on first input
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 400);

    return () => {
      ctx.revert();
      clearTimeout(timer);
    };
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    const char = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto advance to next slot
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveSlot(index + 1);
    }

    // Check if fully filled
    if (index === 5 && newDigits.every((d) => d !== "")) {
      handleSubmit(newDigits.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (digits[index] === "" && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
        setActiveSlot(index - 1);
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveSlot(index - 1);
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveSlot(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      if (i < pasted.length) {
        newDigits[i] = pasted[i];
      }
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
    setActiveSlot(nextIndex);

    if (newDigits.every((d) => d !== "")) {
      handleSubmit(newDigits.join(""));
    }
  };

  const handleAutoFillDemo = () => {
    const code = currentOtp && currentOtp.length === 6 ? currentOtp : "123456";
    const newDigits = code.split("");
    setDigits(newDigits);
    inputRefs.current[5]?.focus();
    setActiveSlot(5);
    toast.success(`Filled demo authentication code: ${code}`, {
      duration: 3000,
      icon: "✨",
    });
  };

  const handleResend = () => {
    if (!canResend) return;
    setCountdown(30);
    sendOtp(email);
    setDigits(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    setActiveSlot(0);
  };

  const handleSubmit = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join("");
    if (code.length < 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyOtp(code);
      if (result.success) {
        setTimeout(() => {
          setIsVerifying(false);
          navigate("/");
        }, 600);
      } else {
        setIsVerifying(false);
        toast.error(result.message || "Invalid verification code.");

        // Shake animation effect on failure
        if (cardRef.current) {
          gsap.fromTo(
            cardRef.current,
            { x: -10 },
            {
              x: 10,
              duration: 0.08,
              repeat: 5,
              yoyo: true,
              ease: "sine.inOut",
              onComplete: () => {
                gsap.to(cardRef.current, { x: 0, duration: 0.1 });
              },
            },
          );
        }
      }
    } catch {
      setIsVerifying(false);
      toast.error("Verification failed. Please try again.");
    }
  };

  return (
    <div
      ref={pageRef}
      className="relative min-h-[calc(100svh-5rem)] py-12 md:py-16 overflow-hidden flex items-center justify-center bg-neutral-950 text-white select-none"
    >
      {/* Background Campus Image Layer matching HeroSection */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/campus.jpg"
          alt="Campus backdrop"
          className="w-full h-full object-cover object-center opacity-25 filter brightness-50"
        />
        <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-[3px]" />
      </div>

      {/* Atmospheric Glow Blurs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none z-10" />
      <div className="absolute top-12 left-10 w-80 h-80 bg-[#E5192D]/10 rounded-full blur-3xl pointer-events-none z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none z-10" />

      {/* Foreground Container */}
      <div className="relative z-20 w-full max-w-xl mx-auto px-4 sm:px-6 flex flex-col items-center">
        {/* Navigation Breadcrumb */}
        <div className="w-full flex items-center justify-between mb-6 text-xs text-neutral-400">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Email / Back</span>
          </Link>
          <span className="flex items-center gap-1 text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            2FA Verification
          </span>
        </div>

        {/* Hero Tag */}
        <div
          ref={tagRef}
          className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 border border-white/15 shadow-sm backdrop-blur-md mb-5"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5192D] animate-pulse" />
          <span className="text-xs sm:text-sm font-bold tracking-[0.18em] text-neutral-200 uppercase">
            Two-Step Authentication &bull; 6 Digits
          </span>
        </div>

        {/* Hero Headline */}
        <h1
          ref={titleRef}
          className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white text-center leading-[1.1] mb-3"
        >
          Verify Your{" "}
          <span className="text-[#E5192D] relative inline-block drop-shadow-[0_0_35px_rgba(229,25,45,0.45)]">
            Identity.
            <svg
              className="absolute -bottom-2 left-0 w-full h-3.5 text-[#E5192D]/50"
              viewBox="0 0 200 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 9C50 3 150 3 197 9"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        <p
          ref={subtitleRef}
          className="text-sm sm:text-base text-neutral-300 max-w-md mx-auto text-center leading-relaxed font-normal mb-8"
        >
          We sent a 6-digit confirmation code to{" "}
          <span className="text-white font-semibold underline underline-offset-4 decoration-[#E5192D]">
            {email}
          </span>
          . Enter the code below to complete authentication.
        </p>

        {/* Glassmorphism Card */}
        <div
          ref={cardRef}
          className="w-full bg-neutral-900/90 rounded-3xl shadow-2xl shadow-black/80 border border-white/15 backdrop-blur-xl p-6 sm:p-8 flex flex-col items-center"
        >
          {/* Email Badge with quick change link */}
          <div className="w-full flex items-center justify-between p-3 bg-neutral-800/80 rounded-2xl border border-neutral-700/60 mb-6 text-xs">
            <div className="flex items-center gap-2 truncate text-neutral-300">
              <Mail className="w-4 h-4 text-[#E5192D] shrink-0" />
              <span className="truncate">{email}</span>
            </div>
            <Link
              to="/login"
              className="text-[#E5192D] hover:underline font-semibold shrink-0 ml-2"
            >
              Edit
            </Link>
          </div>

          {/* 6 Digit Inputs */}
          <div
            ref={digitsRef}
            className="flex items-center justify-center gap-2.5 sm:gap-3.5 mb-6 w-full"
          >
            {digits.map((digit, index) => {
              const isFilled = digit !== "";
              const isActive = activeSlot === index;

              return (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete="one-time-code"
                  aria-label={`Digit ${index + 1}`}
                  value={digit}
                  onFocus={() => setActiveSlot(index)}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-black rounded-2xl bg-neutral-800/90 border transition-all duration-200 focus:outline-none ${
                    isActive
                      ? "border-[#E5192D] ring-4 ring-red-500/25 bg-neutral-800 text-white scale-105"
                      : isFilled
                        ? "border-neutral-500 text-white bg-neutral-800/90"
                        : "border-neutral-700/80 text-neutral-400 hover:border-neutral-600"
                  }`}
                />
              );
            })}
          </div>

          {/* Demo Helper Pill */}
          <div className="mb-6 flex items-center justify-between w-full p-2.5 bg-neutral-800/50 rounded-xl border border-dashed border-neutral-700/60 text-xs">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Demo Code:{" "}
              <strong className="text-white font-mono tracking-wider">
                {currentOtp || "123456"}
              </strong>
            </span>
            <button
              type="button"
              onClick={handleAutoFillDemo}
              className="text-xs font-semibold text-[#E5192D] hover:underline cursor-pointer flex items-center gap-1"
            >
              Auto-fill Demo &rarr;
            </button>
          </div>

          {/* Action Button */}
          <Button
            onClick={() => handleSubmit()}
            disabled={isVerifying || digits.some((d) => d === "")}
            className="w-full h-12 sm:h-13 rounded-2xl bg-[#E5192D] hover:bg-[#c91424] text-white font-bold text-sm sm:text-base shadow-xl shadow-red-600/30 hover:shadow-red-600/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 mb-4"
          >
            {isVerifying ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying Authenticity...
              </span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Verify & Sign In</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </Button>

          {/* Resend Code Section */}
          <div className="w-full flex items-center justify-between text-xs text-neutral-400 pt-3 border-t border-neutral-800">
            <span>Didn't receive the code?</span>
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                className="font-bold text-[#E5192D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Resend Code
              </button>
            ) : (
              <span className="text-neutral-500 font-mono">
                Resend in {countdown}s
              </span>
            )}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Verified Campus Access
          </span>
          <span className="text-neutral-600">&bull;</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#E5192D]" />
            Anti-Fraud Protection
          </span>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
