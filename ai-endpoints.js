/**
 * AI Service API Endpoints
 * OpenRouter and Bytez providers for Photo/Video Generation and Watermark Removal
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/ai-service-manager');

// AI Provider Configuration endpoint
router.get('/api/ai/providers', (req, res) => {
    res.json({
        success: true,
        providers: ['openrouter', 'bytez'],
        default: 'bytez'
    });
});

// Get available models for a provider
router.get('/api/ai/models/:provider/:type', (req, res) => {
    const { provider, type } = req.params;
    try {
        const models = aiService.getAvailableModels(provider, type);
        res.json({
            success: true,
            provider,
            type,
            models
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate Photo
router.post('/api/ai/generate-photo', async (req, res) => {
    const { prompt, provider, model, size, style, userId } = req.body;
    
    if (!prompt) {
        return res.status(400).json({
            success: false,
            error: 'Prompt is required'
        });
    }
    
    try {
        const result = await aiService.generatePhoto(prompt, {
            provider,
            model,
            size,
            style
        });
        
        if (result.success) {
            // Log usage if userId provided
            if (userId) {
                console.log(`[AI Photo] User ${userId} generated image with ${result.provider}`);
            }
            
            res.json({
                success: true,
                provider: result.provider,
                data: {
                    url: result.url,
                    urls: result.urls,
                    jobId: result.jobId,
                    status: result.status
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Generation failed'
            });
        }
    } catch (error) {
        console.error('Photo generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate Video
router.post('/api/ai/generate-video', async (req, res) => {
    const { prompt, provider, model, duration, fps, userId } = req.body;
    
    if (!prompt) {
        return res.status(400).json({
            success: false,
            error: 'Prompt is required'
        });
    }
    
    try {
        const result = await aiService.generateVideo(prompt, {
            provider,
            model,
            duration,
            fps
        });
        
        if (result.success) {
            if (userId) {
                console.log(`[AI Video] User ${userId} generated video with ${result.provider}`);
            }
            
            res.json({
                success: true,
                provider: result.provider,
                data: {
                    url: result.url,
                    thumbnail: result.thumbnail,
                    jobId: result.jobId,
                    status: result.status
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Generation failed'
            });
        }
    } catch (error) {
        console.error('Video generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Check job status (for async operations)
router.get('/api/ai/job-status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { provider } = req.query;
    
    try {
        const result = await aiService.checkJobStatus(jobId, provider || 'bytez');
        res.json({
            success: true,
            jobId,
            status: result.status,
            progress: result.progress,
            url: result.url
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get job result
router.get('/api/ai/job-result/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { provider } = req.query;
    
    try {
        const result = await aiService.getJobResult(jobId, provider || 'bytez');
        res.json({
            success: true,
            jobId,
            url: result.url,
            urls: result.urls,
            metadata: result.metadata
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

console.log('[AI Services] OpenRouter and Bytez API endpoints registered');

module.exports = router;
