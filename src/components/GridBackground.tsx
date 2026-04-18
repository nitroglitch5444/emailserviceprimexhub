import React from 'react';

export default function GridBackground() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
      {/* Dark Base */}
      <div className="absolute inset-0 bg-[#030712]" />
      
      {/* Main Grid */}
      <div 
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1d4ed8 1px, transparent 1px),
            linear-gradient(to bottom, #1d4ed8 1px, transparent 1px)
          `,
          backgroundSize: '4rem 4rem',
        }}
      />
      
      {/* Accent Grid Points */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#1d4ed8 1px, transparent 1px)',
          backgroundSize: '4rem 4rem',
        }}
      />

      {/* Vignette/Glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(29,78,216,0.15),_transparent_70%)]" />
    </div>
  );
}
