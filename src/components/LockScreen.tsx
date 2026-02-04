import { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Jackson_Heights') {
      onUnlock();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1120] flex items-center justify-center p-6 font-serif">
      <div className="max-w-md w-full">
        {/* Emblem */}
        <div className="flex justify-center mb-12">
          <div className="w-24 h-24 rounded-full border-4 border-[#c5a059]/20 flex items-center justify-center bg-[#0f172a] shadow-2xl">
            <Lock className="w-10 h-10 text-[#c5a059]" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0f172a] border border-[#c5a059]/30 p-10 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#c5a059] to-[#8b6f36]"></div>
          
          <h1 className="text-3xl text-[#e2e8f0] mb-2 tracking-wide font-medium">SCHNITZELBANK</h1>
          <p className="text-[#c5a059] text-xs uppercase tracking-[0.3em] mb-10 font-sans font-bold">Institutional Archive</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Enter Access Key"
                className="w-full bg-[#0a1120] border border-[#c5a059]/30 px-6 py-4 text-[#e2e8f0] text-center focus:outline-none focus:border-[#c5a059] transition-colors placeholder:text-slate-700 font-sans tracking-widest text-lg"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs uppercase tracking-widest font-sans font-bold animate-pulse">
                Access Denied
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#c5a059] hover:bg-[#8b6f36] text-[#0a1120] py-4 font-bold uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-2 group font-sans"
            >
              Unlock Archive
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em] font-sans">
            Secured by Murray Protocol v4.1
          </p>
        </div>
      </div>
    </div>
  );
}
