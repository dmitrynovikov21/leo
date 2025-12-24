export type DocumentStatus = 'ready' | 'processing' | 'error' | 'vectorized';

export interface Document {
    id: string;
    name: string;
    type: 'pdf' | 'docx' | 'txt' | 'md' | 'spreadsheet' | 'folder';
    size: string;
    chunksCount: number;
    tokensUsage: number;
    status: DocumentStatus;
    updatedAt: string;
    errorMessage?: string;
    parentId?: string | null; // For folder structure
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
        updatedAt: '2 hours ago',
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
        updatedAt: 'Just now',
        parentId: null
    },
    {
        id: '3',
        name: 'Old_Price_List_Scanned.pdf',
        type: 'pdf',
        size: '15 MB',
        chunksCount: 0,
        tokensUsage: 0,
        status: 'error',
        updatedAt: '1 day ago',
        errorMessage: 'OCR Failed: File resolution too low',
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
        updatedAt: '3 days ago',
        parentId: 'f1' // Inside Marketing folder
    },
    {
        id: '5',
        name: 'Q3_Financial_Report.xlsx',
        type: 'spreadsheet',
        size: '1.2 MB',
        chunksCount: 12,
        tokensUsage: 4500,
        status: 'ready',
        updatedAt: '5 hours ago',
        parentId: 'f2' // Inside Finance folder
    },
];
