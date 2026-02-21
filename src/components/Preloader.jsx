import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Preloader = ({ onComplete }) => {
    const [show, setShow] = useState(true);

    useEffect(() => {
        // Minimum display time for the logo to be seen clearly
        const timer = setTimeout(() => {
            setShow(false);
            if (onComplete) {
                setTimeout(onComplete, 500); // Wait for exit animation
            }
        }, 2500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a] text-white"
                >
                    <div className="relative flex flex-col items-center">
                        {/* Logo Container with Glow */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="relative w-32 h-32 md:w-40 md:h-40 mb-8 flex items-center justify-center"
                        >
                            {/* Background Glows */}
                            <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
                            <div className="absolute inset-0 bg-orange-500/10 rounded-full blur-2xl animate-pulse delay-75" />

                            <img
                                src="/faviconmain.png"
                                alt="Vocalize Logo"
                                className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
                            />
                        </motion.div>

                        {/* Loading Bar */}
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 200, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
                            className="h-1 bg-slate-800 rounded-full overflow-hidden relative"
                        >
                            <motion.div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-orange-500"
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 1.5,
                                    ease: "linear"
                                }}
                                style={{ width: '50%' }}
                            />
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="mt-4 text-slate-400 text-sm font-medium tracking-widest uppercase"
                        >
                            Yükleniyor...
                        </motion.p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
