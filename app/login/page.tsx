"use client";

// app/login/page.tsx
// Email / Password authentication — sign in, sign up, and password reset with sleek Lucide icons.

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  ArrowLeft,
  ArrowRight,
  Send,
} from "lucide-react";
import { useAuth } from "../_hooks/useAuth";

type Mode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === "official") {
        router.replace("/gov");
      } else {
        router.replace("/");
      }
    }
  }, [user, router]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setResetSent(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "reset") {
        await resetPassword(email);
        setResetSent(true);
      } else if (mode === "signup") {
        await signUp(email, password, name);
        router.replace("/");
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb--1" aria-hidden="true" />
      <div className="auth-orb auth-orb--2" aria-hidden="true" />

      <div className="auth-card">
        {/* Logo */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 mx-auto mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>

        {/* Mode tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === "signin" ? " auth-tab--active" : ""}`}
            onClick={() => switchMode("signin")}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`auth-tab${mode === "signup" ? " auth-tab--active" : ""}`}
            onClick={() => switchMode("signup")}
            type="button"
          >
            Create Account
          </button>
        </div>

        {/* Reset password banner */}
        {mode === "reset" && (
          <div className="auth-mode-banner">
            <button
              className="auth-mode-banner__back flex items-center gap-1.5"
              onClick={() => switchMode("signin")}
              type="button"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
            <p className="auth-mode-banner__title">Reset Password</p>
          </div>
        )}

        {/* Success state for password reset */}
        {resetSent ? (
          <div className="auth-reset-success flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <p className="auth-reset-success__text">
              Reset email sent to <strong>{email}</strong>.<br />
              Check your inbox and follow the link.
            </p>
            <button
              className="auth-google-btn"
              style={{ marginTop: 16 }}
              onClick={() => { setResetSent(false); switchMode("signin"); }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>

            {/* Display name — only on sign-up */}
            {mode === "signup" && (
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="auth-name">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  className="auth-field__input"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            {/* Email */}
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="auth-email">
                Email address
              </label>
              <input
                id="auth-email"
                className="auth-field__input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete={mode === "signup" ? "email" : "username"}
              />
            </div>

            {/* Password — hidden on reset mode */}
            {mode !== "reset" && (
              <div className="auth-field">
                <div className="auth-field__row">
                  <label className="auth-field__label" htmlFor="auth-password">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      className="auth-field__forgot"
                      onClick={() => switchMode("reset")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="auth-pwd-wrap relative flex items-center">
                  <input
                    id="auth-password"
                    className="auth-field__input auth-field__input--pwd pr-10"
                    type={showPwd ? "text" : "password"}
                    placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={mode === "signup" ? 6 : undefined}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    className="auth-pwd-toggle absolute right-3 flex items-center justify-center p-1 text-slate-400 hover:text-slate-200"
                    onClick={() => setShowPwd(v => !v)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="auth-card__error" role="alert">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="auth-submit-btn"
              className="auth-submit-btn flex items-center justify-center gap-2"
              type="submit"
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <div className="auth-btn-spinner" />
                  <span>
                    {mode === "signup" ? "Creating account…" : mode === "reset" ? "Sending email…" : "Signing in…"}
                  </span>
                </>
              ) : mode === "signup" ? (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === "reset" ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Reset Email</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {mode === "signup" && (
              <p className="auth-card__legal">
                By creating an account you agree to our Terms of Service.
              </p>
            )}
          </form>
        )}

        {/* Footer link back to welcome */}
        <div className="auth-card__footer">
          <Link href="/welcome" className="auth-card__footer-link flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to welcome</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
