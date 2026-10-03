import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
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
  const navigate = useNavigate();

  // GSAP animation refs
  const pageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      toast(`You are currently signed in as ${user.name}`, { icon: "ℹ️" });
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
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
  }, []);

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
          navigate("/");
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                        First Name <span className="text-[#E5192D]">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Alex"
                          className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 text-neutral-900 placeholder-neutral-400 text-sm transition-all focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="w-[38%] min-w-[110px] max-w-[160px]">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                        Middle Initial{" "}
                        <span className="text-neutral-400 text-[10px] normal-case">
                          (Optional)
                        </span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={middleInitial}
                          onChange={(e) =>
                            setMiddleInitial(e.target.value.slice(0, 1))
                          }
                          placeholder="e.g. M"
                          className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 text-neutral-900 placeholder-neutral-400 text-sm transition-all focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                      Last Name <span className="text-[#E5192D]">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Rivera"
                        className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 text-neutral-900 placeholder-neutral-400 text-sm transition-all focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  School Email <span className="text-[#E5192D]">*</span>
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="text-[11px] text-[#E5192D] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Fill Demo User
                  </button>
                )}
              </div>
              <div className="relative">
                <Mail className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@wmsu.edu.ph"
                  className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 text-neutral-900 placeholder-neutral-400 text-sm transition-all focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
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
                    className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 pl-11 pr-11 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 text-neutral-900 placeholder-neutral-400 text-sm transition-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Confirm Password <span className="text-[#E5192D]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 text-neutral-900 placeholder-neutral-400 text-sm transition-all focus:outline-none"
                  />
                </div>
              </div>
            )}

            {mode === "signup" && (
              <label className="flex items-start gap-2.5 pt-1 text-xs text-neutral-500 cursor-pointer">
                <input
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
                className="w-full h-12 sm:h-13 rounded-2xl bg-[#E5192D] hover:bg-[#c91424] text-white font-bold text-sm sm:text-base shadow-xl shadow-red-600/30 hover:shadow-red-600/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending 6-Digit Code...
                  </span>
                ) : (
                  <>
                    <span>{mode === "signin" ? "Sign In" : "Register"}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
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
                  className="font-semibold text-[#E5192D] hover:underline"
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
                  className="font-semibold text-[#E5192D] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
