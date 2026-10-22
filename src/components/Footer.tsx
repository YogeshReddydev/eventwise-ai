import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#e9e5db] pt-8 pb-12 text-[#969187] text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="font-serif font-bold text-[#24231f]">EventWise AI</span>
        <span>•</span>
        <span>Plan clearly. Adapt thoughtfully.</span>
      </div>

      <div className="flex items-center gap-4 text-[11px]">
        <span>Deterministic budget arithmetic</span>
        <span>•</span>
        <span>MIT License</span>
        <span>•</span>
        <span>© 2026 EventWise AI</span>
      </div>
    </footer>
  );
};
