"use client";

// app/login/page.tsx
// Email / Password authentication — sign in and sign up in one page.
// Tabs toggle between modes. Password reset link inline.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../_hooks/useAuth";

type Mode = "signin" | "signup" | "reset";

// Firebase error code → human readable message
function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-credential":     "Incorrect email or password.",
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Incorrect password. Try again.",
    "auth/email-already-in-use":   "An account with this email already exists.",
    "auth/weak-password":          "Password must be at least 6 characters.",
    "auth/invalid-email":          "Please enter a valid email address.",
    "auth/too-many-requests":      "Too many attempts. Try again later or reset your password.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/user-disabled":          "This account has been disabled.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

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
        router.replace("/");
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
        <span className="auth-card__logo-icon">🛣️</span>

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
              className="auth-mode-banner__back"
              onClick={() => switchMode("signin")}
              type="button"
            >
              ← Back to Sign In
            </button>
            <p className="auth-mode-banner__title">Reset Password</p>
          </div>
        )}

        {/* Success state for password reset */}
        {resetSent ? (
          <div className="auth-reset-success">
            <span className="auth-reset-success__icon">📧</span>
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
                <div className="auth-pwd-wrap">
                  <input
                    id="auth-password"
                    className="auth-field__input auth-field__input--pwd"
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
                    className="auth-pwd-toggle"
                    onClick={() => setShowPwd(v => !v)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? "🫣" : "👁️"}
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
              className="auth-submit-btn"
              type="submit"
              disabled={loading || !email}
            >
              {loading ? (
                <><div className="auth-btn-spinner" />
                  {mode === "signup" ? "Creating account…" : mode === "reset" ? "Sending email…" : "Signing in…"}
                </>
              ) : (
                mode === "signup" ? "Create Account →"
                : mode === "reset" ? "Send Reset Email"
                : "Sign In →"
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
          <Link href="/welcome" className="auth-card__footer-link">← Back to welcome</Link>
        </div>
      </div>
    </main>
  );
}
