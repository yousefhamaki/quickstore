'use client';

import { useState } from 'react';
import { SEOHealth, SEOIssue } from '@/types/seo';
import { AlertCircle, AlertTriangle, Info, CheckCircle, RefreshCw } from 'lucide-react';

interface SEOHealthDashboardProps {
    health: SEOHealth | null;
    loading: boolean;
    onRefresh: () => void;
    refreshing: boolean;
}

export function SEOHealthDashboard({ health, loading, onRefresh, refreshing }: SEOHealthDashboardProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!health) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">No SEO health data available. Click refresh to run a health check.</p>
                <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
                    Run Health Check
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">SEO Health Score</h2>
                        <p className="text-sm text-gray-600">
                            Last checked: {new Date(health.lastCheckedAt).toLocaleDateString()}
                        </p>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                        aria-label="Refresh SEO health"
                    >
                        <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
                        Refresh
                    </button>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-center">
                        <div className={`text-6xl font-black ${getScoreColor(health.score)}`}>
                            {health.score}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">out of 100</div>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                            <div className={`text-3xl font-bold ${getGradeColor(health.grade)}`}>
                                Grade: {health.grade}
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full transition-all ${getScoreBgColor(health.score)}`}
                                style={{ width: `${health.score}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                    <MetricCard
                        label="Total Pages"
                        value={health.metrics.totalPages}
                        icon="📄"
                    />
                    <MetricCard
                        label="Indexed Pages"
                        value={health.metrics.indexedPages}
                        icon="✅"
                    />
                    <MetricCard
                        label="Missing Titles"
                        value={health.metrics.pagesWithMissingTitles}
                        icon="⚠️"
                        warning={health.metrics.pagesWithMissingTitles > 0}
                    />
                    <MetricCard
                        label="Duplicate Titles"
                        value={health.metrics.pagesWithDuplicateTitles}
                        icon="🔴"
                        warning={health.metrics.pagesWithDuplicateTitles > 0}
                    />
                </div>
            </div>

            {/* Issues */}
            {health.issues.critical.length > 0 && (
                <IssueSection
                    title="Critical Issues"
                    issues={health.issues.critical}
                    icon={<AlertCircle className="text-red-500" size={24} />}
                    bgColor="bg-red-50"
                    borderColor="border-red-200"
                />
            )}

            {health.issues.warnings.length > 0 && (
                <IssueSection
                    title="Warnings"
                    issues={health.issues.warnings}
                    icon={<AlertTriangle className="text-yellow-500" size={24} />}
                    bgColor="bg-yellow-50"
                    borderColor="border-yellow-200"
                />
            )}

            {health.issues.suggestions.length > 0 && (
                <IssueSection
                    title="Suggestions"
                    issues={health.issues.suggestions}
                    icon={<Info className="text-blue-500" size={24} />}
                    bgColor="bg-blue-50"
                    borderColor="border-blue-200"
                />
            )}

            {/* All Clear */}
            {health.issues.critical.length === 0 &&
                health.issues.warnings.length === 0 &&
                health.issues.suggestions.length === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-center gap-4">
                        <CheckCircle className="text-green-500" size={32} />
                        <div>
                            <h3 className="font-bold text-green-900 text-lg">Perfect SEO!</h3>
                            <p className="text-green-700">Your store has no SEO issues. Great work!</p>
                        </div>
                    </div>
                )}
        </div>
    );
}

function MetricCard({ label, value, icon, warning }: { label: string; value: number; icon: string; warning?: boolean }) {
    return (
        <div className={`p-4 rounded-lg ${warning ? 'bg-yellow-50' : 'bg-gray-50'}`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className={`text-2xl font-bold ${warning ? 'text-yellow-900' : 'text-gray-900'}`}>
                {value}
            </div>
            <div className={`text-sm ${warning ? 'text-yellow-700' : 'text-gray-600'}`}>
                {label}
            </div>
        </div>
    );
}

function IssueSection({
    title,
    issues,
    icon,
    bgColor,
    borderColor
}: {
    title: string;
    issues: SEOIssue[];
    icon: React.ReactNode;
    bgColor: string;
    borderColor: string;
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className={`${bgColor} border ${borderColor} rounded-lg p-6`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-3 mb-4 w-full text-left"
                aria-expanded={expanded}
            >
                {icon}
                <h3 className="font-bold text-lg flex-1">{title}</h3>
                <span className="text-sm text-gray-600">{issues.length} issue(s)</span>
                <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
            </button>

            {expanded && (
                <div className="space-y-3">
                    {issues.map((issue, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                            <p className="font-semibold text-gray-900 mb-1">{issue.message}</p>
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Fix:</strong> {issue.fix}
                            </p>
                            {issue.affectedPages.length > 0 && (
                                <p className="text-xs text-gray-500">
                                    Affects {issue.affectedPages.length} page(s)
                                    {issue.affectedPages.length <= 3 && (
                                        <span className="ml-2">
                                            ({issue.affectedPages.map(p => p.url).join(', ')})
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
}

function getScoreBgColor(score: number): string {
    if (score >= 90) return 'bg-green-600';
    if (score >= 80) return 'bg-blue-600';
    if (score >= 70) return 'bg-yellow-600';
    if (score >= 60) return 'bg-orange-600';
    return 'bg-red-600';
}

function getGradeColor(grade: string): string {
    if (grade === 'A') return 'text-green-600';
    if (grade === 'B') return 'text-blue-600';
    if (grade === 'C') return 'text-yellow-600';
    if (grade === 'D') return 'text-orange-600';
    return 'text-red-600';
}
