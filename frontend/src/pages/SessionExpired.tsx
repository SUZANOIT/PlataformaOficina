import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, LogIn, Clock } from 'lucide-react';

export function SessionExpired() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(8);
  const redirectPath = searchParams.get('from') || '/';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(`/login?from=${encodeURIComponent(redirectPath)}`, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, redirectPath]);

  const handleManualLogin = () => {
    navigate(`/login?from=${encodeURIComponent(redirectPath)}`, { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden font-sans">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>

      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300 relative z-10">
        
        {/* Warning Icon Banner */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 animate-bounce">
          <ShieldAlert size={32} />
        </div>

        {/* Header Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">
            Sua Sessão Expirou
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed px-2">
            Por motivos de segurança e inatividade prolongada, a sua sessão foi encerrada de forma segura.
          </p>
        </div>

        {/* Countdown Indicator Banner */}
        <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-2xl flex items-center justify-center gap-3 text-slate-300 text-xs">
          <Clock size={16} className="text-emerald-500 animate-spin" />
          <span>
            Redirecionando automaticamente em <strong className="text-emerald-400 font-mono text-sm">{countdown}s</strong>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2">
          <button
            onClick={handleManualLogin}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-2xl hover:bg-emerald-700 transition duration-200 active:scale-[0.98] shadow-lg shadow-emerald-950/50"
          >
            <LogIn size={18} />
            <span>Fazer Login Agora</span>
          </button>
        </div>

        {/* Symmetrical Security Label */}
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
          Conexão Segura SSL Encritada
        </p>
      </div>
    </div>
  );
}
