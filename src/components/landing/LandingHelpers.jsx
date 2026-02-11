import React, { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// ============================================================================
// ENTERPRISE BACKGROUND COMPONENT
// ============================================================================

export const EnterpriseBackground = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
            linear-gradient(to right, #14b8a6 1px, transparent 1px),
            linear-gradient(to bottom, #14b8a6 1px, transparent 1px)
          `,
                    backgroundSize: '80px 80px'
                }}
            />

            <div
                className="absolute top-0 left-0 w-[600px] h-[600px] opacity-20"
                style={{
                    background: 'radial-gradient(circle, rgba(20,184,166,0.4) 0%, rgba(20,184,166,0.1) 40%, transparent 70%)',
                    filter: 'blur(80px)'
                }}
            />

            <div
                className="absolute top-0 right-0 w-[500px] h-[500px] opacity-15"
                style={{
                    background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(249,115,22,0.1) 40%, transparent 70%)',
                    filter: 'blur(70px)'
                }}
            />

            <div
                className="absolute bottom-0 left-1/4 w-[400px] h-[400px] opacity-10"
                style={{
                    background: 'radial-gradient(circle, rgba(20,184,166,0.3) 0%, transparent 70%)',
                    filter: 'blur(60px)'
                }}
            />

            <div
                className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-15"
                style={{
                    background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)',
                    filter: 'blur(70px)'
                }}
            />
        </div>
    );
};

// ============================================================================
// ANIMATED COUNTER COMPONENT
// ============================================================================

export const AnimatedCounter = ({ from = 0, to, duration = 2, suffix = "" }) => {
    const nodeRef = useRef();
    const inView = useInView(nodeRef, { once: true, margin: "-100px" });

    useEffect(() => {
        const node = nodeRef.current;
        if (!inView) return;

        let startTime;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(from + (to - from) * ease);

            if (node) {
                node.textContent = current.toLocaleString() + suffix;
            }

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, [inView, from, to, duration, suffix]);

    return <span ref={nodeRef} className="tabular-nums">{from}{suffix}</span>;
};

// ============================================================================
// FADE IN ANIMATION COMPONENT
// ============================================================================

export const FadeIn = ({ children, delay = 0, className }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
};
