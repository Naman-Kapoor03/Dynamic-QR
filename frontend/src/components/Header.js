import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/qr_logo.png";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#020617] text-white">

      {/* LEFT SIDE */}
      <div className="flex items-center gap-4">

        {/* BACK BUTTON */}
        {location.pathname !== "/" && location.pathname !== "/history" && (
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-gray-300 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}

        {/* LOGO + TITLE */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <img src={logo} className="w-8 h-8 rounded" />
          <h1 className="text-lg font-semibold">QR Studio</h1>
        </div>

      </div>

      {/* RIGHT SIDE */}
      <div>
        <button
          onClick={() => navigate("/create")}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-sm font-medium hover:scale-105 transition"
        >
          + Create QR
        </button>
      </div>

    </div>
  );
}