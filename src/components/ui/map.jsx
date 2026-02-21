"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * @typedef {Object} MapProps
 * @property {Array} [dots]
 * @property {string} [lineColor="#14b8a6"]
 * @property {boolean} [showLabels=true]
 * @property {string} [labelClassName="text-sm"]
 * @property {number} [animationDuration=2]
 * @property {boolean} [loop=true]
 */

export function WorldMap({ 
  dots = [], 
  lineColor = "#14b8a6",
  showLabels = true,
  labelClassName = "text-sm",
  animationDuration = 2,
  loop = true
}) {
  const svgRef = useRef(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);

  // Predefined global cities for simple map display
  const cities = [
    { name: "Istanbul", x: "25%", y: "30%", label: "Istanbul, TR" },
    { name: "London", x: "15%", y: "25%", label: "London, UK" },
    { name: "Dubai", x: "35%", y: "40%", label: "Dubai, UAE" },
    { name: "New York", x: "5%", y: "35%", label: "New York, USA" },
    { name: "Tokyo", x: "65%", y: "30%", label: "Tokyo, JP" },
    { name: "Sydney", x: "70%", y: "70%", label: "Sydney, AU" }
  ];

  return (
    <div className="w-full aspect-[2/1] md:aspect-[2.5/1] lg:aspect-[2/1] bg-[#0f172a] rounded-lg relative font-sans overflow-hidden border border-slate-700/50">
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(20,184,166,0.3) 0%, transparent 70%)"
        }}
      />

      {/* SVG Map Design */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 600"
        className="w-full h-full absolute inset-0 pointer-events-none select-none"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="globe-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Background grid */}
        <rect width="1000" height="600" fill="url(#globe-gradient)" />

        {/* Animated grid lines */}
        <g opacity="0.1" stroke={lineColor} strokeWidth="0.5">
          {[...Array(6)].map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={i * 100} x2="1000" y2={i * 100} />
          ))}
          {[...Array(11)].map((_, i) => (
            <line key={`v-${i}`} x1={i * 100} y1="0" x2={i * 100} y2="600" />
          ))}
        </g>

        {/* Connection lines between cities */}
        <motion.g
          opacity="0.3"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeDasharray="5,5"
        >
          <line x1="250" y1="180" x2="150" y2="150" />
          <line x1="150" y1="150" x2="350" y2="240" />
          <line x1="350" y1="240" x2="500" y2="240" />
          <line x1="500" y1="240" x2="750" y2="180" />
          <line x1="750" y1="180" x2="700" y2="420" />
        </motion.g>
      </svg>

      {/* Interactive city markers */}
      <div className="absolute inset-0 pointer-events-auto">
        {cities.map((city, idx) => (
          <motion.div
            key={city.name}
            className="absolute flex flex-col items-center cursor-pointer"
            style={{ left: city.x, top: city.y, transform: "translate(-50%, -50%)" }}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.15, duration: 0.4 }}
            onHoverStart={() => setHoveredLocation(city.label)}
            onHoverEnd={() => setHoveredLocation(null)}
          >
            {/* Animated pulse */}
            <motion.div
              className="absolute w-3 h-3 bg-teal-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Main circle */}
            <div className="relative w-3 h-3 bg-teal-400 rounded-full shadow-lg border border-teal-300" />

            {/* Tooltip */}
            {hoveredLocation === city.label && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: -30 }}
                className="absolute bottom-full mb-2 bg-slate-900 border border-teal-500/50 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-xl"
              >
                {city.label}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 text-xs text-slate-400 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-teal-400 rounded-full" />
          <span>{showLabels ? "Global Reach" : ""}</span>
        </div>
      </div>
    </div>
  );
}