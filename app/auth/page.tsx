"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyVault, createVault } from "../../lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [errorStatus, setErrorStatus] = useState("");

  // Auto-redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("soul_link_id");
    if (token) {
      router.replace("/journal");
    }
  }, [router]);

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorStatus("");
    if (!username || !pin) {
      setErrorStatus("Vault Name and Pin are required.");
      return;
    }

    if (pin.length !== 6 || isNaN(Number(pin))) {
      setErrorStatus("Pin must be exactly 6 digits.");
      return;
    }

    try {
      if (isRegistering) {
        if (!question || !answer) {
          setErrorStatus("Security question and answer are required for recovery.");
          return;
        }
        const res = await createVault(username, pin, question, answer);
        if (res.success && res.user) {
          localStorage.setItem("soul_link_id", res.user.id);
          localStorage.setItem("soul_link_username", res.user.username);
          router.replace("/journal");
        } else {
          setErrorStatus(res.error || "Failed to create vault.");
        }
      } else {
        const res = await verifyVault(username, pin);
        if (res.success && res.user) {
          localStorage.setItem("soul_link_id", res.user.id);
          localStorage.setItem("soul_link_username", res.user.username);
          router.replace("/journal");
        } else {
          setErrorStatus(res.error || "Invalid credentials.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus("An unexpected error occurred.");
    }
  };

  return (
    <div className="flex flex-col h-screen pt-12 p-6 md:p-12 max-w-md mx-auto items-center justify-center">
      <div className="w-full bg-surface-container rounded-3xl p-8 border border-outline-variant shadow-lg flex flex-col items-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">Soul-Link</h1>
        <p className="text-sm text-outline text-center mb-8">
          {isRegistering ? "Create your secure sanctuary vault." : "Enter your Identity Vault."}
        </p>

        {errorStatus && (
          <div className="w-full p-3 mb-4 rounded-xl bg-error/10 text-error text-center text-sm">
            {errorStatus}
          </div>
        )}

        <form className="w-full space-y-4" onSubmit={handleAuth}>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Vault Name</label>
            <input
              type="text"
              placeholder="e.g. Neo"
              className="w-full p-3 rounded-xl bg-surface border border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">6-Digit PIN</label>
            <input
              type="password"
              maxLength={6}
              placeholder="••••••"
              className="w-full p-3 rounded-xl bg-surface border border-outline-variant text-on-surface tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Secret Question</label>
                <input
                  type="text"
                  placeholder="e.g. What is my first pet's name?"
                  className="w-full p-3 rounded-xl bg-surface border border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Secret Answer</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full p-3 rounded-xl bg-surface border border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full mt-4 p-[12px] bg-primary text-on-primary rounded-full font-bold hover:opacity-90 active:scale-95 transition-all text-lg shadow-md cursor-pointer"
          >
            {isRegistering ? "Forge Vault" : "Unlock"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setErrorStatus("");
            setPin("");
            setQuestion("");
            setAnswer("");
          }}
          className="mt-6 text-sm text-primary hover:underline"
        >
          {isRegistering ? "Already have a Vault? Unlock it" : "Need a Sanctuary? Forge one"}
        </button>
      </div>
    </div>
  );
}
