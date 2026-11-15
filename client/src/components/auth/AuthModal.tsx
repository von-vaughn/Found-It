import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import axios from "axios";
import { Eye, EyeOff, KeyRound, RotateCcw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { isSchoolEmail, SCHOOL_EMAIL_DOMAINS } from "@/context/auth-context";
import { authService } from "@/services/authService";
import { paths } from "@/routes/paths";

type AuthMode = "signin" | "signup" | "forgot";
type SignupScreen = "email" | "profile" | "verify";
type ForgotScreen = "email" | "reset";
type ScreenTransition = { direction: number; immediate: boolean };

interface AuthModalProps {
  initialMode: AuthMode;
  onClose: () => void;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Wrapper for the primary action on each screen. It deliberately does not stick
// or pin on mobile: the whole dialog scrolls as one column, header and action
// bar included, so nothing is frozen to the viewport.
const actionDockClass = "mt-4 sm:mt-0";

export function AuthModal({ initialMode, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupScreen, setSignupScreen] = useState<SignupScreen>("email");
  const [forgotScreen, setForgotScreen] = useState<ForgotScreen>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationCountdown, setVerificationCountdown] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetCountdown, setResetCountdown] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [isSwitchingAuthMode, setIsSwitchingAuthMode] = useState(false);
  const [skipScreenAnimation, setSkipScreenAnimation] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const schoolIdInputRef = useRef<HTMLInputElement>(null);
  const verificationInputRef = useRef<HTMLInputElement>(null);
  const resetCodeInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { login, signup, verifyOtp, resendOtp, checkEmailAvailability } =
    useAuth();

  const screenKey =
    mode === "signin"
      ? "signin"
      : mode === "forgot"
        ? `forgot-${forgotScreen}`
        : `signup-${signupScreen}`;
  const screenOrder: Record<string, number> = {
    signin: 0,
    "forgot-email": 1,
    "forgot-reset": 2,
    "signup-email": 1,
    "signup-profile": 2,
    "signup-verify": 3,
  };
  const screenVariants = {
    enter: ({ direction, immediate }: ScreenTransition) => ({
      opacity: reduceMotion || immediate ? 1 : 0,
      x: reduceMotion || immediate ? 0 : direction * 14,
    }),
    center: { opacity: 1, x: 0 },
    exit: ({ direction, immediate }: ScreenTransition) => ({
      opacity: reduceMotion || immediate ? 1 : 0,
      x: reduceMotion || immediate ? 0 : direction * -14,
    }),
  };
  const screenTransition = {
    direction: transitionDirection,
    immediate: isSwitchingAuthMode || skipScreenAnimation,
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
    if (
      mode === "signin" ||
      (mode === "signup" && signupScreen === "email") ||
      (mode === "forgot" && forgotScreen === "email")
    ) {
      emailInputRef.current?.focus();
    } else if (mode === "signup" && signupScreen === "profile") {
      firstNameInputRef.current?.focus();
    } else if (mode === "signup" && signupScreen === "verify") {
      verificationInputRef.current?.focus();
    } else if (mode === "forgot" && forgotScreen === "reset") {
      resetCodeInputRef.current?.focus();
    }
  }, [mode, signupScreen, forgotScreen]);

  const focusActiveField = () => {
    if (
      mode === "signin" ||
      (mode === "signup" && signupScreen === "email") ||
      (mode === "forgot" && forgotScreen === "email")
    ) {
      emailInputRef.current?.focus();
    } else if (mode === "signup" && signupScreen === "profile") {
      firstNameInputRef.current?.focus();
    } else if (mode === "signup" && signupScreen === "verify") {
      verificationInputRef.current?.focus();
    } else {
      resetCodeInputRef.current?.focus();
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

  useEffect(() => {
    if (mode !== "forgot" || forgotScreen !== "reset" || resetCountdown <= 0) {
      return;
    }
    const timer = window.setTimeout(
      () => setResetCountdown((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [mode, forgotScreen, resetCountdown]);

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
    const nextKey =
      nextMode === "signin"
        ? "signin"
        : nextMode === "forgot"
          ? "forgot-email"
          : "signup-email";
    setIsSwitchingAuthMode(true);
    setSkipScreenAnimation(false);
    setTransitionDirection(
      screenOrder[nextKey] > screenOrder[screenKey] ? 1 : -1,
    );
    setMode(nextMode);
    setSignupScreen("email");
    setForgotScreen("email");
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
    setResetCode("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const changeSignupScreen = (nextScreen: SignupScreen) => {
    const nextKey = `signup-${nextScreen}`;
    const shouldSkip =
      (signupScreen === "email" && nextScreen === "profile") ||
      (signupScreen === "profile" && nextScreen === "email");
    setIsSwitchingAuthMode(false);
    setSkipScreenAnimation(shouldSkip);
    setTransitionDirection(
      screenOrder[nextKey] > screenOrder[screenKey] ? 1 : -1,
    );
    setSignupScreen(nextScreen);
  };

  const changeForgotScreen = (nextScreen: ForgotScreen) => {
    const nextKey = `forgot-${nextScreen}`;
    setIsSwitchingAuthMode(false);
    setSkipScreenAnimation(false);
    setTransitionDirection(
      screenOrder[nextKey] > screenOrder[screenKey] ? 1 : -1,
    );
    setForgotScreen(nextScreen);
  };

  const extractErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError<{ message?: string }>(err)) {
      return err.response?.data?.message || fallback;
    }
    return fallback;
  };

  const getSafeRedirect = (defaultRolePath: string): string => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get("redirect");
      if (
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//") &&
        !redirectParam.includes(":")
      ) {
        return redirectParam;
      }
    } catch {
      // fallback
    }
    return defaultRolePath;
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
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
      const res = await login(normalizedEmail, password);
      if (!res.success) {
        if (res.requiresVerification) {
          setEmail(normalizedEmail);
          setVerificationCode("");
          setVerificationCountdown(60);
          switchMode("signup");
          setSignupScreen("verify");
          setError(
            res.message ||
              "Email not verified. Enter your 6-digit verification code.",
          );
          return;
        }
        setError(res.message || "Invalid email or password.");
        return;
      }
      onClose();
      const rolePath =
        res.role === "admin" || res.role === "super_admin"
          ? paths.admin
          : paths.dashboard;
      navigate(getSafeRedirect(rolePath));
    } catch {
      setError("Sign in failed. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid school email to continue.");
      emailInputRef.current?.focus();
      return;
    }
    if (!isSchoolEmail(normalizedEmail)) {
      setError(
        `Use your school email ending in ${SCHOOL_EMAIL_DOMAINS.join(" or ")}.`,
      );
      emailInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const checkFn = checkEmailAvailability || authService.checkEmail;
      const res = await checkFn(normalizedEmail);
      if (!res.available) {
        setError(res.message || "An account with this email already exists.");
        emailInputRef.current?.focus();
        return;
      }
      setEmail(normalizedEmail);
      changeSignupScreen("profile");
    } catch {
      setError("Unable to verify email availability. Check your connection.");
      emailInputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
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
    const trimmedSchoolId = schoolId.trim();
    if (!trimmedSchoolId) {
      setError("Enter your school ID.");
      schoolIdInputRef.current?.focus();
      return;
    }
    if (
      trimmedSchoolId.length < 3 ||
      trimmedSchoolId.length > 30 ||
      !/^[A-Za-z0-9-]+$/.test(trimmedSchoolId)
    ) {
      setError("Enter a valid school ID (3–30 letters, numbers, or hyphens).");
      schoolIdInputRef.current?.focus();
      return;
    }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setError("Enter a password between 8 and 72 characters.");
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
      const res = await signup({
        name: fullName,
        email,
        schoolId: trimmedSchoolId,
        password,
      });
      if (!res.success) {
        setError(
          res.message ||
            "We couldn't create your account. Check your details and try again.",
        );
        return;
      }
      setVerificationCode("");
      setVerificationCountdown(60);
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
        setError(
          result.message || "That code didn't work. Check it and try again.",
        );
        return;
      }
      onClose();
      const rolePath =
        result.role === "admin" || result.role === "super_admin"
          ? paths.admin
          : paths.dashboard;
      navigate(getSafeRedirect(rolePath));
    } catch {
      setError("Verification failed. Check your connection and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (verificationCountdown > 0) return;
    const res = await resendOtp(email);
    if (!res.success) {
      setError(
        res.message || "Could not resend code. Please wait before trying again.",
      );
      return;
    }
    setVerificationCode("");
    setVerificationCountdown(60);
    setError("");
  };

  const handleForgotEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      emailInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword({ email: normalizedEmail });
      setEmail(normalizedEmail);
      setResetCode("");
      setPassword("");
      setConfirmPassword("");
      setResetCountdown(60);
      changeForgotScreen("reset");
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          "Unable to send reset code. Please check your connection and try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(resetCode)) {
      setError("Enter the complete 6-digit reset code.");
      resetCodeInputRef.current?.focus();
      return;
    }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setError("Enter a password between 8 and 72 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.resetPassword({
        email,
        otp: resetCode,
        newPassword: password,
      });
      setIsSwitchingAuthMode(true);
      setSkipScreenAnimation(false);
      setTransitionDirection(-1);
      setMode("signin");
      setForgotScreen("email");
      setResetCode("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError("");
      setNotice(
        res.message || "Password reset successfully. Sign in with your new password.",
      );
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          "Reset failed. Check your code and try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    if (resetCountdown > 0) return;
    setError("");
    try {
      await authService.forgotPassword({ email });
      setResetCode("");
      setResetCountdown(60);
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          "Could not resend code. Please wait before trying again.",
        ),
      );
    }
  };

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "forgot"
        ? forgotScreen === "email"
          ? "Reset password"
          : "Enter reset code"
        : signupScreen === "email"
          ? "Join FoundIt"
          : signupScreen === "profile"
            ? "Your details"
            : "Verify your email";

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-stretch justify-center overflow-y-auto overscroll-contain bg-white sm:items-center sm:bg-neutral-950/45 sm:px-4 sm:py-6 sm:backdrop-blur-[2px]"
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
        layout={!isSwitchingAuthMode && !skipScreenAnimation}
        className="relative my-auto flex min-h-[100dvh] w-full flex-col overflow-y-auto overscroll-contain bg-white sm:my-auto sm:block sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-md sm:min-h-0 sm:overflow-y-auto sm:rounded-3xl sm:border sm:border-neutral-200 sm:p-8 sm:shadow-2xl"
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.99 }}
        transition={{
          duration: reduceMotion ? 0 : 0.22,
          ease: "easeOut",
          layout:
            reduceMotion || isSwitchingAuthMode || skipScreenAnimation
              ? { duration: 0 }
              : { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
        }}
        onKeyDown={handleDialogKeyDown}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-100 bg-white px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:block sm:border-0 sm:bg-transparent sm:p-0 sm:pr-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <img
                src="/logo.jpeg"
                alt=""
                aria-hidden="true"
                className="h-6 w-6 object-cover rounded-none"
              />
              <p className="text-sm font-extrabold tracking-tight text-neutral-900">
                Found<span className="text-[#E5192D]">It</span>
              </p>
            </div>
            <h2
              id="auth-modal-title"
              className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-900"
            >
              {title}
            </h2>
            {(signupScreen === "email" || signupScreen === "verify") &&
              mode === "signup" && (
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                  {signupScreen === "email"
                    ? `Use ${SCHOOL_EMAIL_DOMAINS.join(", ")}.`
                    : `Code sent to ${email}.`}
                </p>
              )}
            {mode === "forgot" && (
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                {forgotScreen === "email"
                  ? "Enter your account email and we'll send a 6-digit reset code."
                  : `If an account exists for ${email}, enter the code and choose a new password.`}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close authentication dialog"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 sm:absolute sm:right-4 sm:top-4"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-0 sm:pb-0">
          <AnimatePresence
            mode={
              isSwitchingAuthMode || skipScreenAnimation
                ? undefined
                : "popLayout"
            }
            initial={false}
            custom={screenTransition}
            onExitComplete={focusActiveField}
          >
            {mode === "signin" ? (
              <motion.form
                key="signin"
                className="mt-6 flex flex-col gap-4"
                noValidate
                onSubmit={handleSignIn}
                custom={screenTransition}
                variants={screenVariants}
                initial={isSwitchingAuthMode ? false : "enter"}
                animate="center"
                exit="exit"
                transition={{
                  duration: reduceMotion || isSwitchingAuthMode ? 0 : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {notice && (
                  <p
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800"
                  >
                    {notice}
                  </p>
                )}
                <label
                  className="block text-sm font-semibold text-neutral-800"
                  htmlFor="modal-signin-email"
                >
                  Email Address
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
                    setNotice("");
                  }}
                  required
                  maxLength={254}
                  aria-invalid={Boolean(error)}
                  className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                  placeholder="you@example.com"
                />
                <div className="flex items-center justify-between">
                  <label
                    className="block text-sm font-semibold text-neutral-800"
                    htmlFor="modal-signin-password"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="rounded-sm text-xs font-bold text-[#B42332] underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordInput
                  id="modal-signin-password"
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    setError("");
                    setNotice("");
                  }}
                  showPassword={showPassword}
                  onToggleVisibility={() => setShowPassword((shown) => !shown)}
                  autoComplete="current-password"
                />
                {error && (
                  <p role="alert" className="text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}
                <div className={actionDockClass}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isLoading ? "Signing in…" : "Sign In"}
                  </button>
                </div>
                {import.meta.env.DEV && (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                      Dev Demo Accounts (One-Click Fill)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("user@foundit.local");
                          setPassword("User12345!");
                          setError("");
                        }}
                        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                      >
                        Demo Student
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("admin@foundit.local");
                          setPassword("Admin123!");
                          setError("");
                        }}
                        className="inline-flex min-h-8 items-center justify-center rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                      >
                        Demo Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("founditsuperadmin@foundit.local");
                          setPassword("founditSuperAdminOSA!");
                          setError("");
                        }}
                        className="col-span-2 inline-flex min-h-8 items-center justify-center rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                      >
                        Demo Super Admin
                      </button>
                    </div>
                  </div>
                )}
                <p className="pt-1 text-center text-sm text-neutral-600">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="rounded-sm font-bold text-[#B42332] underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    Sign Up
                  </button>
                </p>
              </motion.form>
            ) : mode === "forgot" && forgotScreen === "email" ? (
              <motion.form
                key="forgot-email"
                className="mt-6 flex flex-col gap-4"
                noValidate
                onSubmit={handleForgotEmailSubmit}
                custom={screenTransition}
                variants={screenVariants}
                initial={isSwitchingAuthMode ? false : "enter"}
                animate="center"
                exit="exit"
                transition={{
                  duration: reduceMotion || isSwitchingAuthMode ? 0 : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <label
                  className="block text-sm font-semibold text-neutral-800"
                  htmlFor="modal-forgot-email"
                >
                  Email Address
                </label>
                <input
                  ref={emailInputRef}
                  id="modal-forgot-email"
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
                  aria-describedby={error ? "forgot-email-error" : undefined}
                  className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                  placeholder="you@wmsu.edu.ph"
                />
                {error && (
                  <p
                    id="forgot-email-error"
                    role="alert"
                    className="text-sm font-medium text-red-700"
                  >
                    {error}
                  </p>
                )}
                <div className={actionDockClass}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isLoading ? "Sending code…" : "Send Reset Code"}
                  </button>
                </div>
                <p className="pt-1 text-center text-sm text-neutral-600">
                  Remembered your password?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="rounded-sm font-bold text-[#B42332] underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    Sign In
                  </button>
                </p>
              </motion.form>
            ) : mode === "forgot" ? (
              <motion.form
                key="forgot-reset"
                className="mt-6 flex flex-col gap-4"
                noValidate
                onSubmit={handleResetPassword}
                custom={screenTransition}
                variants={screenVariants}
                initial={isSwitchingAuthMode ? false : "enter"}
                animate="center"
                exit="exit"
                transition={{
                  duration: reduceMotion || isSwitchingAuthMode ? 0 : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-500">
                      Email Address
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900">
                      {email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      changeForgotScreen("email");
                    }}
                    className="ml-3 shrink-0 text-xs font-semibold text-[#E5192D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="modal-reset-code"
                    className="mb-1.5 block text-sm font-semibold text-neutral-800"
                  >
                    6-Digit Reset Code
                  </label>
                  <input
                    ref={resetCodeInputRef}
                    id="modal-reset-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={resetCode}
                    onChange={(event) => {
                      setResetCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      );
                      setError("");
                    }}
                    className="h-14 w-full rounded-xl border border-neutral-300 bg-white px-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-neutral-900 outline-none transition placeholder:tracking-normal focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                    placeholder="000000"
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-semibold text-neutral-800"
                    htmlFor="modal-reset-password"
                  >
                    New Password
                  </label>
                  <PasswordInput
                    id="modal-reset-password"
                    value={password}
                    onChange={(value) => {
                      setPassword(value);
                      setError("");
                    }}
                    showPassword={showPassword}
                    onToggleVisibility={() =>
                      setShowPassword((shown) => !shown)
                    }
                    autoComplete="new-password"
                  />
                  <p className="mt-1.5 text-xs text-neutral-600">
                    Use 8–72 characters.
                  </p>
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-semibold text-neutral-800"
                    htmlFor="modal-reset-confirm-password"
                  >
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="modal-reset-confirm-password"
                    value={confirmPassword}
                    onChange={(value) => {
                      setConfirmPassword(value);
                      setError("");
                    }}
                    showPassword={showConfirmPassword}
                    onToggleVisibility={() =>
                      setShowConfirmPassword((shown) => !shown)
                    }
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <div className={actionDockClass}>
                  <button
                    type="submit"
                    disabled={isLoading || resetCode.length !== 6}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      "Resetting password…"
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                        Reset Password
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4 text-sm">
                  <span className="text-neutral-600">
                    Didn&apos;t get the code?
                  </span>
                  <button
                    type="button"
                    onClick={handleResendResetCode}
                    disabled={resetCountdown > 0}
                    className="inline-flex items-center gap-1.5 rounded-sm font-bold text-[#B42332] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-not-allowed disabled:text-neutral-500"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {resetCountdown > 0
                      ? `Resend in ${resetCountdown}s`
                      : "Resend code"}
                  </button>
                </div>
              </motion.form>
            ) : signupScreen === "email" ? (
              <motion.form
                key="signup-email"
                className="mt-6 flex flex-col gap-4"
                noValidate
                onSubmit={handleContinue}
                custom={screenTransition}
                variants={screenVariants}
                initial={
                  isSwitchingAuthMode || skipScreenAnimation ? false : "enter"
                }
                animate="center"
                exit="exit"
                transition={{
                  duration:
                    reduceMotion || isSwitchingAuthMode || skipScreenAnimation
                      ? 0
                      : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <label
                  className="block text-sm font-semibold text-neutral-800"
                  htmlFor="modal-signup-email"
                >
                  School Email <span className="text-[#E5192D]">*</span>
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
                  placeholder="you@wmsu.edu.ph"
                />
                {error && (
                  <p
                    id="signup-email-error"
                    role="alert"
                    className="text-sm font-medium text-red-700"
                  >
                    {error}
                  </p>
                )}
                <div className={actionDockClass}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#E5192D] px-5 text-sm font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isLoading ? "Checking…" : "Continue"}
                  </button>
                </div>
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
                className="mt-6 flex flex-col gap-4"
                noValidate
                onSubmit={handleCreateAccount}
                custom={screenTransition}
                variants={screenVariants}
                initial={
                  isSwitchingAuthMode || skipScreenAnimation ? false : "enter"
                }
                animate="center"
                exit="exit"
                transition={{
                  duration:
                    reduceMotion || isSwitchingAuthMode || skipScreenAnimation
                      ? 0
                      : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-500">
                      Email Address
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900">
                      {email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      changeSignupScreen("email");
                    }}
                    className="ml-3 shrink-0 text-xs font-semibold text-[#E5192D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    Change
                  </button>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                  <div>
                    <label
                      className="mb-1.5 block min-h-10 text-sm font-semibold text-neutral-800"
                      htmlFor="modal-first-name"
                    >
                      First Name <span className="text-[#E5192D]">*</span>
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
                      maxLength={50}
                      className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block min-h-10 text-sm font-semibold text-neutral-800"
                      htmlFor="modal-middle-initial"
                    >
                      Middle Initial
                    </label>
                    <input
                      id="modal-middle-initial"
                      type="text"
                      autoComplete="additional-name"
                      placeholder="—"
                      value={middleInitial}
                      onChange={(event) =>
                        setMiddleInitial(event.target.value.slice(0, 1))
                      }
                      maxLength={1}
                      aria-label="Middle Initial (optional)"
                      className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-center text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                </div>
                {error && error.includes("first name") && (
                  <p role="alert" className="text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <div>
                  <label
                    className="mb-1.5 block text-sm font-semibold text-neutral-800"
                    htmlFor="modal-last-name"
                  >
                    Last Name <span className="text-[#E5192D]">*</span>
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
                    maxLength={50}
                    aria-invalid={error === "Enter your last name."}
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none transition focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                  />
                  {error === "Enter your last name." && (
                    <p
                      role="alert"
                      className="mt-1.5 text-sm font-medium text-red-700"
                    >
                      {error}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-semibold text-neutral-800"
                    htmlFor="modal-school-id"
                  >
                    School ID <span className="text-[#E5192D]">*</span>
                  </label>
                  <input
                    ref={schoolIdInputRef}
                    id="modal-school-id"
                    type="text"
                    placeholder="e.g. 2021-00318"
                    value={schoolId}
                    onChange={(event) => {
                      setSchoolId(event.target.value);
                      setError("");
                    }}
                    required
                    maxLength={30}
                    aria-invalid={error.toLowerCase().includes("school id")}
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                  />
                  {error.toLowerCase().includes("school id") && (
                    <p
                      role="alert"
                      className="mt-1.5 text-sm font-medium text-red-700"
                    >
                      {error}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-semibold text-neutral-800"
                    htmlFor="modal-signup-password"
                  >
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
                    onToggleVisibility={() =>
                      setShowPassword((shown) => !shown)
                    }
                    autoComplete="new-password"
                  />
                  <p className="mt-1.5 text-xs text-neutral-600">
                    Use 8–72 characters.
                  </p>
                  {error.toLowerCase().includes("password") && (
                    <p
                      role="alert"
                      className="mt-1 text-sm font-medium text-red-700"
                    >
                      {error}
                    </p>
                  )}
                </div>

                {error &&
                  !error.includes("first name") &&
                  error !== "Enter your last name." &&
                  !error.toLowerCase().includes("school id") &&
                  !error.toLowerCase().includes("password") && (
                    <p
                      role="alert"
                      className="text-sm font-medium text-red-700"
                    >
                      {error}
                    </p>
                  )}

                <div className={actionDockClass}>
                  <div className="flex gap-3">
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
                className="mt-6 flex flex-col gap-5"
                noValidate
                onSubmit={handleVerifyEmail}
                custom={screenTransition}
                variants={screenVariants}
                initial={isSwitchingAuthMode ? false : "enter"}
                animate="center"
                exit="exit"
                transition={{
                  duration: reduceMotion || isSwitchingAuthMode ? 0 : 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div>
                    <label
                      htmlFor="modal-verification-code"
                      className="mb-2 block text-sm font-semibold text-neutral-800"
                    >
                      6-Digit Verification Code
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
                    aria-describedby={
                      error ? "verification-code-error" : undefined
                    }
                    className="h-14 w-full rounded-xl border border-neutral-300 bg-white px-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-neutral-900 outline-none transition placeholder:tracking-normal focus:border-[#E5192D] focus:ring-2 focus:ring-red-100"
                    placeholder="000000"
                  />
                  {error && (
                    <p
                      id="verification-code-error"
                      role="alert"
                      className="mt-2 text-sm font-medium text-red-700"
                    >
                      {error}
                    </p>
                  )}
                </div>
                <div className={actionDockClass}>
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
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4 text-sm">
                  <span className="text-neutral-600">
                    Didn&apos;t get the code?
                  </span>
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
              </motion.form>
            )}
          </AnimatePresence>
        </div>
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
        maxLength={autoComplete === "new-password" ? 72 : undefined}
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
