// firebase-app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics, logEvent, isSupported } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    setDoc,
    serverTimestamp, 
    increment,
    getDocs,
    getDoc,
    query,
    orderBy,
    limit,
    enableIndexedDbPersistence,
    deleteDoc // Added for completeness
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// ==================== CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyCNR_T8_msAoj94k_r7RIBbFTxlzzBa7ew",
    authDomain: "survey-website-25133.firebaseapp.com",
    projectId: "survey-website-25133",
    storageBucket: "survey-website-25133.firebasestorage.app",
    messagingSenderId: "87335881825",
    appId: "1:87335881825:web:5988ffa0e73247272d2e20",
    measurementId: "G-74ZMVP45LE"
};

// ==================== CONSTANTS ====================
const STORAGE_KEYS = {
    PENDING_SURVEYS: 'pending_surveys',
    LAST_SYNC_ATTEMPT: 'last_sync_attempt'
};

const MAX_STORED_SURVEYS = 20;
const SYNC_RETRY_DELAY = 5000; // 5 seconds

// ==================== INITIALIZATION ====================
let app, analytics, db;

/**
 * Initialize Firebase with comprehensive error handling
 */
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        
        // Initialize Analytics with feature detection
        await initializeAnalytics();
        
        // Initialize Firestore
        db = getFirestore(app);
        
        // Enable offline persistence
        await enablePersistence();
        
        console.log('🔥 Firebase initialized successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        return { success: false, error };
    }
}

/**
 * Initialize Analytics with fallback
 */
async function initializeAnalytics() {
    try {
        const analyticsSupported = await isSupported();
        if (analyticsSupported) {
            analytics = getAnalytics(app);
            console.log('📊 Analytics initialized');
        } else {
            console.log('📊 Analytics not supported in this environment');
            analytics = createAnalyticsFallback();
        }
    } catch (error) {
        console.warn('📊 Analytics initialization failed:', error);
        analytics = createAnalyticsFallback();
    }
}

/**
 * Create analytics fallback object
 */
function createAnalyticsFallback() {
    return {
        logEvent: (eventName, eventParams) => {
            console.log(`[Analytics] ${eventName}:`, eventParams);
        }
    };
}

/**
 * Enable Firestore persistence with error handling
 */
async function enablePersistence() {
    if (!db) return;
    
    try {
        await enableIndexedDbPersistence(db);
        console.log('💾 Offline persistence enabled');
    } catch (err) {
        switch (err.code) {
            case 'failed-precondition':
                console.warn('⚠️ Multiple tabs open, persistence disabled');
                break;
            case 'unimplemented':
                console.warn('⚠️ Browser doesn\'t support persistence');
                break;
            default:
                console.warn('⚠️ Persistence error:', err.message);
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Safe localStorage operations
 */
const storage = {
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : [];
        } catch {
            return [];
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Failed to save to localStorage (${key}):`, e);
            return false;
        }
    }
};

/**
 * Generate a unique local ID
 */
function generateLocalId() {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== FIREBASE SERVICE ====================

const firebaseService = {
    // ========== SURVEY OPERATIONS ==========
    
    /**
     * Save survey response to Firestore
     */
    async saveSurveyResponse(surveyData) {
        if (!this.isFirestoreAvailable()) {
            return this.handleOfflineSave(surveyData);
        }
        
        try {
            const docRef = await addDoc(collection(db, 'survey_responses'), {
                ...surveyData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            this.logEvent('survey_completed', {
                survey_path: surveyData.path,
                question_count: surveyData.completedQuestions,
                session_id: surveyData.sessionId
            });
            
            // Remove from pending if it was previously saved
            await this.removeFromPending(surveyData.sessionId);
            
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error saving survey:', error);
            return this.handleOfflineSave(surveyData, error);
        }
    },
    
    /**
     * Handle offline save with retry queue
     */
    handleOfflineSave(surveyData, error = null) {
        const localId = this.saveToLocalStorage(surveyData);
        
        return { 
            success: false, 
            error: error?.message || 'Network unavailable',
            offline: true,
            localId
        };
    },
    
    /**
     * Check if Firestore is available
     */
    isFirestoreAvailable() {
        return db && typeof db === 'object' && !db._isFallback;
    },
    
    // ========== ANALYTICS OPERATIONS ==========
    
    /**
     * Update analytics counters
     */
    async updateAnalytics(path) {
        if (!this.isFirestoreAvailable()) {
            return { success: false, offline: true };
        }
        
        try {
            const analyticsRef = doc(db, 'survey_analytics', 'completions');
            const pathKey = this.getPathKey(path);
            
            await updateDoc(analyticsRef, {
                total_completions: increment(1),
                [pathKey]: increment(1),
                last_completed: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            return { success: true };
        } catch (error) {
            // If document doesn't exist, create it
            if (error.code === 'not-found' || error.message.includes('not-found')) {
                return this.createAnalyticsDocument(path);
            }
            
            console.error('Error updating analytics:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Get path key for analytics
     */
    getPathKey(path) {
        const pathMap = {
            'Sports': 'sports_completions',
            'E-Sports': 'esports_completions',
            'Combined': 'combined_completions',
            'Non-Player': 'nonplayer_completions'
        };
        return pathMap[path] || 'other_completions';
    },
    
    /**
     * Create analytics document
     */
    async createAnalyticsDocument(path) {
        try {
            await setDoc(doc(db, 'survey_analytics', 'completions'), {
                total_completions: 1,
                sports_completions: path === 'Sports' ? 1 : 0,
                esports_completions: path === 'E-Sports' ? 1 : 0,
                combined_completions: path === 'Combined' ? 1 : 0,
                nonplayer_completions: path === 'Non-Player' ? 1 : 0,
                other_completions: 0,
                last_completed: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { success: true };
        } catch (createError) {
            console.error('Error creating analytics doc:', createError);
            return { success: false, error: createError.message };
        }
    },
    
    // ========== LOCAL STORAGE OPERATIONS ==========
    
    /**
     * Save survey to localStorage
     */
    saveToLocalStorage(surveyData) {
        try {
            const pending = storage.get(STORAGE_KEYS.PENDING_SURVEYS);
            const localId = generateLocalId();
            
            pending.push({
                ...surveyData,
                localId,
                savedAt: new Date().toISOString(),
                retryCount: 0
            });
            
            // Keep only recent surveys
            const trimmed = pending.slice(-MAX_STORED_SURVEYS);
            storage.set(STORAGE_KEYS.PENDING_SURVEYS, trimmed);
            
            console.log(`💾 Survey saved locally: ${localId}`);
            return localId;
        } catch (e) {
            console.error('Local storage save failed:', e);
            return null;
        }
    },
    
    /**
     * Remove survey from pending queue
     */
    async removeFromPending(sessionId) {
        try {
            const pending = storage.get(STORAGE_KEYS.PENDING_SURVEYS);
            const filtered = pending.filter(s => s.sessionId !== sessionId);
            storage.set(STORAGE_KEYS.PENDING_SURVEYS, filtered);
        } catch (e) {
            console.warn('Failed to remove from pending:', e);
        }
    },
    
    /**
     * Retry pending operations
     */
    async retryPendingOperations() {
        if (!this.isFirestoreAvailable()) {
            return { success: false, error: 'Firestore unavailable', synced: 0 };
        }
        
        const pending = storage.get(STORAGE_KEYS.PENDING_SURVEYS);
        if (pending.length === 0) {
            return { success: true, synced: 0, remaining: 0 };
        }
        
        const results = {
            synced: [],
            failed: [],
            errors: []
        };
        
        for (const survey of pending) {
            try {
                const result = await this.saveSurveyResponse(survey);
                if (result.success) {
                    results.synced.push(survey.localId);
                    await this.updateAnalytics(survey.path);
                } else {
                    results.failed.push(survey.localId);
                    results.errors.push({ id: survey.localId, error: result.error });
                }
            } catch (error) {
                results.failed.push(survey.localId);
                results.errors.push({ id: survey.localId, error: error.message });
            }
        }
        
        // Update pending queue (keep failed ones)
        const remaining = pending.filter(s => results.failed.includes(s.localId));
        storage.set(STORAGE_KEYS.PENDING_SURVEYS, remaining);
        
        // Record last sync attempt
        storage.set(STORAGE_KEYS.LAST_SYNC_ATTEMPT, new Date().toISOString());
        
        return {
            success: true,
            synced: results.synced.length,
            failed: results.failed.length,
            remaining: remaining.length,
            errors: results.errors
        };
    },
    
    /**
     * Get pending surveys count
     */
    getPendingCount() {
        return storage.get(STORAGE_KEYS.PENDING_SURVEYS).length;
    },
    
    /**
     * Check connection status
     */
    isOnline() {
        return typeof navigator !== 'undefined' ? navigator.onLine : true;
    },
    
    // ========== QUERY OPERATIONS ==========
    
    /**
     * Get recent surveys
     */
    async getRecentSurveys(limitCount = 10) {
        if (!this.isFirestoreAvailable()) {
            return this.getLocalSurveys(limitCount);
        }
        
        try {
            const q = query(
                collection(db, 'survey_responses'),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
            
            const querySnapshot = await getDocs(q);
            const surveys = [];
            
            querySnapshot.forEach((doc) => {
                surveys.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || null
                });
            });
            
            return { success: true, data: surveys };
        } catch (error) {
            console.error('Error fetching surveys:', error);
            return this.getLocalSurveys(limitCount);
        }
    },
    
    /**
     * Get local surveys as fallback
     */
    getLocalSurveys(limitCount = 10) {
        const pending = storage.get(STORAGE_KEYS.PENDING_SURVEYS);
        return {
            success: true,
            data: pending.slice(-limitCount).map(s => ({
                ...s,
                id: s.localId,
                createdAt: s.savedAt
            })),
            offline: true
        };
    },
    
    /**
     * Get analytics summary
     */
    async getAnalyticsSummary() {
        if (!this.isFirestoreAvailable()) {
            return { success: false, offline: true };
        }
        
        try {
            const docRef = doc(db, 'survey_analytics', 'completions');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { success: true, data: docSnap.data() };
            }
            return { success: true, data: null };
        } catch (error) {
            console.error('Error fetching analytics:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ========== EVENT LOGGING ==========
    
    /**
     * Log custom event
     */
    logEvent(eventName, eventParams = {}) {
        try {
            const enrichedParams = {
                ...eventParams,
                timestamp: new Date().toISOString(),
                online: this.isOnline()
            };
            
            if (analytics && typeof analytics.logEvent === 'function') {
                logEvent(analytics, eventName, enrichedParams);
            } else {
                console.log(`[Analytics] ${eventName}:`, enrichedParams);
            }
        } catch (error) {
            console.log(`[Analytics Fallback] ${eventName}:`, eventParams);
        }
    },
    
    // ========== UTILITY ==========
    
    /**
     * Clear all pending surveys (admin only)
     */
    clearPendingSurveys() {
        try {
            storage.set(STORAGE_KEYS.PENDING_SURVEYS, []);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Get storage info
     */
    getStorageInfo() {
        const pending = storage.get(STORAGE_KEYS.PENDING_SURVEYS);
        const lastSync = storage.get(STORAGE_KEYS.LAST_SYNC_ATTEMPT);
        
        return {
            pendingCount: pending.length,
            lastSyncAttempt: lastSync || null,
            online: this.isOnline(),
            firestoreAvailable: this.isFirestoreAvailable()
        };
    }
};

// ==================== INITIALIZE ====================

// Run initialization
await initializeFirebase();

// ==================== AUTO-SYNC ON CONNECTION ====================

if (typeof window !== 'undefined') {
    let syncTimeout = null;
    
    const handleOnline = async () => {
        console.log('🔄 Connection restored, retrying pending operations...');
        
        // Debounce sync to prevent multiple rapid calls
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
            const result = await firebaseService.retryPendingOperations();
            console.log(`✅ Sync complete: ${result.synced} synced, ${result.failed} failed, ${result.remaining} remaining`);
            syncTimeout = null;
        }, SYNC_RETRY_DELAY);
    };
    
    window.addEventListener('online', handleOnline);
    
    // Initial sync attempt if there are pending items
    if (firebaseService.getPendingCount() > 0 && navigator.onLine) {
        setTimeout(handleOnline, 2000);
    }
}

// ==================== EXPORTS ====================

export { 
    app, 
    analytics, 
    db, 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    setDoc,
    serverTimestamp, 
    increment,
    getDocs,
    getDoc,
    query,
    orderBy,
    limit,
    deleteDoc
};

export default firebaseService;

// Attach to window for debugging (development only)
if (typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.firebaseService = firebaseService;
    console.log('🔧 Firebase service attached to window for debugging');
}