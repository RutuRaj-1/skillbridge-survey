// script.js - Enhanced with Firebase Integration
document.addEventListener('DOMContentLoaded', async function() {
    // ==================== FIREBASE IMPORT & SETUP ====================
    let firebaseService = null;
    let firebaseAvailable = false;
    
    try {
        // Import Firebase services
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js");
        const { getAnalytics, logEvent } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js");
        const { 
            getFirestore, 
            collection, 
            addDoc, 
            updateDoc, 
            doc, 
            setDoc,
            serverTimestamp, 
            increment 
        } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");

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

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const analytics = getAnalytics(app);
        const db = getFirestore(app);
        
        firebaseService = {
            db,
            analytics,
            async saveSurvey(surveyData) {
                try {
                    const docRef = await addDoc(collection(db, 'survey_responses'), {
                        ...surveyData,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    
                    logEvent(analytics, 'survey_completed', {
                        path: surveyData.path,
                        questions: surveyData.completedQuestions,
                        duration: surveyData.duration
                    });
                    
                    return { success: true, id: docRef.id };
                } catch (error) {
                    console.error('Firebase save error:', error);
                    return { success: false, error: error.message };
                }
            },
            
            async updateAnalytics(path) {
                try {
                    const analyticsRef = doc(db, 'survey_analytics', 'completions');
                    const pathKey = `${path.toLowerCase().replace('-', '')}_completions`;
                    
                    await updateDoc(analyticsRef, {
                        total_completions: increment(1),
                        [pathKey]: increment(1),
                        last_completed: serverTimestamp()
                    });
                    return { success: true };
                } catch (error) {
                    await setDoc(doc(db, 'survey_analytics', 'completions'), {
                        total_completions: 1,
                        sports_completions: path === 'Sports' ? 1 : 0,
                        esports_completions: path === 'E-Sports' ? 1 : 0,
                        combined_completions: path === 'Combined' ? 1 : 0,
                        nonplayer_completions: path === 'Non-Player' ? 1 : 0,
                        last_completed: serverTimestamp(),
                        createdAt: serverTimestamp()
                    });
                    return { success: true };
                }
            }
        };
        
        firebaseAvailable = true;
        console.log('Firebase initialized successfully');
        
    } catch (error) {
        console.warn('Firebase not available, using local storage:', error);
        firebaseService = {
            async saveSurvey(surveyData) {
                const stored = JSON.parse(localStorage.getItem('survey_backup') || '[]');
                stored.push({
                    ...surveyData,
                    id: 'local_' + Date.now(),
                    savedAt: new Date().toISOString()
                });
                localStorage.setItem('survey_backup', JSON.stringify(stored));
                return { success: true, id: 'local_' + Date.now() };
            },
            async updateAnalytics() {
                return { success: true };
            }
        };
    }

    // ==================== SURVEY DATA ====================
    const surveyData = {
        initial: {
            id: 'initial',
            title: 'Which of these have you played?',
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Sports', value: 'sports' },
                { text: 'E-Sports', value: 'esports' },
                { text: 'None', value: 'none' }
            ],
            next: 'path-selector'
        },
        
        'path-selector': {
            id: 'path-selector',
            title: 'Based on your selection',
            subtitle: 'We will customize the experience for you',
            type: 'conditional',
            next: {
                'sports-only': 'sports-1',
                'esports-only': 'esports-1',
                'combined': 'combined-1',
                'none': 'no-reason'
            }
        },
        
        'no-reason': {
            id: 'no-reason',
            title: 'What kept you from exploring sports or esports?',
            subtitle: 'Select the main reason',
            type: 'single',
            options: [
                { text: 'Focus on academics', value: 'academics' },
                { text: 'Cost constraints', value: 'cost' },
                { text: 'Health/injury issues', value: 'health' },
                { text: 'No access nearby', value: 'access' },
                { text: 'Family did not support', value: 'family' },
                { text: 'No time', value: 'time' },
                { text: 'Never interested', value: 'interest' },
                { text: 'Fear of failure', value: 'fear' },
                { text: 'Started too late', value: 'late-start' }
            ],
            next: 'thank-you'
        },
        
        // ============ COMBINED SPORTS + E-SPORTS PATH ============
        'combined-1': { 
            id: 'combined-1', 
            title: 'Which do you prioritize more?', 
            type: 'single',
            options: [
                { text: 'Sports', value: 'sports' },
                { text: 'E-Sports', value: 'esports' },
                { text: 'Both equally', value: 'both' }
            ],
            next: 'combined-2' 
        },
        
        'combined-2': { 
            id: 'combined-2', 
            title: 'What is your biggest struggle across both?', 
            type: 'single',
            options: [
                { text: 'Time management between both', value: 'time' },
                { text: 'Financial constraints', value: 'financial' },
                { text: 'Finding good coaching/training', value: 'coaching' },
                { text: 'Balancing with education', value: 'education' },
                { text: 'Family support', value: 'family' },
                { text: 'Physical vs mental burnout', value: 'burnout' },
                { text: 'Opportunities in both fields', value: 'opportunities' }
            ],
            next: 'combined-3' 
        },
        
        'combined-3': { 
            id: 'combined-3', 
            title: 'Do you see synergy between sports and esports?', 
            type: 'single',
            options: [
                { text: 'Yes, they complement each other', value: 'yes-complement' },
                { text: 'Somewhat, but very different', value: 'somewhat' },
                { text: 'No, completely different', value: 'no' },
                { text: 'Not sure', value: 'unsure' }
            ],
            next: 'combined-4' 
        },
        
        'combined-4': { 
            id: 'combined-4', 
            title: 'What skills from sports help you in esports?', 
            type: 'multi',
            options: [
                { text: 'Hand-eye coordination', value: 'coordination' },
                { text: 'Team communication', value: 'communication' },
                { text: 'Competitive mindset', value: 'mindset' },
                { text: 'Discipline/practice routine', value: 'discipline' },
                { text: 'Handling pressure', value: 'pressure' },
                { text: 'Physical fitness/stamina', value: 'fitness' },
                { text: 'None', value: 'none' }
            ],
            next: 'combined-5' 
        },
        
        'combined-5': { 
            id: 'combined-5', 
            title: 'What skills from esports help you in sports?', 
            type: 'multi',
            options: [
                { text: 'Strategic thinking', value: 'strategy' },
                { text: 'Quick decision making', value: 'decisions' },
                { text: 'Reaction time', value: 'reaction' },
                { text: 'Pattern recognition', value: 'patterns' },
                { text: 'Adaptability', value: 'adaptability' },
                { text: 'Focus/concentration', value: 'focus' },
                { text: 'None', value: 'none' }
            ],
            next: 'combined-6' 
        },
        
        'combined-6': { 
            id: 'combined-6', 
            title: 'How do you split your practice time?', 
            type: 'single',
            options: [
                { text: '70% Sports, 30% E-Sports', value: '70-30-sports' },
                { text: '50% Sports, 50% E-Sports', value: '50-50' },
                { text: '30% Sports, 70% E-Sports', value: '30-70-esports' },
                { text: 'Varies based on season', value: 'seasonal' },
                { text: 'More time on whichever has opportunities', value: 'opportunity-based' }
            ],
            next: 'combined-7' 
        },
        
        'combined-7': { 
            id: 'combined-7', 
            title: 'Have you faced criticism for pursuing both?', 
            type: 'single',
            options: [
                { text: 'Yes, from family', value: 'family' },
                { text: 'Yes, from coaches', value: 'coaches' },
                { text: 'Yes, from peers', value: 'peers' },
                { text: 'No, people are supportive', value: 'supportive' },
                { text: 'No one knows I do both', value: 'hidden' }
            ],
            next: 'combined-8' 
        },
        
        'combined-8': { 
            id: 'combined-8', 
            title: 'If a platform existed for both sports and esports, what would you want?', 
            type: 'multi',
            options: [
                { text: 'Cross-training programs', value: 'cross-training' },
                { text: 'Scholarships for multi-sport athletes', value: 'scholarships' },
                { text: 'Career paths in both', value: 'career-paths' },
                { text: 'Mental/physical wellness', value: 'wellness' },
                { text: 'Networking across both communities', value: 'networking' },
                { text: 'Performance tracking for both', value: 'tracking' }
            ],
            next: 'combined-9' 
        },
        
        'combined-9': { 
            id: 'combined-9', 
            title: 'Would you pay for such a platform?', 
            type: 'single',
            options: [
                { text: 'Yes, definitely', value: 'yes' },
                { text: 'Maybe, depends on features', value: 'maybe' },
                { text: 'No, expect free', value: 'no' }
            ],
            next: 'combined-10' 
        },
        
        // TEXT INPUT QUESTIONS - Combined Path
        'combined-10': { 
            id: 'combined-10', 
            title: 'Primary Sport', 
            subtitle: 'Please specify your main sport',
            type: 'text-short',
            placeholder: 'e.g., Cricket, Football, Basketball...',
            next: 'combined-11' 
        },
        
        'combined-11': { 
            id: 'combined-11', 
            title: 'Primary E-Sport / Game', 
            subtitle: 'Please specify your main game',
            type: 'text-short',
            placeholder: 'e.g., Valorant, League of Legends, CS:GO...',
            next: 'combined-12' 
        },
        
        'combined-12': { 
            id: 'combined-12', 
            title: 'Sports Playing Level', 
            type: 'single',
            options: [
                { text: 'Beginner', value: 'beginner' },
                { text: 'Intermediate', value: 'intermediate' },
                { text: 'Advanced', value: 'advanced' },
                { text: 'Amateur Competitor', value: 'amateur' },
                { text: 'Semi-Pro', value: 'semi-pro' },
                { text: 'Professional', value: 'professional' }
            ],
            next: 'combined-13' 
        },
        
        'combined-13': { 
            id: 'combined-13', 
            title: 'E-Sports Level', 
            type: 'single',
            options: [
                { text: 'Casual', value: 'casual' },
                { text: 'Intermediate', value: 'intermediate' },
                { text: 'Advanced', value: 'advanced' },
                { text: 'Elite', value: 'elite' },
                { text: 'Semi-pro', value: 'semi-pro' },
                { text: 'Professional', value: 'professional' }
            ],
            next: 'combined-14' 
        },
        
        'combined-14': { 
            id: 'combined-14', 
            title: 'Age Group', 
            type: 'single',
            options: [
                { text: 'Under 18', value: 'under-18' },
                { text: '18-24', value: '18-24' },
                { text: '25-34', value: '25-34' },
                { text: '35-44', value: '35-44' },
                { text: '45+', value: '45-plus' }
            ],
            next: 'combined-15' 
        },
        
        'combined-15': { 
            id: 'combined-15', 
            title: 'Gender', 
            type: 'single',
            options: [
                { text: 'Male', value: 'male' },
                { text: 'Female', value: 'female' },
                { text: 'Non-binary', value: 'non-binary' },
                { text: 'Prefer not to say', value: 'prefer-not' }
            ],
            next: 'combined-16' 
        },
        
        'combined-16': { 
            id: 'combined-16', 
            title: 'City', 
            subtitle: 'Where are you currently based?',
            type: 'text-short',
            placeholder: 'e.g., Mumbai, Delhi, Bangalore...',
            next: 'combined-17' 
        },
        
        'combined-17': { 
            id: 'combined-17', 
            title: 'How do you view sports?', 
            type: 'single',
            options: [
                { text: 'Hobby', value: 'hobby' },
                { text: 'Serious career', value: 'career' },
                { text: 'Undecided', value: 'undecided' },
                { text: 'Passion but not career', value: 'passion' }
            ],
            next: 'combined-18' 
        },
        
        'combined-18': { 
            id: 'combined-18', 
            title: 'How do you view esports?', 
            type: 'single',
            options: [
                { text: 'Hobby', value: 'hobby' },
                { text: 'Serious career', value: 'career' },
                { text: 'Undecided', value: 'undecided' },
                { text: 'Passion but not career', value: 'passion' }
            ],
            next: 'combined-19' 
        },
        
        'combined-19': { 
            id: 'combined-19', 
            title: 'Family support for sports?', 
            type: 'single',
            options: [
                { text: 'Strongly supportive', value: 'strong' },
                { text: 'Somewhat supportive', value: 'somewhat' },
                { text: 'Neutral', value: 'neutral' },
                { text: 'Not supportive', value: 'not' }
            ],
            next: 'combined-20' 
        },
        
        'combined-20': { 
            id: 'combined-20', 
            title: 'Family support for esports?', 
            type: 'single',
            options: [
                { text: 'Strongly supportive', value: 'strong' },
                { text: 'Somewhat supportive', value: 'somewhat' },
                { text: 'Neutral', value: 'neutral' },
                { text: 'Not supportive', value: 'not' }
            ],
            next: 'combined-21' 
        },
        
        'combined-21': { 
            id: 'combined-21', 
            title: 'Weekly training hours - Sports', 
            type: 'single',
            options: [
                { text: '< 5 hours', value: '<5' },
                { text: '5-10 hours', value: '5-10' },
                { text: '11-20 hours', value: '11-20' },
                { text: '21-30 hours', value: '21-30' },
                { text: '30+ hours', value: '30+' }
            ],
            next: 'combined-22' 
        },
        
        'combined-22': { 
            id: 'combined-22', 
            title: 'Weekly gaming hours - E-Sports', 
            type: 'single',
            options: [
                { text: '< 10 hours', value: '<10' },
                { text: '10-20 hours', value: '10-20' },
                { text: '20-30 hours', value: '20-30' },
                { text: '30-40 hours', value: '30-40' },
                { text: '40+ hours', value: '40+' }
            ],
            next: 'combined-23' 
        },
        
        'combined-23': { 
            id: 'combined-23', 
            title: 'Which career are you more likely to pursue?', 
            type: 'single',
            options: [
                { text: 'Sports', value: 'sports' },
                { text: 'E-Sports', value: 'esports' },
                { text: 'Both professionally', value: 'both' },
                { text: 'Neither - just hobbies', value: 'neither' }
            ],
            next: 'thank-you' 
        },
        
        // ============ SPORTS ONLY PATH ============
        'sports-1': { 
            id: 'sports-1', 
            title: 'What is your biggest struggle(s) right now?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Cost/financial', value: 'financial' },
                { text: 'Finding good coaching', value: 'coaching' },
                { text: 'Time management', value: 'time' },
                { text: 'Getting opportunities/trials', value: 'opportunities' },
                { text: 'Physical fitness/injuries', value: 'physical' },
                { text: 'Mental pressure/confidence', value: 'mental' },
                { text: 'Balancing education', value: 'education' },
                { text: 'Family support', value: 'family' }
            ],
            next: 'sports-2' 
        },
        
        'sports-2': { 
            id: 'sports-2', 
            title: 'What stops you from taking steps toward pro sports?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Don\'t know the path/roadmap', value: 'dont-know-path' },
                { text: 'Don\'t know right academies', value: 'dont-know-academies' },
                { text: 'Need financial support first', value: 'financial' },
                { text: 'Need to finish education', value: 'education' },
                { text: 'Family expects different career', value: 'family-pressure' },
                { text: 'Recovering from injury', value: 'injury' },
                { text: 'Don\'t know selection criteria', value: 'criteria' }
            ],
            next: 'sports-3' 
        },
        
        'sports-3': { 
            id: 'sports-3', 
            title: 'If you thought of quitting, what was the main reason(s)?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Lack of progress/improvement', value: 'no-progress' },
                { text: 'Recurring injuries', value: 'injuries' },
                { text: 'Financial pressure', value: 'cost' },
                { text: 'Burnout/exhaustion', value: 'burnout' },
                { text: 'Lost motivation/passion', value: 'motivation' },
                { text: 'Toxic environment/people', value: 'toxic' },
                { text: 'Academic pressure', value: 'academics' },
                { text: 'Never thought of quitting', value: 'never' }
            ],
            next: 'sports-4' 
        },
        
        'sports-4': { 
            id: 'sports-4', 
            title: 'Do you feel you are getting enough opportunities today?', 
            type: 'single',
            options: [
                { text: 'Yes, plenty', value: 'yes' },
                { text: 'Somewhat', value: 'somewhat' },
                { text: 'No, very limited', value: 'no' }
            ],
            next: 'sports-4a'
        },
        
        'sports-4a': { 
            id: 'sports-4a', 
            title: 'Why do you feel this way about opportunities?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Limited in my city/region', value: 'location' },
                { text: 'Only for elite players', value: 'elite-only' },
                { text: 'Don\'t know where to find', value: 'awareness' },
                { text: 'Too expensive', value: 'expensive' },
                { text: 'Too much competition', value: 'competition' },
                { text: 'Few academies/clubs', value: 'infrastructure' },
                { text: 'Opportunities are rare', value: 'rare' }
            ],
            next: 'sports-5' 
        },
        
        'sports-5': { 
            id: 'sports-5', 
            title: 'Have you ever missed an opportunity due to lack of guidance?', 
            type: 'single',
            options: [
                { text: 'Yes, multiple times', value: 'yes' },
                { text: 'Yes, once/twice', value: 'once' },
                { text: 'No, never', value: 'no' }
            ],
            next: 'sports-6' 
        },
        
        'sports-6': { 
            id: 'sports-6', 
            title: 'What matters most when choosing a coach/academy?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Student results/alumni', value: 'results' },
                { text: 'Online reviews/ratings', value: 'reviews' },
                { text: 'Word of mouth', value: 'word-of-mouth' },
                { text: 'Coach credentials', value: 'credentials' },
                { text: 'Free trial class', value: 'trial' },
                { text: 'Current players', value: 'current-players' },
                { text: 'Training methodology', value: 'methodology' }
            ],
            next: 'sports-7' 
        },
        
        'sports-7': { 
            id: 'sports-7', 
            title: 'What frustrates you most in sports ecosystem?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'High costs', value: 'high-cost' },
                { text: 'Unclear career paths', value: 'unclear-paths' },
                { text: 'Poor infrastructure', value: 'poor-infra' },
                { text: 'Lack of transparency', value: 'transparency' },
                { text: 'Nepotism/favoritism', value: 'nepotism' },
                { text: 'Complex selection process', value: 'selection' },
                { text: 'Limited tournaments', value: 'tournaments' },
                { text: 'Mental health support', value: 'mental-health' }
            ],
            next: 'sports-8' 
        },
        
        'sports-8': { 
            id: 'sports-8', 
            title: 'What would give you confidence to choose sports full-time?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Guaranteed minimum income', value: 'income' },
                { text: 'Professional contract offer', value: 'contract' },
                { text: 'Scholarship opportunity', value: 'scholarship' },
                { text: 'Family approval', value: 'family' },
                { text: 'Proven success path', value: 'success-path' },
                { text: 'Elite coach mentor', value: 'mentor' },
                { text: 'Performance analytics', value: 'analytics' }
            ],
            next: 'sports-9' 
        },
        
        'sports-9': { 
            id: 'sports-9', 
            title: 'If a single platform existed, what would you want most?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Verified coaches & academies', value: 'verified' },
                { text: 'Clear career roadmaps', value: 'roadmaps' },
                { text: 'Tournament / trial alerts', value: 'alerts' },
                { text: 'Performance tracking', value: 'tracking' },
                { text: 'Scholarships', value: 'scholarships' },
                { text: 'Parent guidance', value: 'parent' },
                { text: 'Mental & injury support', value: 'support' }
            ],
            next: 'sports-10' 
        },
        
        'sports-10': { 
            id: 'sports-10', 
            title: 'If it helped you, would you pay?', 
            type: 'single',
            options: [
                { text: 'Yes, definitely', value: 'yes' },
                { text: 'No, expect free', value: 'no' },
                { text: 'Depends on value', value: 'depends' }
            ],
            next: 'sports-11' 
        },
        
        'sports-11': { 
            id: 'sports-11', 
            title: 'Age Group', 
            type: 'single',
            options: [
                { text: 'Under 18', value: 'under-18' },
                { text: '18-24', value: '18-24' },
                { text: '25-34', value: '25-34' },
                { text: '35-44', value: '35-44' },
                { text: '45+', value: '45-plus' }
            ],
            next: 'sports-12' 
        },
        
        'sports-12': { 
            id: 'sports-12', 
            title: 'How do you identify?', 
            type: 'single',
            options: [
                { text: 'Male', value: 'male' },
                { text: 'Female', value: 'female' },
                { text: 'Prefer not to say', value: 'prefer-not' }
            ],
            next: 'sports-13' 
        },
        
        'sports-13': { 
            id: 'sports-13', 
            title: 'Primary Sport(s)', 
            subtitle: 'List the sports you actively play',
            type: 'text-long',
            placeholder: 'e.g., Cricket, Football, Basketball...',
            next: 'sports-14' 
        },
        
        'sports-14': { 
            id: 'sports-14', 
            title: 'Current Playing Level', 
            type: 'single',
            options: [
                { text: 'Beginner', value: 'beginner' },
                { text: 'Intermediate', value: 'intermediate' },
                { text: 'Advanced', value: 'advanced' },
                { text: 'Amateur Competitor', value: 'amateur' },
                { text: 'Semi-Pro', value: 'semi-pro' },
                { text: 'Professional', value: 'professional' }
            ],
            next: 'sports-15' 
        },
        
        'sports-15': { 
            id: 'sports-15', 
            title: 'Years of Training', 
            type: 'single',
            options: [
                { text: '< 1 year', value: '<1' },
                { text: '1-3 years', value: '1-3' },
                { text: '4-7 years', value: '4-7' },
                { text: '8-12 years', value: '8-12' },
                { text: '13+ years', value: '13+' }
            ],
            next: 'sports-16' 
        },
        
        'sports-16': { 
            id: 'sports-16', 
            title: 'Weekly Training Commitment', 
            type: 'single',
            options: [
                { text: '< 5 hours', value: '<5' },
                { text: '5-10 hours', value: '5-10' },
                { text: '11-20 hours', value: '11-20' },
                { text: '21-30 hours', value: '21-30' },
                { text: '30+ hours', value: '30+' }
            ],
            next: 'sports-17' 
        },
        
        'sports-17': { 
            id: 'sports-17', 
            title: 'Family Support', 
            type: 'single',
            options: [
                { text: 'Strongly supportive', value: 'strong' },
                { text: 'Somewhat supportive', value: 'somewhat' },
                { text: 'Neutral', value: 'neutral' },
                { text: 'Not supportive', value: 'not' }
            ],
            next: 'sports-18' 
        },
        
        'sports-18': { 
            id: 'sports-18', 
            title: 'City', 
            subtitle: 'Where are you currently based?',
            type: 'text-short',
            placeholder: 'e.g., Mumbai, Delhi, Bangalore...',
            next: 'sports-19' 
        },
        
        'sports-19': { 
            id: 'sports-19', 
            title: 'How do you view sports?', 
            type: 'single',
            options: [
                { text: 'Hobby', value: 'hobby' },
                { text: 'Serious career', value: 'career' },
                { text: 'Undecided', value: 'undecided' },
                { text: 'Passion but not career', value: 'passion' }
            ],
            next: 'thank-you' 
        },
        
        // ============ E-SPORTS ONLY PATH ============
        'esports-1': { 
            id: 'esports-1', 
            title: 'Your biggest esports struggle(s)?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Hitting high rank', value: 'plateau' },
                { text: 'No proper coaching', value: 'coaching' },
                { text: 'Time vs practice', value: 'time' },
                { text: 'Finding teammates', value: 'teammates' },
                { text: 'No tournament access', value: 'tournaments' },
                { text: 'Hardware limitations', value: 'hardware' },
                { text: 'Family disapproval', value: 'family' },
                { text: 'Burnout', value: 'burnout' }
            ],
            next: 'esports-2' 
        },
        
        'esports-2': { 
            id: 'esports-2', 
            title: 'Have you felt stuck in your improvement?', 
            type: 'single',
            options: [
                { text: 'Yes', value: 'yes' },
                { text: 'No', value: 'no' }
            ],
            next: 'esports-2a'
        },
        
        'esports-2a': { 
            id: 'esports-2a', 
            title: 'Why do you feel stuck?', 
            subtitle: 'Select all that apply',  
            type: 'multi',
            options: [
                { text: 'No structured practice', value: 'no-structure' },
                { text: 'Don\'t analyze mistakes', value: 'no-analysis' },
                { text: 'Mental block/tilt', value: 'mental' },
                { text: 'Playing solo only', value: 'solo' },
                { text: 'Low game knowledge', value: 'knowledge' },
                { text: 'Hardware/network issues', value: 'hardware' },
                { text: 'Not stuck - improving', value: 'improving' }
            ],
            next: 'esports-3' 
        },
        
        'esports-3': { 
            id: 'esports-3', 
            title: 'What\'s your biggest uncertainty about going pro?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Am I skilled enough?', value: 'skill' },
                { text: 'Can I earn consistently?', value: 'income' },
                { text: 'How to join a team?', value: 'join-team' },
                { text: 'How to get scouted?', value: 'scouted' },
                { text: 'Career after gaming?', value: 'career-after' },
                { text: 'Family acceptance?', value: 'family' },
                { text: 'Balancing education?', value: 'education' }
            ],
            next: 'esports-4' 
        },
        
        'esports-4': { 
            id: 'esports-4', 
            title: 'Are there enough real opportunities in your Game?', 
            type: 'single',
            options: [
                { text: 'Yes', value: 'yes' },
                { text: 'No', value: 'no' },
                { text: 'Somewhat', value: 'somewhat' }
            ],
            next: 'esports-4a'
        },
        
        'esports-4a': { 
            id: 'esports-4a', 
            title: 'Why do you feel this way?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Small player base', value: 'small-community' },
                { text: 'Region not supported', value: 'region' },
                { text: 'Only top players get opportunities', value: 'top-only' },
                { text: 'Few tournaments', value: 'few-tournaments' },
                { text: 'No local esports scene', value: 'local-scene' },
                { text: 'Game is dying', value: 'dying-game' },
                { text: 'Plenty of opportunities', value: 'plenty' }
            ],
            next: 'esports-5' 
        },
        
        'esports-5': { 
            id: 'esports-5', 
            title: 'How do you verify if coaching is legit?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Student results/rank', value: 'results' },
                { text: 'Free YouTube content', value: 'free-content' },
                { text: 'Community reputation', value: 'reputation' },
                { text: 'Coach\'s own rank', value: 'coach-rank' },
                { text: 'Discord testimonials', value: 'testimonials' },
                { text: 'Trial session', value: 'trial' },
                { text: 'Don\'t trust any', value: 'no-trust' }
            ],
            next: 'esports-6' 
        },
        
        'esports-6': { 
            id: 'esports-6', 
            title: 'Have you played tournaments?', 
            type: 'single',
            options: [
                { text: 'Yes', value: 'yes' },
                { text: 'No', value: 'no' }
            ],
            next: 'esports-6a'
        },
        
        'esports-6a': { 
            id: 'esports-6a', 
            title: 'What was your tournament experience?', 
            type: 'single',
            options: [
                { text: 'Won/placed well', value: 'success' },
                { text: 'Participated only', value: 'participated' },
                { text: 'Performed below expectations', value: 'poor-performance' },
                { text: 'Regular competitor', value: 'regular' },
                { text: 'Online only', value: 'online' },
                { text: 'LAN experience', value: 'lan' },
                { text: 'Never played', value: 'never' }
            ],
            next: 'esports-7' 
        },
        
        'esports-7': { 
            id: 'esports-7', 
            title: 'What do you rely on to improve?', 
            type: 'multi',
            options: [
                { text: 'YouTube', value: 'youtube' },
                { text: 'Discord', value: 'discord' },
                { text: 'Paid coaching', value: 'coaching' },
                { text: 'Friends', value: 'friends' },
                { text: 'Tournaments', value: 'tournaments' },
                { text: 'Nothing structured', value: 'nothing' }
            ],
            next: 'esports-8' 
        },
        
        'esports-8': { 
            id: 'esports-8', 
            title: 'What\'s missing in current learning resources?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Structured pathway', value: 'structure' },
                { text: 'Personalized feedback', value: 'feedback' },
                { text: 'Performance tracking', value: 'tracking' },
                { text: 'Team coordination training', value: 'teamwork' },
                { text: 'Mental coaching', value: 'mental' },
                { text: 'Game-specific content', value: 'game-specific' },
                { text: 'Community support', value: 'community' }
            ],
            next: 'esports-9' 
        },
        
        'esports-9': { 
            id: 'esports-9', 
            title: 'What would make you go full-time in esports?', 
            subtitle: 'Select all that apply',
            type: 'multi',
            options: [
                { text: 'Salary/contract offer', value: 'salary' },
                { text: 'Consistent winnings', value: 'winnings' },
                { text: 'Top rank', value: 'rank' },
                { text: 'Pro team tryout', value: 'tryout' },
                { text: 'Family approval', value: 'family' },
                { text: 'Finished education', value: 'education' },
                { text: 'Sponsorship', value: 'sponsorship' }
            ],
            next: 'esports-10' 
        },
        
        'esports-10': { 
            id: 'esports-10', 
            title: 'If one platform existed, what should it provide?', 
            type: 'multi',
            options: [
                { text: 'Verified mentors', value: 'mentors' },
                { text: 'Structured path', value: 'path' },
                { text: 'Teams & tournaments', value: 'teams' },
                { text: 'Skill tracking', value: 'tracking' },
                { text: 'Career roles', value: 'roles' },
                { text: 'Parent guidance', value: 'parent' },
                { text: 'Mental/fitness support', value: 'support' }
            ],
            next: 'esports-11' 
        },
        
        'esports-11': { 
            id: 'esports-11', 
            title: 'Would you like to pay for such platforms?', 
            type: 'single',
            options: [
                { text: 'Yes', value: 'yes' },
                { text: 'No', value: 'no' },
                { text: 'Depends', value: 'depends' }
            ],
            next: 'esports-12' 
        },
        
        'esports-12': { 
            id: 'esports-12', 
            title: 'Primary Game(s)', 
            subtitle: 'List all the games you have played and are currently playing',
            type: 'text-long',
            placeholder: 'e.g., Valorant, League of Legends, CS:GO, Dota 2...',
            next: 'esports-13' 
        },
        
        'esports-13': { 
            id: 'esports-13', 
            title: 'Current level', 
            type: 'single',
            options: [
                { text: 'Casual', value: 'casual' },
                { text: 'Intermediate', value: 'intermediate' },
                { text: 'Advanced', value: 'advanced' },
                { text: 'Elite', value: 'elite' },
                { text: 'Semi-pro', value: 'semi-pro' },
                { text: 'Professional', value: 'professional' }
            ],
            next: 'esports-14' 
        },
        
        'esports-14': { 
            id: 'esports-14', 
            title: 'What is your serious playing duration?', 
            type: 'single',
            options: [
                { text: '< 6 months', value: '<6' },
                { text: '6-12 months', value: '6-12' },
                { text: '1-2 years', value: '1-2' },
                { text: '2-4 years', value: '2-4' },
                { text: '4+ years', value: '4+' }
            ],
            next: 'esports-15' 
        },
        
        'esports-15': { 
            id: 'esports-15', 
            title: 'Weekly time spent on gaming?', 
            type: 'single',
            options: [
                { text: '< 10 hours', value: '<10' },
                { text: '10-20 hours', value: '10-20' },
                { text: '20-30 hours', value: '20-30' },
                { text: '30-40 hours', value: '30-40' },
                { text: '40+ hours', value: '40+' }
            ],
            next: 'esports-16' 
        },
        
        'esports-16': { 
            id: 'esports-16', 
            title: 'What is your family support level?', 
            type: 'single',
            options: [
                { text: 'Strong', value: 'strong' },
                { text: 'Somewhat', value: 'somewhat' },
                { text: 'Neutral', value: 'neutral' },
                { text: 'Not supportive', value: 'not' }
            ],
            next: 'esports-17' 
        },
        
        'esports-17': { 
            id: 'esports-17', 
            title: 'City', 
            subtitle: 'Where are you currently based?',
            type: 'text-short',
            placeholder: 'e.g., Mumbai, Delhi, Bangalore...',
            next: 'esports-18' 
        },
        
        'esports-18': { 
            id: 'esports-18', 
            title: 'What is your age group?', 
            type: 'single',
            options: [
                { text: 'Under 18', value: 'under-18' },
                { text: '18-24', value: '18-24' },
                { text: '25-34', value: '25-34' },
                { text: '35-44', value: '35-44' },
                { text: '45+', value: '45-plus' }
            ],
            next: 'esports-19' 
        },
        
        'esports-19': { 
            id: 'esports-19', 
            title: 'What is your gender?', 
            type: 'single',
            options: [
                { text: 'Male', value: 'male' },
                { text: 'Female', value: 'female' },
                { text: 'Non-binary', value: 'non-binary' },
                { text: 'Prefer not to say', value: 'prefer-not' }
            ],
            next: 'esports-20' 
        },
        
        'esports-20': { 
            id: 'esports-20', 
            title: 'How do you view esports?', 
            type: 'single',
            options: [
                { text: 'Hobby', value: 'hobby' },
                { text: 'Career', value: 'career' },
                { text: 'Exploring', value: 'exploring' },
                { text: 'Passion', value: 'passion' }
            ],
            next: 'esports-21' 
        },
        
        'esports-21': { 
            id: 'esports-21', 
            title: 'Is esports career or hobby for you?', 
            type: 'single',
            options: [
                { text: 'Career - I\'m actively pursuing', value: 'career-active' },
                { text: 'Career - But need more time', value: 'career-future' },
                { text: 'Hobby - Have other career', value: 'hobby-other' },
                { text: 'Hobby - Focused on studies', value: 'hobby-study' },
                { text: 'Exploring - Not decided', value: 'exploring' },
                { text: 'Side income - Part time', value: 'side-income' }
            ],
            next: 'thank-you' 
        }
    };

    // ==================== STATE MANAGEMENT ====================
    const state = {
        currentQuestionId: 'welcome',
        answers: {},
        questionHistory: ['welcome'],
        currentPath: '',
        totalQuestions: 1,
        currentQuestionNumber: 0,
        surveySessionId: generateSessionId(),
        userStartedAt: new Date(),
        lastAnswerTime: null
    };

    // ==================== DOM ELEMENTS ====================
    const elements = {
        welcomeScreen: document.getElementById('welcome-screen'),
        questionContainer: document.getElementById('question-container'),
        thankYouScreen: document.getElementById('thank-you-screen'),
        startSurveyBtn: document.querySelector('.start-survey-btn'),
        nextBtn: document.getElementById('next-btn'),
        backBtn: document.getElementById('back-btn'),
        restartBtn: document.getElementById('restart-btn'),
        progressFill: document.querySelector('.progress-fill'),
        progressPercent: document.querySelector('.progress-percent'),
        progressMessage: document.querySelector('.progress-message'),
        questionTitle: document.querySelector('.question-title'),
        questionSubtitle: document.querySelector('.question-subtitle'),
        optionsContainer: document.querySelector('.options-container'),
        inputContainer: document.querySelector('.input-container'),
        completionPercent: document.querySelector('.completion-percent'),
        progressRingCircle: document.querySelector('.progress-ring-circle'),
        pathIndicator: document.getElementById('path-indicator'),
        pathName: document.getElementById('path-name'),
        questionCounter: document.getElementById('question-counter'),
        currentQuestion: document.getElementById('current-question'),
        totalQuestions: document.getElementById('total-questions'),
        submissionStatus: document.getElementById('submission-status'),
        offlineIndicator: document.getElementById('offline-indicator')
    };

    // ==================== UTILITY FUNCTIONS ====================
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ==================== FIREBASE FUNCTIONS ====================
    async function saveSurveyToFirebase() {
        if (!firebaseService) return null;
        
        try {
            showSubmissionStatus('Saving your responses...', 'loading');
            
            const surveyData = {
                sessionId: state.surveySessionId,
                path: state.currentPath,
                startedAt: state.userStartedAt,
                completedAt: new Date(),
                duration: Date.now() - state.userStartedAt.getTime(),
                totalQuestions: getTotalQuestionsForPath(),
                completedQuestions: Object.keys(state.answers).length,
                answers: formatAnswersForStorage(state.answers),
                metadata: {
                    userAgent: navigator.userAgent,
                    screenSize: `${window.innerWidth}x${window.innerHeight}`,
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    online: navigator.onLine,
                    timestamp: new Date().toISOString()
                }
            };
            
            const result = await firebaseService.saveSurvey(surveyData);
            
            if (result.success) {
                await firebaseService.updateAnalytics(state.currentPath);
                showSubmissionStatus('Your journey has been saved! Thank you!', 'success');
                return result.id;
            } else {
                showSubmissionStatus('Saved locally - will sync when online', 'info');
                saveToLocalStorage(surveyData);
                return 'local_' + state.surveySessionId;
            }
        } catch (error) {
            console.error('Save error:', error);
            showSubmissionStatus('Saved locally for later sync', 'info');
            saveToLocalStorage(surveyData);
            return 'local_' + state.surveySessionId;
        }
    }

    function getTotalQuestionsForPath() {
        if (state.currentPath === 'Sports') return 19;
        else if (state.currentPath === 'E-Sports') return 21;
        else if (state.currentPath === 'Combined') return 23;
        else if (state.currentPath === 'Non-Player') return 2;
        return 1;
    }

    function formatAnswersForStorage(answers) {
        return Object.entries(answers).map(([questionId, answer], index) => ({
            questionId,
            questionText: surveyData[questionId]?.title || questionId,
            answerType: answer.type,
            answerValue: answer.value || answer.values || '',
            answerText: answer.text || answer.texts || '',
            questionOrder: index + 1,
            timestamp: new Date().toISOString()
        }));
    }

    function saveToLocalStorage(surveyData) {
        try {
            const pending = JSON.parse(localStorage.getItem('pending_surveys') || '[]');
            pending.push({
                ...surveyData,
                localId: 'local_' + state.surveySessionId,
                savedAt: new Date().toISOString()
            });
            localStorage.setItem('pending_surveys', JSON.stringify(pending.slice(-10)));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    function showSubmissionStatus(message, type) {
        if (!elements.submissionStatus) return;
        
        elements.submissionStatus.textContent = message;
        elements.submissionStatus.className = `submission-status ${type}`;
        elements.submissionStatus.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                if (elements.submissionStatus) {
                    elements.submissionStatus.style.display = 'none';
                }
            }, 4000);
        }
    }

    // ==================== SURVEY LOGIC ====================
    function init() {
        // Add event listeners
        if (elements.startSurveyBtn) {
            elements.startSurveyBtn.addEventListener('click', startSurvey);
        }
        if (elements.nextBtn) {
            elements.nextBtn.addEventListener('click', goToNextQuestion);
        }
        if (elements.backBtn) {
            elements.backBtn.addEventListener('click', goToPreviousQuestion);
        }
        if (elements.restartBtn) {
            elements.restartBtn.addEventListener('click', restartSurvey);
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);
        
        // Online/offline detection
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Initialize
        addStatusStyles();
        updateProgress();
        createConfetti();
        updateOnlineStatus();
        
        console.log('Survey initialized with session:', state.surveySessionId);
    }

    function updateOnlineStatus() {
        if (elements.offlineIndicator) {
            if (navigator.onLine) {
                elements.offlineIndicator.style.display = 'none';
            } else {
                elements.offlineIndicator.style.display = 'flex';
            }
        }
    }

    function addStatusStyles() {
        if (!document.querySelector('#status-styles')) {
            const style = document.createElement('style');
            style.id = 'status-styles';
            style.textContent = `
                .submission-status {
                    padding: 15px 25px;
                    border-radius: 12px;
                    margin: 20px 0;
                    font-weight: 600;
                    text-align: center;
                    display: none;
                    animation: fadeIn 0.3s ease-out;
                    backdrop-filter: blur(10px);
                }
                .submission-status.loading {
                    background: rgba(59, 130, 246, 0.15);
                    color: #3b82f6;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                }
                .submission-status.success {
                    background: rgba(34, 197, 94, 0.15);
                    color: #16a34a;
                    border: 1px solid rgba(34, 197, 94, 0.3);
                }
                .submission-status.info {
                    background: rgba(251, 191, 36, 0.15);
                    color: #d97706;
                    border: 1px solid rgba(251, 191, 36, 0.3);
                }
                .submission-status.error {
                    background: rgba(239, 68, 68, 0.15);
                    color: #dc2626;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }
                .offline-indicator {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 20px;
                    background: rgba(255, 193, 7, 0.1);
                    color: #ffc107;
                    border-radius: 50px;
                    margin-top: 20px;
                    border: 1px solid rgba(255, 193, 7, 0.3);
                    backdrop-filter: blur(10px);
                    font-size: 14px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    function startSurvey() {
        if (elements.startSurveyBtn) {
            elements.startSurveyBtn.classList.add('loading');
            setTimeout(() => {
                elements.startSurveyBtn.classList.remove('loading');
                switchScreen('initial');
                loadQuestion('initial');
                updateProgress();
            }, 300);
        }
    }

    function loadQuestion(questionId) {
        const question = surveyData[questionId];
        if (!question) return;
        
        state.currentQuestionId = questionId;
        state.currentQuestionNumber = state.questionHistory.length;
        
        // Update path indicator
        updatePathIndicator();
        
        // Update question counter
        updateQuestionCounter();
        
        // Clear containers
        if (elements.optionsContainer) {
            elements.optionsContainer.innerHTML = '';
            elements.optionsContainer.style.display = 'grid';
        }
        if (elements.inputContainer) {
            elements.inputContainer.innerHTML = '';
            elements.inputContainer.style.display = 'none';
        }
        if (elements.nextBtn) elements.nextBtn.disabled = true;
        
        // Show/hide back button
        if (elements.backBtn) {
            elements.backBtn.style.display = state.questionHistory.length > 1 ? 'flex' : 'none';
        }
        
        // Load question based on type
        if (question.type === 'single' || question.type === 'multi') {
            // MCQ Questions
            elements.optionsContainer.style.display = 'grid';
            elements.inputContainer.style.display = 'none';
            
            if (question.type === 'single') {
                loadSingleChoice(question);
            } else if (question.type === 'multi') {
                loadMultiChoice(question);
            }
        } else if (question.type === 'text' || question.type === 'text-short' || question.type === 'text-long') {
            // Text Input Questions
            elements.optionsContainer.style.display = 'none';
            elements.inputContainer.style.display = 'block';
            loadTextInput(question);
        } else if (question.type === 'conditional') {
            handleConditionalRouting();
            return; // Don't proceed with UI updates yet
        }
        
        // Restore answer if exists
        if (state.answers[questionId]) {
            restoreAnswer(question, questionId);
        }
        
        // Update UI
        if (elements.questionTitle) {
            elements.questionTitle.textContent = question.title;
        }
        if (elements.questionSubtitle) {
            elements.questionSubtitle.textContent = question.subtitle || '';
        }
        
        // Animate transition
        if (elements.questionContainer) {
            elements.questionContainer.style.opacity = '0';
            requestAnimationFrame(() => {
                elements.questionContainer.style.opacity = '1';
                elements.questionContainer.scrollTop = 0;
            });
        }
        
        state.lastAnswerTime = new Date();
    }

    function updatePathIndicator() {
        if (!elements.pathIndicator || !elements.pathName) return;
        
        if (state.currentPath) {
            elements.pathIndicator.style.display = 'flex';
            
            let pathIcon = '';
            let pathDisplay = '';
            
            switch(state.currentPath) {
                case 'Sports':
                    pathIcon = '⚽';
                    pathDisplay = 'Sports Athlete';
                    break;
                case 'E-Sports':
                    pathIcon = '🎮';
                    pathDisplay = 'Esports Gamer';
                    break;
                case 'Combined':
                    pathIcon = '⚽🎮';
                    pathDisplay = 'Athlete & Gamer';
                    break;
                case 'Non-Player':
                    pathIcon = '👤';
                    pathDisplay = 'Non-Player';
                    break;
                default:
                    pathIcon = '🔍';
                    pathDisplay = 'Exploring';
            }
            
            elements.pathName.innerHTML = `${pathIcon} ${pathDisplay}`;
        } else {
            elements.pathIndicator.style.display = 'none';
        }
    }

    function updateQuestionCounter() {
        if (!elements.questionCounter || !elements.currentQuestion || !elements.totalQuestions) return;
        
        const total = getTotalQuestionsForPath();
        const current = Math.min(state.questionHistory.length - 1, total);
        
        elements.currentQuestion.textContent = current;
        elements.totalQuestions.textContent = total;
        elements.questionCounter.style.display = 'flex';
    }

    function loadSingleChoice(question) {
        if (!elements.optionsContainer) return;
        
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.innerHTML = `
                <span class="option-text">${option.text}</span>
                <span class="check-icon"><i class="fas fa-check"></i></span>
            `;
            button.dataset.value = option.value;
            button.dataset.index = index;
            
            button.addEventListener('click', () => selectOption(button, option));
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectOption(button, option);
                }
            });
            
            elements.optionsContainer.appendChild(button);
        });
    }

    function selectOption(button, option) {
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected');
            btn.setAttribute('aria-checked', 'false');
        });
        
        button.classList.add('selected');
        button.setAttribute('aria-checked', 'true');
        if (elements.nextBtn) elements.nextBtn.disabled = false;
        
        state.answers[state.currentQuestionId] = {
            type: 'single',
            value: option.value,
            text: option.text
        };
        
        button.style.transform = 'scale(0.98)';
        setTimeout(() => button.style.transform = '', 150);
    }

    function loadMultiChoice(question) {
        if (!elements.optionsContainer) return;
        
        question.options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'option-btn multi-select';
            button.innerHTML = `
                <span class="checkbox"></span>
                <span class="option-text">${option.text}</span>
            `;
            button.dataset.value = option.value;
            
            button.addEventListener('click', () => {
                button.classList.toggle('selected');
                updateMultiSelect();
            });
            
            elements.optionsContainer.appendChild(button);
        });
        
        if (elements.nextBtn) elements.nextBtn.disabled = true;
    }

    function updateMultiSelect() {
        const selected = document.querySelectorAll('.option-btn.multi-select.selected');
        const values = Array.from(selected).map(btn => btn.dataset.value);
        const texts = Array.from(selected).map(btn => btn.querySelector('.option-text').textContent);
        
        // Special handling for initial question - "None" should deselect others
        if (state.currentQuestionId === 'initial') {
            const noneSelected = Array.from(selected).some(btn => btn.dataset.value === 'none');
            if (noneSelected) {
                // Remove all other selections
                document.querySelectorAll('.option-btn.multi-select').forEach(btn => {
                    if (btn.dataset.value !== 'none') {
                        btn.classList.remove('selected');
                    }
                });
                // Update values again
                const updatedSelected = document.querySelectorAll('.option-btn.multi-select.selected');
                const updatedValues = Array.from(updatedSelected).map(btn => btn.dataset.value);
                const updatedTexts = Array.from(updatedSelected).map(btn => btn.querySelector('.option-text').textContent);
                
                state.answers[state.currentQuestionId] = {
                    type: 'multi',
                    values: updatedValues,
                    texts: updatedTexts
                };
            } else {
                state.answers[state.currentQuestionId] = {
                    type: 'multi',
                    values,
                    texts
                };
            }
        } else {
            state.answers[state.currentQuestionId] = {
                type: 'multi',
                values,
                texts
            };
        }
        
        if (elements.nextBtn) {
            elements.nextBtn.disabled = values.length === 0;
        }
    }

    // ==================== TEXT INPUT HANDLING ====================
    function loadTextInput(question) {
        if (!elements.inputContainer) return;
        
        const isShort = question.type === 'text-short';
        const textarea = document.createElement('textarea');
        textarea.className = `text-input ${isShort ? 'short' : ''}`;
        textarea.placeholder = question.placeholder || 'Type your answer here...';
        textarea.rows = isShort ? 2 : 4;
        
        // Add character counter for long text
        if (!isShort) {
            const counter = document.createElement('div');
            counter.className = 'character-counter';
            counter.textContent = '0 characters';
            elements.inputContainer.appendChild(counter);
        }
        
        // Debounced validation
        const validateInput = debounce(() => {
            // Sanitize input
            let value = textarea.value;
            
            // Basic sanitization - remove excessive special chars but keep meaningful ones
            if (question.type === 'text-short') {
                value = value.replace(/[^\w\s.,!?@#&()-]/g, '');
            }
            
            if (textarea.value !== value) textarea.value = value;
            
            const isValid = value.trim().length > 0;
            
            if (elements.nextBtn) {
                elements.nextBtn.disabled = !isValid;
            }
            
            if (isValid) {
                state.answers[state.currentQuestionId] = {
                    type: 'text',
                    value: value.trim(),
                    questionType: question.type
                };
            }
            
            // Update character counter
            const counter = elements.inputContainer.querySelector('.character-counter');
            if (counter) {
                const length = value.trim().length;
                counter.textContent = `${length} character${length !== 1 ? 's' : ''}`;
            }
        }, 300);
        
        textarea.addEventListener('input', validateInput);
        
        // Focus after a short delay
        setTimeout(() => textarea.focus(), 150);
        
        elements.inputContainer.appendChild(textarea);
    }

    function restoreAnswer(question, questionId) {
        const answer = state.answers[questionId];
        if (!answer) return;
        
        if (question.type === 'single') {
            const button = document.querySelector(`.option-btn[data-value="${answer.value}"]`);
            if (button) {
                button.classList.add('selected');
                button.setAttribute('aria-checked', 'true');
                if (elements.nextBtn) elements.nextBtn.disabled = false;
            }
        } else if (question.type === 'multi') {
            if (answer.values && Array.isArray(answer.values)) {
                answer.values.forEach(value => {
                    const button = document.querySelector(`.option-btn[data-value="${value}"]`);
                    if (button) button.classList.add('selected');
                });
            }
            if (elements.nextBtn) {
                elements.nextBtn.disabled = !answer.values || answer.values.length === 0;
            }
        } else if (question.type.includes('text')) {
            const textarea = elements.inputContainer?.querySelector('.text-input');
            if (textarea && answer.value) {
                textarea.value = answer.value;
                if (elements.nextBtn) elements.nextBtn.disabled = false;
                
                // Update character counter
                const counter = elements.inputContainer?.querySelector('.character-counter');
                if (counter) {
                    const length = answer.value.length;
                    counter.textContent = `${length} character${length !== 1 ? 's' : ''}`;
                }
            }
        }
    }

    function handleConditionalRouting() {
        const initialAnswer = state.answers.initial;
        if (!initialAnswer) return;
        
        const selectedValues = initialAnswer.type === 'multi' ? initialAnswer.values : [initialAnswer.value];
        let path = '';
        
        if (selectedValues.includes('none') || (selectedValues.length === 1 && selectedValues[0] === 'none')) {
            path = 'none';
        } else if (selectedValues.includes('sports') && selectedValues.includes('esports')) {
            path = 'combined';
        } else if (selectedValues.includes('sports')) {
            path = 'sports-only';
        } else if (selectedValues.includes('esports')) {
            path = 'esports-only';
        }
        
        // Update path for analytics
        if (path === 'combined') state.currentPath = 'Combined';
        else if (path === 'sports-only') state.currentPath = 'Sports';
        else if (path === 'esports-only') state.currentPath = 'E-Sports';
        else if (path === 'none') state.currentPath = 'Non-Player';
        
        // Auto-advance to next question
        setTimeout(() => {
            const nextId = surveyData['path-selector'].next[path];
            if (nextId) {
                state.questionHistory.push('path-selector');
                updateProgress();
                loadQuestion(nextId);
            }
        }, 500);
    }

    async function goToNextQuestion() {
        const question = surveyData[state.currentQuestionId];
        if (!question) return;
        
        let nextId;
        if (typeof question.next === 'object') {
            const answer = state.answers[state.currentQuestionId];
            if (answer) {
                if (answer.type === 'multi' && state.currentQuestionId === 'initial') {
                    nextId = 'path-selector';
                } else {
                    nextId = question.next[answer.value] || Object.values(question.next)[0];
                }
            } else {
                nextId = Object.values(question.next)[0];
            }
        } else {
            nextId = question.next;
        }
        
        state.questionHistory.push(state.currentQuestionId);
        updateProgress();
        
        if (nextId === 'thank-you') {
            await showThankYouScreen();
        } else if (surveyData[nextId]) {
            if (elements.questionContainer) {
                elements.questionContainer.style.opacity = '0';
                setTimeout(() => loadQuestion(nextId), 200);
            }
        }
    }

    function goToPreviousQuestion() {
        if (state.questionHistory.length <= 1) return;
        
        state.questionHistory.pop();
        
        const prevId = state.questionHistory[state.questionHistory.length - 1];
        
        if (prevId === 'welcome') {
            switchScreen('welcome');
        } else {
            if (elements.questionContainer) {
                elements.questionContainer.style.opacity = '0';
                setTimeout(() => loadQuestion(prevId), 200);
            }
        }
        
        updateProgress();
    }

    async function showThankYouScreen() {
        // Update completion UI
        if (elements.completionPercent) {
            elements.completionPercent.textContent = '100%';
        }
        if (elements.progressRingCircle) {
            const circumference = 2 * Math.PI * 52;
            elements.progressRingCircle.style.strokeDashoffset = '0';
        }
        
        // Set personalized thank you message
        const messages = {
            'Sports': "Thank you for sharing your sports journey! Your experiences will help us build better opportunities for athletes.",
            'E-Sports': "Thank you for sharing your esports experience! Your insights will shape the future of competitive gaming.",
            'Combined': "Thank you for sharing your unique journey in both sports and esports! Your perspective is truly valuable.",
            'Non-Player': "Thank you for sharing your perspective! Your feedback helps us understand how to make sports and esports more accessible."
        };
        
        const message = messages[state.currentPath] || "Thank you for your valuable feedback!";
        const completionMessageEl = document.querySelector('.completion-message');
        if (completionMessageEl) {
            completionMessageEl.textContent = message;
        }
        
        // Save to Firebase
        await saveSurveyToFirebase();
        
        // Celebrate
        triggerConfetti();
        switchScreen('thank-you');
        
        // Update progress bar
        if (elements.progressFill) {
            elements.progressFill.style.width = '100%';
        }
        if (elements.progressPercent) {
            elements.progressPercent.textContent = '100%';
        }
        if (elements.progressMessage) {
            elements.progressMessage.textContent = 'Complete!';
        }
        
        console.log('Survey completed:', state.answers);
    }

    function updateProgress() {
        const total = getTotalQuestionsForPath();
        let completed = state.questionHistory.length - 1;
        
        // Cap at total
        completed = Math.min(completed, total);
        
        const percentage = Math.min(Math.round((completed / total) * 100), 100);
        
        if (elements.progressFill) {
            elements.progressFill.style.width = `${percentage}%`;
        }
        if (elements.progressPercent) {
            elements.progressPercent.textContent = `${percentage}%`;
        }
        
        const messages = [
            "Starting your journey...", 
            "Making progress!", 
            "Great insights!", 
            "Halfway there!", 
            "Almost done!", 
            "Final stretch!", 
            "Complete!"
        ];
        
        const msgIndex = Math.min(Math.floor(percentage / 16.67), messages.length - 1);
        if (elements.progressMessage) {
            elements.progressMessage.textContent = messages[msgIndex] || "Almost there!";
        }
        
        // Subtle animation
        if (elements.progressFill) {
            elements.progressFill.style.transform = 'scaleY(1.2)';
            setTimeout(() => {
                if (elements.progressFill) {
                    elements.progressFill.style.transform = '';
                }
            }, 300);
        }
    }

    function switchScreen(screenName) {
        if (elements.welcomeScreen) elements.welcomeScreen.classList.remove('active');
        if (elements.questionContainer) elements.questionContainer.classList.remove('active');
        if (elements.thankYouScreen) elements.thankYouScreen.classList.remove('active');
        
        if (screenName === 'welcome' && elements.welcomeScreen) {
            elements.welcomeScreen.classList.add('active');
        } else if (screenName === 'thank-you' && elements.thankYouScreen) {
            elements.thankYouScreen.classList.add('active');
        } else if (elements.questionContainer) {
            elements.questionContainer.classList.add('active');
        }
    }

    function restartSurvey() {
        // Reset state
        state.currentQuestionId = 'welcome';
        state.answers = {};
        state.questionHistory = ['welcome'];
        state.currentPath = '';
        state.currentQuestionNumber = 0;
        state.surveySessionId = generateSessionId();
        state.userStartedAt = new Date();
        
        // Reset UI
        switchScreen('welcome');
        updateProgress();
        
        // Hide path indicator
        if (elements.pathIndicator) {
            elements.pathIndicator.style.display = 'none';
        }
        
        // Hide question counter
        if (elements.questionCounter) {
            elements.questionCounter.style.display = 'none';
        }
        
        console.log('Survey restarted with new session:', state.surveySessionId);
    }

    function handleKeyboardNavigation(e) {
        if (!elements.questionContainer || !elements.questionContainer.classList.contains('active')) return;
        
        // Prevent default behavior for these keys
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
        }
        
        if (e.key === 'Enter' && elements.nextBtn && !elements.nextBtn.disabled) {
            goToNextQuestion();
        } else if (e.key === 'Escape') {
            goToPreviousQuestion();
        }
    }

    function createConfetti() {
        const container = document.querySelector('.celebration-animation');
        if (!container) return;
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = ['#8a2be2', '#00d4ff', '#ff0080', '#00ff88'][i % 4];
            confetti.style.animationDelay = `${Math.random() * 2}s`;
            confetti.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
            container.appendChild(confetti);
        }
    }

    function triggerConfetti() {
        document.querySelectorAll('.confetti').forEach(c => {
            c.style.animation = 'none';
            void c.offsetWidth;
            c.style.animation = `confetti-fall ${c.style.animationDuration} ease-out ${c.style.animationDelay}s forwards`;
        });
    }

    // Initialize the survey
    init();
});