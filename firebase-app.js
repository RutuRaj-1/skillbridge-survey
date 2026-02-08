// firebase-app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
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
    query,
    orderBy,
    limit
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
    analytics = getAnalytics(app);
    db = getFirestore(app);
    
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
            add: () => Promise.reject('Firebase not initialized'),
            get: () => Promise.reject('Firebase not initialized')
        })
    };
}

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
            
            logEvent(analytics, 'survey_completed', {
                survey_path: surveyData.path,
                question_count: surveyData.completedQuestions,
                session_id: surveyData.sessionId
            });
            
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error saving survey:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Update analytics
    async updateAnalytics(path) {
        try {
            const analyticsRef = doc(db, 'survey_analytics', 'completions');
            const pathKey = `${path.toLowerCase().replace('-', '')}_completions`;
            
            await updateDoc(analyticsRef, {
                total_completions: increment(1),
                [pathKey]: increment(1),
                last_completed: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            return { success: true };
        } catch (error) {
            // If document doesn't exist, create it
            if (error.code === 'not-found') {
                try {
                    await setDoc(doc(db, 'survey_analytics', 'completions'), {
                        total_completions: 1,
                        sports_completions: path === 'Sports' ? 1 : 0,
                        esports_completions: path === 'E-Sports' ? 1 : 0,
                        nonplayer_completions: path === 'Non-Player' ? 1 : 0,
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
                    ...doc.data()
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
            logEvent(analytics, eventName, {
                ...eventParams,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
        } catch (error) {
            console.log(`[Analytics] ${eventName}:`, eventParams);
        }
    }
};

// Add offline support detection
const isOnline = () => navigator.onLine;
const queue = [];

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
    query,
    orderBy,
    limit,
    getDoc // Add this import if missing
};

// Export the service object for easy use
export default firebaseService;

// Also attach to window for debugging (remove in production)
if (typeof window !== 'undefined') {
    window.firebaseService = firebaseService;
}