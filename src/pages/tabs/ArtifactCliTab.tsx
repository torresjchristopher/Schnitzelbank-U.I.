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
    <div className="text-white max-w-5xl mx-auto font-serif">
      <div className="text-center mb-24">
        <span className="text-white/30 font-black text-[10px] uppercase tracking-[0.5em] italic">Ingestion Interface</span>
        <h2 className="text-6xl font-black text-white tracking-tighter italic uppercase mt-6">
          Artifact <span className="underline decoration-white/10 underline-offset-[12px]">CLI.</span>
        </h2>
        <p className="text-xl text-white/40 font-medium italic leading-relaxed max-w-2xl mx-auto pt-8">
          Professional grade ingestion for high-resolution archives. Secure, local-first bridge to the Schnitzelbank sovereign cloud.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-16 mb-20">
        {/* Specs Panel */}
        <div className="bg-white/[0.02] border border-white/10 rounded-sm p-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-px bg-white/20"></div>
          <h3 className="text-white/60 font-black text-[11px] uppercase italic tracking-[0.3em] mb-12">Technical Blueprint</h3>
          <div className="space-y-10">
            {specs.map((spec) => (
              <div key={spec.label} className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                    <spec.icon className="w-5 h-5 text-white/60" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/30">{spec.label}</span>
                </div>
                <span className="text-white font-black italic text-xl tracking-tight">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features & Download */}
        <div className="space-y-10 flex flex-col justify-center">
          <div className="bg-white/[0.02] border border-white/5 p-10 space-y-6 hover:bg-white/[0.04] transition-colors relative">
            <CheckCircle2 className="w-8 h-8 text-white/40" />
            <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Bulk Classification</h4>
            <p className="text-white/40 text-sm font-medium italic leading-relaxed">Automated metadata mapping for high-volume artifact sets using the Murray Ingestion Protocol.</p>
          </div>
          
          <a href="/downloads/artifact-cli-v1.0.zip" className="flex items-center justify-center gap-4 px-12 py-6 bg-white text-black font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-slate-200 transition-all hover:scale-[1.02] active:scale-95 italic">
            <Download className="w-5 h-5" />
            Initialize Download
          </a>
        </div>
      </div>

      <div className="text-center py-10">
        <a href="https://github.com/torresjchristopher/artifact-cli" target="_blank" className="text-white/20 hover:text-white/60 transition-colors text-[10px] font-black uppercase tracking-[0.3em] italic">Open Source Codebase available at GitHub</a>
      </div>
    </div>
  );
}
