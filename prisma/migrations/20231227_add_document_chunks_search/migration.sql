-- Добавить колонку tsvector
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- GIN индекс
CREATE INDEX IF NOT EXISTS idx_document_chunks_search 
ON document_chunks USING GIN(search_vector);

-- Триггер для автообновления
CREATE OR REPLACE FUNCTION document_chunks_search_update() 
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('russian', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_chunks_search ON document_chunks;
CREATE TRIGGER trg_document_chunks_search
  BEFORE INSERT OR UPDATE OF content ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION document_chunks_search_update();

-- Проиндексировать существующие чанки
UPDATE document_chunks 
SET search_vector = to_tsvector('russian', COALESCE(content, ''))
WHERE search_vector IS NULL;
