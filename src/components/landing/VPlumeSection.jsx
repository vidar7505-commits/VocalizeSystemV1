import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Wallet, Infinity as InfinityIcon } from 'lucide-react';
import { FadeIn } from './LandingHelpers';
import { cn } from "@/lib/utils";

const LevitatingTitleFeather = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative flex items-center justify-center -mt-2"
    >
        <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
            <svg
                width="60"
                height="60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_20px_rgba(255,255,255,0.9)] md:w-[70px] md:h-[70px]"
            >
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                <line x1="16" y1="8" x2="2" y2="22" />
                <line x1="17.5" y1="15" x2="9" y2="15" />
            </svg>
        </motion.div>
    </motion.div>
);

const OrbitalCore = () => {
    return (
        <div className="relative w-full h-[280px] md:h-[350px] flex items-center justify-center lg:-mt-4">
            {/* Outer Ring */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute w-[260px] h-[260px] md:w-[320px] md:h-[320px] rounded-full border border-cyan-500/20"
            >
                {/* Particle 1 */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_#06b6d4]" />
            </motion.div>

            {/* Middle Ring */}
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute w-[180px] h-[180px] md:w-[220px] md:h-[220px] rounded-full border border-cyan-500/30"
            >
                {/* Particle 2 */}
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-300 rounded-full shadow-[0_0_12px_#67e8f9]" />
                {/* Particle 3 */}
                <div className="absolute bottom-0 left-1/4 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_#ffffff]" />
            </motion.div>

            {/* Inner Ring */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute w-[90px] h-[90px] md:w-[110px] md:h-[110px] rounded-full border border-cyan-400/40"
            />

            {/* The Core Pulsing Icon */}
            <motion.div
                animate={{ scale: [1, 1.1, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-14 h-14 md:w-16 md:h-16 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.5)] backdrop-blur-md"
            >
                <InfinityIcon className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
            </motion.div>

            {/* Ambient Core Glow */}
            <div className="absolute w-40 h-40 md:w-48 md:h-48 bg-cyan-500/20 blur-[50px] rounded-full z-0 animate-pulse" />
        </div>
    );
};

const TimelineNode = ({ icon: Icon, title, desc, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
        className="relative flex items-start gap-5 md:gap-7 z-10"
    >
        {/* Icon Node */}
        <div className="relative z-10 flex-shrink-0 bg-[#0B1120] p-1 rounded-full mt-1">
            <div className="bg-cyan-500/10 text-cyan-400 p-2.5 md:p-3 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:bg-cyan-500/20 transition-colors">
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
        </div>

        {/* Content */}
        <div className="flex flex-col pt-1.5 pb-2">
            <h3 className="text-lg md:text-xl text-white font-bold mb-1.5 tracking-tight">
                {title}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
                {desc}
            </p>
        </div>
    </motion.div>
);

const VPlumeSection = ({ content }) => {
    if (!content) return null;

    const iconMap = {
        shield: ShieldCheck,
        wallet: Wallet,
        loop: InfinityIcon,
    };

    return (
        <section id="v-plume" className="py-12 md:py-16 bg-[#0B1120] relative z-20 flex flex-col items-center justify-center px-4 min-h-[100dvh]">
            {/* The Unified Glass Stage Dashboard Container */}
            <div className="w-full max-w-6xl mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 md:p-10 flex flex-col relative overflow-hidden shadow-2xl">

                {/* Massive Turquoise Radial Glow Background */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none z-0"
                    style={{
                        background: "radial-gradient(circle at center, #06B6D4 0%, transparent 60%)",
                        opacity: 0.15,
                        filter: "blur(100px)"
                    }}
                />

                {/* Top Area: Header & Badge */}
                <div className="relative z-10 flex flex-col items-center text-center w-full mb-8 px-4">
                    {/* Glowing Pill Badge */}
                    <FadeIn>
                        <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[10px] md:text-xs font-bold tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                            🚀 Geliştirme Aşamasında - Çok Yakında
                        </div>
                    </FadeIn>

                    {/* Title and Feather */}
                    <FadeIn delay={0.1}>
                        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-3">
                            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-400 tracking-tighter leading-tight pb-2">
                                {content.title}
                            </h2>
                            <LevitatingTitleFeather />
                        </div>
                    </FadeIn>

                    {/* Subtitle */}
                    <FadeIn delay={0.2}>
                        <p className="text-slate-300 text-sm md:text-base font-medium max-w-2xl mx-auto">
                            {content.subtitle}
                        </p>
                    </FadeIn>
                </div>

                {/* Bottom Area: Grid Layout */}
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center w-full max-w-5xl mx-auto">

                    {/* Left Column: The Orbital Core */}
                    <div className="w-full flex justify-center items-center">
                        <FadeIn delay={0.3} className="w-full">
                            <OrbitalCore />
                        </FadeIn>
                    </div>

                    {/* Right Column: The Ecosystem Flow (Timeline) */}
                    <div className="w-full relative py-2 lg:pl-10">
                        {/* Vertical Gradient Line */}
                        <div className="absolute left-[24px] md:left-[28px] top-[24px] bottom-10 w-[2px] bg-gradient-to-b from-cyan-400 via-cyan-500/50 to-transparent z-0" />

                        <div className="flex flex-col gap-6 md:gap-8 relative w-full">
                            {content.cards.map((card, idx) => {
                                const Icon = iconMap[card.icon];
                                return (
                                    <TimelineNode
                                        key={idx}
                                        icon={Icon}
                                        title={card.title}
                                        desc={card.desc}
                                        delay={0.4 + (0.15 * idx)}
                                    />
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default VPlumeSection;
