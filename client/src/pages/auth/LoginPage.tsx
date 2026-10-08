import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import toast from "react-hot-toast";

interface LoginPageProps {
  defaultMode?: "signin" | "signup";
}

export const LoginPage: React.FC<LoginPageProps> = ({
  defaultMode = "signin",
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const qMode = searchParams.get("mode");
  const mode: "signin" | "signup" =
    qMode === "signup" || qMode === "signin" ? qMode : defaultMode;

  const setMode = (newMode: "signin" | "signup") => {
    setSearchParams({ mode: newMode });
  };

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  const { login, signup, isAuthenticated, user } = useAuth();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  // GSAP animation refs
  const pageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      toast(`You are currently signed in as ${user.name}`, { icon: "ℹ️" });
      navigate("/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
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
    }, pageRef);

    return () => ctx.revert();
  }, [reduceMotion]);

  const handleFillDemo = () => {
    setEmail("student@campus.edu");
    setPassword("campus2026!");
    toast.success("Loaded demo credentials", { duration: 2500 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const safeEmail = email.trim() || "user@wmsu.edu.ph";
    const safeFirstName = firstName.trim() || "User";
    const safeLastName = lastName.trim() || "Guest";
    const safePassword = password || "password123";
    const safeConfirmPassword = confirmPassword || safePassword;

    if (mode === "signin") {
      if (!email.trim()) {
        toast.error("Please enter your school email address.");
        return;
      }
    }

    if (
      mode === "signup" &&
      password &&
      confirmPassword &&
      password !== confirmPassword
    ) {
      toast.error("Passwords do not match.");
      return;
    }

    setEmail(safeEmail);
    setFirstName(safeFirstName);
    setLastName(safeLastName);
    setPassword(safePassword);
    setConfirmPassword(safeConfirmPassword);
    setIsLoading(true);

    try {
      if (mode === "signin") {
        const success = await login(email, password);
        setIsLoading(false);

        if (success) {
          navigate("/dashboard");
          return;
        }

        return;
      }

      const fullName =
        `${safeFirstName} ${middleInitial ? `${middleInitial}.` : ""} ${safeLastName}`
          .replace(/\s+/g, " ")
          .trim();

      await signup({
        name: fullName,
        email: safeEmail,
        password: safePassword,
      });

      // Smooth simulated network transit to 6-digit OTP verification
      setTimeout(() => {
        setIsLoading(false);
        navigate(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
      }, 500);
    } catch {
      setIsLoading(false);
      toast.error("An error occurred during submission. Please try again.");
    }
  };

  return (
    <div
      ref={pageRef}
      className="relative min-h-[calc(100svh-5rem)] py-12 md:py-16 overflow-hidden flex items-center justify-center bg-white text-neutral-900 select-none"
    >
      {/* Background Campus Image Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/campus.jpg"
          alt="Campus backdrop"
          className="w-full h-full object-cover object-center opacity-10 filter brightness-75"
        />
        <div className="absolute inset-0 bg-white/90 backdrop-blur-[3px]" />
      </div>

      {/* Atmospheric Glow Blurs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-red-400/20 rounded-full blur-[140px] pointer-events-none z-10" />
      <div className="absolute top-12 left-10 w-80 h-80 bg-[#E5192D]/10 rounded-full blur-3xl pointer-events-none z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-rose-400/10 rounded-full blur-3xl pointer-events-none z-10" />

      {/* Foreground Content */}
      <div className="relative z-20 w-full max-w-xl mx-auto px-4 sm:px-6 flex flex-col items-center">
        {/* Hero Headline */}
        <h1
          ref={titleRef}
          className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-neutral-900 text-center leading-[1.1] mb-3"
        >
          {mode === "signin" ? "Sign in to " : "Create your "}
          <span className="text-[#E5192D] relative inline-block drop-shadow-[0_0_35px_rgba(229,25,45,0.45)]">
            FoundIt.
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
          className="text-sm sm:text-base text-neutral-500 max-w-md mx-auto text-center leading-relaxed font-normal mb-8"
        >
          {mode === "signin"
            ? "Access your campus account to manage reports, claim items, and verify identity."
            : "Join the community network to help reunite students and campus members with lost belongings."}
        </p>

        {/* Card */}
        <div
          ref={cardRef}
          className="w-full bg-white rounded-3xl shadow-2xl shadow-red-100/80 border border-neutral-200 backdrop-blur-xl p-6 sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1 min-w-0">
                      <label htmlFor="first-name" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                        First Name <span className="text-[#E5192D]">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                        <input
                          id="first-name"
                          name="firstName"
                          type="text"
                          autoComplete="given-name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Alex"
                          className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-100 text-neutral-900 placeholder-neutral-500 text-sm transition-[border-color,background-color,box-shadow] focus-visible:outline-none"
                        />
                      </div>
                    </div>

                    <div className="w-[38%] min-w-[110px] max-w-[160px]">
                      <label htmlFor="middle-initial" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                        Middle Initial{" "}
                        <span className="text-neutral-400 text-[10px] normal-case">
                          (Optional)
                        </span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                        <input
                          id="middle-initial"
                          name="middleInitial"
                          type="text"
                          autoComplete="additional-name"
                          value={middleInitial}
                          onChange={(e) =>
                            setMiddleInitial(e.target.value.slice(0, 1))
                          }
                          placeholder="e.g. M"
                          className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-100 text-neutral-900 placeholder-neutral-500 text-sm transition-[border-color,background-color,box-shadow] focus-visible:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="last-name" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                      Last Name <span className="text-[#E5192D]">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                      <input
                        id="last-name"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Rivera"
                        className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-100 text-neutral-900 placeholder-neutral-500 text-sm transition-[border-color,background-color,box-shadow] focus-visible:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-email" className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  School Email <span className="text-[#E5192D]">*</span>
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="text-[11px] text-[#E5192D] hover:underline flex items-center gap-1 font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    Fill Demo User
                  </button>
                )}
              </div>
              <div className="relative">
                <Mail className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@wmsu.edu.ph"
                  className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-100 text-neutral-900 placeholder-neutral-500 text-sm transition-[border-color,background-color,box-shadow] focus-visible:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Password <span className="text-[#E5192D]">*</span>
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() =>
                      toast(
                        "Enter your email and click Continue to verify via 6-digit OTP",
                        {
                          icon: "🔑",
                        },
                      )
                    }
                    className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 pl-11 pr-11 bg-neutral-50 rounded-xl border border-neutral-200 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-100 text-neutral-900 placeholder-neutral-500 text-sm transition-[border-color,background-color,box-shadow] focus-visible:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-500 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Confirm Password <span className="text-[#E5192D]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="auth-confirm-password"
                    name="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-100 text-neutral-900 placeholder-neutral-500 text-sm transition-[border-color,background-color,box-shadow] focus-visible:outline-none"
                  />
                </div>
              </div>
            )}

            {mode === "signup" && (
              <label className="flex items-start gap-2.5 pt-1 text-xs text-neutral-500 cursor-pointer">
                <input
                  name="honor-code"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 bg-white text-[#E5192D] focus:ring-red-200"
                />
                <span>
                  I agree to the FoundIt Campus Honor Code and community
                  verification guidelines.
                </span>
              </label>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading || (mode === "signup" && !agreeTerms)}
                className="w-full h-12 sm:h-13 rounded-2xl bg-[#E5192D] hover:bg-[#c91424] text-white font-bold text-sm sm:text-base shadow-xl shadow-red-600/30 hover:shadow-red-600/50 transition-[background-color,box-shadow,transform] duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending 6-Digit Code...
                  </span>
                ) : (
                  <>
                    <span>{mode === "signin" ? "Sign In" : "Register"}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center text-sm text-neutral-500">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="rounded-sm font-semibold text-[#E5192D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="rounded-sm font-semibold text-[#E5192D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {mode === "signin" && (
            <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
              <p className="text-xs text-neutral-500">Office of Student Affairs</p>
              <Link
                to="/admin"
                className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                Open OSA dashboard demo
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <p className="mt-2 text-[10px] text-neutral-400">
                UI preview only. No staff sign-in is performed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
