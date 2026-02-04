import { 
  Terminal, 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  Zap, 
  Code,
  Monitor
} from 'lucide-react';

export default function ArtifactCliTab() {
  const specs = [
    { label: 'Runtime', value: 'Python 3.11+', icon: Cpu },
    { label: 'Footprint', value: '15MB RSS', icon: Monitor },
    { label: 'Storage', value: 'Zero Latency', icon: HardDrive },
    { label: 'Security', value: 'VaultZero', icon: ShieldCheck },
  ];

  const features = [
    { title: 'Batch Ingestion', desc: 'Process and upload thousands of artifacts with automated metadata analysis.', icon: Zap },
    { title: 'Rich TUI', desc: 'Interactive terminal interface built for rapid navigation and bulk management.', icon: Terminal },
    { title: 'Universal Support', desc: 'Native binaries for Windows, macOS, and Linux with zero external dependencies.', icon: Code },
  ];

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row gap-16 items-center mb-32">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] italic">
            Enterprise Command Line Tooling
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight italic uppercase">
            Artifact <span className="text-blue-500 underline decoration-white/10 underline-offset-8">CLI.</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium leading-relaxed italic max-w-2xl">
            The professional grade interface for high-volume artifact ingestion. Bridge your local memory stores with the Schnitzelbank cloud instantly.
          </p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-4">
            <a href="/downloads/artifact-cli-v1.0.zip" className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-white/10 italic">
              Download Latest Release
            </a>
            <a href="https://github.com/torresjchristopher/artifact-cli" target="_blank" className="px-10 py-5 bg-slate-900 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/5 transition-all italic">
              View Source
            </a>
          </div>
        </div>

        {/* Dynamic Spec Panel */}
        <div className="w-full max-w-md">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <h3 className="text-white font-black text-lg uppercase italic tracking-[0.2em] mb-10">Technical Specifications</h3>
            <div className="grid grid-cols-1 gap-8">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                      <spec.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{spec.label}</span>
                  </div>
                  <span className="text-white font-black italic">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-3 gap-12 mb-32">
        {features.map((f) => (
          <div key={f.title} className="space-y-6 group">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
              <f.icon className="w-7 h-7 text-blue-400" />
            </div>
            <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">{f.title}</h4>
            <p className="text-slate-500 text-sm font-medium italic leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* OS Matrix */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-12 md:p-20 text-center">
        <h2 className="text-3xl font-black text-white mb-16 uppercase italic tracking-[0.2em]">Deployment Matrix</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="text-xs font-black text-blue-500 uppercase tracking-[0.3em]">Microsoft</div>
            <div className="text-2xl font-black text-white italic">Windows 10/11</div>
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Native .exe supported</div>
          </div>
          <div className="space-y-4 border-x border-white/5">
            <div className="text-xs font-black text-purple-500 uppercase tracking-[0.3em]">Apple</div>
            <div className="text-2xl font-black text-white italic">macOS 12+</div>
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">M1/M2/Intel Silicon</div>
          </div>
          <div className="space-y-4">
            <div className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em]">Open Source</div>
            <div className="text-2xl font-black text-white italic">Linux Kernel 5.4+</div>
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Debian/RHEL/Arch</div>
          </div>
        </div>
      </div>
    </div>
  );
}