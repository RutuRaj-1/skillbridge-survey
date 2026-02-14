// firebase-helpers.js - Utility functions for Firebase operations
import firebaseService from './firebase-app.js';

// ==================== CONSTANTS & CONFIGURATION ====================
const STORAGE_KEYS = {
    PENDING_SURVEYS: 'pending_surveys',
    SURVEY_BACKUP: 'survey_backup',
    LAST_SYNC: 'last_sync_time'
};

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;
const MAX_STORED_SURVEYS = 20;

// ==================== QUESTION TEXT MAPPING ====================
export const getQuestionTextMap = () => ({
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
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Safely access localStorage with error handling
 */
const safeLocalStorage = {
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.warn(`Failed to read from localStorage (${key}):`, error);
            return null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`Failed to write to localStorage (${key}):`, error);
            return false;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`Failed to remove from localStorage (${key}):`, error);
            return false;
        }
    }
};

/**
 * Get browser information safely
 */
const getBrowserInfo = () => {
    if (typeof window === 'undefined') return { userAgent: 'unknown', screenSize: 'unknown', language: 'unknown' };
    
    return {
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        platform: navigator.platform,
        vendor: navigator.vendor,
        online: navigator.onLine
    };
};

/**
 * Calculate delay with exponential backoff and jitter
 */
const getRetryDelay = (attempt) => {
    const baseDelay = RETRY_DELAY_BASE * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 10000);
};

// ==================== CORE FUNCTIONS ====================

/**
 * Format survey data for storage with enhanced error handling
 */
export const formatSurveyData = (sessionId, path, answers, metadata = {}) => {
    try {
        const now = new Date();
        const startedAt = metadata.startedAt ? new Date(metadata.startedAt) : now;
        const duration = now - startedAt;
        
        // Get question text mapping
        const questionTexts = metadata.questionTexts || getQuestionTextMap();
        
        // Format answers with validation
        const formattedAnswers = Object.entries(answers || {})
            .filter(([_, answerData]) => answerData) // Remove null/undefined answers
            .map(([questionId, answerData], index) => {
                // Safely extract answer data
                const answerType = answerData?.type || 'unknown';
                let answerValue = '';
                let answerText = '';
                
                if (answerType === 'multi') {
                    answerValue = Array.isArray(answerData?.values) ? answerData.values.join(', ') : '';
                    answerText = Array.isArray(answerData?.texts) ? answerData.texts.join(', ') : '';
                } else {
                    answerValue = answerData?.value || '';
                    answerText = answerData?.text || '';
                }
                
                return {
                    questionId: String(questionId),
                    questionText: questionTexts[questionId] || questionId,
                    answerType,
                    answerValue: String(answerValue).substring(0, 1000), // Limit length
                    answerText: String(answerText).substring(0, 1000),
                    questionOrder: index + 1,
                    timestamp: now.toISOString()
                };
            });
        
        return {
            sessionId: String(sessionId || 'unknown'),
            path: String(path || 'unknown'),
            startedAt: startedAt.toISOString(),
            completedAt: now.toISOString(),
            duration: Math.max(0, duration),
            totalQuestions: metadata.totalQuestions || formattedAnswers.length,
            completedQuestions: formattedAnswers.length,
            answers: formattedAnswers,
            metadata: {
                ...metadata,
                ...getBrowserInfo(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timestamp: now.toISOString()
            }
        };
    } catch (error) {
        console.error('Error formatting survey data:', error);
        
        // Return minimal valid data structure
        return {
            sessionId: sessionId || 'error',
            path: path || 'error',
            completedAt: new Date().toISOString(),
            duration: 0,
            totalQuestions: 0,
            completedQuestions: 0,
            answers: [],
            metadata: { 
                error: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
};

/**
 * Save survey with retry mechanism and offline support
 */
export const saveSurveyWithRetry = async (surveyData, maxRetries = MAX_RETRIES) => {
    if (!surveyData) {
        return { success: false, error: 'No survey data provided' };
    }
    
    let lastError;
    let savedLocally = false;
    let localId = null;
    
    // Try to save with retries
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Check if firebaseService is available
            if (!firebaseService || typeof firebaseService.saveSurveyResponse !== 'function') {
                throw new Error('Firebase service not available');
            }
            
            const result = await firebaseService.saveSurveyResponse(surveyData);
            
            if (result?.success) {
                // Update analytics asynchronously (don't await)
                if (firebaseService.updateAnalytics) {
                    firebaseService.updateAnalytics(surveyData.path).catch(console.warn);
                }
                
                // Log success
                if (firebaseService.logEvent) {
                    firebaseService.logEvent('survey_save_success', {
                        path: surveyData.path,
                        attempt,
                        surveyId: result.id
                    });
                }
                
                // Clear from pending if it was previously saved locally
                removeFromPending(surveyData.sessionId);
                
                return { 
                    success: true, 
                    id: result.id, 
                    attempt,
                    savedLocally: false 
                };
            }
            
            lastError = result?.error || 'Unknown error';
        } catch (error) {
            lastError = error.message;
            
            // Exponential backoff with jitter
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, getRetryDelay(attempt)));
            }
        }
    }
    
    // If all retries failed, save locally
    try {
        localId = saveToLocalStorage(surveyData);
        savedLocally = true;
        
        // Log failure
        if (firebaseService?.logEvent) {
            firebaseService.logEvent('survey_save_failed', {
                path: surveyData.path,
                error: lastError
            });
        }
    } catch (storageError) {
        console.error('Local storage backup failed:', storageError);
        lastError = storageError.message;
    }
    
    return { 
        success: false, 
        error: `Failed after ${maxRetries} attempts: ${lastError}`,
        savedLocally,
        localId
    };
};

/**
 * Save survey data to localStorage with rotation
 */
export const saveToLocalStorage = (surveyData) => {
    try {
        const pending = safeLocalStorage.get(STORAGE_KEYS.PENDING_SURVEYS) || [];
        const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        pending.push({
            ...surveyData,
            localId,
            savedAt: new Date().toISOString(),
            retryCount: 0
        });
        
        // Keep only last MAX_STORED_SURVEYS items
        const trimmed = pending.slice(-MAX_STORED_SURVEYS);
        safeLocalStorage.set(STORAGE_KEYS.PENDING_SURVEYS, trimmed);
        
        // Update last sync time
        safeLocalStorage.set(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        
        return localId;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        throw error;
    }
};

/**
 * Remove a survey from pending queue
 */
const removeFromPending = (sessionId) => {
    try {
        const pending = safeLocalStorage.get(STORAGE_KEYS.PENDING_SURVEYS) || [];
        const filtered = pending.filter(s => s.sessionId !== sessionId);
        safeLocalStorage.set(STORAGE_KEYS.PENDING_SURVEYS, filtered);
    } catch (error) {
        console.warn('Failed to remove from pending:', error);
    }
};

/**
 * Sync pending surveys with retry mechanism
 */
export const syncPendingSurveys = async (maxItems = 10) => {
    // Check online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { 
            success: false, 
            error: 'No internet connection',
            pending: getPendingCount()
        };
    }
    
    try {
        const pending = safeLocalStorage.get(STORAGE_KEYS.PENDING_SURVEYS) || [];
        if (pending.length === 0) {
            return { success: true, synced: 0, remaining: 0 };
        }
        
        const toSync = pending.slice(0, maxItems);
        const successful = [];
        const failed = [];
        
        for (const survey of toSync) {
            try {
                if (!firebaseService || typeof firebaseService.saveSurveyResponse !== 'function') {
                    throw new Error('Firebase service not available');
                }
                
                const result = await firebaseService.saveSurveyResponse(survey);
                
                if (result?.success) {
                    successful.push(survey.localId);
                    
                    // Update analytics
                    if (firebaseService.updateAnalytics) {
                        await firebaseService.updateAnalytics(survey.path).catch(console.warn);
                    }
                } else {
                    failed.push(survey);
                }
            } catch (error) {
                console.warn('Failed to sync survey:', survey.localId, error);
                failed.push(survey);
            }
        }
        
        // Update pending queue - remove successful, keep failed
        const remaining = pending.filter(s => 
            failed.some(f => f.localId === s.localId) || !toSync.some(t => t.localId === s.localId)
        );
        
        safeLocalStorage.set(STORAGE_KEYS.PENDING_SURVEYS, remaining);
        
        return { 
            success: true, 
            synced: successful.length, 
            failed: failed.length,
            remaining: remaining.length 
        };
    } catch (error) {
        console.error('Sync failed:', error);
        return { 
            success: false, 
            error: error.message,
            pending: getPendingCount()
        };
    }
};

/**
 * Get count of pending surveys
 */
export const getPendingCount = () => {
    try {
        const pending = safeLocalStorage.get(STORAGE_KEYS.PENDING_SURVEYS) || [];
        return pending.length;
    } catch {
        return 0;
    }
};

/**
 * Get survey statistics summary
 */
export const getSurveyStats = (surveyData) => {
    if (!surveyData?.answers) {
        return { 
            total: 0, 
            byPath: {}, 
            byType: {},
            completionRate: 0
        };
    }
    
    const stats = {
        total: surveyData.completedQuestions || 0,
        path: surveyData.path || 'unknown',
        duration: surveyData.duration || 0,
        byType: {},
        byQuestion: {},
        completionRate: 0
    };
    
    if (surveyData.totalQuestions > 0) {
        stats.completionRate = Math.round((stats.total / surveyData.totalQuestions) * 100);
    }
    
    surveyData.answers.forEach(answer => {
        // Count by answer type
        stats.byType[answer.answerType] = (stats.byType[answer.answerType] || 0) + 1;
        
        // Store per-question stats
        stats.byQuestion[answer.questionId] = {
            type: answer.answerType,
            value: answer.answerValue.substring(0, 50) // Truncate for display
        };
    });
    
    return stats;
};

/**
 * Validate Firebase configuration
 */
export const validateFirebaseConfig = (config) => {
    if (!config || typeof config !== 'object') {
        console.error('❌ Invalid Firebase config: not an object');
        return false;
    }
    
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
        console.warn('⚠️ Missing Firebase config fields:', missingFields.join(', '));
        return false;
    }
    
    // Validate formats
    const issues = [];
    
    if (!config.apiKey.startsWith('AIza')) {
        issues.push('API key format incorrect (should start with AIza)');
    }
    
    if (!config.authDomain.includes('.')) {
        issues.push('Auth domain format incorrect');
    }
    
    if (config.projectId.length < 6) {
        issues.push('Project ID seems too short');
    }
    
    if (issues.length > 0) {
        console.warn('⚠️ Firebase config issues:', issues);
        return false;
    }
    
    return true;
};

/**
 * Clear all pending surveys (admin use)
 */
export const clearPendingSurveys = () => {
    try {
        safeLocalStorage.remove(STORAGE_KEYS.PENDING_SURVEYS);
        safeLocalStorage.remove(STORAGE_KEYS.LAST_SYNC);
        return { success: true, message: 'Pending surveys cleared' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Export survey data as CSV
 */
export const exportToCSV = (surveys) => {
    if (!surveys?.length) {
        return null;
    }
    
    const headers = [
        'Survey ID', 
        'Path', 
        'Completed At', 
        'Duration (ms)', 
        'Question ID', 
        'Question', 
        'Answer Type',
        'Answer Value',
        'Answer Text'
    ];
    
    const rows = [];
    
    surveys.forEach(survey => {
        if (survey.answers?.length) {
            survey.answers.forEach(answer => {
                rows.push([
                    survey.sessionId || survey.id || 'unknown',
                    survey.path || 'unknown',
                    survey.completedAt || '',
                    survey.duration || 0,
                    answer.questionId || '',
                    answer.questionText || '',
                    answer.answerType || '',
                    answer.answerValue || '',
                    answer.answerText || ''
                ].map(cell => {
                    // Escape quotes and wrap in quotes
                    const str = String(cell ?? '');
                    return `"${str.replace(/"/g, '""')}"`;
                }).join(','));
            });
        }
    });
    
    return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
};

/**
 * Get storage usage information
 */
export const getStorageInfo = () => {
    try {
        const pending = safeLocalStorage.get(STORAGE_KEYS.PENDING_SURVEYS) || [];
        const backup = safeLocalStorage.get(STORAGE_KEYS.SURVEY_BACKUP) || [];
        const lastSync = safeLocalStorage.get(STORAGE_KEYS.LAST_SYNC);
        
        return {
            pendingCount: pending.length,
            backupCount: backup.length,
            lastSync,
            totalStored: pending.length + backup.length
        };
    } catch (error) {
        return { error: error.message };
    }
};

// ==================== EXPORTS ====================

export default {
    formatSurveyData,
    saveSurveyWithRetry,
    validateFirebaseConfig,
    syncPendingSurveys,
    getSurveyStats,
    clearPendingSurveys,
    exportToCSV,
    getQuestionTextMap,
    saveToLocalStorage,
    getPendingCount,
    getStorageInfo
};