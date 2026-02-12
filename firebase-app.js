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
    getDoc,  // ✅ ADDED - was missing
    query,
    orderBy,
    limit,
    enableIndexedDbPersistence // ✅ ADDED - for offline support
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCNR_T8_msAoj94k_r7RIBbFTxlzzBa7ew",
    authDomain: "survey-website-25133.firebaseapp.com",
    projectId: "survey-website-25133",
    storageBucket: "survey-website-25133.firebasestorage.app",
    messagingSenderId: "87335881825",
    appId: "1:87335881825:web:5988ffa0e73247272d2e20",
    measurementId: "G-74ZMVP45LE"
};

// Initialize Firebase with error handling
let app, analytics, db;

try {
    app = initializeApp(firebaseConfig);
    
    // ✅ FIX: Check if analytics is supported (prevents errors in some environments)
    const analyticsSupported = await isSupported();
    if (analyticsSupported) {
        analytics = getAnalytics(app);
    } else {
        console.log('📊 Analytics not supported in this environment');
        analytics = {
            logEvent: (eventName, eventParams) => {
                console.log(`[Analytics] ${eventName}:`, eventParams);
            }
        };
    }
    
    db = getFirestore(app);
    
    // ✅ ADDED: Enable offline persistence
    try {
        await enableIndexedDbPersistence(db);
        console.log('💾 Offline persistence enabled');
    } catch (err) {
        if (err.code === 'failed-precondition') {
            console.warn('⚠️ Multiple tabs open, persistence disabled');
        } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Browser doesn\'t support persistence');
        }
    }
    
    console.log('🔥 Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
    
    // Create fallback objects to prevent app crashes
    app = { name: 'Firebase Failed' };
    analytics = {
        logEvent: (eventName, eventParams) => {
            console.log(`[Analytics Fallback] ${eventName}:`, eventParams);
        }
    };
    db = {
        collection: () => ({
            addDoc: () => Promise.reject('Firebase not initialized'),
            get: () => Promise.reject('Firebase not initialized'),
            where: () => ({ get: () => Promise.reject('Firebase not initialized') })
        }),
        doc: () => ({
            get: () => Promise.reject('Firebase not initialized'),
            set: () => Promise.reject('Firebase not initialized'),
            update: () => Promise.reject('Firebase not initialized')
        })
    };
}

// ✅ ADDED: Queue for offline operations
const pendingOperations = [];

// Helper functions for common operations
const firebaseService = {
    // Save survey response
    async saveSurveyResponse(surveyData) {
        try {
            const docRef = await addDoc(collection(db, 'survey_responses'), {
                ...surveyData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            if (analytics) {
                logEvent(analytics, 'survey_completed', {
                    survey_path: surveyData.path,
                    question_count: surveyData.completedQuestions,
                    session_id: surveyData.sessionId
                });
            }
            
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error saving survey:', error);
            
            // ✅ ADDED: Queue for offline retry
            if (error.code === 'unavailable' || error.code === 'failed-precondition') {
                pendingOperations.push({
                    type: 'save',
                    data: surveyData,
                    timestamp: Date.now()
                });
                
                // Store in localStorage as backup
                this.saveToLocalStorage(surveyData);
            }
            
            return { success: false, error: error.message };
        }
    },
    
    // ✅ ADDED: Local storage fallback
    saveToLocalStorage(surveyData) {
        try {
            const pending = JSON.parse(localStorage.getItem('pending_surveys') || '[]');
            pending.push({
                ...surveyData,
                localId: 'local_' + Date.now(),
                savedAt: new Date().toISOString()
            });
            // Keep only last 20 surveys
            localStorage.setItem('pending_surveys', JSON.stringify(pending.slice(-20)));
        } catch (e) {
            console.error('Local storage save failed:', e);
        }
    },
    
    // ✅ ADDED: Retry pending operations
    async retryPendingOperations() {
        const pending = JSON.parse(localStorage.getItem('pending_surveys') || '[]');
        if (pending.length === 0) return { success: true, count: 0 };
        
        const successful = [];
        const failed = [];
        
        for (const survey of pending) {
            try {
                const result = await this.saveSurveyResponse(survey);
                if (result.success) {
                    successful.push(survey.localId);
                    await this.updateAnalytics(survey.path);
                } else {
                    failed.push(survey.localId);
                }
            } catch (error) {
                failed.push(survey.localId);
            }
        }
        
        // Remove successful ones from storage
        const remaining = pending.filter(s => failed.includes(s.localId));
        localStorage.setItem('pending_surveys', JSON.stringify(remaining));
        
        return { 
            success: true, 
            synced: successful.length, 
            remaining: remaining.length 
        };
    },
    
    // Update analytics with support for Combined path
    async updateAnalytics(path) {
        try {
            const analyticsRef = doc(db, 'survey_analytics', 'completions');
            
            // ✅ FIX: Added Combined path support
            let pathKey;
            switch(path) {
                case 'Sports':
                    pathKey = 'sports_completions';
                    break;
                case 'E-Sports':
                    pathKey = 'esports_completions';
                    break;
                case 'Combined':
                    pathKey = 'combined_completions';
                    break;
                case 'Non-Player':
                    pathKey = 'nonplayer_completions';
                    break;
                default:
                    pathKey = 'other_completions';
            }
            
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
                try {
                    await setDoc(doc(db, 'survey_analytics', 'completions'), {
                        total_completions: 1,
                        sports_completions: path === 'Sports' ? 1 : 0,
                        esports_completions: path === 'E-Sports' ? 1 : 0,
                        combined_completions: path === 'Combined' ? 1 : 0, // ✅ ADDED
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
            }
            
            console.error('Error updating analytics:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get recent surveys (for admin dashboard)
    async getRecentSurveys(limitCount = 10) {
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
            return { success: false, error: error.message };
        }
    },
    
    // Get analytics summary
    async getAnalyticsSummary() {
        try {
            const docRef = doc(db, 'survey_analytics', 'completions');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { success: true, data: docSnap.data() };
            } else {
                return { success: true, data: null };
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Log custom event
    logEvent(eventName, eventParams = {}) {
        try {
            if (analytics) {
                logEvent(analytics, eventName, {
                    ...eventParams,
                    timestamp: new Date().toISOString()
                });
            } else {
                console.log(`[Analytics] ${eventName}:`, eventParams);
            }
        } catch (error) {
            console.log(`[Analytics Fallback] ${eventName}:`, eventParams);
        }
    },
    
    // ✅ ADDED: Check connection status
    isOnline() {
        return navigator.onLine;
    },
    
    // ✅ ADDED: Get pending surveys count
    getPendingCount() {
        try {
            const pending = JSON.parse(localStorage.getItem('pending_surveys') || '[]');
            return pending.length;
        } catch {
            return 0;
        }
    }
};

// ✅ ADDED: Auto-retry on connection
if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
        console.log('🔄 Connection restored, retrying pending operations...');
        const result = await firebaseService.retryPendingOperations();
        console.log(`✅ Synced ${result.synced} surveys, ${result.remaining} remaining`);
    });
}

// Export everything
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
    getDoc,  // ✅ Now exported
    query,
    orderBy,
    limit
};

// Export the service object for easy use
export default firebaseService;

// Attach to window for debugging (remove in production)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.firebaseService = firebaseService;
}