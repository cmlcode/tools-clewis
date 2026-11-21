// src/features/launcher/LauncherPage.tsx
import { ToolCard } from "./components/ToolCard";
import { tools } from "./data/tools";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { Link } from "react-router-dom";
import { paths } from "@/routes/paths";

export function LauncherPage() {
  const { loggedIn, role, logout } = useAuthStatus();

  const visibleTools = tools.filter(
    (tool) => tool.public || loggedIn
  );

  return (
    <div className="wrap">
      <header>
        <div className="header-top">
          <p className="eyebrow"><Link to={'/'} className="eyebrow">Tools</Link></p>

          <nav className="nav">
            {loggedIn === null ? null : loggedIn ? (
              <>
                {role === "admin" && (
                  <Link className="nav-tab" to={paths.admin}>
                    Admin
                  </Link>
                )}
                <Link className="nav-tab" to={paths.account}>
                  Account
                </Link>
                <button
                  type="button"
                  className="nav-tab"
                  onClick={() => void logout()}
                >
                  Log out
                </button>
              </>
            ) : (
              <Link className="nav-tab" to={paths.login}>
                Log in
              </Link>
            )}
          </nav>
        </div>

        <h1>Tools</h1>
        <p>Personal utilities</p>
      </header>

      <div className="grid">
        {visibleTools.length === 0 ? (
          <div className="empty">Nothing built yet.</div>
        ) : (
          visibleTools.map((tool) => (
            <ToolCard key={tool.ref} tool={tool} />
          ))
        )}
      </div>

      <footer>tools.clewis.tech</footer>
    </div>
  );
}
