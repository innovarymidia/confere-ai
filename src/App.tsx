import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { AuditResultPage } from "./pages/AuditResultPage";
import { LoginPage } from "./pages/LoginPage";
import { HistoryPage } from "./pages/HistoryPage";
import { CookieConsentBanner } from "./components/ui/cookie-consent-banner";
import { ErrorBoundary } from "./components/ui/error-boundary";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/resultado/:id" element={<AuditResultPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CookieConsentBanner />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
