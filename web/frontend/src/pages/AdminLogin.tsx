import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/admin-login", { email, password });
      login(res.data.access_token, res.data.is_admin, res.data.name);
      navigate("/admin");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gold-400 tracking-widest">AURUM</h1>
          <p className="text-gray-500 text-sm mt-1">Gold Trading Platform</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-gold-400" />
              <h2 className="text-xl font-semibold text-white">Admin Sign In</h2>
            </div>
            <p className="text-gray-400 text-sm -mt-3">Enter your admin credentials</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-2">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn-gold w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="text-center text-sm text-gray-500">
              Not admin?{" "}
              <Link to="/login" className="text-gold-400 hover:underline">
                User login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
