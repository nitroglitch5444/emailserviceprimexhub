import React, { useEffect, useRef } from 'react';

export default function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Disable on mobile for performance
    if (window.innerWidth < 768) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Use alpha: false for better performance if background is solid, 
    // but we need it transparent to show the CSS background color/gradients behind it
    const ctx = canvas.getContext('2d', { alpha: true }); 
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; radius: number; vy: number; alpha: number; type: 'small' | 'medium' | 'large' }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      // Optimized density for premium feel without lag
      const numParticles = Math.floor((canvas.width * canvas.height) / 8000); 
      for (let i = 0; i < numParticles; i++) {
        const rand = Math.random();
        let type: 'small' | 'medium' | 'large' = 'small';
        let radius = Math.random() * 0.8 + 0.2;
        
        // Base speed moving downwards (gives illusion of moving up)
        let vy = Math.random() * 0.5 + 0.2;

        if (rand > 0.85) {
          type = 'medium';
          radius = Math.random() * 1.2 + 0.8;
          vy = Math.random() * 0.8 + 0.5;
        }
        if (rand > 0.98) {
          type = 'large';
          radius = Math.random() * 2.0 + 1.5;
          vy = Math.random() * 1.2 + 0.8;
        }

        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius,
          vy,
          alpha: Math.random() * 0.5 + 0.1,
          type
        });
      }
    };

    const draw = () => {
      // Clear canvas (transparent)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw and update particles
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        // Premium colors: subtle whites and blues
        if (p.type === 'large') {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
        } else if (p.type === 'medium') {
          ctx.fillStyle = `rgba(139, 92, 246, ${p.alpha * 0.6})`; // Violet tint
        } else {
          ctx.fillStyle = `rgba(59, 130, 246, ${p.alpha * 0.4})`; // Blue tint
        }

        ctx.fill();

        // Move particle downwards
        p.y += p.vy;
        
        // Wrap around to top
        if (p.y > canvas.height + 10) {
          p.y = -10;
          p.x = Math.random() * canvas.width; // Randomize X on respawn
        }

        // Subtle twinkle
        p.alpha += (Math.random() - 0.5) * 0.02;
        if (p.alpha < 0.1) p.alpha = 0.1;
        if (p.alpha > 0.8) p.alpha = 0.8;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Base Dark Background */}
      <div className="fixed inset-0 z-[-3] bg-[#0a0a0a]" />
      
      {/* Subtle Premium Gradients */}
      <div className="fixed inset-0 z-[-2] pointer-events-none opacity-30 hidden md:block">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen transform-gpu"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen transform-gpu"></div>
      </div>

      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[-1] pointer-events-none"
      />
    </>
  );
}
