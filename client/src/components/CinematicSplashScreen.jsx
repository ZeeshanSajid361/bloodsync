import { useState, useEffect } from 'react';
import { Droplets, Heart, Activity, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export default function CinematicSplashScreen({ onComplete }) {
  const [stage, setStage] = useState(1); // 1: Blood Drop, 2: Digital Network Ripple, 3: Transition Out

  useEffect(() => {
    // Stage 1 -> Stage 2 (Drop hits invisible plane & ripples into digital network)
    const timer1 = setTimeout(() => {
      setStage(2);
    }, 1400);

    // Stage 2 -> Stage 3 (Fade out to reveal main dashboard)
    const timer2 = setTimeout(() => {
      setStage(3);
    }, 3600);

    // Trigger onComplete callback
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (stage === 4) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: '#070a12',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: stage === 3 ? 0 : 1,
        pointerEvents: stage === 3 ? 'none' : 'auto',
      }}
    >
      {/* Background Animated Gradient Radial Pulse */}
      <div
        style={{
          position: 'absolute',
          width: '120vw',
          height: '120vh',
          background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.22) 0%, rgba(15, 23, 42, 0.95) 60%, #070a12 100%)',
          animation: 'pulseBg 3s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />

      {/* Frame 1: The Falling Realistic Blood Drop */}
      {stage === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <div
            style={{
              width: 80,
              height: 100,
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              background: 'linear-gradient(135deg, #ff4d4d 0%, #dc2626 50%, #991b1b 100%)',
              boxShadow: '0 0 50px rgba(239, 68, 68, 0.8), inset -8px -8px 20px rgba(0,0,0,0.5), inset 6px 6px 15px rgba(255,255,255,0.6)',
              animation: 'dropFall 1.4s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards',
              position: 'relative',
            }}
          >
            {/* Highlight specularity */}
            <div
              style={{
                position: 'absolute',
                top: 15,
                left: 15,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.8)',
                filter: 'blur(2px)',
              }}
            />
          </div>
        </div>
      )}

      {/* Frame 2: The Digital Network Transformation & Illuminated Logo */}
      {stage === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%', maxWidth: 500, padding: '0 20px' }}>
          
          {/* Central Pulsing Network Orb & Radiant Lines */}
          <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            
            {/* Concentric Rippling Shockwaves */}
            <div className="splash-ripple" style={{ animationDelay: '0s' }} />
            <div className="splash-ripple" style={{ animationDelay: '0.4s' }} />
            <div className="splash-ripple" style={{ animationDelay: '0.8s' }} />

            {/* Glowing Heart & Pulse Logo */}
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 60px rgba(239, 68, 68, 0.9), 0 0 100px rgba(239, 68, 68, 0.4)',
                border: '3px solid rgba(255, 255, 255, 0.8)',
                zIndex: 2,
                animation: 'logoGlow 1.2s ease-in-out infinite alternate',
              }}
            >
              <Activity size={48} color="#ffffff" style={{ filter: 'drop-shadow(0 0 10px #ffffff)' }} />
            </div>

            {/* Radiant Connected Nodes */}
            <div className="node-dot" style={{ top: '10%', left: '15%' }} />
            <div className="node-dot" style={{ top: '15%', right: '15%' }} />
            <div className="node-dot" style={{ bottom: '15%', left: '20%' }} />
            <div className="node-dot" style={{ bottom: '10%', right: '20%' }} />
          </div>

          {/* Illuminated Brand Name & Tagline */}
          <div style={{ textAlign: 'center', zIndex: 2, animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <h1 style={{
              margin: 0,
              fontSize: '2.8rem',
              fontWeight: 900,
              letterSpacing: '2px',
              background: 'linear-gradient(135deg, #ffffff 0%, #fecdd3 50%, #ef4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 10px 30px rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <Droplets size={34} color="#ef4444" /> BloodSync
            </h1>

            <p style={{
              margin: '12px 0 0',
              fontSize: '1.05rem',
              color: '#94a3b8',
              fontWeight: 600,
              letterSpacing: '1px',
            }}>
              Save Lives, One Drop at a Time
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '20px',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              <Sparkles size={14} /> Real-Time Life-Saving Network
            </div>
          </div>

        </div>
      )}

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes pulseBg {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes dropFall {
          0% { transform: translateY(-180px) rotate(-45deg) scale(0.6); opacity: 0; }
          70% { transform: translateY(20px) rotate(-45deg) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) rotate(-45deg) scale(1); opacity: 1; }
        }
        @keyframes logoGlow {
          0% { boxShadow: 0 0 40px rgba(239, 68, 68, 0.8); transform: scale(1); }
          100% { boxShadow: 0 0 80px rgba(239, 68, 68, 1); transform: scale(1.05); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .splash-ripple {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid rgba(239, 68, 68, 0.6);
          animation: rippleExpand 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
        }
        @keyframes rippleExpand {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .node-dot {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 15px #ef4444, 0 0 30px #ef4444;
          animation: nodePulse 1.5s ease-in-out infinite alternate;
        }
        @keyframes nodePulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
