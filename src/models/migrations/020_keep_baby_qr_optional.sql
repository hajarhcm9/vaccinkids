-- Historical imports may create a baby before assigning a QR code.
-- API-generated QR codes remain mandatory and cryptographically random.
ALTER TABLE bebe ALTER COLUMN code_qr DROP NOT NULL;
