import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#dedad0] pt-8 pb-12 text-[#57554e] text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="font-serif font-bold text-[#1f1e1a]">EventWise AI</span>
        <span aria-hidden="true">•</span>
        <span>Plan clearly. Adapt thoughtfully.</span>
      </div>

      <div className="flex items-center gap-4 text-[11px]">
        <span>Deterministic budget arithmetic</span>
        <span aria-hidden="true">•</span>
        <span>MIT License</span>
        <span aria-hidden="true">•</span>
        <span>© 2026 EventWise AI</span>
      </div>
    </footer>
  );
};
