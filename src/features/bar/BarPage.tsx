import { Link } from "react-router-dom";
import { OrderForm } from "./components/OrderForm.tsx"
import { OrdersWidget } from "./components/OrdersWidget.tsx"
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useBarStatus } from "./hooks/useBarStatus";
import "./bar-page.css";

export function BarPage() {
  const { loggedIn } = useAuthStatus();
  const { isOpen, toggle } = useBarStatus();

  return (
    <div className="wrap">
      <header>
        <div className="header-top">
          <p className="eyebrow"><Link to={'/'} className="eyebrow">Tools</Link>/bar</p>
        </div>

        <h1>Bar</h1>
        <p>Order drinks from the bar</p>
				{loggedIn && isOpen !== null && (
					<button type="button" onClick={toggle}>
						{isOpen ? "Close bar" : "Open bar"}
					</button>
				)}
				<div className={`bar-content${loggedIn ? " bar-content--owner" : ""}`}>
					<OrderForm isOpen={isOpen} />
					{loggedIn && <OrdersWidget />}
				</div>
      </header>
      <footer>tools.clewis.tech</footer>
    </div>
  );
}
