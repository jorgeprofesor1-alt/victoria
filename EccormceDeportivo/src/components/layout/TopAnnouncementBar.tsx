import React from 'react';
import { Truck, ShieldCheck, Package, CheckCircle2 } from 'lucide-react';

export const TopAnnouncementBar: React.FC = () => {
  const announcements = [
    { icon: <Truck className="w-3.5 h-3.5 text-volt shrink-0" />, text: "ENVÍOS 100% GRATIS EN TODA LA CIUDAD DE PASTO" },
    { icon: <ShieldCheck className="w-3.5 h-3.5 text-volt shrink-0" />, text: "PAGA FÁCIL CON NEQUI O BANCOLOMBIA" },
    { icon: <Package className="w-3.5 h-3.5 text-volt shrink-0" />, text: "DESPACHOS EL MISMO DÍA (ANTES DE 2 PM)" },
    { icon: <CheckCircle2 className="w-3.5 h-3.5 text-volt shrink-0" />, text: "100% ORIGINAL SIS CERTIFICADO" },
  ];

  return (
    <div className="bg-[#080B10] border-b border-white/5 py-2 text-[10px] md:text-[11px] font-black tracking-widest text-gray-300 uppercase relative z-50">
      {/* Desktop View: Clean 4 items distributed */}
      <div className="hidden lg:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 justify-between items-center">
        {announcements.map((item, index) => (
          <div key={index} className="flex items-center gap-2 hover:text-volt transition-colors cursor-default">
            {item.icon}
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      {/* Mobile/Tablet View: Smooth infinite marquee */}
      <div className="lg:hidden overflow-hidden flex whitespace-nowrap">
        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          {[...Array(2)].map((_, arrayIndex) => (
            <div key={arrayIndex} className="flex items-center shrink-0">
              {announcements.map((item, index) => (
                <div key={index} className="flex items-center gap-2 mx-6 shrink-0">
                  {item.icon}
                  <span>{item.text}</span>
                  <span className="mx-6 text-white/10 font-normal">/</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

