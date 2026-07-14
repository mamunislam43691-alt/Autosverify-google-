const axios = require('axios');
const otpExtractor = require('./otp-extractor');

/**
 * GMAIL & HOTMAIL EMAIL PROVIDERS
 * 
 * Only Gmail and Hotmail account generation
 * Using tempmail-providers.js for fallback
 */

// Placeholder exports (functionality moved to tempmail-providers)
module.exports = {
    createGmailAccount: async function() {
        throw new Error('Gmail account generation requires SMTPLabs API key. Use tempmail-providers instead.');
    },
    createHotmailAccount: async function() {
        throw new Error('Hotmail account generation requires SMTPLabs API key. Use tempmail-providers instead.');
    },
    getGmailMessages: async function() {
        return [];
    },
    getHotmailMessages: async function() {
        return [];
    },
    createStudentEmailAccount: async function() {
        throw new Error('Student email account generation requires SMTPLabs API key. Use tempmail-providers instead.');
    },
    getStudentEmailMessages: async function() {
        return [];
    }
};
