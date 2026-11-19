import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-dark-surface rounded-2xl border border-white/10 flex flex-col h-full animate-pulse overflow-hidden select-none">
      {/* 1:1 image container */}
      <div className="w-full aspect-square bg-white/5" />

      {/* Content body */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        {/* Brand placeholder */}
        <div className="h-3 w-16 bg-white/5 rounded mb-1" />

        {/* 2-line title placeholder */}
        <div className="space-y-1.5 h-[2.5rem] sm:h-[2.75rem]">
          <div className="h-3.5 sm:h-4 w-5/6 bg-white/5 rounded" />
          <div className="h-3.5 sm:h-4 w-3/5 bg-white/5 rounded" />
        </div>

        {/* Key data placeholder */}
        <div className="h-3 w-1/2 bg-white/5 rounded mt-1" />

        {/* Bottom container pinned to bottom */}
        <div className="mt-auto pt-3 border-t border-white/[0.08] flex flex-col gap-2.5">
          <div className="h-5 sm:h-6 w-24 bg-white/5 rounded min-h-[24px]" />
          <div className="h-10 sm:h-11 w-full bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
