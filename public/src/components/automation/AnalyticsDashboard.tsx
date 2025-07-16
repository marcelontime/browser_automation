import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    LineElement,
    PointElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
    TrendingUp, 
    TrendingDown, 
    Activity, 
    AlertTriangle, 
    CheckCircle, 
    Clock
} from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    LineElement,
    PointElement
);

interface AnalyticsDashboardProps {
    websocket: WebSocket | null;
    automationId?: string;
}

interface DashboardData {
    overview: {
        totalEvents: number;
        successEvents: number;
        failureEvents: number;
        successRate: number;
        failureRate: number;
    };
    trends: any[];
    topVariables: any[];
    automations: any[];
    errors: {
        commonErrors: any[];
        errorTrends: any[];
    };
    recommendations: any[];
}

interface VariableStats {
    totalUsage: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    failureRate: number;
    averageDuration: number;
    totalDuration: number;
    uniqueExecutions: number;
    lastUsed: Date | null;
    firstUsed: Date | null;
    validationErrorCount: number;
    validationErrorRate: number;
    recentEvents: number;
    recentSuccessRate: number;
    usageFrequency: string;
    peakUsageHours: Array<{ hour: number; count: number }>;
    usageTrend: string;
    performanceTrend: string;
}

interface UsagePatterns {
    automationId: string;
    patterns: Array<{
        variableId: string;
        variableName: string;
        type: string;
        usageFrequency: string;
        isHighlyUsed: boolean;
        isProblematic: boolean;
        hasValidationIssues: boolean;
        commonValues: Array<{ value: string; count: number; percentage: number }>;
        valueVariability: number;
        suggestions: Array<{
            type: string;
            priority: string;
            message: string;
            action: string;
        }>;
    }>;
    summary: {
        totalVariables: number;
        highUsageVariables: number;
        problematicVariables: number;
        unusedVariables: number;
        validationIssues: number;
    };
    recommendations: any[];
}



export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
    websocket, 
    automationId 
}) => {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [usagePatterns, setUsagePatterns] = useState<UsagePatterns | null>(null);
    const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
    const [variableStats, setVariableStats] = useState<VariableStats | null>(null);
    const [timeRange, setTimeRange] = useState<string>('24h');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (websocket) {
            websocket.addEventListener('message', handleWebSocketMessage);
            loadDashboardData();
            
            if (automationId) {
                loadUsagePatterns();
            }
        }

        return () => {
            if (websocket) {
                websocket.removeEventListener('message', handleWebSocketMessage);
            }
        };
    }, [websocket, timeRange, automationId]);

    const handleWebSocketMessage = (event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'dashboard_analytics':
                    setDashboardData(message.data.dashboard);
                    setLoading(false);
                    break;
                    
                case 'usage_patterns':
                    setUsagePatterns(message.data.patterns);
                    break;
                    
                case 'variable_analytics':
                    setVariableStats(message.data.analytics);
                    break;
                    
                case 'error':
                    console.error('Analytics error:', message.message);
                    setLoading(false);
                    break;
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    const loadDashboardData = () => {
        if (!websocket) return;
        
        setLoading(true);
        websocket.send(JSON.stringify({
            type: 'get_dashboard_analytics',
            timeRange
        }));
    };

    const loadUsagePatterns = () => {
        if (!websocket || !automationId) return;
        
        websocket.send(JSON.stringify({
            type: 'get_usage_patterns',
            automationId
        }));
    };

    const loadVariableStats = (variableId: string) => {
        if (!websocket) return;
        
        websocket.send(JSON.stringify({
            type: 'get_variable_analytics',
            variableId,
            timeRange
        }));
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };

    const formatPercentage = (value: number) => {
        return `${(value * 100).toFixed(1)}%`;
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'increasing':
            case 'improving':
                return <TrendingUp className="h-4 w-4 text-green-500" />;
            case 'decreasing':
            case 'degrading':
                return <TrendingDown className="h-4 w-4 text-red-500" />;
            default:
                return <Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'destructive';
            case 'medium': return 'default';
            case 'low': return 'secondary';
            default: return 'outline';
        }
    };

    const renderOverviewCards = () => {
        if (!dashboardData) return null;

        const { overview } = dashboardData;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overview.totalEvents.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Variable usage events
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatPercentage(overview.successRate)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {overview.successEvents.toLocaleString()} successful events
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failure Rate</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatPercentage(overview.failureRate)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {overview.failureEvents.toLocaleString()} failed events
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Time Range</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{timeRange}</div>
                        <p className="text-xs text-muted-foreground">
                            Current analysis period
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderUsagePatternsTab = () => {
        if (!usagePatterns) {
            return (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">
                        {automationId ? 'Loading usage patterns...' : 'Select an automation to view usage patterns'}
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Variables</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{usagePatterns.summary.totalVariables}</div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">High Usage</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {usagePatterns.summary.highUsageVariables}
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Problematic</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {usagePatterns.summary.problematicVariables}
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Unused</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-600">
                                {usagePatterns.summary.unusedVariables}
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Validation Issues</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {usagePatterns.summary.validationIssues}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Variable Patterns Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Variable Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {usagePatterns.patterns.map((pattern) => (
                                <div 
                                    key={pattern.variableId} 
                                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => {
                                        setSelectedVariable(pattern.variableId);
                                        loadVariableStats(pattern.variableId);
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <h4 className="font-medium">{pattern.variableName}</h4>
                                            <Badge variant="outline">{pattern.type}</Badge>
                                            <Badge variant={pattern.isHighlyUsed ? 'default' : 'secondary'}>
                                                {pattern.usageFrequency}
                                            </Badge>
                                        </div>
                                        <div className="flex space-x-1">
                                            {pattern.isProblematic && (
                                                <Badge variant="destructive">Issues</Badge>
                                            )}
                                            {pattern.hasValidationIssues && (
                                                <Badge variant="secondary">Validation</Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {pattern.suggestions.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm text-muted-foreground mb-1">Suggestions:</p>
                                            {pattern.suggestions.slice(0, 2).map((suggestion, idx) => (
                                                <div key={idx} className="flex items-center space-x-2 text-sm">
                                                    <Badge variant={getPriorityColor(suggestion.priority)} className="text-xs">
                                                        {suggestion.priority}
                                                    </Badge>
                                                    <span>{suggestion.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recommendations */}
                {usagePatterns.recommendations.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {usagePatterns.recommendations.map((rec, idx) => (
                                    <div key={idx} className="flex items-start space-x-3 p-3 border rounded-lg">
                                        <Badge variant={getPriorityColor(rec.priority)}>
                                            {rec.priority}
                                        </Badge>
                                        <div className="flex-1">
                                            <p className="text-sm">{rec.message}</p>
                                            {rec.affectedVariables && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Affects {rec.affectedVariables.length} variables
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    const renderVariableDetailsModal = () => {
        if (!selectedVariable || !variableStats) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Variable Analytics Details</h3>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedVariable(null)}
                        >
                            Close
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Total Usage</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{variableStats.totalUsage}</div>
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                    {getTrendIcon(variableStats.usageTrend)}
                                    <span>{variableStats.usageTrend}</span>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Success Rate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-green-600">
                                    {formatPercentage(variableStats.successRate)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {variableStats.successCount} / {variableStats.totalUsage}
                                </p>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Avg Duration</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">
                                    {formatDuration(variableStats.averageDuration)}
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                    {getTrendIcon(variableStats.performanceTrend)}
                                    <span>{variableStats.performanceTrend}</span>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Usage Frequency</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold capitalize">
                                    {variableStats.usageFrequency}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {variableStats.recentEvents} recent events
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Peak Usage Hours Chart */}
                    {variableStats.peakUsageHours.length > 0 && (
                        <Card className="mb-4">
                            <CardHeader>
                                <CardTitle className="text-sm">Peak Usage Hours</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div style={{ height: '200px' }}>
                                    <Bar
                                        data={{
                                            labels: variableStats.peakUsageHours.map(h => `${h.hour}:00`),
                                            datasets: [{
                                                label: 'Usage Count',
                                                data: variableStats.peakUsageHours.map(h => h.count),
                                                backgroundColor: '#8884d8',
                                                borderColor: '#8884d8',
                                                borderWidth: 1
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    display: false
                                                }
                                            },
                                            scales: {
                                                y: {
                                                    beginAtZero: true
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Variable Analytics</h2>
                    <p className="text-muted-foreground">
                        Monitor variable usage patterns and performance
                    </p>
                </div>
                
                <div className="flex items-center space-x-2">
                    <select 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                    >
                        <option value="1h">Last Hour</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                    
                    <Button 
                        onClick={loadDashboardData} 
                        disabled={loading}
                        size="sm"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            {renderOverviewCards()}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="patterns">Usage Patterns</TabsTrigger>
                    <TabsTrigger value="trends">Trends</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {dashboardData && dashboardData.recommendations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>System Recommendations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {dashboardData.recommendations.map((rec, idx) => (
                                        <div key={idx} className="flex items-center space-x-2 p-2 border rounded">
                                            <Badge variant={getPriorityColor(rec.priority)}>
                                                {rec.priority}
                                            </Badge>
                                            <span className="text-sm">{rec.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="patterns">
                    {renderUsagePatternsTab()}
                </TabsContent>

                <TabsContent value="trends" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usage Trends</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Trend analysis will be available as more data is collected.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Variable Details Modal */}
            {renderVariableDetailsModal()}
        </div>
    );
};

export default AnalyticsDashboard;