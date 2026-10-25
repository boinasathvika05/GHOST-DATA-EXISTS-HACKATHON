import React, { useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  GitBranch,
  Layers,
  Database,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';

interface LandingHeroProps {
  onLaunchConsole: () => void;
  onExploreGraph: () => void;
  totalCases: number;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onLaunchConsole,
  onExploreGraph,
  totalCases,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Digital data-flow background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes representing data packets flowing across systems
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      isGhost: boolean;
    }[] = [];

    const colors = ['#8B7CFF', '#59D9FF', '#10B981', '#F59E0B'];

    for (let i = 0; i < 45; i++) {
      const isGhost = Math.random() < 0.2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: isGhost ? 2.5 : Math.random() * 2 + 1,
        color: isGhost ? '#EF4444' : colors[Math.floor(Math.random() * colors.length)],
        isGhost,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = particles[i].isGhost || particles[j].isGhost
              ? `rgba(239, 68, 68, ${0.15 * (1 - dist / 120)})`
              : `rgba(139, 124, 255, ${0.1 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (p.isGhost) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex flex-col justify-between">
      {/* Background canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-60 z-0" />

      {/* Radial subtle glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#8B7CFF]/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Hero Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        {/* Subtle pill-free kicker */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#929DB0] mb-6">
          <span className="text-[#8B7CFF]">HACKERRANK ORCHESTRATE OCTOBER 2026</span>
          <span aria-hidden="true">·</span>
          <span>ENTERPRISE DELETION ASSURANCE</span>
        </div>

        {/* Logo reveal & Wordmark */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B7CFF] to-[#59D9FF] flex items-center justify-center shadow-2xl shadow-[#8B7CFF]/30 border border-[#8B7CFF]/40">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-white">
            GhostTrace <span className="text-[#8B7CFF]">AI</span>
          </span>
        </div>

        {/* Main headline */}
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6 max-w-3xl mx-auto leading-tight">
          Your deletion pipeline says complete.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B7CFF] via-[#59D9FF] to-white">
            Can you prove it?
          </span>
        </h1>

        {/* Supporting text */}
        <p className="text-base md:text-lg text-[#929DB0] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Deleted should mean gone. GhostTrace AI delivers evidence-driven deletion assurance across secondary databases, support attachments, analytics cohorts, search indexes, active synchronizers, and backup archives.
        </p>

        {/* Primary & Secondary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            onClick={onLaunchConsole}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#8B7CFF] hover:bg-[#7866FF] text-white text-sm font-medium shadow-xl shadow-[#8B7CFF]/25 hover:shadow-[#8B7CFF]/40 transition-all cursor-pointer group"
          >
            <span>Launch Audit Console</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onExploreGraph}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#101521] hover:bg-[#151C2A] text-white text-sm font-medium border border-[#1C2436] hover:border-[#8B7CFF]/40 transition-all cursor-pointer"
          >
            <GitBranch className="w-4 h-4 text-[#59D9FF]" />
            <span>Explore Evidence Graph</span>
          </button>
        </div>

        {/* Live Preview Panel using genuine demo data */}
        <div className="relative max-w-3xl mx-auto rounded-xl bg-[#101521]/90 border border-[#1C2436] shadow-2xl p-4 text-left backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1C2436] text-xs">
            <div className="flex items-center gap-2 text-[#929DB0]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-white">Live Forensic Trace</span>
              <span>·</span>
              <span className="font-mono">Northstar Shop Case #48</span>
            </div>
            <div className="text-[11px] font-mono text-[#8B7CFF]">
              Grounded in 94 Evidence Artifacts
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
            <div className="p-2.5 rounded-lg bg-[#080B12] border border-[#151C2A]">
              <div className="text-[#929DB0] text-[10px] uppercase font-mono mb-1">Workflow Claim</div>
              <div className="text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                REPORTED COMPLETE
              </div>
              <div className="text-[10px] text-[#929DB0] mt-1">account_service: 404 ABSENT</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#080B12] border border-[#EF4444]/30">
              <div className="text-[#EF4444] text-[10px] uppercase font-mono mb-1">Ghost Data Detected</div>
              <div className="text-coral-400 font-mono font-medium text-[#EF4444] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                FAILOVER REPLICA ACTIVE
              </div>
              <div className="text-[10px] text-[#929DB0] mt-1 font-mono">search_052 & data_flow_9522</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#080B12] border border-[#151C2A]">
              <div className="text-[#929DB0] text-[10px] uppercase font-mono mb-1">Audit Decision</div>
              <div className="text-amber-400 font-mono font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                STATUS: INCOMPLETE
              </div>
              <div className="text-[10px] text-[#929DB0] mt-1">Ordered remediation required</div>
            </div>
          </div>

          <div className="text-[11px] font-mono bg-[#080B12] p-2.5 rounded border border-[#151C2A] text-[#929DB0] overflow-x-auto">
            <span className="text-[#8B7CFF]">Step 1:</span> [FINDING] search_service/search_052 (REPORT_REMAINING_RECORD) · ev=evidence_03<br/>
            <span className="text-[#8B7CFF]">Step 2:</span> [REMEDIATION] integration_service/data_flow_9522 (DISABLE_DATA_FLOW)<br/>
            <span className="text-[#8B7CFF]">Step 3:</span> [VERIFICATION] security_service/audit_record_9394 (VERIFY_RECORD_PRESENT)
          </div>
        </div>
      </div>

      {/* The 4 Audit Stages Section */}
      <div className="relative z-10 border-t border-[#151C2A] bg-[#0A0E18]/60 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-xs font-mono text-[#8B7CFF] uppercase tracking-wider mb-1">Methodology</h2>
            <p className="text-lg font-semibold text-white">The Four Verification Stages</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#101521] border border-[#1C2436]">
              <div className="w-8 h-8 rounded-lg bg-[#8B7CFF]/15 text-[#8B7CFF] flex items-center justify-center font-mono font-bold text-xs mb-3">
                01
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Discover</h3>
              <p className="text-xs text-[#929DB0] leading-relaxed">
                Ingest global operational logs, SQLite snapshots, support files, and connector maps.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#101521] border border-[#1C2436]">
              <div className="w-8 h-8 rounded-lg bg-[#59D9FF]/15 text-[#59D9FF] flex items-center justify-center font-mono font-bold text-xs mb-3">
                02
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Correlate</h3>
              <p className="text-xs text-[#929DB0] leading-relaxed">
                Resolve historical email changes, stable internal user_ids, and cross-system trace IDs.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#101521] border border-[#1C2436]">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-mono font-bold text-xs mb-3">
                03
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Remediate</h3>
              <p className="text-xs text-[#929DB0] leading-relaxed">
                Disable active recreation flows and block restore paths before modifying downstream copies.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#101521] border border-[#1C2436]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs mb-3">
                04
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Verify</h3>
              <p className="text-xs text-[#929DB0] leading-relaxed">
                Generate deterministic proof checks and preserve required compliance audit logs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
