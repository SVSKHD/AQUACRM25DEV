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
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4"
            >
              <Lock className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Screen Locked
            </h2>
            <p className="text-slate-600 text-center">
              Your session has been locked due to inactivity
            </p>
            <p className="text-sm text-slate-500 mt-2">{userEmail}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Enter unlock code
              </label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 4-digit code"
                className={`w-full px-4 py-3 text-center text-2xl tracking-widest border-2 rounded-lg outline-none transition-all ${
                  error
                    ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500"
                    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
                  className="text-red-600 text-sm mt-2 text-center"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !code}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                loading || !code
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Unlocking...</span>
                </div>
              ) : (
                "Unlock"
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center space-y-2">
            <p className="text-sm text-slate-600">
              Locked for security after 50 minutes of inactivity
            </p>
            <p className="text-xs text-slate-500">
              Press{" "}
              <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-slate-700 font-mono">
                Cmd/Ctrl + L
              </kbd>{" "}
              to lock screen anytime
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
