import { 
  Download, 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  Monitor,
  CheckCircle2
} from 'lucide-react';

export default function ArtifactCliTab() {
  const specs = [
    { label: 'Runtime', value: 'Python 3.11+', icon: Cpu },
    { label: 'Core RSS', value: '12MB', icon: Monitor },
    { label: 'Data I/O', value: 'Atomic Store', icon: HardDrive },
    { label: 'Integrity', value: 'VaultZero', icon: ShieldCheck },
  ];

  return (
    <div className="text-white max-w-4xl mx-auto font-serif h-full flex flex-col justify-center">
      <div className="text-center mb-8">
        <span className="text-white/30 font-black text-[9px] uppercase tracking-[0.5em] italic">Ingestion Interface</span>
        <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase mt-2">
          Artifact <span className="underline decoration-white/10 underline-offset-[8px]">CLI.</span>
        </h2>
        <p className="text-sm text-white/40 font-medium italic leading-relaxed max-w-xl mx-auto pt-4">
          Professional grade ingestion for high-resolution archives. Secure, local-first bridge to the Schnitzelbank sovereign cloud.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Specs Panel */}
        <div className="bg-white/[0.02] border border-white/10 rounded-sm p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-px bg-white/20"></div>
          <h3 className="text-white/60 font-black text-[10px] uppercase italic tracking-[0.3em] mb-6">Technical Blueprint</h3>
          <div className="space-y-4">
            {specs.map((spec) => (
              <div key={spec.label} className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                    <spec.icon className="w-4 h-4 text-white/60" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{spec.label}</span>
                </div>
                <span className="text-white font-black italic text-base tracking-tight">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features & Download */}
        <div className="space-y-6 flex flex-col justify-center">
          <div className="bg-white/[0.02] border border-white/5 p-6 space-y-3 hover:bg-white/[0.04] transition-colors relative">
            <CheckCircle2 className="w-6 h-6 text-white/40" />
            <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Bulk Classification</h4>
            <p className="text-white/40 text-xs font-medium italic leading-relaxed">Automated metadata mapping for high-volume artifact sets using the Murray Ingestion Protocol.</p>
          </div>
          
          <a href="./downloads/artifact-cli.zip" download className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:bg-slate-200 transition-all hover:scale-[1.02] active:scale-95 italic">
            <Download className="w-4 h-4" />
            Initialize Download
          </a>
        </div>
      </div>

      <div className="text-center py-4">
        <a href="https://github.com/torresjchristopher/artifact-cli" target="_blank" className="text-white/20 hover:text-white/60 transition-colors text-[9px] font-black uppercase tracking-[0.3em] italic">Open Source Codebase available at GitHub</a>
      </div>
    </div>
  );
}
