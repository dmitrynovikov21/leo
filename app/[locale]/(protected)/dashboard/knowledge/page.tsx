
import { GlobalKnowledgeView } from "@/components/knowledge/global-knowledge-view"
import { getLibraryItems } from "@/actions/library"

export default async function KnowledgePage() {
    const items = await getLibraryItems()
    return <GlobalKnowledgeView initialItems={items} />
}
