import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import QuotationLinkPage from "./pages/QuotationLinkPage";
import "./index.css";
import "./styles/liquidControls.css";
import "./styles/dashboardTabs.css";
import "./styles/invoiceDialogMobile.css";

const isQuotationPage = window.location.pathname.startsWith("/quotation/");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isQuotationPage ? <QuotationLinkPage /> : <App />}
  </StrictMode>,
);
