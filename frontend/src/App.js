import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";

import History from "./pages/History";
import CreateQR from "./pages/CreateQR";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>

      <div className="min-h-screen bg-[#020617]">

        {/* HEADER */}
        <Header />

        {/* MAIN CONTENT */}
        <div className="p-4">

          <Routes>
            <Route path="/" element={<History />} />
            <Route path="/history" element={<History />} />
            <Route path="/create" element={<CreateQR />} />
            <Route path="/dashboard/:code" element={<Dashboard />} />
          </Routes>

        </div>

      </div>

    </BrowserRouter>
  );
}