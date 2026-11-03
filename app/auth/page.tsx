"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyVault, createVault } from "../../lib/supabase";
import { Sparkles, Lock, ShieldCheck, UserPlus, KeyRound } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [errorStatus, setErrorStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-fill username if remembered on this device so returning user only enters PIN
  useEffect(() => {
    const rememberedUser = localStorage.getItem("soul_link_username");
    if (rememberedUser) {
      setUsername(rememberedUser);
    }
  }, []);

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorStatus("");
    
    const cleanUser = username.trim();
    const cleanPin = pin.trim();

    if (!cleanUser || !cleanPin) {
      setErrorStatus("Vault Name and PIN are required.");
      return;
    }

    if (cleanPin.length !== 6 || isNaN(Number(cleanPin))) {
      setErrorStatus("PIN must be exactly 6 digits.");
      return;
    }

    setLoading(true);

    try {
      if (isRegistering) {
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
          sessionStorage.setItem("soul_link_id", res.user.id);
          sessionStorage.setItem("soul_link_username", res.user.username);
          localStorage.setItem("soul_link_username", res.user.username);
          router.replace("/journal");
        } else {
          setErrorStatus(res.error || "Invalid Vault Name or PIN.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-pink-500/5 flex flex-col items-center">
        {/* Brand Header */}
        <div className="w-14 h-14 rounded-2xl bg-pink-50 text-[#b42243] flex items-center justify-center mb-4 shadow-sm border border-pink-100">
          <Sparkles size={28} />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-1 text-center">
          MindMate Sanctuary
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          {isRegistering
            ? "Create your private sanctuary vault"
            : "Enter your PIN to unlock your private vault"}
        </p>

        {errorStatus && (
          <div className="w-full p-3 mb-5 rounded-2xl bg-red-50 border border-red-100 text-[#b42243] text-center text-sm font-medium">
            {errorStatus}
          </div>
        )}

        <form className="w-full space-y-4" onSubmit={handleAuth}>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Vault Name
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
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              6-Digit Security PIN
            </label>
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

          {isRegistering && (
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
            ) : isRegistering ? (
              <>
                <UserPlus size={18} />
                Forge Sanctuary Vault
              </>
            ) : (
              <>
                <KeyRound size={18} />
                Unlock Sanctuary
              </>
            )}
          </button>
        </form>

        <div className="w-full mt-6 pt-6 border-t border-gray-100 flex flex-col gap-2 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorStatus("");
              setPin("");
              setQuestion("");
              setAnswer("");
            }}
            className="text-sm font-semibold text-[#b42243] hover:underline cursor-pointer"
          >
            {isRegistering
              ? "Already have a Vault? Unlock it"
              : "Need a new private Vault? Forge one"}
          </button>

          {!isRegistering && username && (
            <button
              type="button"
              onClick={() => {
                setUsername("");
                setPin("");
                setErrorStatus("");
              }}
              className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              Sign into a different Vault name
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
