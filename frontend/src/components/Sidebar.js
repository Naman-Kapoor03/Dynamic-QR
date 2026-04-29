import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Sidebar({ isOpen }) {
  return (
    <motion.div
      animate={{ width: isOpen ? 240 : 70 }}
      className="h-screen bg-[#020617] border-r border-gray-800 text-white p-4 overflow-hidden"
    >

      <h2 className="text-lg font-bold mb-8">
        {isOpen ? "🚀 QR Studio" : "🚀"}
      </h2>

      <div className="space-y-4">

        <Link to="/history" className="block hover:bg-gray-800 p-2 rounded">
          {isOpen ? "📊 Dashboard" : "📊"}
        </Link>

        <Link to="/create" className="block hover:bg-gray-800 p-2 rounded">
          {isOpen ? "➕ Create QR" : "➕"}
        </Link>

      </div>

    </motion.div>
  );
}