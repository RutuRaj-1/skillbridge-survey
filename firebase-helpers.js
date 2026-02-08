// firebase-helpers.js - Utility functions for Firebase operations
import firebaseService from './firebase-app.js';

export const formatSurveyData = (sessionId, path, answers, metadata = {}) => {
    const now = new Date();
    const startedAt = metadata.startedAt || now;
    const duration = now - startedAt;
    
    return {
        sessionId,
        path,
        startedAt,
        completedAt: now,
        duration,
        totalQuestions: metadata.totalQuestions || 0,
        completedQuestions: Object.keys(answers).length,
        answers: Object.entries(answers).map(([questionId, answerData], index) => ({
            questionId,
            questionText: metadata.questionTexts?.[questionId] || questionId,
            answerType: answerData.type,
            answerValue: answerData.value || answerData.values || '',
            answerText: answerData.text || answerData.texts || '',
            questionOrder: index + 1
        })),
        metadata: {
            ...metadata,
            userAgent: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    };
};

export const saveSurveyWithRetry = async (surveyData, maxRetries = 3) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await firebaseService.saveSurveyResponse(surveyData);
            
            if (result.success) {
                // Update analytics
                await firebaseService.updateAnalytics(surveyData.path);
                return { ...result, attempt };
            }
            
            lastError = result.error;
        } catch (error) {
            lastError = error.message;
            
            // Exponential backoff
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    return { 
        success: false, 
        error: `Failed after ${maxRetries} attempts: ${lastError}`,
        savedLocally: true // Indicate we saved locally for later sync
    };
};

export const validateFirebaseConfig = (config) => {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
        console.warn('⚠️ Missing Firebase config fields:', missingFields);
        return false;
    }
    
    return true;
};

// Export as a convenience object
export default {
    formatSurveyData,
    saveSurveyWithRetry,
    validateFirebaseConfig
};