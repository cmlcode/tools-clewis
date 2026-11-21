// src/features/account/AccountPage.tsx
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, paths } from "@/routes/paths";
import { call } from "@/lib/http";

type Message = { kind: "ok" | "error"; text: string };

export function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirm) {
      setMessage({ kind: "error", text: "The new passwords don't match." });
      return;
    }

    setBusy(true);
    const r = await call<{ ok: true }>(api.auth.changePassword, "POST", {
      currentPassword,
      newPassword,
    });
    setBusy(false);

    if (r.ok) {
      setMessage({
        kind: "ok",
        text: "Password changed. Your other devices have been signed out.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } else {
      setMessage({ kind: "error", text: r.error });
    }
  }

  return (
    <main>
      <p>
        <Link to={paths.launcher}>← Back</Link>
      </p>

      <h1>Change password</h1>

      <form onSubmit={onSubmit}>
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={12}
            maxLength={200}
            required
          />
        </label>
        <small>At least 12 characters.</small>

        <label>
          Confirm new password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Change password"}
        </button>
      </form>

      {message && <p role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
    </main>
  );
}
