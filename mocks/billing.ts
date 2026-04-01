export interface Transaction {
    id: string;
    date: string;
    type: 'payment' | 'usage';
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    description: string;
}

export interface DailySpend {
    date: string;
    amount: number;
    model?: string;
}

export const mockTransactions: Transaction[] = [
    {
        id: 't1',
        date: '2024-12-09',
        type: 'payment',
        amount: 5000,
        status: 'completed',
        description: 'Balance top-up via card',
    },
    {
        id: 't2',
        date: '2024-12-09',
        type: 'usage',
        amount: -145,
        status: 'completed',
        description: 'Daily usage aggregate',
    },
    {
        id: 't3',
        date: '2024-12-08',
        type: 'usage',
        amount: -230,
        status: 'completed',
        description: 'Daily usage aggregate',
    },
    {
        id: 't4',
        date: '2024-12-07',
        type: 'usage',
        amount: -189,
        status: 'completed',
        description: 'Daily usage aggregate',
    },
];

export const mockDailySpend: DailySpend[] = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: Math.floor(Math.random() * 150) + 50,
})).reverse();

export const mockModelBreakdown = [
    { model: 'Claude Sonnet 4.6', percentage: 60, cost: 900 },
    { model: 'Claude Opus 4.6', percentage: 20, cost: 300 },
    { model: 'Gemini 2.5 Pro', percentage: 10, cost: 150 },
    { model: 'Embeddings', percentage: 10, cost: 150 },
];
