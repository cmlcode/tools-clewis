// src/features/bar/BarPage.tsx
import { Link } from "react-router-dom";
import { OrderForm } from "./components/OrderForm.tsx";
import { OrdersWidget } from "./components/OrdersWidget.tsx";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { isManager } from "@/lib/auth";
import { useBarStatus } from "./hooks/useBarStatus";
import "./bar-page.css";

export function BarPage() {
  const { loggedIn, role } = useAuthStatus();
  const { isOpen, toggle } = useBarStatus();

  // Managers and admins run the bar (see every order); everyone, including them, can place an order.
  const canManage = isManager(role);

  return (
    <div className="wrap">
      <header>
        <div className="header-top">
          <p className="eyebrow"><Link to={'/'} className="eyebrow">Tools</Link>/bar</p>
        </div>

        <h1>Bar</h1>
        <p>Order drinks from the bar</p>

        {canManage && isOpen !== null && (
          <button type="button" onClick={toggle}>
            {isOpen ? "Close bar" : "Open bar"}
          </button>
        )}
      </header>

      {/* render nothing until we know who is looking, so managers don't see a flash of the guest form */}
      {loggedIn !== null && (
        <div className={`bar-content${canManage ? " bar-content--owner" : ""}`}>
          {/* managers and admins see all orders AND can still place one; everyone else only orders */}
          {canManage && <OrdersWidget />}
          <OrderForm isOpen={isOpen} />
        </div>
      )}

      <footer>tools.clewis.tech</footer>
    </div>
  );
}
