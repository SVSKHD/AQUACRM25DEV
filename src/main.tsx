import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import QuotationPage from "./pages/QuotationPage";
import "./index.css";
import "./styles/liquidControls.css";
import "./styles/dashboardTabs.css";

const isQuotationPage = window.location.pathname.startsWith("/quotation/");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isQuotationPage ? (
      <BrowserRouter>
        <QuotationPage />
      </BrowserRouter>
    ) : (
      <App />
    )}
  </StrictMode>,
);
