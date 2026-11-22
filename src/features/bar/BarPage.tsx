// src/features/bar/BarPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { MenuList } from "./components/MenuList.tsx";
import { OrderForm } from "./components/OrderForm.tsx";
import { OrdersWidget } from "./components/OrdersWidget.tsx";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { isManager } from "@/lib/auth";
import { useBarStatus } from "./hooks/useBarStatus";
import "./bar-page.css";

export function BarPage() {
  const { loggedIn, role } = useAuthStatus();
  const { isOpen, toggle } = useBarStatus();
  const [drink, setDrink] = useState("");

  // Managers and admins run the bar (see every order); everyone, including them, can place an order.
  const canManage = isManager(role);

  // Tapping "Order" on the menu fills the drink field and brings the form into view.
  function pickDrink(name: string) {
    setDrink(name);
    const field = document.getElementById("drink-input");
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  }

  return (
    <div className="wrap">
      <header>
        <div className="header-top">
          <p className="eyebrow"><Link to={'/'} className="eyebrow">Tools</Link>/bar</p>

          {/* top right: open/closed for everyone; managers also get the toggle */}
          {isOpen !== null && (
            <div className="bar-actions">
              <span
                className={`bar-status bar-status--${isOpen ? "open" : "closed"}`}
                role="status"
              >
                {isOpen ? "Open for orders" : "Closed"}
              </span>
              {canManage && (
                <button type="button" className="bar-toggle" onClick={toggle}>
                  {isOpen ? "Close bar" : "Open bar"}
                </button>
              )}
            </div>
          )}
        </div>

        <h1>Bar</h1>
        <p>Order drinks from the bar</p>
      </header>

      {/* render nothing until we know who is looking, so managers don't see a flash of the guest form */}
      {loggedIn !== null && (
        <div className={`bar-content${canManage ? " bar-content--owner" : ""}`}>
          {/* managers and admins see all orders AND can still place one; everyone else only orders */}
          {canManage && <OrdersWidget />}
          <MenuList onPick={pickDrink} disabled={isOpen === false} />
          <OrderForm isOpen={isOpen} drink={drink} onDrinkChange={setDrink} />
        </div>
      )}

      <footer>tools.clewis.tech</footer>
    </div>
  );
}
