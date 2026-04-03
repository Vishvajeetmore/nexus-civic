'use client';
import { useEffect, useState } from 'react';

interface KPICardProps {
  title: string;
  value: number;
  trend: number;
  icon: string;
  accentColor: string;
  isLive?: boolean;
  unit?: string;
}

export default function KPICard({ title, value, trend, icon, accentColor, isLive, unit }: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepTime = duration / steps;
    const increment = value / steps;
    
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div 
      className="bg-[#1A0533] rounded-xl p-4 relative overflow-hidden border-l-4 shadow-lg flex flex-col justify-between"
      style={{ borderLeftColor: accentColor }}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-gray-400 text-sm font-medium">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      
      <div className="flex items-baseline space-x-1">
        <span className="text-3xl font-bold text-white font-space-mono">
          {displayValue}{unit}
        </span>
        {isLive && (
          <div className="relative flex h-2 w-2 ml-2 mb-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </div>
        )}
      </div>

      <div className="mt-2 text-sm">
        <span className={trend >= 0 ? "text-green-400" : "text-red-400"}>
          {trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%
        </span>
        <span className="text-gray-500 ml-2 text-xs">vs last week</span>
      </div>
    </div>
  );
}
