// src/features/launcher/LauncherPage.tsx
import { ToolCard, type LiveStatus } from "./components/ToolCard";
import { tools, type Tool } from "./data/tools";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { Link } from "react-router-dom";
import { paths } from "@/routes/paths";
import { useBarStatus } from "@/features/bar/hooks/useBarStatus";

export function LauncherPage() {
  const { loggedIn, email, role, logout } = useAuthStatus();
  const { isOpen } = useBarStatus();

  // The bar's tile shows whether the bar is open right now, not a fixed label.
  // Matches on href, ref or title so it still works if the tool entry is written differently.
  function isBarTool(tool: Tool) {
    const clean = (v: string) => v.toLowerCase().replace(/\/+$/, "");
    return (
      [tool.href, tool.ref].some((v) => clean(v).endsWith("/bar")) ||
      tool.title.trim().toLowerCase() === "bar"
    );
  }

  function liveStatusFor(tool: Tool): LiveStatus | undefined {
    if (!isBarTool(tool)) return undefined;
    if (isOpen === null) return { label: "Checking…", tone: "building" };
    return isOpen ? { label: "Open", tone: "open" } : { label: "Closed", tone: "closed" };
  }

  const visibleTools = tools.filter(
    (tool) => tool.public || loggedIn
  );

  return (
    <div className="wrap">
      <header>
        <div className="header-top">
          <p className="eyebrow">
            clewis.tech / <Link to={'/'} className="eyebrow">tools</Link>
          </p>

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
        <p>Utilities I build</p>
      </header>

      <div className="grid">
        {visibleTools.length === 0 ? (
          <div className="empty">Nothing built yet.</div>
        ) : (
          visibleTools.map((tool) => (
            <ToolCard key={tool.ref} tool={tool} liveStatus={liveStatusFor(tool)} />
          ))
        )}
      </div>

      <footer className="footer-row">
        <span>tools.clewis.tech</span>
        {loggedIn === null ? null : loggedIn ? (
          <span>Signed in as {email}</span>
        ) : (
          <span>Public tools</span>
        )}
      </footer>
    </div>
  );
}
