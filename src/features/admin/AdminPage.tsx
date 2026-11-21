// src/features/admin/AdminPage.tsx
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { paths } from "@/routes/paths";
import type { ApiResult } from "@/lib/http";
import type { UserDto } from "@/shared/auth";
import { createManager, deleteUser, listUsers, updateUser } from "./adminApi";
 
type Message = { kind: "ok" | "error"; text: string };
 
export function AdminPage() {
  const [users, setUsers] = useState<UserDto[] | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
 
  const refresh = useCallback(async () => {
    const r = await listUsers();
    if (r.ok) setUsers(r.data);
    else setMessage({ kind: "error", text: r.error });
  }, []);
 
  useEffect(() => {
    void refresh();
  }, [refresh]);
 
  return (
    <main>
      <p>
        <Link to={paths.launcher}>← Back</Link>
      </p>
 
      <h1>Managers</h1>
 
      <AddManagerForm onMessage={setMessage} onCreated={refresh} />
 
      {message && <p role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
 
      <h2>Accounts</h2>
      {users === null ? (
        <p>Loading…</p>
      ) : users.length === 0 ? (
        <p>No manager accounts yet.</p>
      ) : (
        <ul>
          {users.map((u) => (
            <UserRow key={u.id} user={u} onMessage={setMessage} onChanged={refresh} />
          ))}
        </ul>
      )}
    </main>
  );
}
 
function AddManagerForm({
  onMessage,
  onCreated,
}: {
  onMessage: (m: Message) => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
 
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const cleanEmail = email.trim();
    const r = await createManager(cleanEmail, password);
    setBusy(false);
 
    if (r.ok) {
      onMessage({ kind: "ok", text: `Manager account created for ${cleanEmail}.` });
      setEmail("");
      setPassword("");
      onCreated();
    } else {
      onMessage({ kind: "error", text: r.error });
    }
  }
 
  return (
    <form onSubmit={onSubmit}>
      <h2>Add manager</h2>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          required
        />
      </label>
 
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={12}
          maxLength={200}
          required
        />
      </label>
      <small>At least 12 characters.</small>
 
      <button type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create manager"}
      </button>
    </form>
  );
}
 
function UserRow({
  user,
  onMessage,
  onChanged,
}: {
  user: UserDto;
  onMessage: (m: Message) => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
 
  async function run(action: () => Promise<ApiResult<unknown>>, okText: string): Promise<boolean> {
    setBusy(true);
    const r = await action();
    setBusy(false);
 
    if (r.ok) {
      onMessage({ kind: "ok", text: okText });
      onChanged();
    } else {
      onMessage({ kind: "error", text: r.error });
    }
    return r.ok;
  }
 
  async function onReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = await run(
      () => updateUser(user.id, { password: newPassword }),
      `Password reset for ${user.email}. They have been signed out everywhere.`
    );
    if (ok) {
      setResetting(false);
      setNewPassword("");
    }
  }
 
  return (
    <li>
      <span>{user.email}</span>{" "}
      <small>
        ({user.role}
        {user.disabled ? ", disabled" : ""})
      </small>{" "}
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void run(
            () => updateUser(user.id, { disabled: !user.disabled }),
            user.disabled ? `${user.email} enabled.` : `${user.email} disabled and signed out.`
          )
        }
      >
        {user.disabled ? "Enable" : "Disable"}
      </button>{" "}
      <button type="button" disabled={busy} onClick={() => setResetting((r) => !r)}>
        Reset password
      </button>{" "}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (window.confirm(`Remove ${user.email}? This cannot be undone.`)) {
            void run(() => deleteUser(user.id), `${user.email} removed.`);
          }
        }}
      >
        Remove
      </button>
 
      {resetting && (
        <form onSubmit={onReset}>
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
          <button type="submit" disabled={busy}>
            Save
          </button>
        </form>
      )}
    </li>
  );
}
 
