export interface DashboardKPI {
    id: string;
    title: string;
    value: string | number;
    change: number; // percentage
    trend: 'up' | 'down';
    icon: string;
}

export interface ServiceStatus {
    name: string;
    status: 'operational' | 'degraded' | 'down';
    latency: string;
}

export const mockDashboardKPIs: DashboardKPI[] = [
    {
        id: 'active-chats',
        title: 'Active Chats',
        value: 24,
        change: 12.5,
        trend: 'up',
        icon: 'messages',
    },
    {
        id: 'todays-spend',
        title: "Today's Spend",
        value: '₽ 145',
        change: -8.3,
        trend: 'down',
        icon: 'billing',
    },
    {
        id: 'total-agents',
        title: 'Active Agents',
        value: 4,
        change: 0,
        trend: 'up',
        icon: 'user',
    },
    {
        id: 'avg-response',
        title: 'Avg. Response Time',
        value: '1.2s',
        change: -15.2,
        trend: 'down', // lower is better
        icon: 'activity',
    },
];

export const mockServiceStatus: ServiceStatus[] = [
    {
        name: 'OpenAI API',
        status: 'operational',
        latency: '180ms',
    },
    {
        name: 'Anthropic API',
        status: 'operational',
        latency: '210ms',
    },
    {
        name: 'Database',
        status: 'operational',
        latency: '12ms',
    },
    {
        name: 'Vector Store',
        status: 'operational',
        latency: '45ms',
    },
];
