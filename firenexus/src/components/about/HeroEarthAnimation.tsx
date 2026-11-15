import React, { useRef, useEffect } from 'react';

/**
 * HeroEarthAnimation: An elegant, lightweight canvas-based Earth visualization
 * with rotating coordinate grid, atmosphere glow, and orbiting satellite markers
 * representing MODIS (Terra & Aqua) and VIIRS (Suomi-NPP & NOAA-20).
 */
export const HeroEarthAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 0;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Satellites orbiting Earth
    const satellites = [
      {
        name: 'Terra (MODIS)',
        altitude: 1.38,
        inclination: 0.35,
        speed: 0.012,
        color: '#FF713E',
        phase: 0,
        trail: [] as { x: number; y: number }[],
      },
      {
        name: 'Aqua (MODIS)',
        altitude: 1.42,
        inclination: -0.42,
        speed: 0.011,
        color: '#FF8A5B',
        phase: Math.PI * 0.7,
        trail: [] as { x: number; y: number }[],
      },
      {
        name: 'Suomi-NPP (VIIRS)',
        altitude: 1.55,
        inclination: 0.52,
        speed: 0.009,
        color: '#00E5B0',
        phase: Math.PI * 1.3,
        trail: [] as { x: number; y: number }[],
      },
      {
        name: 'NOAA-20 (VIIRS)',
        altitude: 1.58,
        inclination: -0.28,
        speed: 0.0095,
        color: '#00B8D9',
        phase: Math.PI * 0.2,
        trail: [] as { x: number; y: number }[],
      },
    ];

    // Simulated continent dots around sphere
    const continentPoints: { lat: number; lon: number }[] = [];
    const numPoints = 160;
    for (let i = 0; i < numPoints; i++) {
      // Cluster points into general landmass distributions
      const u = Math.random();
      const v = Math.random();
      const lat = (Math.acos(2 * v - 1) - Math.PI / 2) * (180 / Math.PI);
      const lon = (360 * u - 180);
      continentPoints.push({ lat, lon });
    }

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.28;

      rotation += 0.003;

      // 1. Atmosphere outer glow gradient
      const atmosphereGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.85,
        centerX,
        centerY,
        radius * 1.45
      );
      atmosphereGrad.addColorStop(0, 'rgba(0, 184, 217, 0.22)');
      atmosphereGrad.addColorStop(0.5, 'rgba(0, 229, 176, 0.08)');
      atmosphereGrad.addColorStop(1, 'rgba(7, 11, 24, 0)');

      ctx.fillStyle = atmosphereGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // 2. Earth sphere core background
      const earthGrad = ctx.createRadialGradient(
        centerX - radius * 0.35,
        centerY - radius * 0.35,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      earthGrad.addColorStop(0, '#1A2946');
      earthGrad.addColorStop(0.5, '#111C32');
      earthGrad.addColorStop(1, '#070B18');

      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Earth limb stroke
      ctx.strokeStyle = 'rgba(0, 184, 217, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Coordinate Graticule (Latitude Parallels & Longitude Meridians)
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();

      // Latitude circles
      [-60, -30, 0, 30, 60].forEach((latDeg) => {
        const phi = (latDeg * Math.PI) / 180;
        const y = centerY - radius * Math.sin(phi);
        const rLat = radius * Math.cos(phi);

        ctx.strokeStyle = latDeg === 0 ? 'rgba(0, 229, 176, 0.28)' : 'rgba(0, 184, 217, 0.14)';
        ctx.lineWidth = latDeg === 0 ? 1.2 : 0.8;
        ctx.setLineDash(latDeg === 0 ? [] : [3, 4]);

        ctx.beginPath();
        ctx.ellipse(centerX, y, rLat, rLat * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Longitude meridians rotating
      ctx.setLineDash([2, 4]);
      for (let i = 0; i < 8; i++) {
        const angle = rotation + (i * Math.PI) / 4;
        const xOffset = Math.sin(angle) * radius;
        const visible = Math.cos(angle) > -0.2; // Front-facing check

        if (visible) {
          ctx.strokeStyle = 'rgba(0, 184, 217, 0.16)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(centerX + xOffset * 0.5, centerY, Math.abs(xOffset), radius, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);

      // 4. Landmass / Active Fire Hotspot Dots on Sphere
      continentPoints.forEach((pt) => {
        const lonRad = ((pt.lon + rotation * (180 / Math.PI)) * Math.PI) / 180;
        const latRad = (pt.lat * Math.PI) / 180;

        // Spherical to 2D orthographic projection
        const cosLon = Math.cos(lonRad);
        if (cosLon > 0) {
          // Front hemisphere
          const x = centerX + radius * Math.cos(latRad) * Math.sin(lonRad);
          const y = centerY - radius * Math.sin(latRad);

          const isHotspot = (pt.lat + pt.lon) % 7 < 1.2;
          ctx.fillStyle = isHotspot ? 'rgba(255, 113, 62, 0.85)' : 'rgba(0, 229, 176, 0.35)';
          ctx.beginPath();
          ctx.arc(x, y, isHotspot ? 2.2 : 1.2, 0, Math.PI * 2);
          ctx.fill();

          if (isHotspot) {
            ctx.fillStyle = 'rgba(255, 113, 62, 0.25)';
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      ctx.restore();

      // 5. Orbital Satellite Rings & Beacons
      satellites.forEach((sat) => {
        sat.phase += sat.speed;
        const satR = radius * sat.altitude;

        // Draw elliptical orbit path
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(sat.inclination);

        ctx.strokeStyle = `${sat.color}22`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 0, satR, satR * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Satellite position
        const satX = Math.cos(sat.phase) * satR;
        const satY = Math.sin(sat.phase) * (satR * 0.32);

        // Store trail
        sat.trail.push({ x: satX, y: satY });
        if (sat.trail.length > 12) sat.trail.shift();

        // Draw faint trail
        if (sat.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(sat.trail[0].x, sat.trail[0].y);
          for (let i = 1; i < sat.trail.length; i++) {
            ctx.lineTo(sat.trail[i].x, sat.trail[i].y);
          }
          ctx.strokeStyle = `${sat.color}44`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Outer beacon glow
        ctx.fillStyle = `${sat.color}33`;
        ctx.beginPath();
        ctx.arc(satX, satY, 7, 0, Math.PI * 2);
        ctx.fill();

        // Satellite beacon core
        ctx.fillStyle = sat.color;
        ctx.beginPath();
        ctx.arc(satX, satY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-85 z-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default HeroEarthAnimation;
