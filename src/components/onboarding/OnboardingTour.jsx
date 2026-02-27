import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAdminContext } from '@/contexts/AdminContext';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Custom Tooltip Component ───────────────────────────────────────────────
const CustomTooltip = React.memo(({
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
    size,
    isLastStep,
}) => {
    const { t } = useTranslation('admin');
    const { theme } = useAdminContext();
    const progress = ((index + 1) / size) * 100;

    return (
        <div
            {...tooltipProps}
            className="onboarding-tooltip vocalize-onboarding-card"
            style={{
                borderRadius: '16px',
                background: theme === 'dark' ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.96))' : 'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96))',
                border: theme === 'dark' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(99, 102, 241, 0.15)',
                boxShadow: theme === 'dark' ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.15)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 40px rgba(99, 102, 241, 0.05)',
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
                animation: 'onboarding-tooltip-enter 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                maxWidth: '400px',
                width: '100%',
                minWidth: '280px',
            }}
        >
            <div style={{
                height: '3px',
                background: 'linear-gradient(90deg, #6366f1, #0ea5e9, #8b5cf6)',
                borderRadius: '20px 20px 0 0',
            }} />

            <div style={{
                height: '2px',
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                position: 'relative',
            }}>
                <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #6366f1, #0ea5e9)',
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '0 2px 2px 0',
                }} />
            </div>

            <div style={{ padding: '18px 20px 16px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                }}>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: theme === 'dark' ? '#818cf8' : '#4f46e5',
                        background: theme === 'dark' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: theme === 'dark' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(99, 102, 241, 0.1)',
                    }}>
                        {index + 1} {t('onboarding.step_of')} {size}
                    </span>
                    {step.target === 'body' && (
                        <span className="animate-pulse" style={{ fontSize: '18px' }}>✨</span>
                    )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                    {step.content}
                </div>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderTop: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
                background: theme === 'dark' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.8)',
            }}>
                <button
                    {...skipProps}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: theme === 'dark' ? '#64748b' : '#94a3b8',
                        fontSize: '13px',
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        fontWeight: 500,
                    }}
                >
                    {t('onboarding.btn_skip')}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {index > 0 && (
                        <button
                            {...backProps}
                            style={{
                                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'white',
                                border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                                color: theme === 'dark' ? '#cbd5e1' : '#475569',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                transition: 'all 0.2s',
                            }}
                        >
                            {t('onboarding.btn_back')}
                        </button>
                    )}

                    {continuous && (
                        <button
                            {...primaryProps}
                            style={{
                                background: isLastStep
                                    ? 'linear-gradient(135deg, #10b981, #059669)'
                                    : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '8px 18px',
                                borderRadius: '10px',
                                transition: 'all 0.2s',
                                boxShadow: isLastStep
                                    ? '0 4px 15px rgba(16, 185, 129, 0.3)'
                                    : '0 4px 15px rgba(99, 102, 241, 0.3)',
                                letterSpacing: '0.02em',
                            }}
                        >
                            {isLastStep ? t('onboarding.btn_finish') : t('onboarding.btn_next')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

const StepContent = React.memo(({ title, desc, isCenter = false }) => {
    const { theme } = useAdminContext();
    return (
        <div className={`text-left space-y-3 ${isCenter ? 'text-center' : ''}`}>
            <h3 className={`font-bold leading-tight ${isCenter ? 'text-xl' : 'text-base md:text-lg'} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                style={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
                {title}
            </h3>
            <p className={`text-xs md:text-sm leading-relaxed whitespace-pre-line ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
                style={{ lineHeight: 1.6, wordBreak: 'break-word' }}>
                {desc}
            </p>
        </div>
    );
});

const OnboardingStyles = React.memo(() => {
    const { theme } = useAdminContext();
    return (
        <style>{`
            @keyframes onboarding-tooltip-enter {
                from {
                    opacity: 0;
                    transform: scale(0.92) translateY(8px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .onboarding-tooltip {
                pointer-events: auto !important;
            }

            .react-joyride__spotlight {
                border-radius: 12px !important;
                box-shadow: 
                    0 0 0 9999px ${theme === 'dark' ? 'rgba(2, 6, 23, 0.88)' : 'rgba(15, 23, 42, 0.25)'},
                    0 0 40px rgba(99, 102, 241, 0.25) !important;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }

            .vocalize-onboarding-card {
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
            }

            @media (max-width: 768px) {
                .react-joyride__spotlight {
                    max-width: calc(100vw - 24px) !important;
                }
                .__floater {
                    max-width: calc(100vw - 16px) !important;
                    left: 8px !important;
                    right: 8px !important;
                }
                .__floater.__floater--open {
                    max-width: calc(100vw - 16px) !important;
                }
                .vocalize-onboarding-card {
                    max-width: calc(100vw - 24px) !important;
                }
            }

            .__floater.__floater--open {
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
                z-index: 100000 !important;
            }

            .__floater__arrow svg polygon {
                fill: ${theme === 'dark' ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'} !important;
            }
        `}</style>
    );
});

const OnboardingTour = () => {
    const { t } = useTranslation(['admin', 'common']);
    const { hasSeenOnboarding, updateOnboardingStatus, loading: authLoading } = useAuth();
    const { userRole, theme, loading: adminLoading, branches, assignedBranchId } = useAdminContext();
    const navigate = useNavigate();
    const location = useLocation();

    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [isWaiting, setIsWaiting] = useState(false);
    const [tourSteps, setTourSteps] = useState([]);
    const [tourWidth, setTourWidth] = useState(340);

    const hasInitialized = useRef(false);
    const isOwner = userRole === 'owner';

    // Derive manager's branch name for display
    const managerBranchName = useMemo(() => {
        if (!isOwner && assignedBranchId && branches?.length > 0) {
            const branch = branches.find(b => b.id === assignedBranchId);
            return branch?.branch_name_tr || branch?.branch_name_en || null;
        }
        return null;
    }, [isOwner, assignedBranchId, branches]);

    // ─── STOP TOUR IF NOT ON TOUR PAGES ─────────────────────────────
    useEffect(() => {
        if (run) {
            const allowedPaths = ['/admin-panel', '/admin-panel/feedbacks', '/admin-panel/analytics', '/admin-panel/', '/admin-panel/feedbacks/', '/admin-panel/analytics/'];
            const normalizedPath = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
            const isAllowed = allowedPaths.includes(location.pathname) || allowedPaths.includes(normalizedPath);

            if (!isAllowed) {
                setRun(false);
                setIsWaiting(false);
            }
        }
    }, [location.pathname, run]);

    // ─── App State Sync ───────────────────────────────────────────────
    const isAppLoading = authLoading || adminLoading || !userRole;

    useEffect(() => {
        const handleResize = () => {
            setTourWidth(window.innerWidth < 480 ? Math.min(window.innerWidth - 24, 300) : 340);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Phase 1: Compute Steps (Once role is stable)
    useEffect(() => {
        if (!isAppLoading && userRole && tourSteps.length === 0) {
            const computed = [
                // 1. WELCOME
                {
                    target: 'body',
                    placement: 'center',
                    content: (
                        <StepContent
                            isCenter
                            title={!isOwner && managerBranchName
                                ? `🏢 ${managerBranchName}`
                                : t('onboarding.items.welcome.title')
                            }
                            desc={t('onboarding.items.welcome.desc')}
                        />
                    ),
                    disableBeacon: true,
                },

                // 2. HEADER SECTION (OWNER ONLY)
                ...(isOwner ? [{
                    target: '#header-branch-selector',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.header_branch.title')}
                            desc={t('onboarding.items.header_branch.desc')}
                        />
                    ),
                }] : []),

                // 3. HEADER QR
                {
                    target: '#header-qr-stats',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.header_qr.title')}
                            desc={t('onboarding.items.header_qr.desc')}
                        />
                    ),
                },

                // 4. HEADER NOTIFICATIONS
                {
                    target: '#header-notifications',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.header_notifications.title')}
                            desc={t('onboarding.items.header_notifications.desc')}
                        />
                    ),
                },

                // 5. DASHBOARD URGENT
                {
                    target: '#urgent-feedbacks-banner',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.feedbacks.title')}
                            desc={t('onboarding.items.feedbacks.desc')}
                        />
                    ),
                },

                // 6. DASHBOARD KPI
                {
                    target: '#kpi-cards-grid',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.dashboard_kpi.title')}
                            desc={t('onboarding.items.dashboard_kpi.desc')}
                        />
                    ),
                },

                // 7. DASHBOARD CHARTS
                {
                    target: '#analytics-charts-section',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.dashboard_charts.title')}
                            desc={t('onboarding.items.dashboard_charts.desc')}
                        />
                    ),
                },

                // 8. DASHBOARD RECENT ACTIVITIES
                {
                    target: '#dashboard-recent-activities',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.dashboard_activities.title')}
                            desc={t('onboarding.items.dashboard_activities.desc')}
                        />
                    ),
                },

                // 9. SIDEBAR FEEDBACKS
                {
                    target: '#sidebar-feedbacks',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.sidebar_feedbacks.title')}
                            desc={t('onboarding.items.sidebar_feedbacks.desc')}
                        />
                    ),
                },

                // 10. FILTERS
                {
                    target: '#onboarding-filters',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.feedbacks_filters.title')}
                            desc={t('onboarding.items.feedbacks_filters.desc')}
                        />
                    ),
                },

                // 11. DATE PICKER
                {
                    target: '#onboarding-date-picker',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.feedbacks_date.title')}
                            desc={t('onboarding.items.feedbacks_date.desc')}
                        />
                    ),
                },

                // 12. SEARCH
                {
                    target: '#feedback-search-bar',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.feedback_search.title')}
                            desc={t('onboarding.items.feedback_search.desc')}
                        />
                    ),
                },

                // 13. CARD ANATOMY
                {
                    target: '#onboarding-feedback-card-0',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.feedback_card_anatomy.title')}
                            desc={t('onboarding.items.feedback_card_anatomy.desc')}
                        />
                    ),
                },

                // 14. SIDEBAR ANALYTICS
                {
                    target: '#sidebar-analytics',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.sidebar_analytics.title')}
                            desc={t('onboarding.items.sidebar_analytics.desc')}
                        />
                    ),
                },

                // 15. ANALYTICS KPI
                {
                    target: '#onboarding-analytics-kpi',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.analytics_kpi.title')}
                            desc={t('onboarding.items.analytics_kpi.desc')}
                        />
                    ),
                },

                // 16. ANALYTICS TREND
                {
                    target: '#analytics-trend-chart',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.analytics_trend.title')}
                            desc={t('onboarding.items.analytics_trend.desc')}
                        />
                    ),
                },

                // 17. ANALYTICS BRAND VS EXPERIENCE
                {
                    target: '#onboarding-brand-experience',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.analytics_brand_experience.title')}
                            desc={t('onboarding.items.analytics_brand_experience.desc')}
                        />
                    ),
                },

                // 18. ANALYTICS HOURLY
                {
                    target: '#onboarding-hourly-analysis',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.analytics_hourly.title')}
                            desc={t('onboarding.items.analytics_hourly.desc')}
                        />
                    ),
                },

                // 19. ANALYTICS DETAILED (OWNER: League | MANAGER: Smart Insights)
                ...(isOwner ? [
                    {
                        target: '#onboarding-analytics-leaderboard',
                        disableBeacon: true,
                        placement: 'top',
                        disableScrolling: true,
                        content: (
                            <StepContent
                                title={t('onboarding.items.league.title')}
                                desc={t('onboarding.items.league.desc')}
                            />
                        ),
                    },
                    {
                        target: '#onboarding-leaderboard-inspect',
                        disableBeacon: true,
                        placement: 'top',
                        disableScrolling: true,
                        content: (
                            <StepContent
                                title={t('onboarding.items.league_inspect.title')}
                                desc={t('onboarding.items.league_inspect.desc')}
                            />
                        ),
                    },
                    {
                        target: 'body',
                        disableBeacon: true,
                        placement: 'center',
                        content: (
                            <StepContent
                                isCenter
                                title={t('onboarding.items.finish.title')}
                                desc={t('onboarding.items.finish.desc')}
                            />
                        ),
                    }
                ] : [
                    // MANAGER: Demographic Intelligence
                    {
                        target: '#onboarding-analytics-demographics',
                        disableBeacon: true,
                        content: (
                            <StepContent
                                title={t('onboarding.items.analytics_detailed.title')}
                                desc={t('onboarding.items.analytics_detailed.desc')}
                            />
                        ),
                    },
                    // MANAGER: Smart Insights
                    {
                        target: '#onboarding-smart-insights',
                        disableBeacon: true,
                        content: (
                            <StepContent
                                title={t('onboarding.items.smart_insights.title')}
                                desc={t('onboarding.items.smart_insights.desc')}
                            />
                        ),
                    },
                    {
                        target: 'body',
                        disableBeacon: true,
                        placement: 'center',
                        content: (
                            <StepContent
                                isCenter
                                title={t('onboarding.items.finish.title')}
                                desc={t('onboarding.items.finish.desc')}
                            />
                        ),
                    }
                ]),
            ];
            setTourSteps(computed);
        }
    }, [isAppLoading, userRole, t, isOwner, managerBranchName]);

    // Phase 2: Start Tour
    useEffect(() => {
        if (isAppLoading || tourSteps.length === 0 || hasInitialized.current) return;

        const forceRestart = localStorage.getItem('vocalize_force_tour') === 'true';
        if (!hasSeenOnboarding || forceRestart) {
            if (window.vocalize_tour_active) return;
            window.vocalize_tour_active = true;

            hasInitialized.current = true;
            // Short delay to ensure everything is mounted
            setTimeout(() => {
                setRun(true);
            }, 600);

            if (forceRestart) {
                localStorage.removeItem('vocalize_force_tour');
            }
        }
    }, [hasSeenOnboarding, isAppLoading, tourSteps]);

    // ─── DOM Polling Helper ─────────────────────────────────────────────
    const waitForElement = (selector, callback, maxWait = 5000) => {
        const interval = 100;
        let elapsed = 0;
        const timer = setInterval(() => {
            if (document.querySelector(selector)) {
                clearInterval(timer);
                callback(true);
            } else if (elapsed >= maxWait) {
                clearInterval(timer);
                callback(false);
            }
            elapsed += interval;
        }, interval);
    };

    const exitTour = useCallback(() => {
        setRun(false);
        setStepIndex(0);
        hasInitialized.current = false;
        updateOnboardingStatus(true).catch(console.error);
        setTimeout(() => {
            navigate('/admin-panel');
        }, 300);
    }, [navigate, updateOnboardingStatus]);

    // ─── Navigation & Action Handler ────────────────────────────────────
    const handleJoyrideCallback = useCallback((data) => {
        const { action, index, status, type } = data;

        // 🟢 Robust Termination Logic
        const isRealFinish = status === STATUS.FINISHED;
        const isUserSkip = status === STATUS.SKIPPED && action === ACTIONS.SKIP;

        if (isRealFinish || isUserSkip) {
            setRun(false);
            window.vocalize_tour_active = false;
            setStepIndex(0);
            hasInitialized.current = false;
            updateOnboardingStatus(true).catch(console.error);

            // Sadece gerçekten bittiyse (atlamadıysa) yönlendir
            if (isRealFinish) {
                setTimeout(() => {
                    navigate('/admin-panel');
                }, 300);
            }
            return;
        }

        // Handle navigation/events
        if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
            const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);

            // Safety check: ensure nextStepIndex is valid
            if (nextStepIndex < 0 || nextStepIndex >= tourSteps.length) {
                // If we went past the end via NEXT, it's a finish
                if (nextStepIndex >= tourSteps.length && action !== ACTIONS.PREV) {
                    exitTour();
                } else {
                    setRun(false);
                }
                return;
            }

            const currentStep = tourSteps[index];

            if (action === ACTIONS.NEXT) {
                if (currentStep.target === '#sidebar-feedbacks') {
                    setRun(false);
                    setIsWaiting(true);
                    navigate('/admin-panel/feedbacks');
                    waitForElement('#onboarding-filters', (found) => {
                        setStepIndex(nextStepIndex);
                        setRun(true);
                        setIsWaiting(false);
                    });
                    return;
                } else if (currentStep.target === '#sidebar-analytics') {
                    setRun(false);
                    setIsWaiting(true);
                    const closeBtn = document.querySelector('[data-onboarding-close-modal]');
                    if (closeBtn) closeBtn.click();
                    setTimeout(() => {
                        navigate('/admin-panel/analytics');
                        waitForElement('#onboarding-analytics-kpi', (found) => {
                            setStepIndex(nextStepIndex);
                            setRun(true);
                            setIsWaiting(false);
                        });
                    }, 400);
                    return;
                } else if (currentStep.target === '#onboarding-feedback-card-0' || currentStep.target === '#onboarding-leaderboard-inspect') {
                    setRun(false);
                    setIsWaiting(true);
                    setTimeout(() => {
                        setStepIndex(nextStepIndex);
                        setRun(true);
                        setIsWaiting(false);
                    }, 400);
                    return;
                }
            } else if (action === ACTIONS.PREV) {
                if (currentStep.target === '#onboarding-filters') {
                    setRun(false);
                    setIsWaiting(true);
                    navigate('/admin-panel');
                    waitForElement('#kpi-cards-grid', (found) => {
                        setStepIndex(nextStepIndex);
                        setRun(true);
                        setIsWaiting(false);
                    });
                    return;
                } else if (currentStep.target === '#onboarding-analytics-kpi') {
                    setRun(false);
                    setIsWaiting(true);
                    navigate('/admin-panel/feedbacks');
                    waitForElement('#onboarding-filters', (found) => {
                        setStepIndex(nextStepIndex);
                        setRun(true);
                        setIsWaiting(false);
                    });
                    return;
                }
            }

            // 🟢 Handle Target Not Found
            if (type === EVENTS.TARGET_NOT_FOUND) {
                const skippableTargets = ['#urgent-feedbacks-banner', '#header-branch-selector'];
                if (skippableTargets.includes(currentStep.target)) {
                    setStepIndex(nextStepIndex);
                    return;
                }

                // Retry logic for mandatory targets
                if (!window.onboardingRetryCount) window.onboardingRetryCount = 0;
                window.onboardingRetryCount++;

                if (window.onboardingRetryCount > 4) {
                    window.onboardingRetryCount = 0;
                    setStepIndex(nextStepIndex); // Skip it to keep the tour moving
                    return;
                }

                setTimeout(() => setStepIndex(index), 400);
                return;
            }

            // Default advance for STEP_AFTER
            if (type === EVENTS.STEP_AFTER) {
                window.onboardingRetryCount = 0;
                const nextTarget = tourSteps[nextStepIndex]?.target;

                // Optimization: If next target is missing and optional, skip immediately
                const optionalTargets = ['#header-branch-selector', '#urgent-feedbacks-banner'];
                if (nextTarget && optionalTargets.includes(nextTarget) && !document.querySelector(nextTarget)) {
                    setStepIndex(nextStepIndex);
                    return;
                }

                // Special scroll handling
                if (nextTarget === '#onboarding-analytics-leaderboard' || nextTarget === '#onboarding-leaderboard-inspect') {
                    const el = document.querySelector(nextTarget);
                    const scrollContainer = document.querySelector('#admin-main-content');
                    if (el && scrollContainer) {
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const elRect = el.getBoundingClientRect();
                        const elOffsetInContainer = elRect.top - containerRect.top + scrollContainer.scrollTop;
                        const targetScrollTop = Math.max(0, elOffsetInContainer - 200);
                        scrollContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                        setTimeout(() => setStepIndex(nextStepIndex), 400);
                    } else {
                        setStepIndex(nextStepIndex);
                    }
                    return;
                }

                // If next step requires waiting
                if (nextTarget && nextTarget !== 'body' && !document.querySelector(nextTarget)) {
                    setRun(false); // Pause while waiting to avoid ghosting
                    setIsWaiting(true);
                    waitForElement(nextTarget, (found) => {
                        setStepIndex(nextStepIndex);
                        setRun(true);
                        setIsWaiting(false);
                    }, 4000);
                } else {
                    setStepIndex(nextStepIndex);
                }
            }
        }
    }, [navigate, tourSteps, updateOnboardingStatus, isWaiting, exitTour]);

    return (
        <>
            <OnboardingStyles />
            <Joyride
                key={run ? 'onboarding-active' : 'onboarding-inactive'}
                callback={handleJoyrideCallback}
                continuous
                hideCloseButton
                run={run}
                stepIndex={stepIndex}
                scrollToFirstStep={true}
                showProgress={false}
                showSkipButton
                steps={tourSteps}
                disableScrolling={false}
                disableScrollParentFix={true}
                disableOverlayClose={true}
                disableCloseOnEsc={true}
                scrollOffset={140}
                tooltipComponent={CustomTooltip}
                styles={{
                    options: {
                        arrowColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                        overlayColor: theme === 'dark' ? 'rgba(2, 6, 23, 0.88)' : 'rgba(15, 23, 42, 0.25)',
                        zIndex: 99999,
                        width: tourWidth,
                    },
                    spotlight: {
                        borderRadius: 12,
                    }
                }}
                locale={{
                    back: t('onboarding.btn_back'),
                    close: t('onboarding.btn_finish'),
                    last: t('onboarding.btn_finish'),
                    next: t('onboarding.btn_next'),
                    skip: t('onboarding.btn_skip'),
                }}
            />
        </>
    );
};

export default OnboardingTour;
