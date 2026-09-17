import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Smartphone, Maximize2 } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const [timeStr, setTimeStr] = useState<string>('09:41');
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen h-[100dvh] max-h-screen bg-slate-100 flex flex-col items-center justify-start text-slate-800 font-sans relative overflow-hidden antialiased">
      {/* Top Desktop-only Control Bar */}
      <header className="hidden md:flex items-center justify-between w-full max-w-lg mt-2 mb-1 px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl text-xs text-slate-300 shadow-md shrink-0">
        <span className="font-semibold text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-400" />
          ADC Shuttle Mobile
        </span>
        <button
          type="button"
          onClick={() => setIsPhoneFrame(!isPhoneFrame)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-[11px] font-bold"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>{isPhoneFrame ? 'Full Width (شاشة عريضة)' : 'Mobile Frame (إطار هاتف)'}</span>
        </button>
      </header>

      {/* Main App Container: Full Screen Native on Mobile, Neat Card on Desktop */}
      <div
        className={`w-full bg-slate-100 transition-all duration-200 relative flex flex-col flex-1 min-h-0 overflow-hidden ${
          isPhoneFrame
            ? 'max-w-md h-full md:h-[calc(100vh-4.5rem)] md:max-h-[880px] md:rounded-[40px] md:border-[6px] md:border-slate-800 md:shadow-2xl md:my-auto'
            : 'max-w-xl h-full md:h-[calc(100vh-4.5rem)] md:max-h-[920px] md:rounded-3xl md:border md:border-slate-200 md:shadow-xl md:mb-2'
        }`}
      >
        {/* Child Screens Container */}
        <div className="flex-1 min-h-0 flex flex-col w-full h-full bg-slate-100 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

