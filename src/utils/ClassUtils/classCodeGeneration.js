const crypto = require('crypto');

/**
 * Generate a short alphanumeric class code
 * Format: XXXXXX (uppercase letters + digits)
 */

const generateClassCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }

  return code;
};

module.exports = generateClassCode;
