import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";

interface LockScreenProps {
  userEmail: string;
  onUnlock: (code: string) => Promise<boolean>;
}

export default function LockScreen({ userEmail, onUnlock }: LockScreenProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await onUnlock(code);
      if (!success) {
        setError("Incorrect code");
        setCode("");
      }
    } catch (err) {
      setError("Failed to unlock. Please try again.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 liquid-bg flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md p-8"
      >
        <div className="glass-card p-8">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 bg-blue-500/20 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 border border-white/10"
            >
              <Lock className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Screen Locked
            </h2>
            <p className="text-white/60 text-center text-sm">
              Your session has been locked for security
            </p>
            <p className="text-xs text-blue-400 font-medium mt-3 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              {userEmail}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/50 mb-3 text-center">
                Enter unlock code
              </label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••"
                className={`w-full px-4 py-4 text-center text-3xl tracking-[1em] glass-input border-2 transition-all ${
                  error
                    ? "border-red-500/50 bg-red-500/10"
                    : "border-white/5 focus:border-blue-500/50"
                }`}
                maxLength={4}
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                disabled={loading}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs mt-3 text-center font-medium"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !code}
              className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
                loading || !code
                  ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
                  : "bg-blue-600/80 hover:bg-blue-600 text-white"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Unlocking...</span>
                </div>
              ) : (
                "Unlock Session"
              )}
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-3">
            <p className="text-[10px] text-white/30 uppercase tracking-widest leading-loose">
              Locked for security after inactivity
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md border border-white/5">
              <span className="text-[10px] text-white/40">Shortcut:</span>
              <kbd className="text-[10px] text-white/60 font-mono">Cmd + L</kbd>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
