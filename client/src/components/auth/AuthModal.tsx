import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, KeyRound, Mail, RotateCcw, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";

type AuthMode = "signin" | "signup";
type SignupScreen = "email" | "profile" | "verify";

interface AuthModalProps {
  initialMode: AuthMode;
  onClose: () => void;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthModal({ initialMode, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupScreen, setSignupScreen] = useState<SignupScreen>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationCountdown, setVerificationCountdown] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const verificationInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { login, signup, currentOtp, verifyOtp, sendOtp } = useAuth();

  const screenKey =
    mode === "signin" ? "signin" : `signup-${signupScreen}`;
  const screenOrder: Record<string, number> = {
    signin: 0,
    "signup-email": 1,
    "signup-profile": 2,
    "signup-verify": 3,
  };
  const screenVariants = {
    enter: (direction: number) => ({
      opacity: reduceMotion ? 1 : 0,
      x: reduceMotion ? 0 : direction * 14,
    }),
    center: { opacity: 1, x: 0 },
    exit: (direction: number) => ({
      opacity: reduceMotion ? 1 : 0,
      x: reduceMotion ? 0 : direction * -14,
    }),
  };

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    emailInputRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    if (mode === "signin" || signupScreen === "email") {
      emailInputRef.current?.focus();
    } else if (signupScreen === "profile") {
      firstNameInputRef.current?.focus();
    } else if (signupScreen === "verify") {
      verificationInputRef.current?.focus();
    }
  }, [mode, signupScreen]);

  const focusActiveField = () => {
    if (mode === "signin" || signupScreen === "email") {
      emailInputRef.current?.focus();
    } else if (signupScreen === "profile") {
      firstNameInputRef.current?.focus();
    } else {
      verificationInputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (signupScreen !== "verify" || verificationCountdown <= 0) return;
    const timer = window.setTimeout(
      () => setVerificationCountdown((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [signupScreen, verificationCountdown]);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    const nextKey = nextMode === "signin" ? "signin" : "signup-email";
    setTransitionDirection(
      screenOrder[nextKey] > screenOrder[screenKey] ? 1 : -1,
    );
    setMode(nextMode);
    setSignupScreen("email");
    setError("");
    setPassword("");
  };

  const changeSignupScreen = (nextScreen: SignupScreen) => {
    const nextKey = `signup-${nextScreen}`;
    setTransitionDirection(
      screenOrder[nextKey] > screenOrder[screenKey] ? 1 : -1,
    );
    setSignupScreen(nextScreen);
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      emailInputRef.current?.focus();
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(normalizedEmail, password);
      if (!success) {
        setError("We couldn't sign you in with those credentials. Check your email and password and try again.");
        return;
      }
      onClose();
      navigate("/dashboard");
    } catch {
      setError("Sign in failed. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid Gmail address to continue.");
      emailInputRef.current?.focus();
      return;
    }
    if (!normalizedEmail.endsWith("@gmail.com")) {
      setError("Use a Gmail address ending in @gmail.com.");
      emailInputRef.current?.focus();
      return;
    }

    setEmail(normalizedEmail);
    setError("");
    changeSignupScreen("profile");
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!firstName.trim()) {
      setError("Enter your first name.");
      firstNameInputRef.current?.focus();
      return;
    }
    if (!lastName.trim()) {
      setError("Enter your last name.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("Enter a password between 8 and 128 characters.");
      return;
    }

    const fullName = [
      firstName.trim(),
      middleInitial.trim() ? `${middleInitial.trim()}.` : "",
      lastName.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    setIsLoading(true);
    try {
      const success = await signup({
        name: fullName,
        email,
        password,
      });
      if (!success) {
        setError("We couldn't create your account. Check your details and try again.");
        return;
      }
      setVerificationCode("");
      setVerificationCountdown(30);
      changeSignupScreen("verify");
    } catch {
      setError("Account creation failed. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyOtp(verificationCode);
      if (!result.success) {
        setError(result.message || "That code didn't work. Check it and try again.");
        return;
      }
      onClose();
      navigate("/dashboard");
    } catch {
      setError("Verification failed. Check your connection and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = () => {
    if (verificationCountdown > 0) return;
    sendOtp(email);
    setVerificationCode("");
    setVerificationCountdown(30);
    setError("");
  };

  const fillDemoCode = () => {
    setVerificationCode(currentOtp || "123456");
    setError("");
  };

  const title =
    mode === "signin"
      ? "Welcome back"
      : signupScreen === "email"
        ? "Join FoundIt"
        : signupScreen === "profile"
          ? "Your details"
          : "Verify your email";

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-neutral-950/45 px-4 py-6 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        layout
        className="relative my-auto max-h-[calc(100dvh-3rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:p-8"
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.99 }}
        transition={{
          duration: reduceMotion ? 0 : 0.22,
          ease: "easeOut",
          layout: reduceMotion
            ? { duration: 0 }
            : { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
        }}
        onKeyDown={handleDialogKeyDown}
      >
        <button
          type="button"
          aria-label="Close authentication dialog"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="pr-10">
          <p className="text-sm font-extrabold tracking-tight text-neutral-900">
            Found<span className="text-[#E5192D]">It</span>
          </p>
          <h2
            id="auth-modal-title"
            className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-900"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
            {mode === "signin"
              ? "Sign in to manage your reports and claims."
              : signupScreen === "email"
                ? "Start with your Gmail address."
                : signupScreen === "profile"
                  ? "Create your account with your personal details."
                  : `Enter the 6-digit code sent to ${email}.`}
          </p>
        </div>

        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={transitionDirection}
          onExitComplete={focusActiveField}
        >
          {mode === "signin" ? (
            <motion.form
              key="signin"
              className="mt-6 space-y-4"
              noValidate
              onSubmit={handleSignIn}
              custom={transitionDirection}
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <label className="block text-sm font-semibold text-neutral-800" htmlFor="modal-signin-email">
                Email address
              </label>
              <input
                ref={emailInputRef}
                id="modal-signin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                required
                maxLength={254}
                aria-invalid={Boolean(error)}
                className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                placeholder="you@example.com"
              />
              <label className="block text-sm font-semibold text-neutral-800" htmlFor="modal-signin-password">
                Password
              </label>
              <PasswordInput
                id="modal-signin-password"
                value={password}
                onChange={setPassword}
                showPassword={showPassword}
                onToggleVisibility={() => setShowPassword((shown) => !shown)}
                autoComplete="current-password"
              />
              {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </button>
              <p className="pt-1 text-center text-sm text-neutral-600">
                New to FoundIt?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="rounded-sm font-bold text-[#B42332] underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Sign Up
                </button>
              </p>
            </motion.form>
          ) : signupScreen === "email" ? (
            <motion.form
              key="signup-email"
              className="mt-6 space-y-4"
              noValidate
              onSubmit={handleContinue}
              custom={transitionDirection}
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <label className="block text-sm font-semibold text-neutral-800" htmlFor="modal-signup-email">
                Gmail address
              </label>
              <input
                ref={emailInputRef}
                id="modal-signup-email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                required
                maxLength={254}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "signup-email-error" : undefined}
                className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                placeholder="you@gmail.com"
              />
              {error && <p id="signup-email-error" role="alert" className="text-sm font-medium text-red-700">{error}</p>}
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                Continue
              </button>
              <p className="pt-1 text-center text-sm text-neutral-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="rounded-sm font-bold text-[#B42332] underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Sign In
                </button>
              </p>
            </motion.form>
          ) : signupScreen === "profile" ? (
            <motion.form
              key="signup-profile"
              className="mt-6 space-y-4"
              noValidate
              onSubmit={handleCreateAccount}
              custom={transitionDirection}
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-500">Email address</p>
                  <p className="truncate text-sm font-semibold text-neutral-900">{email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    changeSignupScreen("email");
                  }}
                  className="shrink-0 rounded-sm text-xs font-bold text-[#B42332] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-800" htmlFor="modal-first-name">
                    First Name
                  </label>
                  <input
                    ref={firstNameInputRef}
                    id="modal-first-name"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => {
                      setFirstName(event.target.value);
                      setError("");
                    }}
                    required
                    maxLength={80}
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-neutral-800" htmlFor="modal-middle-initial">
                    Middle Initial{" "}
                    <span className="font-normal text-neutral-500">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="modal-middle-initial"
                    type="text"
                    autoComplete="additional-name"
                    value={middleInitial}
                    onChange={(event) =>
                      setMiddleInitial(event.target.value.slice(0, 1))
                    }
                    maxLength={1}
                    aria-label="Middle Initial (optional)"
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>
              {error && error.includes("first name") && (
                <p role="alert" className="text-sm font-medium text-red-700">{error}</p>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-800" htmlFor="modal-last-name">
                  Last Name
                </label>
                <input
                  id="modal-last-name"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    setError("");
                  }}
                  required
                  maxLength={80}
                  aria-invalid={error === "Enter your last name."}
                  className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                />
                {error === "Enter your last name." && (
                  <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">{error}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-neutral-800" htmlFor="modal-signup-password">
                  Password
                </label>
                <PasswordInput
                  id="modal-signup-password"
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    setError("");
                  }}
                  showPassword={showPassword}
                  onToggleVisibility={() => setShowPassword((shown) => !shown)}
                  autoComplete="new-password"
                />
                <p className="mt-1.5 text-xs text-neutral-600">
                  Use 8–128 characters.
                </p>
                {error.includes("Password") && (
                  <p role="alert" className="mt-1 text-sm font-medium text-red-700">{error}</p>
                )}
              </div>

              {error && !error.includes("first name") && error !== "Enter your last name." && !error.includes("Password") && (
                <p role="alert" className="text-sm font-medium text-red-700">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    changeSignupScreen("email");
                  }}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-neutral-300 px-4 text-sm font-bold text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[#E5192D] px-4 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                >
                  {isLoading ? "Creating account…" : "Create Account"}
                </button>
              </div>
              <p className="text-center text-sm text-neutral-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="rounded-sm font-bold text-[#B42332] underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Sign In
                </button>
              </p>
            </motion.form>
          ) : (
            <motion.form
              key="signup-verify"
              className="mt-6 space-y-5"
              noValidate
              onSubmit={handleVerifyEmail}
              custom={transitionDirection}
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-start gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#B42332]" aria-hidden="true" />
                <p className="min-w-0 break-all text-sm font-semibold text-neutral-800">
                  {email}
                </p>
              </div>
              <div>
                <label
                  htmlFor="modal-verification-code"
                  className="mb-2 block text-sm font-semibold text-neutral-800"
                >
                  6-digit verification code
                </label>
                <input
                  ref={verificationInputRef}
                  id="modal-verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(event) => {
                    setVerificationCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    );
                    setError("");
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "verification-code-error" : "verification-code-hint"}
                  className="h-14 w-full rounded-xl border border-neutral-300 bg-white px-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-neutral-900 outline-none transition placeholder:tracking-normal focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                  placeholder="000000"
                />
                <p id="verification-code-hint" className="mt-2 text-xs text-neutral-600">
                  In this demo, the code is also shown in the notification.
                </p>
                {error && (
                  <p id="verification-code-error" role="alert" className="mt-2 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isVerifying || verificationCode.length !== 6}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifying ? (
                  "Verifying code…"
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    Verify email
                  </>
                )}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4 text-sm">
                <span className="text-neutral-600">Didn&apos;t get the code?</span>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={verificationCountdown > 0}
                  className="inline-flex items-center gap-1.5 rounded-sm font-bold text-[#B42332] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:text-neutral-500"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {verificationCountdown > 0
                    ? `Resend in ${verificationCountdown}s`
                    : "Resend code"}
                </button>
              </div>
              <button
                type="button"
                onClick={fillDemoCode}
                className="mx-auto inline-flex min-h-10 items-center gap-1.5 rounded-sm text-xs font-semibold text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                Fill demo code
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  autoComplete: string;
}

function PasswordInput({
  id,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  autoComplete,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type={showPassword ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={autoComplete === "new-password" ? 8 : undefined}
        maxLength={autoComplete === "new-password" ? 128 : undefined}
        className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 pr-12 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
      />
      <button
        type="button"
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        onClick={onToggleVisibility}
        className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
