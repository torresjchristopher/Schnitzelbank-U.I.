import { useNavigate } from 'react-router-dom';
import { Archive } from 'lucide-react';

interface HeaderProps {
  familyName: string;
}

export function Header({ familyName }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a1120] border-b border-[#c5a059]/20 h-20 flex items-center shadow-lg">
      <div className="container mx-auto px-10 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-4 group"
        >
          <div className="w-10 h-10 bg-[#c5a059] rounded-sm flex items-center justify-center shadow-md group-hover:bg-[#b48a3e] transition-all duration-500">
            <Archive className="w-5 h-5 text-[#0a1120]" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-2xl font-serif font-bold text-[#f8fafc] tracking-wide uppercase">{familyName}</span>
            <span className="text-[10px] font-sans font-bold text-[#c5a059] uppercase tracking-[0.3em] -mt-1">The Murray Family Website</span>
          </div>
        </button>
        
        <div className="hidden md:flex items-center gap-10 text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-slate-400">
          <a href="https://github.com/torresjchristopher/artifact-cli" target="_blank" className="hover:text-[#c5a059] transition-colors">CLI Access</a>
          <a href="https://github.com/torresjchristopher/Schnitzelbank-U.I." target="_blank" className="hover:text-[#c5a059] transition-colors">Source</a>
          <div className="h-4 w-px bg-[#c5a059]/30"></div>
          <div className="text-[#c5a059] font-serif italic">Murray Protocol v4.1</div>
        </div>
      </div>
    </div>
  );
}