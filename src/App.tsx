import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { AuditResultPage } from "./pages/AuditResultPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/resultado/:id" element={<AuditResultPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
