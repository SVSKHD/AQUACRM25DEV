import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { Mail, Lock, LogIn } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const useDemoCredentials = () => {
    setEmail("demo@aquakart.com");
    setPassword("demo123456");
  };

  return (
    <div className="min-h-screen flex items-center justify-center liquid-bg p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 shadow-2xl">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <img src="/aquakart.png" alt="Aquakart" className="w-20 h-20 drop-shadow-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Aquakart CRM
            </h1>
            <p className="text-white/60">Sign in to your account</p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-medium text-white/70 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-input w-full pl-10 pr-4 py-3 text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-white/70 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="glass-input w-full pl-10 pr-4 py-3 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600/80 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span>Sign In</span>
                </>
              )}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 space-y-4"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">
                Demo Access
              </p>
              <div className="space-y-1 text-xs text-white/50 mb-4">
                <p>Email: demo@aquakart.com</p>
                <p>Password: demo123456</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={useDemoCredentials}
                type="button"
                className="w-full py-2 bg-white/10 text-white text-xs rounded-lg hover:bg-white/20 transition-all font-medium border border-white/5"
              >
                Auto-fill Demo
              </motion.button>
            </div>

            <p className="text-white/40 text-center text-sm">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Sign up
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>

  );
}
