import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#dedad0] bg-[#fbfaf6] p-6 sm:p-10 md:p-12 mb-8 shadow-xs">
      <div className="max-w-2xl relative z-10">
        <span className="inline-block text-[11px] font-bold tracking-[0.16em] uppercase text-[#9c4f2b] mb-2.5">
          Your Event, Under Control
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#1f1e1a] tracking-tight leading-[1.15] mb-4">
          Make room for the{' '}
          <em className="italic text-[#354c3c] font-normal">moments that matter.</em>
        </h1>
        <p className="text-base sm:text-lg text-[#57554e] leading-relaxed max-w-xl">
          Event plans often start in scattered notes, but budget changes and vendor quote increases can cause overruns.
          EventWise combines deterministic arithmetic with a Plan Recovery Engine to keep every rupee and deadline clear.
        </p>
      </div>

      {/* Decorative Brand Artwork */}
      <div className="hidden md:block pointer-events-none select-none">
        <div className="sun" aria-hidden="true" />
        <div className="arch arch-one" aria-hidden="true" />
        <div className="arch arch-two" aria-hidden="true" />
        <div className="flower font-serif" aria-hidden="true">
          ✦
        </div>
      </div>
    </section>
  );
};
