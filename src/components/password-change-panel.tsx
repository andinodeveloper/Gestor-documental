"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { completeMandatoryPasswordChangeAction } from "@/app/change-password/actions";
import { PasswordVisibilityIcon } from "@/components/icons";
import { LogoutButton } from "@/components/logout-button";
import { SubmitButton } from "@/components/submit-button";

export function PasswordChangePanel({
  name,
  username,
}: {
  name: string;
  username: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="surface-card w-full max-w-[560px] p-6 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="section-label">Cambio obligatorio</p>
          <h1 className="display-title text-[1.9rem] md:text-[2.2rem]">Actualiza tu contrasena</h1>
          <p className="text-sm leading-6 text-slate">
            Iniciaste sesion con una contrasena temporal. Debes definir una clave personal antes
            de continuar.
          </p>
        </div>

        <LogoutButton />
      </div>

      <div className="mt-5 rounded-[18px] border border-line bg-white/88 px-4 py-4">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="mt-1 text-sm text-slate">{username}</p>
      </div>

      <form
        className="mt-5 space-y-4"
        action={async (formData) => {
          setError(null);

          try {
            const result = await completeMandatoryPasswordChangeAction(formData);

            if (!result.ok) {
              setError(result.message ?? "No fue posible validar la nueva contrasena.");
              return;
            }

            router.replace(result.redirectTo ?? "/");
          } catch {
            setError("No fue posible actualizar la contrasena en este momento.");
          }
        }}
      >
        <PasswordField
          label="Nueva contrasena"
          name="password"
          placeholder="NuevaClave123!"
          value={password}
          visible={isPasswordVisible}
          onChange={setPassword}
          onToggleVisibility={() => setIsPasswordVisible((value) => !value)}
        />

        <PasswordField
          label="Confirmar contrasena"
          name="confirmPassword"
          placeholder="NuevaClave123!"
          value={confirmPassword}
          visible={isConfirmPasswordVisible}
          onChange={setConfirmPassword}
          onToggleVisibility={() => setIsConfirmPasswordVisible((value) => !value)}
        />

        {error ? (
          <div className="rounded-[18px] border border-red/18 bg-red-soft px-4 py-3 text-sm leading-6 text-red">
            {error}
          </div>
        ) : null}

        <div className="rounded-[18px] border border-line bg-panel-muted/55 px-4 py-4 text-sm leading-6 text-slate">
          Usa una clave de al menos 8 caracteres. Al guardarla, se desactiva el requerimiento de
          cambio y podras entrar con esa nueva contrasena en el siguiente acceso.
        </div>

        <SubmitButton
          idleLabel="Guardar y continuar"
          pendingLabel="Guardando..."
          className="button-primary w-full disabled:cursor-wait disabled:opacity-70"
        />
      </form>
    </section>
  );
}

function PasswordField({
  label,
  name,
  placeholder,
  value,
  visible,
  onChange,
  onToggleVisibility,
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>

      <div className="relative">
        <input
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="password-input field-input pr-14"
          placeholder={placeholder}
          autoComplete="new-password"
          required
        />

        <button
          type="button"
          className="absolute inset-y-2 right-2 inline-flex w-10 items-center justify-center rounded-[14px] border border-line bg-panel-muted/75 text-foreground transition hover:border-line-strong hover:bg-panel-muted"
          onClick={onToggleVisibility}
          aria-label={visible ? "Ocultar contrasena" : "Mostrar contrasena"}
        >
          <PasswordVisibilityIcon revealed={visible} className="h-4 w-4" />
        </button>
      </div>
    </label>
  );
}
