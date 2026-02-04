import { 
  Download, 
  Terminal, 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  Monitor,
  CheckCircle2,
  FileCode
} from 'lucide-react';

export default function ArtifactCliTab() {
  const specs = [
    { label: 'Runtime', value: 'Python 3.11+', icon: Cpu },
    { label: 'Core RSS', value: '12MB', icon: Monitor },
    { label: 'Data I/O', value: 'Atomic Store', icon: HardDrive },
    { label: 'Integrity', value: 'VaultZero', icon: ShieldCheck },
  ];

  return (
    <div className="container mx-auto px-10 py-16 text-slate-200">
      <div className="flex flex-col lg:flex-row gap-20 items-start mb-32">
        <div className="flex-1 space-y-10">
          <div className="space-y-4">
            <span className="text-blue-500 font-black text-[10px] uppercase tracking-[0.5em] italic">Ingestion Interface</span>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter italic leading-tight uppercase">
              Artifact <br/> <span className="underline decoration-white/5 underline-offset-8">CLI.</span>
            </h1>
            <p className="text-xl text-slate-400 font-medium italic leading-relaxed max-w-2xl pt-4">
              High-caliber ingestion for professional archives. A zero-latency bridge between local storage and the Schnitzelbank sovereign cloud.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-4 hover:bg-white/10 transition-colors">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <h4 className="text-lg font-black text-white uppercase italic tracking-tighter">Bulk Classification</h4>
              <p className="text-slate-500 text-sm font-medium italic">Automated metadata mapping for thousands of artifacts in a single session.</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-4 hover:bg-white/10 transition-colors">
              <FileCode className="w-6 h-6 text-blue-500" />
              <h4 className="text-lg font-black text-white uppercase italic tracking-tighter">Native Binaries</h4>
              <p className="text-slate-500 text-sm font-medium italic">Self-contained execution environments for Windows, macOS, and Linux nodes.</p>
            </div>
          </div>

          <div className="pt-6">
            <a href="/downloads/artifact-cli-v1.0.zip" className="inline-flex items-center gap-4 px-12 py-6 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
              <Download className="w-5 h-5" />
              Download Latest Build
            </a>
          </div>
        </div>

        {/* Technical Data Card */}
        <div className="w-full lg:w-[450px]">
          <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <h3 className="text-white font-black text-lg uppercase italic tracking-[0.2em] mb-12">Technical Blueprint</h3>
            
            <div className="space-y-10">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between group/spec">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover/spec:bg-blue-500/20 transition-colors">
                      <spec.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover/spec:text-slate-300 transition-colors">{spec.label}</span>
                  </div>
                  <span className="text-white font-black italic text-lg">{spec.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-16 pt-10 border-t border-white/5 flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase italic tracking-widest">
              <Terminal className="w-4 h-4" />
              v1.0.4 Stable Release
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Logic */}
      <div className="grid md:grid-cols-3 gap-12 border-t border-white/5 pt-24">
        <div className="space-y-4">
          <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">Node Setup</span>
          <h5 className="text-xl font-black text-white italic uppercase tracking-tighter underline decoration-white/5">Windows Enterprise</h5>
          <p className="text-slate-500 text-sm italic font-medium">Full support for Powershell 7 and standard CMD execution groups.</p>
        </div>
        <div className="space-y-4">
          <span className="text-[9px] font-black text-purple-500 uppercase tracking-[0.4em]">Unix Support</span>
          <h5 className="text-xl font-black text-white italic uppercase tracking-tighter underline decoration-white/5">macOS Silicon</h5>
          <p className="text-slate-500 text-sm italic font-medium">Native ARM64 binaries for zero-overhead execution on M1/M2 chips.</p>
        </div>
        <div className="space-y-4">
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.4em]">Node Setup</span>
          <h5 className="text-xl font-black text-white italic uppercase tracking-tighter underline decoration-white/5">Linux Distros</h5>
          <p className="text-slate-500 text-sm italic font-medium">Compatible with Debian, Arch, and RHEL standard kernel deployments.</p>
        </div>
      </div>
    </div>
  );
}
