// firebase-helpers.js - Utility functions for Firebase operations
import firebaseService from './firebase-app.js';

// ✅ FIX: Added proper question text mapping for new Combined path
export const getQuestionTextMap = () => {
    return {
        // Initial questions
        'initial': 'Which of these have you played?',
        'path-selector': 'Based on your selection',
        'no-reason': 'What kept you from exploring sports or esports?',
        
        // Combined path
        'combined-1': 'Which do you prioritize more?',
        'combined-2': 'What is your biggest struggle across both?',
        'combined-3': 'Do you see synergy between sports and esports?',
        'combined-4': 'What skills from sports help you in esports?',
        'combined-5': 'What skills from esports help you in sports?',
        'combined-6': 'How do you split your practice time?',
        'combined-7': 'Have you faced criticism for pursuing both?',
        'combined-8': 'If a platform existed for both sports and esports, what would you want?',
        'combined-9': 'Would you pay for such a platform?',
        'combined-10': 'Primary Sport',
        'combined-11': 'Primary E-Sport / Game',
        'combined-12': 'Sports Playing Level',
        'combined-13': 'E-Sports Level',
        'combined-14': 'Age Group',
        'combined-15': 'Gender',
        'combined-16': 'City',
        'combined-17': 'How do you view sports?',
        'combined-18': 'How do you view esports?',
        'combined-19': 'Family support for sports?',
        'combined-20': 'Family support for esports?',
        'combined-21': 'Weekly training hours - Sports',
        'combined-22': 'Weekly gaming hours - E-Sports',
        'combined-23': 'Which career are you more likely to pursue?',
        
        // Sports path
        'sports-1': 'What is your biggest struggle right now?',
        'sports-2': 'What stops you from taking steps toward pro sports?',
        'sports-3': 'If you thought of quitting, what was the main reason?',
        'sports-4': 'Do you feel you are getting enough opportunities today?',
        'sports-4a': 'Why do you feel this way about opportunities?',
        'sports-5': 'Have you ever missed an opportunity due to lack of guidance?',
        'sports-6': 'What matters most when choosing a coach/academy?',
        'sports-7': 'What frustrates you most in sports ecosystem?',
        'sports-8': 'What would give you confidence to choose sports full-time?',
        'sports-9': 'If a single platform existed, what would you want most?',
        'sports-10': 'If it helped you, would you pay?',
        'sports-11': 'Age Group',
        'sports-12': 'How do you identify?',
        'sports-13': 'Primary Sport',
        'sports-14': 'Current Playing Level',
        'sports-15': 'Years of Training',
        'sports-16': 'Weekly Training Commitment',
        'sports-17': 'Family Support',
        'sports-18': 'City',
        'sports-19': 'How do you view sports?',
        
        // Esports path
        'esports-1': 'Your biggest esports struggle?',
        'esports-2': 'Have you felt stuck in your improvement?',
        'esports-2a': 'Why do you feel stuck?',
        'esports-3': 'What\'s your biggest uncertainty about going pro?',
        'esports-4': 'Are there enough real opportunities in your Game?',
        'esports-4a': 'Why do you feel this way?',
        'esports-5': 'How do you verify if coaching is legit?',
        'esports-6': 'Have you played tournaments?',
        'esports-6a': 'What was your tournament experience?',
        'esports-7': 'What do you rely on to improve?',
        'esports-8': 'What\'s missing in current learning resources?',
        'esports-9': 'What would make you go full-time in esports?',
        'esports-10': 'If one platform existed, what should it provide?',
        'esports-11': 'Would you like to pay for such platforms?',
        'esports-12': 'Primary Game',
        'esports-13': 'Current level',
        'esports-14': 'What is your serious playing duration?',
        'esports-15': 'Weekly time spent on gaming?',
        'esports-16': 'What is your family support level?',
        'esports-17': 'City',
        'esports-18': 'What is your age group?',
        'esports-19': 'What is your gender?',
        'esports-20': 'How do you view esports?',
        'esports-21': 'Is esports career or hobby for you?'
    };
};

// ✅ FIX: Enhanced formatter with better error handling
export const formatSurveyData = (sessionId, path, answers, metadata = {}) => {
    try {
        const now = new Date();
        const startedAt = metadata.startedAt || now;
        const duration = now - startedAt;
        
        // Get question text mapping
        const questionTexts = metadata.questionTexts || getQuestionTextMap();
        
        // ✅ IMPROVED: Better answer formatting for multi-select
        const formattedAnswers = Object.entries(answers).map(([questionId, answerData], index) => {
            // Handle missing answer data
            if (!answerData) {
                return {
                    questionId,
                    questionText: questionTexts[questionId] || questionId,
                    answerType: 'unknown',
                    answerValue: '',
                    answerText: '',
                    questionOrder: index + 1
                };
            }
            
            // Format based on answer type
            let answerValue = '';
            let answerText = '';
            
            if (answerData.type === 'multi') {
                answerValue = Array.isArray(answerData.values) ? answerData.values.join(', ') : '';
                answerText = Array.isArray(answerData.texts) ? answerData.texts.join(', ') : '';
            } else {
                answerValue = answerData.value || '';
                answerText = answerData.text || '';
            }
            
            return {
                questionId,
                questionText: questionTexts[questionId] || questionId,
                answerType: answerData.type || 'single',
                answerValue,
                answerText,
                questionOrder: index + 1
            };
        });
        
        return {
            sessionId,
            path,
            startedAt: startedAt.toISOString(),
            completedAt: now.toISOString(),
            duration,
            totalQuestions: metadata.totalQuestions || Object.keys(answers).length,
            completedQuestions: Object.keys(answers).length,
            answers: formattedAnswers,
            metadata: {
                ...metadata,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
                language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
                timestamp: now.toISOString()
            }
        };
    } catch (error) {
        console.error('Error formatting survey data:', error);
        
        // Return minimal valid data structure
        return {
            sessionId: sessionId || 'unknown',
            path: path || 'unknown',
            completedAt: new Date().toISOString(),
            duration: 0,
            totalQuestions: 0,
            completedQuestions: 0,
            answers: [],
            metadata: { error: error.message }
        };
    }
};

// ✅ IMPROVED: Save with retry and better queue management
export const saveSurveyWithRetry = async (surveyData, maxRetries = 3) => {
    let lastError;
    
    // First, try to save
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await firebaseService.saveSurveyResponse(surveyData);
            
            if (result.success) {
                // Update analytics (don't await to not block)
                firebaseService.updateAnalytics(surveyData.path).catch(console.warn);
                
                // Log success event
                firebaseService.logEvent('survey_save_success', {
                    path: surveyData.path,
                    attempt,
                    surveyId: result.id
                });
                
                return { 
                    success: true, 
                    id: result.id, 
                    attempt,
                    savedLocally: false 
                };
            }
            
            lastError = result.error;
        } catch (error) {
            lastError = error.message;
            
            // Exponential backoff with jitter
            if (attempt < maxRetries) {
                const baseDelay = 1000 * Math.pow(2, attempt);
                const jitter = Math.random() * 1000;
                const delay = Math.min(baseDelay + jitter, 10000);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // If all retries failed, save locally
    try {
        firebaseService.saveToLocalStorage(surveyData);
        firebaseService.logEvent('survey_save_failed', {
            path: surveyData.path,
            error: lastError
        });
    } catch (storageError) {
        console.error('Local storage backup failed:', storageError);
    }
    
    return { 
        success: false, 
        error: `Failed after ${maxRetries} attempts: ${lastError}`,
        savedLocally: true,
        localId: 'local_' + Date.now()
    };
};

// ✅ ADDED: Sync pending surveys manually
export const syncPendingSurveys = async () => {
    if (!firebaseService.isOnline()) {
        return { 
            success: false, 
            error: 'No internet connection',
            pending: firebaseService.getPendingCount()
        };
    }
    
    return await firebaseService.retryPendingOperations();
};

// ✅ ADDED: Get survey statistics summary
export const getSurveyStats = (surveyData) => {
    if (!surveyData || !surveyData.answers) {
        return { total: 0, byPath: {}, byType: {} };
    }
    
    const stats = {
        total: surveyData.completedQuestions || 0,
        path: surveyData.path || 'unknown',
        duration: surveyData.duration || 0,
        byType: {},
        byQuestion: {}
    };
    
    surveyData.answers.forEach(answer => {
        // Count by answer type
        stats.byType[answer.answerType] = (stats.byType[answer.answerType] || 0) + 1;
        
        // Store per-question stats
        stats.byQuestion[answer.questionId] = {
            type: answer.answerType,
            value: answer.answerValue
        };
    });
    
    return stats;
};

// ✅ IMPROVED: Validate config with better checks
export const validateFirebaseConfig = (config) => {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
        console.warn('⚠️ Missing Firebase config fields:', missingFields);
        return false;
    }
    
    // Additional validation
    if (!config.apiKey.startsWith('AIza')) {
        console.warn('⚠️ API key format looks incorrect');
    }
    
    if (!config.projectId || config.projectId.length < 6) {
        console.warn('⚠️ Project ID seems too short');
    }
    
    return true;
};

// ✅ ADDED: Clear all pending surveys (admin use)
export const clearPendingSurveys = () => {
    try {
        localStorage.removeItem('pending_surveys');
        return { success: true, message: 'Pending surveys cleared' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ✅ ADDED: Export data as CSV
export const exportToCSV = (surveys) => {
    if (!surveys || surveys.length === 0) {
        return null;
    }
    
    const headers = ['Survey ID', 'Path', 'Completed At', 'Duration', 'Question ID', 'Question', 'Answer'];
    const rows = [];
    
    surveys.forEach(survey => {
        if (survey.answers && Array.isArray(survey.answers)) {
            survey.answers.forEach(answer => {
                rows.push([
                    survey.sessionId || survey.id,
                    survey.path,
                    survey.completedAt,
                    survey.duration,
                    answer.questionId,
                    answer.questionText,
                    answer.answerText || answer.answerValue
                ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
            });
        }
    });
    
    return [headers.join(','), ...rows].join('\n');
};

// Export all functions
export default {
    formatSurveyData,
    saveSurveyWithRetry,
    validateFirebaseConfig,
    syncPendingSurveys,
    getSurveyStats,
    clearPendingSurveys,
    exportToCSV,
    getQuestionTextMap
};