CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE bebe ALTER COLUMN code_qr TYPE VARCHAR(68);

UPDATE bebe
SET code_qr = 'VK1.' || encode(gen_random_bytes(32), 'hex');
