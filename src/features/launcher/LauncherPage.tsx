import { ToolCard } from "./components/ToolCard";
import { tools } from "./data/tools";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { Link } from "react-router-dom";

export function LauncherPage() {
  const { loggedIn, logout } = useAuthStatus();

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
              <button
                type="button"
                className="nav-tab"
                onClick={logout}
              >
                Log out
              </button>
            ) : (
              <a className="nav-tab" href="/auth/login">
                Log in
              </a>
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
