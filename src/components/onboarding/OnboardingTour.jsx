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
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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
                maxWidth: isMobile ? 'calc(100vw - 24px)' : '400px',
                width: '100%',
                minWidth: isMobile ? '260px' : '280px',
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

            <div style={{ padding: isMobile ? '14px 16px 12px' : '18px 20px 16px' }}>
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
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return (
        <div className={`text-left ${isMobile ? 'space-y-1.5' : 'space-y-3'} ${isCenter ? 'text-center' : ''}`}>
            <h3 className={`font-bold leading-tight ${isCenter ? (isMobile ? 'text-lg' : 'text-xl') : (isMobile ? 'text-sm' : 'text-base md:text-lg')} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                style={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
                {title}
            </h3>
            <p className={`${isMobile ? 'text-[11px]' : 'text-xs md:text-sm'} leading-relaxed whitespace-pre-line ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
                style={{ lineHeight: 1.5, wordBreak: 'break-word' }}>
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
                    max-width: calc(100vw - 16px) !important;
                }
                .__floater {
                    max-width: calc(100vw - 12px) !important;
                    /* REMOVED: Specific left/right overrides to allow Joyride's own centering and calculation */
                }
                .vocalize-onboarding-card {
                    max-width: calc(100vw - 12px) !important;
                    min-width: 250px !important;
                }
                .onboarding-tooltip {
                    padding: 0 !important;
                    max-height: 80vh;
                    overflow-y: auto;
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
    const { userRole, theme, loading: adminLoading, branches, assignedBranchId, setSelectedBranchId } = useAdminContext();
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
            setTourWidth((typeof window !== 'undefined' && window.innerWidth < 768) ? Math.min(window.innerWidth - 12, 320) : 340);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ─── Scroll-Lock Cleanup ──────────────────────────────────────────
    useEffect(() => {
        if (!run) {
            document.body.style.overflow = '';
            const main = document.querySelector('#admin-main-content');
            if (main) {
                main.style.overflowY = 'auto';
                main.style.pointerEvents = 'auto';
            }
        }
    }, [run]);

    // ─── Phase 1: Compute Steps (Separated for Mobile/Desktop) ──────────────────
    useEffect(() => {
        if (isAppLoading || !userRole || tourSteps.length > 0) return;

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

        // Shared Steps
        const welcomeStep = {
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
        };

        const finishStep = {
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
        };

        const commonDashboardSteps = [
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
            {
                target: '#analytics-charts-section',
                disableBeacon: true,
                content: (
                    <StepContent
                        title={t('onboarding.items.dashboard_charts.title')}
                        desc={t('onboarding.items.dashboard_charts.desc')}
                    />
                ),
            }
        ];

        let steps = [];

        if (isMobile) {
            // 📱 MOBILE FLOW
            steps = [
                welcomeStep,
                {
                    target: '#mobile-qr-stats',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.header_qr.title')}
                            desc={t('onboarding.items.header_qr.desc')}
                        />
                    ),
                },
                ...(isOwner ? [{
                    target: '#mobile-branch-selector',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.header_branch.title')}
                            desc={t('onboarding.items.header_branch.desc')}
                        />
                    ),
                }] : []),
                {
                    target: '#mobile-notifications',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.header_notifications.title')}
                            desc={t('onboarding.items.header_notifications.desc')}
                        />
                    ),
                },
                ...commonDashboardSteps,
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
                {
                    target: '#mobile-menu-trigger',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('sidebar.menu', { defaultValue: 'Menü' })}
                            desc={t('onboarding.items.sidebar_feedbacks.desc')}
                        />
                    ),
                },
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
                {
                    target: '#onboarding-feedback-card-0',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.feedback_card_anatomy.title', { defaultValue: 'Geri Bildirim Detayı' })}
                            desc={t('onboarding.items.feedback_card_anatomy.desc')}
                        />
                    ),
                },
                {
                    target: '#mobile-menu-trigger',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('sidebar.menu', { defaultValue: 'Gezinti' })}
                            desc={t('onboarding.items.sidebar_analytics.desc')}
                        />
                    ),
                },
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
                {
                    target: '#onboarding-analytics-kpi',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('onboarding.items.analytics_kpi.title', { defaultValue: 'Analiz Özetleri' })}
                            desc={t('onboarding.items.analytics_kpi.desc')}
                        />
                    ),
                },
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
                {
                    target: '#onboarding-brand-experience',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('analytics.brand_vs_experience.title', { defaultValue: 'Marka Denetimi' })}
                            desc={t('analytics.brand_vs_experience.subtitle', { defaultValue: 'Müşterilerinizin marka algısı ve anlık deneyim karşılaştırması.' })}
                        />
                    ),
                },
                {
                    target: '#onboarding-hourly-analysis',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('analytics.hourly.title', { defaultValue: 'Zaman Analizi' })}
                            desc={t('analytics.hourly.subtitle', { defaultValue: 'Günün hangi saatlerinde daha yoğun geri bildirim aldığınızı görün.' })}
                        />
                    ),
                },
                {
                    target: '#onboarding-analytics-demographics',
                    disableBeacon: true,
                    content: (
                        <StepContent
                            title={t('analytics.demographics.title', { defaultValue: 'Demografik Zekâ' })}
                            desc={t('analytics.demographics.subtitle', { defaultValue: 'Müşteri kitlenizin yaş ve cinsiyet bazlı dağılım analizi.' })}
                        />
                    ),
                },
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
                ] : [
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
                ]),
                finishStep
            ];
        } else {
            // 💻 DESKTOP FLOW (Original Detailed Flow)
            steps = [
                welcomeStep,
                ...(isOwner ? [{
                    target: '#header-branch-selector',
                    disableBeacon: true,
                    content: (<StepContent title={t('onboarding.items.header_branch.title')} desc={t('onboarding.items.header_branch.desc')} />),
                }] : []),
                { target: '#header-qr-stats', disableBeacon: true, content: (<StepContent title={t('onboarding.items.header_qr.title')} desc={t('onboarding.items.header_qr.desc')} />) },
                { target: '#header-notifications', disableBeacon: true, content: (<StepContent title={t('onboarding.items.header_notifications.title')} desc={t('onboarding.items.header_notifications.desc')} />) },
                ...commonDashboardSteps,
                { target: '#dashboard-recent-activities', disableBeacon: true, content: (<StepContent title={t('onboarding.items.dashboard_activities.title')} desc={t('onboarding.items.dashboard_activities.desc')} />) },
                { target: '#sidebar-feedbacks', disableBeacon: true, content: (<StepContent title={t('onboarding.items.sidebar_feedbacks.title')} desc={t('onboarding.items.sidebar_feedbacks.desc')} />) },
                { target: '#onboarding-filters', disableBeacon: true, content: (<StepContent title={t('onboarding.items.feedbacks_filters.title')} desc={t('onboarding.items.feedbacks_filters.desc')} />) },
                { target: '#onboarding-date-picker', disableBeacon: true, content: (<StepContent title={t('onboarding.items.feedbacks_date.title')} desc={t('onboarding.items.feedbacks_date.desc')} />) },
                { target: '#onboarding-feedback-card-0', disableBeacon: true, content: (<StepContent title={t('onboarding.items.feedback_card_anatomy.title')} desc={t('onboarding.items.feedback_card_anatomy.desc')} />) },
                { target: '#sidebar-analytics', disableBeacon: true, content: (<StepContent title={t('onboarding.items.sidebar_analytics.title')} desc={t('onboarding.items.sidebar_analytics.desc')} />) },
                { target: '#onboarding-analytics-kpi', disableBeacon: true, content: (<StepContent title={t('onboarding.items.analytics_kpi.title')} desc={t('onboarding.items.analytics_kpi.desc')} />) },
                { target: '#analytics-trend-chart', disableBeacon: true, content: (<StepContent title={t('onboarding.items.analytics_trend.title')} desc={t('onboarding.items.analytics_trend.desc')} />) },
                { target: '#onboarding-brand-experience', disableBeacon: true, content: (<StepContent title={t('onboarding.items.analytics_brand_experience.title')} desc={t('onboarding.items.analytics_brand_experience.desc')} />) },
                { target: '#onboarding-hourly-analysis', disableBeacon: true, content: (<StepContent title={t('onboarding.items.analytics_hourly.title')} desc={t('onboarding.items.analytics_hourly.desc')} />) },
                { target: '#onboarding-analytics-demographics', disableBeacon: true, content: (<StepContent title={t('onboarding.items.analytics_detailed.title')} desc={t('onboarding.items.analytics_detailed.desc')} />) },
                ...(isOwner ? [
                    { target: '#onboarding-analytics-leaderboard', disableBeacon: true, placement: 'top', disableScrolling: true, content: (<StepContent title={t('onboarding.items.league.title')} desc={t('onboarding.items.league.desc')} />) },
                    { target: '#onboarding-leaderboard-inspect', disableBeacon: true, placement: 'top', disableScrolling: true, content: (<StepContent title={t('onboarding.items.league_inspect.title')} desc={t('onboarding.items.league_inspect.desc')} />) },
                ] : [
                    { target: '#onboarding-smart-insights', disableBeacon: true, content: (<StepContent title={t('onboarding.items.smart_insights.title')} desc={t('onboarding.items.smart_insights.desc')} />) },
                ]),
                finishStep
            ];
        }

        setTourSteps(steps);
    }, [isAppLoading, userRole, t, isOwner, managerBranchName, tourSteps.length]);

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
        window.vocalize_tour_active = false;

        // Force reset scroll locks
        document.body.style.overflow = '';
        const main = document.querySelector('#admin-main-content');
        if (main) main.style.overflowY = 'auto';

        updateOnboardingStatus(true).catch(console.error);
        setTimeout(() => {
            navigate('/admin-panel');
        }, 300);
    }, [navigate, updateOnboardingStatus]);

    // ─── Navigation & Action Handler ────────────────────────────────────
    const handleJoyrideCallback = useCallback((data) => {
        const { action, index, status, type } = data;

        // ─── Phase 0: Termination Logic ─────────────────────────────────────
        if (status === STATUS.FINISHED || (status === STATUS.SKIPPED && action === ACTIONS.SKIP)) {
            setRun(false);
            window.vocalize_tour_active = false;
            setStepIndex(0);

            // Force reset scroll locks
            document.body.style.overflow = '';
            const main = document.querySelector('#admin-main-content');
            if (main) main.style.overflowY = 'auto';

            updateOnboardingStatus(true).catch(console.error);
            if (status === STATUS.FINISHED) {
                setTimeout(() => navigate('/admin-panel'), 300);
            }
            return;
        }

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const optionalTargets = [
            '#urgent-feedbacks-banner',
            '#mobile-branch-selector',
            '#header-branch-selector',
            '#onboarding-brand-experience',
            '#onboarding-hourly-analysis',
            '#onboarding-analytics-demographics',
            '#onboarding-analytics-leaderboard',
            '#onboarding-leaderboard-inspect',
            '#onboarding-smart-insights'
        ];

        // ─── Phase 1: Scroll & UI Adjustments (STEP_BEFORE) ──────────────────
        if (type === EVENTS.STEP_BEFORE) {
            const target = tourSteps[index]?.target;
            if (!target) return;

            // 1. Mobile Sidebar Handling
            if (isMobile) {
                if (typeof target === 'string' && target.startsWith('#sidebar')) {
                    const aside = document.querySelector('aside');
                    if (aside && aside.classList.contains('-translate-x-full')) {
                        const trigger = document.querySelector('#mobile-menu-trigger');
                        if (trigger) trigger.click();
                    }
                } else if (typeof target === 'string' && !target.startsWith('#sidebar') && target !== '#mobile-menu-trigger') {
                    const aside = document.querySelector('aside');
                    if (aside && !aside.classList.contains('-translate-x-full')) {
                        const closeBtn = aside.querySelector('button.md\\:hidden');
                        if (closeBtn) closeBtn.click();
                    }
                }
            }

            // 2. Advanced Scrolling for Analytics sections
            const analyticsTargets = ['leaderboard', 'trend-chart', 'demographics', 'smart-insights', 'recent-activities', 'brand-experience', 'hourly-analysis', 'analytics-kpi'];
            if (typeof target === 'string' && analyticsTargets.some(t => target.includes(t))) {
                const el = document.querySelector(target);
                if (el) {
                    // Use instant scroll for correct spotlight positioning during transitions
                    el.scrollIntoView({ behavior: 'auto', block: 'center' });
                }
            }
        }

        // ─── Phase 2: Action & Event Processing ──────────────────────────────
        if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
            const nextIdx = index + (action === ACTIONS.PREV ? -1 : 1);

            // Safety: Check bounds
            if (nextIdx < 0 || nextIdx >= tourSteps.length) {
                if (nextIdx >= tourSteps.length && action === ACTIONS.NEXT) exitTour();
                return;
            }

            const current = tourSteps[index];

            if (action === ACTIONS.NEXT) {
                // Route Navigation
                if (current.target === '#sidebar-feedbacks') {
                    setRun(false);
                    setIsWaiting(true);
                    navigate('/admin-panel/feedbacks');
                    setTimeout(() => {
                        waitForElement('#onboarding-filters', (found) => {
                            setStepIndex(nextIdx);
                            setRun(true);
                            setIsWaiting(false);
                        });
                    }, 500);
                    return;
                }

                if (current.target === '#sidebar-analytics') {
                    setRun(false);
                    setIsWaiting(true);
                    const closeBtn = document.querySelector('[data-onboarding-close-modal]');
                    if (closeBtn) closeBtn.click();
                    navigate('/admin-panel/analytics');
                    if (isOwner && setSelectedBranchId) {
                        setSelectedBranchId('all');
                    }
                    setTimeout(() => {
                        waitForElement('#onboarding-analytics-kpi', () => {
                            setStepIndex(nextIdx);
                            setRun(true);
                            setIsWaiting(false);
                        });
                    }, 500);
                    return;
                }

                // Interaction: Sidebar Open
                if (current.target === '#mobile-menu-trigger') {
                    const aside = document.querySelector('aside');
                    if (aside && aside.classList.contains('-translate-x-full')) {
                        const trigger = document.querySelector('#mobile-menu-trigger');
                        if (trigger) trigger.click();
                    }
                    setTimeout(() => setStepIndex(nextIdx), 300);
                    return;
                }

                // Interaction: Dashboard Scroll
                if (current.target === '#analytics-charts-section' && isMobile) {
                    const recentAct = document.querySelector('#dashboard-recent-activities');
                    if (recentAct) {
                        recentAct.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setTimeout(() => setStepIndex(nextIdx), 400);
                        return;
                    }
                }
            } else if (action === ACTIONS.PREV) {
                // Back Nav
                if (current.target === '#onboarding-filters' || current.target === '#onboarding-dashboard-card-0') {
                    setRun(false);
                    setIsWaiting(true);
                    navigate('/admin-panel');
                    setTimeout(() => {
                        waitForElement('#kpi-cards-grid', () => {
                            setStepIndex(nextIdx);
                            setRun(true);
                            setIsWaiting(false);
                        });
                    }, 500);
                    return;
                }
                if (current.target === '#onboarding-analytics-kpi') {
                    setRun(false);
                    setIsWaiting(true);
                    navigate('/admin-panel/feedbacks');
                    setTimeout(() => {
                        waitForElement('#onboarding-filters', () => {
                            setStepIndex(nextIdx);
                            setRun(true);
                            setIsWaiting(false);
                        });
                    }, 500);
                    return;
                }
            }

            // ─── Phase 3: Target Availability Checks ─────────────────────────

            // A: Target Not Found Case
            if (type === EVENTS.TARGET_NOT_FOUND) {
                if (optionalTargets.includes(current.target)) {
                    // If moving forward and optional target missing, keep moving
                    if (action === ACTIONS.NEXT) {
                        setStepIndex(nextIdx);
                    } else if (action === ACTIONS.PREV && nextIdx >= 0) {
                        setStepIndex(nextIdx);
                    }
                    return;
                }

                // Mandatory retry
                if (!window.vocalize_retry) window.vocalize_retry = 0;
                window.vocalize_retry++;
                if (window.vocalize_retry > 3) {
                    window.vocalize_retry = 0;
                    setStepIndex(nextIdx);
                } else {
                    setTimeout(() => setStepIndex(index), 300);
                }
                return;
            }

            // B: Success/Transition Case (STEP_AFTER)
            if (type === EVENTS.STEP_AFTER) {
                window.vocalize_retry = 0;
                let targetCandidateIdx = nextIdx;

                // 🟢 NEW: Optimization for Optional Steps
                // If moving next, check if the NEXT candidate is optional and missing. 
                // If so, skip it immediately to avoid a TARGET_NOT_FOUND or wait.
                if (action === ACTIONS.NEXT) {
                    while (
                        targetCandidateIdx < tourSteps.length &&
                        optionalTargets.includes(tourSteps[targetCandidateIdx].target) &&
                        !document.querySelector(tourSteps[targetCandidateIdx].target)
                    ) {
                        targetCandidateIdx++;
                    }
                }

                if (targetCandidateIdx >= tourSteps.length) {
                    exitTour();
                    return;
                }

                const nextStep = tourSteps[targetCandidateIdx];

                // Check if target candidate exists, otherwise wait (unless it's body or center)
                const targetDom = nextStep.target !== 'body' ? document.querySelector(nextStep.target) : true;
                if (!targetDom) {
                    setRun(false);
                    setIsWaiting(true);
                    waitForElement(nextStep.target, (found) => {
                        if (found) {
                            setStepIndex(targetCandidateIdx);
                            setRun(true);
                            setIsWaiting(false);
                        } else {
                            // If optional, skip
                            if (optionalTargets.includes(nextStep.target)) {
                                setStepIndex(targetCandidateIdx + 1);
                                setRun(true);
                                setIsWaiting(false);
                            } else {
                                // Fallback: exit or try anyway
                                setStepIndex(targetCandidateIdx);
                                setRun(true);
                                setIsWaiting(false);
                            }
                        }
                    });
                } else {
                    setStepIndex(targetCandidateIdx);
                }
            }
        }
    }, [navigate, tourSteps, updateOnboardingStatus, exitTour]);

    return (
        <>
            <OnboardingStyles />
            <Joyride
                key="vocalize-main-tour"
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
                disableScrollParentFix={false}
                disableOverlayClose={true}
                disableCloseOnEsc={true}
                scrollOffset={(typeof window !== 'undefined' && window.innerWidth < 768) ? 90 : 140}
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
