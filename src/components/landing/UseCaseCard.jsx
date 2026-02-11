import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';

const UseCaseCard = ({ solution, index, lang }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15, duration: 0.5 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="relative group"
        >
            {/* Card Container */}
            <div className="relative bg-gradient-to-br from-slate-800/60 via-slate-850/60 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 h-full hover:border-teal-500/40 transition-all duration-500 overflow-hidden">
                {/* Animated Background Gradient */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                />

                {/* Content */}
                <div className="relative z-10">
                    {/* Icon & Title */}
                    <div className="flex items-start gap-4 mb-6">
                        <motion.div
                            className="text-5xl"
                            animate={isHovered ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {solution.icon}
                        </motion.div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                                {solution.sector}
                            </h3>
                        </div>
                    </div>

                    {/* Challenge */}
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-xs font-semibold text-red-300 uppercase tracking-wider">
                                {lang === 'tr' ? 'Yaygın Sorun' : 'Common Challenge'}
                            </span>
                        </div>
                        <p className="text-sm text-red-200/80 leading-relaxed">
                            {solution.challenge}
                        </p>
                    </div>

                    {/* Solution */}
                    <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-teal-400" />
                            <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider">
                                {lang === 'tr' ? 'Vocalize Çözümü' : 'Vocalize Solution'}
                            </span>
                        </div>
                        <p className="text-sm text-teal-200/90 leading-relaxed font-medium">
                            {solution.solution}
                        </p>
                    </div>

                    {/* CTA Arrow */}
                    <motion.div
                        className="flex items-center gap-2 mt-6 text-teal-400 font-semibold text-sm cursor-pointer group-hover:gap-3 transition-all"
                        animate={isHovered ? { x: 5 } : { x: 0 }}
                    >
                        <span>{lang === 'tr' ? 'Detaylı İncele' : 'Learn More'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </motion.div>
                </div>

                {/* Hover Border Glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                        boxShadow: '0 0 30px rgba(20, 184, 166, 0.3)'
                    }}
                />
            </div>
        </motion.div>
    );
};

export default UseCaseCard;
