/**
 * Gmail Provider
 * Gmail generation is handled via IMAP/SmtpLabs (tempmail-providers.js)
 * This file is kept as a stub for backward compatibility.
 */

// Gmail generation is now handled by tempmail-providers.js
// Use createAccount() from tempmail-providers.js for all email generation

module.exports = {
    generateEmail: async () => {
        const tempmail = require('./tempmail-providers');
        return await tempmail.createAccount();
    },
    fetchInbox: async (email, provider) => {
        return [];
    },
    checkHealth: async () => {
        return [{ name: 'tempmail', status: 'online' }];
    }
};
