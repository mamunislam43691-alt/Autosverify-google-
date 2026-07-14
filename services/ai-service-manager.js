/**
 * AI Service Manager - Stub
 * Provides AI model information and provider details
 */

function getAvailableModels(provider, type) {
    const models = {
        openrouter: {
            photo: ['dall-e-3', 'stable-diffusion-xl'],
            video: ['runway-gen-2']
        },
        bytez: {
            photo: ['bytez-photo-v1'],
            video: ['bytez-video-v1']
        }
    };
    return (models[provider] && models[provider][type]) || [];
}

function getProviders() {
    return ['openrouter', 'bytez'];
}

module.exports = { getAvailableModels, getProviders };
