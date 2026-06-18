import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

type Step = "email" | "otp";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/login", { email });
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login/verify", { email, otp });
      login(res.data.access_token, res.data.is_admin, res.data.name);
      navigate(res.data.is_admin ? "/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gold-400 tracking-widest">CB Markets</h1>
          <p className="text-gray-500 text-sm mt-1">Gold Trading Platform</p>
        </div>

        <div className="card">
          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
                <p className="text-gray-400 text-sm">Enter your email to receive a login code</p>
              </div>

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
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button className="btn-gold w-full" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Login Code"}
              </button>

              <p className="text-center text-sm text-gray-500">
                No account?{" "}
                <Link to="/register" className="text-gold-400 hover:underline">
                  Register here
                </Link>
              </p>

              <div className="border-t border-[#1f2937] pt-4">
                <Link
                  to="/admin-login"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-[#1f2937] text-sm text-gray-400 hover:text-gold-400 hover:border-gold-400/40 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Admin Sign In
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Check your email</h2>
                <p className="text-gray-400 text-sm">
                  We sent a 6-digit code to <span className="text-white">{email}</span>
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">One-time code</label>
                <input
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                />
              </div>

              <button className="btn-gold w-full" type="submit" disabled={loading || otp.length < 6}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                className="w-full text-sm text-gray-500 hover:text-gray-300"
                onClick={() => { setStep("email"); setOtp(""); setError(""); }}
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
