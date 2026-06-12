"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PasswordVisibilityIcon } from "@/components/icons";
import { roleLabels } from "@/lib/auth/policy";
import type { DemoCredential } from "@/lib/auth/types";

export function LoginPanel({ demoAccounts }: { demoAccounts: DemoCredential[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [credential, setCredential] = useState(demoAccounts[0]?.username ?? "");
  const [password, setPassword] = useState(demoAccounts[0]?.password ?? "");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError("");
    setNotice("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/forgot-password";
    const payload = mode === "login" ? { credential, password } : { credential };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as
        | { message?: string; redirectTo?: string }
        | null;

      if (!response.ok) {
        setError(result?.message ?? "No fue posible procesar la solicitud.");
        return;
      }

      if (mode === "forgot") {
        setNotice(result?.message ?? "Se inicio el flujo de restablecimiento.");
        setMode("login");
        return;
      }

      router.replace(result?.redirectTo ?? "/dashboard");
    } catch {
      setError("No fue posible completar la autenticacion en este momento.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="surface-card w-full max-w-[460px] p-6 sm:p-7">
      <div className="mb-6 space-y-2">
        <p className="section-label">Acceso</p>
        <h1 className="display-title text-[1.9rem] md:text-[2.2rem]">
          {mode === "login" ? "Ingresar" : "Recuperar contrasena"}
        </h1>
        <p className="text-sm leading-6 text-slate">
          {mode === "login"
            ? "Acceso local con credenciales demo o usuario real."
            : "Te enviaremos un flujo de restablecimiento segun el usuario registrado."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-foreground">Usuario o email</span>
          <input
            value={credential}
            onChange={(event) => setCredential(event.target.value)}
            className="w-full rounded-[18px] border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(15,77,93,0.08)]"
            placeholder="usuario / correo"
            required
          />
        </label>

        {mode === "login" ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-foreground">Contrasena</span>
            <div className="relative">
              <input
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="password-input w-full rounded-[18px] border border-line bg-white px-4 py-3 pr-14 text-sm outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(15,77,93,0.08)]"
                placeholder="Contrasena"
                required
              />
              <button
                type="button"
                className="absolute inset-y-2 right-2 inline-flex w-10 items-center justify-center rounded-[14px] border border-line bg-panel-muted/75 text-foreground transition hover:border-line-strong hover:bg-panel-muted"
                onClick={() => setIsPasswordVisible((value) => !value)}
                aria-label={isPasswordVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
              >
                <PasswordVisibilityIcon
                  revealed={isPasswordVisible}
                  className="h-4 w-4"
                />
              </button>
            </div>
          </label>
        ) : null}

        {error ? (
          <div className="rounded-[18px] border border-red/18 bg-red-soft px-4 py-3 text-sm leading-6 text-red">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-[18px] border border-green/18 bg-green-soft px-4 py-3 text-sm leading-6 text-green">
            {notice}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="button-primary w-full disabled:cursor-wait disabled:opacity-70"
        >
          {isPending ? "Procesando..." : mode === "login" ? "Ingresar" : "Enviar"}
        </button>
      </form>

      <div className="mt-5 rounded-[18px] border border-line bg-white/88 p-4">
        <p className="section-label">Demo</p>
        <div className="mt-3 space-y-2">
          {demoAccounts.map((account) => (
            <button
              key={account.username}
              type="button"
              onClick={() => {
                setCredential(account.username);
                setPassword(account.password);
                setIsPasswordVisible(false);
                setMode("login");
                setError("");
                setNotice("");
              }}
              className="w-full rounded-[16px] border border-line bg-panel-muted/60 px-4 py-3 text-left hover:border-line-strong hover:bg-panel-muted/80"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                {roleLabels[account.role]}
              </p>
              <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-foreground">
                {account.username}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate">
        <button
          type="button"
          className="font-semibold text-accent"
          onClick={() => {
            setMode(mode === "login" ? "forgot" : "login");
            setIsPasswordVisible(false);
          }}
        >
          {mode === "login" ? "Olvide mi contrasena" : "Volver"}
        </button>
        <span>Acceso por usuario o correo.</span>
      </div>
    </section>
  );
}
