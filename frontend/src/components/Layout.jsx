import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Shield,
  Key,
  Lock,
  Mail,
  BarChart3,
  FileText,
  Activity,
  LogOut,
  User,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Auth", path: "/auth", icon: User },
  { label: "Keys", path: "/keys", icon: Key },
  { label: "KEM", path: "/kem", icon: Lock },
  { label: "Encrypt / Decrypt", path: "/encrypt", icon: Shield },
  { label: "Sign / Verify", path: "/sign", icon: FileText },
  { label: "Messages", path: "/messages", icon: Mail },
  { label: "Benchmark", path: "/benchmark", icon: BarChart3 },
  { label: "Logs", path: "/logs", icon: FileText },
  { label: "Security Status", path: "/security", icon: Activity },
];

export default function Layout({ children }) {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate("/auth");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1a2a4a]">
        <span className="text-2xl font-extrabold text-cyan-400 tracking-tight select-none">
          🔐 QuantumSafe
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active =
            path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                active
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-400 hover:bg-[#111c35] hover:text-white"
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && (
                <ChevronRight size={14} className="text-cyan-400 opacity-70" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-[#1a2a4a] space-y-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <User size={15} className="text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user.username || user.sub || "User"}
              </p>
              <p className="text-gray-500 text-xs truncate">
                {user.email || "Authenticated"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-xs px-1">Not logged in</p>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0e1a] text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-[#0d1526] border-r border-[#1a2a4a]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 flex flex-col w-64 bg-[#0d1526] border-r border-[#1a2a4a] h-full">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d1526] border-b border-[#1a2a4a]">
          <span className="text-lg font-bold text-cyan-400">🔐 QuantumSafe</span>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
