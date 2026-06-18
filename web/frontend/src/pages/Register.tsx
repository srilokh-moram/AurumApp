import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

type Step = "details" | "otp" | "done";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", { email, name });
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify", { email, otp });
      login(res.data.access_token, res.data.is_admin, res.data.name);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.svg" alt="CB Markets" className="h-20 w-auto mb-3" />
          <p className="text-gray-500 text-sm">Gold Trading Platform</p>
        </div>

        <div className="card">
          {/* Progress */}
          <div className="flex gap-2 mb-6">
            {(["details", "otp"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  step === "details" && i === 0 ? "bg-gold-400" :
                  step === "otp" ? "bg-gold-400" : "bg-[#374151]"
                }`}
              />
            ))}
          </div>

          {step === "details" ? (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Create account</h2>
                <p className="text-gray-400 text-sm">Register to start trading gold</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">Full name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button className="btn-gold w-full" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Continue"}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link to="/login" className="text-gold-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Verify your email</h2>
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
                <label className="block text-sm text-gray-400 mb-2">Verification code</label>
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
                {loading ? "Verifying..." : "Create Account"}
              </button>

              <button
                type="button"
                className="w-full text-sm text-gray-500 hover:text-gray-300"
                onClick={() => { setStep("details"); setOtp(""); setError(""); }}
              >
                Go back
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          After registration, contact your account manager to fund your account.
        </p>
      </div>
    </div>
  );
}
