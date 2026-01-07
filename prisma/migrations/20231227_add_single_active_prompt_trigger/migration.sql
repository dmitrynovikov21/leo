-- Migration: Add trigger to ensure only one active prompt per agent

-- Create function to ensure single active prompt
CREATE OR REPLACE FUNCTION ensure_single_active_prompt()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE system_prompt_versions
        SET is_active = false
        WHERE agent_id = NEW.agent_id AND id != NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS trg_single_active_prompt ON system_prompt_versions;

-- Create trigger
CREATE TRIGGER trg_single_active_prompt
    BEFORE INSERT OR UPDATE OF is_active ON system_prompt_versions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_prompt();
