import { Shield, Lock, Eye, Database, Server, Key } from 'lucide-react';

export default function PrivacyTab() {
  return (
    <div className="container mx-auto px-10 py-16 text-slate-200">
      <div className="mb-20 space-y-4">
        <span className="text-blue-500 font-black text-[10px] uppercase tracking-[0.5em] italic">Institutional Integrity</span>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter italic uppercase">
          Sovereign <span className="underline decoration-white/5 underline-offset-8">SECURITY.</span>
        </h1>
        <p className="text-xl text-slate-400 font-medium italic leading-relaxed max-w-2xl pt-4">
          Your family archive is protected by absolute data invisibility protocols. We ensure that your digital legacy remains private, encrypted, and under your total authority.
        </p>
      </div>

      {/* High-Caliber Security Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
        {[
          { title: 'AES-256 Encryption', desc: 'All artifacts are encrypted at the block level before being committed to the cloud archive.', icon: Lock, color: 'text-blue-400' },
          { title: 'Zero-Knowledge', desc: 'Yukora has no visibility into your data. Access is physically bound to your verified hardware.', icon: Shield, color: 'text-purple-400' },
          { title: 'Anonymous Auth', desc: 'No accounts, no trackers, no telemetry. Your archive exists in the shadows of the web.', icon: Eye, color: 'text-emerald-400' },
          { title: 'Data Sovereignty', desc: 'You own the primary keys. Export or delete your entire history with atomic finality.', icon: Database, color: 'text-amber-400' },
          { title: 'Secure Nodes', desc: 'Direct ingestion via the Artifact CLI ensures your data never touches unverified relays.', icon: Server, color: 'text-indigo-400' },
          { title: 'VaultZero Store', desc: 'Hardware-rooted secret management prevents session compromise and key scraping.', icon: Key, color: 'text-rose-400' },
        ].map((item) => (
          <div key={item.title} className="glass p-10 rounded-[3rem] border-white/5 group hover:bg-white/5 transition-all">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/5 group-hover:border-blue-500/20 transition-all">
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">{item.title}</h3>
            <p className="text-slate-500 text-sm font-medium italic leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Protocol Compliance */}
      <div className="bg-slate-950/50 border border-white/5 rounded-[3rem] p-12 md:p-20">
        <div className="max-w-4xl">
          <h2 className="text-3xl font-black text-white mb-10 uppercase italic tracking-[0.2em]">The Invisibility Covenant</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-500 italic">Core Prohibitions</h4>
              <ul className="space-y-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest italic">
                <li className="flex items-center gap-3"><span className="text-red-500">✕</span> NO Data Submission to Third Parties</li>
                <li className="flex items-center gap-3"><span className="text-red-500">✕</span> NO Ad-Tech or Tracking Pixels</li>
                <li className="flex items-center gap-3"><span className="text-red-500">✕</span> NO Cloud-Side Metadata Scraping</li>
                <li className="flex items-center gap-3"><span className="text-red-500">✕</span> NO Persistent Session Logging</li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500 italic">Mandatory Protections</h4>
              <ul className="space-y-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest italic">
                <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> TLS 1.3 Mandatory for all Transit</li>
                <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Automated Redundant Backups</li>
                <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Full Portability via ZIP/PDF</li>
                <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Transparent Hardware Verification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}