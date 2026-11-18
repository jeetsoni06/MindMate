"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyVault, createVault } from "../../lib/supabase";
import { Sparkles, Lock, ShieldCheck, UserPlus, KeyRound, HelpCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

type AuthMode = "login" | "register" | "forgot";

export default function AuthPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [errorStatus, setErrorStatus] = useState("");
  const [successStatus, setSuccessStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot PIN state
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [recoveryQuestion, setRecoveryQuestion] = useState("");
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");

  // Auto-fill username if remembered on this device so returning user only enters PIN
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('blocked=1')) {
      setErrorStatus("This account has been suspended by an administrator.");
    }
    const rememberedUser = localStorage.getItem("soul_link_username");
    if (rememberedUser) {
      setUsername(rememberedUser);
    }
  }, []);

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorStatus("");
    setSuccessStatus("");
    
    const cleanUser = username.trim();
    const cleanPin = pin.trim();

    if (!cleanUser || !cleanPin) {
      setErrorStatus("User Name and Password are required.");
      return;
    }

    if (cleanPin.length !== 6 || isNaN(Number(cleanPin))) {
      setErrorStatus("PIN must be exactly 6 digits.");
      return;
    }

    setLoading(true);

    try {
      if (authMode === "register") {
        if (!question.trim() || !answer.trim()) {
          setErrorStatus("Security question and answer are required for recovery.");
          setLoading(false);
          return;
        }
        const res = await createVault(cleanUser, cleanPin, question.trim(), answer.trim());
        if (res.success && res.user) {
          sessionStorage.setItem("soul_link_id", res.user.id);
          sessionStorage.setItem("soul_link_username", res.user.username);
          localStorage.setItem("soul_link_username", res.user.username);
          router.replace("/journal");
        } else {
          setErrorStatus(res.error || "Failed to forge vault.");
        }
      } else {
        const res = await verifyVault(cleanUser, cleanPin);
        if (res.success && res.user) {
          // Check if blocked by admin
          try {
            const hb = await fetch('/api/user/heartbeat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: res.user.id })
            });
            const hbData = await hb.json();
            if (hbData.blocked) {
              setErrorStatus("This account has been suspended by an administrator.");
              setLoading(false);
              return;
            }
          } catch (e) {
            // continue if network check fails
          }

          sessionStorage.setItem("soul_link_id", res.user.id);
          sessionStorage.setItem("soul_link_username", res.user.username);
          localStorage.setItem("soul_link_username", res.user.username);
          router.replace("/journal");
        } else {
          setErrorStatus(res.error || "Invalid User Name or Password.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of Forgot PIN: Fetch recovery question
  const handleFetchRecoveryQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorStatus("");
    setSuccessStatus("");

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorStatus("Please enter your User Name first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/recovery-question?username=${encodeURIComponent(cleanUser)}`);
      const data = await res.json();

      if (data.success && data.securityQuestion) {
        setRecoveryQuestion(data.securityQuestion);
        setForgotStep(2);
      } else {
        setErrorStatus(data.error || "No Sanctuary Vault found with this name.");
      }
    } catch (err) {
      console.error("Error looking up recovery question:", err);
      setErrorStatus("Failed to look up recovery details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 of Forgot PIN: Submit answer and set new 6-digit PIN
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus("");
    setSuccessStatus("");

    const cleanUser = username.trim();
    const cleanAnswer = recoveryAnswer.trim();
    const cleanNewPin = newPin.trim();
    const cleanConfirm = confirmNewPin.trim();

    if (!cleanAnswer) {
      setErrorStatus("Please enter your recovery answer.");
      return;
    }

    if (cleanNewPin.length !== 6 || isNaN(Number(cleanNewPin))) {
      setErrorStatus("New PIN must be exactly 6 digits.");
      return;
    }

    if (cleanNewPin !== cleanConfirm) {
      setErrorStatus("New PIN and Confirm PIN do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          answer: cleanAnswer,
          newPin: cleanNewPin
        })
      });

      const data = await res.json();
      if (data.success && data.user) {
        setSuccessStatus("PIN reset successfully! Unlocking your Sanctuary Vault...");
        
        // Log in user automatically with new credentials
        sessionStorage.setItem("soul_link_id", data.user.id);
        sessionStorage.setItem("soul_link_username", data.user.username);
        localStorage.setItem("soul_link_username", data.user.username);

        setTimeout(() => {
          router.replace("/journal");
        }, 1200);
      } else {
        setErrorStatus(data.error || "Failed to reset PIN. Please check your answer.");
      }
    } catch (err) {
      console.error("Reset PIN error:", err);
      setErrorStatus("An unexpected error occurred while resetting PIN.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotPin = () => {
    setAuthMode("forgot");
    setForgotStep(1);
    setRecoveryQuestion("");
    setRecoveryAnswer("");
    setNewPin("");
    setConfirmNewPin("");
    setErrorStatus("");
    setSuccessStatus("");

    // If username is already present, automatically look up question
    if (username.trim()) {
      handleFetchRecoveryQuestion();
    }
  };

  const handleBackToLogin = () => {
    setAuthMode("login");
    setForgotStep(1);
    setErrorStatus("");
    setSuccessStatus("");
    setPin("");
  };

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-pink-500/5 flex flex-col items-center">
        
        {/* Brand Header */}
        <div className="w-14 h-14 rounded-2xl bg-pink-50 text-[#b42243] flex items-center justify-center mb-4 shadow-sm border border-pink-100">
          {authMode === "forgot" ? <HelpCircle size={28} /> : <Sparkles size={28} />}
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-1 text-center">
          {authMode === "forgot" ? "Reset Sanctuary PIN" : "MindMate"}
        </h1>
        {authMode === "forgot" && (
          <p className="text-sm text-gray-500 text-center mb-6">
            Verify your recovery question to forge a new PIN
          </p>
        )}
        {authMode === "register" && (
          <p className="text-sm text-gray-500 text-center mb-6">
            Create your private sanctuary vault
          </p>
        )}
        {authMode === "login" && <div className="mb-4" />}

        {errorStatus && (
          <div className="w-full p-3.5 mb-5 rounded-2xl bg-red-50 border border-red-100 text-[#b42243] text-center text-sm font-semibold">
            {errorStatus}
          </div>
        )}

        {successStatus && (
          <div className="w-full p-3.5 mb-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-center text-sm font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            {successStatus}
          </div>
        )}

        {/* ========================================================= */}
        {/* FORGOT PIN FLOW                                           */}
        {/* ========================================================= */}
        {authMode === "forgot" ? (
          <div className="w-full">
            {forgotStep === 1 ? (
              // Step 1: Enter User Name
              <form className="w-full space-y-4" onSubmit={handleFetchRecoveryQuestion}>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Your User Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maya"
                    className="w-full p-3.5 rounded-2xl bg-[#FDF8F9] border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b42243] text-sm font-medium"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    We will find the security question you registered with this vault.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !username.trim()}
                  className="w-full mt-2 py-3.5 bg-[#b42243] hover:bg-[#9a1a36] text-white rounded-full font-bold transition-all text-base shadow-lg shadow-[#b42243]/20 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    "Find Recovery Question"
                  )}
                </button>
              </form>
            ) : (
              // Step 2: Answer question & set new PIN
              <form className="w-full space-y-4" onSubmit={handleResetPin}>
                {/* Highlighted Recovery Question */}
                <div className="p-4 rounded-2xl bg-pink-50/70 border border-pink-100 text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#b42243] block mb-1">
                    Your Security Question
                  </span>
                  <p className="text-sm font-bold text-gray-800">
                    &ldquo;{recoveryQuestion}&rdquo;
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Your Secret Answer
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your recovery answer"
                    className="w-full p-3.5 rounded-2xl bg-[#FDF8F9] border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b42243] text-sm font-medium"
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    New 6-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    className="w-full p-3.5 rounded-2xl bg-[#FDF8F9] border border-gray-200 text-gray-900 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#b42243] text-xl font-bold"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    className="w-full p-3.5 rounded-2xl bg-[#FDF8F9] border border-gray-200 text-gray-900 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#b42243] text-xl font-bold"
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !recoveryAnswer.trim() || newPin.length !== 6 || confirmNewPin.length !== 6}
                  className="w-full mt-2 py-3.5 bg-[#b42243] hover:bg-[#9a1a36] text-white rounded-full font-bold transition-all text-base shadow-lg shadow-[#b42243]/20 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    "Reset PIN & Unlock"
                  )}
                </button>
              </form>
            )}

            {/* Back to Login Link */}
            <div className="w-full mt-6 pt-5 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} /> Back to Login
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* LOGIN & REGISTER FLOW                                     */
          /* ========================================================= */
          <form className="w-full space-y-4" onSubmit={handleAuth}>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                User Name
              </label>
              <input
                type="text"
                placeholder="e.g. Maya"
                className="w-full p-3.5 rounded-2xl bg-[#FDF8F9] border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b42243] text-sm font-medium"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={handleOpenForgotPin}
                    className="text-xs font-bold text-[#b42243] hover:underline cursor-pointer"
                  >
                    Forgot PIN?
                  </button>
                )}
              </div>
              <input
                type="password"
                maxLength={6}
                placeholder="••••••"
                className="w-full p-3.5 rounded-2xl bg-[#FDF8F9] border border-gray-200 text-gray-900 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#b42243] text-xl font-bold"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="off"
              />
            </div>

            {authMode === "register" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Recovery Question
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Name of your first pet?"
                    className="w-full p-3.5 rounded-2xl bg-[#FDF8F9] border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b42243] text-sm"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Recovery Answer
                  </label>
                  <input
                    type="password"
                    placeholder="Secret answer"
                    className="w-full p-3.5 rounded-2xl bg-[#FDF8F9] border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#b42243] text-sm"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-[#b42243] hover:bg-[#9a1a36] text-white rounded-full font-bold transition-all text-base shadow-lg shadow-[#b42243]/20 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : authMode === "register" ? (
                <>
                  <UserPlus size={18} />
                  Forge Sanctuary Vault
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  Login
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        {authMode !== "forgot" && (
          <div className="w-full mt-6 pt-6 border-t border-gray-100 flex flex-col gap-2 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "register" ? "login" : "register");
                setErrorStatus("");
                setSuccessStatus("");
                setPin("");
                setQuestion("");
                setAnswer("");
              }}
              className="text-sm font-semibold text-[#b42243] hover:underline cursor-pointer"
            >
              {authMode === "register"
                ? "Already have an account? Login"
                : "New user? sign up"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
