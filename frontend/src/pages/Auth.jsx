import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { login, register } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const InputField = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  rightElement,
}) => (
  <div>
    <label htmlFor={id} className="text-gray-400 text-sm mb-1 block">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-cyan-500 transition-colors placeholder-gray-600 ${
          Icon ? "pl-9" : ""
        } ${rightElement ? "pr-10" : ""}`}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  </div>
);

function LoginForm({ onSuccess }) {
  const { loginUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokenPreview, setTokenPreview] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await login({ username, password });
      const responseData = data?.data || data;
      const token = responseData?.access_token || responseData?.token || "";
      if (!token) throw new Error("No token received from server.");
      const userData = {
        username: responseData.username || username,
        user_id: responseData.user_id,
      };
      loginUser(userData, token);
      setTokenPreview(token.length > 40 ? token.slice(0, 40) + "..." : token);
      setTimeout(() => onSuccess(), 1000);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Login failed. Check credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <InputField
        id="login-username"
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="operator"
        icon={User}
      />
      <InputField
        id="login-password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        icon={Lock}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
      />

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {tokenPreview && (
        <div className="space-y-1">
          <p className="text-gray-400 text-sm">JWT Token Preview</p>
          <div className="font-mono text-xs text-cyan-300 bg-[#050810] p-2 rounded break-all border border-cyan-500/20">
            {tokenPreview}
          </div>
          <p className="text-green-400 text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Login successful — redirecting…
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Authenticating…
          </>
        ) : (
          <>
            <Shield size={16} />
            Sign In
          </>
        )}
      </button>
    </form>
  );
}

function RegisterForm({ onSwitchToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await register({ username, email, password });
      setSuccess("Account created successfully! You can now sign in.");
      setUsername("");
      setEmail("");
      setPassword("");
      setTimeout(() => onSwitchToLogin(), 1500);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Registration failed. Username may already exist."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <InputField
        id="reg-username"
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="operator"
        icon={User}
      />
      <InputField
        id="reg-email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="operator@quantumsafe.dev"
        icon={Mail}
      />
      <InputField
        id="reg-password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        icon={Lock}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
      />

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating Account…
          </>
        ) : (
          <>
            <User size={16} />
            Create Account
          </>
        )}
      </button>
    </form>
  );
}

export default function Auth() {
  const [tab, setTab] = useState("login");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4">
            <Shield size={32} className="text-cyan-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">🔐 QuantumSafe</h1>
          <p className="text-gray-400 text-sm mt-2">
            Post-quantum cryptography dashboard
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
          {/* Tabs */}
          <div className="flex rounded-lg bg-[#050810] p-1 mb-6">
            {["login", "register"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                  tab === t
                    ? "bg-cyan-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <LoginForm onSuccess={() => navigate("/")} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setTab("login")} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Secured with ML-KEM-768 + ML-DSA-65 · NIST FIPS 203/204
        </p>
      </div>
    </div>
  );
}
