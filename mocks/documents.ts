export type DocumentStatus = 'ready' | 'processing' | 'error' | 'vectorized' | 'pending';

// AI Metadata structure for file passport
export interface AIMetadata {
    ai_title?: string;
    category?: string;
    summary?: string;
    utility?: string;
    topics?: string[];
    error?: string;
}

export interface Document {
    id: string;
    name: string;
    type: 'pdf' | 'docx' | 'txt' | 'md' | 'spreadsheet' | 'folder' | 'note' | string;
    size: string;
    chunksCount: number;
    tokensUsage: number;
    status: DocumentStatus;
    updatedAt: string;
    description?: string;
    content?: string;
    errorMessage?: string;
    parentId?: string | null;
    aiMetadata?: AIMetadata | null; // AI-generated file passport
}

export const mockDocuments: Document[] = [
    {
        id: 'f1',
        name: 'Маркетинг Материалы',
        type: 'folder',
        size: '-',
        chunksCount: 0,
        tokensUsage: 0,
        status: 'ready',
        updatedAt: '1 час назад',
        description: 'Папка с материалами отдела маркетинга',
        parentId: null
    },
    {
        id: 'f2',
        name: 'Финансовые Отчеты',
        type: 'folder',
        size: '-',
        chunksCount: 0,
        tokensUsage: 0,
        status: 'ready',
        updatedAt: '2 дня назад',
        description: 'Квартальные и годовые финансовые отчёты',
        parentId: null
    },
    {
        id: '1',
        name: 'Company_Policy_2024.pdf',
        type: 'pdf',
        size: '2.4 MB',
        chunksCount: 148,
        tokensUsage: 45000,
        status: 'ready',
        updatedAt: '2 часа назад',
        description: 'Корпоративная политика компании на 2024 год. Содержит правила внутреннего распорядка, HR-процедуры и KPI.',
        parentId: null
    },
    {
        id: '2',
        name: 'Q4_Sales_Script.docx',
        type: 'docx',
        size: '850 KB',
        chunksCount: 0,
        tokensUsage: 0,
        status: 'processing',
        updatedAt: 'Только что',
        description: 'Скрипт продаж для Q4. Включает возражения клиентов и шаблоны ответов.',
        parentId: null
    },
    {
        id: '3',
        name: 'Old_Price_List_Scanned.pdf',
        type: 'pdf',
        size: '15 MB',
        chunksCount: 0,
        tokensUsage: 0,
        status: 'processing',
        updatedAt: '1 день назад',
        description: 'Прайс-лист 2023 года. Сканированный документ, требуется OCR.',
        parentId: null
    },
    {
        id: '4',
        name: 'Technical_Spec_v2.md',
        type: 'md',
        size: '45 KB',
        chunksCount: 24,
        tokensUsage: 12050,
        status: 'ready',
        updatedAt: '3 дня назад',
        description: 'Техническая спецификация API v2. REST endpoints, схемы данных.',
        parentId: 'f1'
    },
    {
        id: '5',
        name: 'Q3_Financial_Report.xlsx',
        type: 'spreadsheet',
        size: '1.2 MB',
        chunksCount: 12,
        tokensUsage: 4500,
        status: 'ready',
        updatedAt: '5 часов назад',
        description: 'Финансовый отчет за Q3 2024. P&L, баланс, cash flow.',
        parentId: 'f2'
    },
    {
        id: 'n1',
        name: 'Ideas for Q1 Campaign',
        type: 'note',
        size: '-',
        chunksCount: 1,
        tokensUsage: 150,
        status: 'ready',
        updatedAt: '2 часа назад',
        description: 'Brainstorming notes for the upcoming ad campaign.',
        parentId: null,
        content: 'Main check for Q1: focus on social media engagement. Key targets: Instagram and LinkedIn.'
    },
    {
        id: 'n2',
        name: 'Meeting Minutes - Oct 15',
        type: 'note',
        size: '-',
        chunksCount: 1,
        tokensUsage: 300,
        status: 'ready',
        updatedAt: '1 день назад',
        description: 'Notes from the weekly sync.',
        parentId: null,
        content: 'Discussed timeline for new feature rollout. Agreed to push deadline by 1 week.'
    }
];
