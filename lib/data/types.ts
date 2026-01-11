export interface Agent {
    id: string;
    name: string;
    role: string;
    avatar: string;
    status: 'active' | 'training' | 'paused' | 'error';
    lastActive: string;
    metrics: {
        totalDialogs: number;
        dialogsToday: number;
        conversionRate: number;
        spend: number;
        connectedChannels: {
            whatsapp: boolean;
            telegram: boolean;
            instagram: boolean;
            facebook: boolean;
            web: boolean;
        };
    };
}

export interface DashboardKPI {
    id: string;
    title: string;
    value: string | number;
    change: number;
    trend: 'up' | 'down';
    icon: string;
}

export interface KPI {
    label: string;
    value: string | number;
    change: string;
    trend: 'up' | 'down' | 'neutral';
}

export interface VolumeData {
    date: string;
    volume: number;
}

export interface AgentStat {
    id: string;
    name: string;
    sessions: number;
    avgDuration: string;
    csat: number;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    plan: 'free' | 'pro' | 'enterprise';
    balance: number;
}

export interface DialogVolumeData {
    '24h': Array<{ time: string; count: number }>;
    '7d': Array<{ day: string; count: number }>;
    '30d': Array<{ week: string; count: number }>;
}

export interface TrafficSourceData {
    name: string;
    value: number;
}

export interface ChannelData {
    id: string;
    name: string;
    type: 'whatsapp' | 'telegram' | 'web';
    status: 'connected' | 'disconnected';
    lastActivity: string;
}

export interface SystemEventData {
    id: string;
    type: 'message' | 'warning' | 'success' | 'upload' | 'user' | 'bot';
    text: string;
    time: string;
}

export interface UserData {
    profile: UserProfile;
    dashboard: {
        kpis: DashboardKPI[];
        recentAgents: Agent[];
        charts: {
            volume: DialogVolumeData;
            trafficSources: TrafficSourceData[];
        };
        activeChannels: ChannelData[];
        systemEvents: SystemEventData[];
    };
    agents: Agent[];
    analytics: {
        kpis: KPI[];
        volume: VolumeData[];
        agentStats: AgentStat[];
    };
}
