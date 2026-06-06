const crypto = require('crypto');

const QR_CODE_PATTERN = /^VK1\.[a-f0-9]{64}$/;

const createQrCode = () => `VK1.${crypto.randomBytes(32).toString('hex')}`;

const isValidQrCode = (value) => typeof value === 'string' && QR_CODE_PATTERN.test(value);

module.exports = { createQrCode, isValidQrCode, QR_CODE_PATTERN };
