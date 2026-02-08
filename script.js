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
                    // Create analytics doc if it doesn't exist
                    await setDoc(doc(db, 'survey_analytics', 'completions'), {
                        total_completions: 1,
                        sports_completions: path === 'Sports' ? 1 : 0,
                        esports_completions: path === 'E-Sports' ? 1 : 0,
                        nonplayer_completions: path === 'Non-Player' ? 1 : 0,
                        last_completed: serverTimestamp(),
                        createdAt: serverTimestamp()
                    });
                    return { success: true };
                }
            }
        };
        
        firebaseAvailable = true;
        console.log('✅ Firebase initialized successfully');
        
    } catch (error) {
        console.warn('⚠️ Firebase not available, using local storage:', error);
        firebaseService = {
            async saveSurvey(surveyData) {
                // Fallback to localStorage
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
            title: 'Have you ever played Sports  or  E-Sports?',
            subtitle: 'This will help us personalize your experience',
            type: 'single',
            options: [
                { text: 'Yes', value: 'yes' },
                { text: 'No', value: 'no' }
            ],
            next: {
                'yes': 'player-type',
                'no': 'no-reason'
            }
        },
        
        'no-reason': {
            id: 'no-reason',
            title: 'What kept you from exploring sports or esports?',
            subtitle: 'Your honest thoughts help us understand barriers',
            type: 'text-long',
            next: 'thank-you'
        },
        
        'player-type': {
            id: 'player-type',
            title: 'What have you played?',
            subtitle: 'Choose the category that best describes your experience',
            type: 'single',
            options: [
                { text: '🏀 Sports', value: 'sports' },
                { text: '🎮 E-Sports', value: 'esports' }
            ],
            next: {
                'sports': 'sports-1',
                'esports': 'esports-1'
            }
        },
        
        // Sports Survey (19 questions)
        'sports-1': { id: 'sports-1', title: 'What is the single biggest struggle you are facing right now in your sports journey?', type: 'text-long', next: 'sports-2' },
        'sports-2': { id: 'sports-2', title: 'If you decided today to become a professional athlete, what steps would you take next? Where are you confused?', type: 'text-long', next: 'sports-3' },
        'sports-3': { id: 'sports-3', title: 'Have you ever seriously thought of quitting sports? What pushed you?', type: 'text-long', next: 'sports-4' },
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
        'sports-4a': { id: 'sports-4a', title: 'Why?', type: 'text-short', next: 'sports-5' },
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
        'sports-6': { id: 'sports-6', title: 'How do you judge whether a coach or academy is good?', type: 'text-long', next: 'sports-7' },
        'sports-7': { id: 'sports-7', title: 'What is missing or frustrating in the current sports ecosystem?', type: 'text-long', next: 'sports-8' },
        'sports-8': { id: 'sports-8', title: 'What ONE thing would make you confident choosing sports full time?', type: 'text-long', next: 'sports-9' },
        'sports-9': { 
            id: 'sports-9', 
            title: 'If a single platform existed, what would you want most?', 
            type: 'single',
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
                { text: 'Non-binary', value: 'non-binary' },
                { text: 'Prefer not to say', value: 'prefer-not' }
            ],
            next: 'sports-13'
        },
        'sports-13': { id: 'sports-13', title: 'Primary Sport', type: 'text-short', next: 'sports-14' },
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
        'sports-18': { id: 'sports-18', title: 'City', type: 'text-short', next: 'sports-19' },
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
        
        // E-Sports Survey (21 questions) - Simplified similar structure
        'esports-1': { id: 'esports-1', title: 'Biggest problem in your esports journey?', type: 'text-long', next: 'esports-2' },
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
        'esports-2a': { id: 'esports-2a', title: 'Reason?', type: 'text-short', next: 'esports-3' },
        'esports-3': { id: 'esports-3', title: 'If you were to pursue esports professionally, what would you do first? What questions or uncertainties would you have?', type: 'text-long', next: 'esports-4' },
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
        'esports-4a': { id: 'esports-4a', title: 'Why?', type: 'text-short', next: 'esports-5' },
        'esports-5': { id: 'esports-5', title: 'How do you judge coach/team/course trust?', type: 'text-long', next: 'esports-6' },
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
        'esports-6a': { id: 'esports-6a', title: 'Experience details', type: 'text-long', next: 'esports-7' },
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
        'esports-8': { id: 'esports-8', title: 'What is missing there?', type: 'text-long', next: 'esports-9' },
        'esports-9': { id: 'esports-9', title: 'ONE thing needed to confidently go full-time?', type: 'text-long', next: 'esports-10' },
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
        'esports-12': { id: 'esports-12', title: 'Primary game', type: 'text-short', next: 'esports-13' },
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
        'esports-17': { id: 'esports-17', title: 'City', type: 'text-short', next: 'esports-18' },
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
        'esports-21': { id: 'esports-21', title: 'Career or hobby? Why?', type: 'text-long', next: 'thank-you' }
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
        progressRingCircle: document.querySelector('.progress-ring-circle')
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
            showSubmissionStatus('Saving responses...', 'loading');
            
            const surveyData = {
                sessionId: state.surveySessionId,
                path: state.currentPath,
                startedAt: state.userStartedAt,
                completedAt: new Date(),
                duration: Date.now() - state.userStartedAt.getTime(),
                totalQuestions: state.totalQuestions,
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
                showSubmissionStatus('Responses saved successfully!', 'success');
                return result.id;
            } else {
                showSubmissionStatus('Saved locally (will sync later)', 'info');
                saveToLocalStorage(surveyData);
                return 'local_' + state.surveySessionId;
            }
        } catch (error) {
            console.error('Save error:', error);
            showSubmissionStatus('Saved locally for later sync', 'info');
            return 'local_' + state.surveySessionId;
        }
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
        const pending = JSON.parse(localStorage.getItem('pending_surveys') || '[]');
        pending.push({
            ...surveyData,
            localId: 'local_' + state.surveySessionId,
            savedAt: new Date().toISOString()
        });
        localStorage.setItem('pending_surveys', JSON.stringify(pending.slice(-10))); // Keep last 10
    }

    function showSubmissionStatus(message, type) {
        let statusEl = document.querySelector('.submission-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.className = 'submission-status';
            elements.thankYouScreen.querySelector('.thank-you-content').appendChild(statusEl);
        }
        
        statusEl.textContent = message;
        statusEl.className = `submission-status ${type}`;
        statusEl.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => statusEl.style.display = 'none', 3000);
        }
    }

    // ==================== SURVEY LOGIC ====================
    function init() {
        elements.startSurveyBtn.addEventListener('click', startSurvey);
        elements.nextBtn.addEventListener('click', goToNextQuestion);
        elements.backBtn.addEventListener('click', goToPreviousQuestion);
        elements.restartBtn.addEventListener('click', restartSurvey);
        
        document.addEventListener('keydown', handleKeyboardNavigation);
        
        // Add submission status styles
        addStatusStyles();
        
        updateProgress();
        createConfetti();
        
        console.log('Survey initialized with session:', state.surveySessionId);
    }

    function addStatusStyles() {
        if (!document.querySelector('#status-styles')) {
            const style = document.createElement('style');
            style.id = 'status-styles';
            style.textContent = `
                .submission-status {
                    padding: 12px 20px;
                    border-radius: 12px;
                    margin: 20px 0;
                    font-weight: 600;
                    text-align: center;
                    display: none;
                    animation: fadeIn 0.3s ease-out;
                }
                .submission-status.loading {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }
                .submission-status.success {
                    background: rgba(34, 197, 94, 0.1);
                    color: #16a34a;
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                .submission-status.info {
                    background: rgba(251, 191, 36, 0.1);
                    color: #d97706;
                    border: 1px solid rgba(251, 191, 36, 0.2);
                }
                .submission-status.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
            `;
            document.head.appendChild(style);
        }
    }

    function startSurvey() {
        elements.startSurveyBtn.classList.add('loading');
        setTimeout(() => {
            elements.startSurveyBtn.classList.remove('loading');
            switchScreen('initial');
            loadQuestion('initial');
            updateProgress();
        }, 300);
    }

    function loadQuestion(questionId) {
        const question = surveyData[questionId];
        if (!question) return;
        
        state.currentQuestionId = questionId;
        state.currentQuestionNumber++;
        
        // Update path
        if (questionId.startsWith('sports')) state.currentPath = 'Sports';
        else if (questionId.startsWith('esports')) state.currentPath = 'E-Sports';
        else if (questionId === 'no-reason') state.currentPath = 'Non-Player';
        
        // Update UI
        elements.questionTitle.textContent = question.title;
        elements.questionSubtitle.textContent = question.subtitle || '';
        
        // Clear containers
        elements.optionsContainer.innerHTML = '';
        elements.inputContainer.innerHTML = '';
        elements.nextBtn.disabled = true;
        
        // Show/hide back button
        elements.backBtn.style.display = state.questionHistory.length > 1 ? 'flex' : 'none';
        
        // Load question type
        if (question.type === 'single') loadSingleChoice(question);
        else if (question.type === 'text-long' || question.type === 'text-short') loadTextInput(question);
        else if (question.type === 'multi') loadMultiChoice(question);
        
        // Restore answer if exists
        if (state.answers[questionId]) restoreAnswer(question, questionId);
        
        // Animate
        elements.questionContainer.style.opacity = '0';
        requestAnimationFrame(() => {
            elements.questionContainer.style.opacity = '1';
            elements.questionContainer.scrollTop = 0;
        });
        
        state.lastAnswerTime = new Date();
    }

    function loadSingleChoice(question) {
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
        elements.nextBtn.disabled = false;
        
        state.answers[state.currentQuestionId] = {
            type: 'single',
            value: option.value,
            text: option.text
        };
        
        button.style.transform = 'scale(0.98)';
        setTimeout(() => button.style.transform = '', 150);
    }

    function loadMultiChoice(question) {
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
        
        elements.nextBtn.disabled = true;
    }

    function updateMultiSelect() {
        const selected = document.querySelectorAll('.option-btn.multi-select.selected');
        const values = Array.from(selected).map(btn => btn.dataset.value);
        const texts = Array.from(selected).map(btn => btn.querySelector('.option-text').textContent);
        
        state.answers[state.currentQuestionId] = {
            type: 'multi',
            values,
            texts
        };
        
        elements.nextBtn.disabled = values.length === 0;
    }

    function loadTextInput(question) {
        const isShort = question.type === 'text-short';
        const textarea = document.createElement('textarea');
        textarea.className = `text-input ${isShort ? 'short' : ''}`;
        textarea.placeholder = 'Type your answer here...';
        textarea.rows = isShort ? 3 : 6;
        
        const validateInput = debounce(() => {
            const value = textarea.value.replace(/[^\w\s.,!?@#%&*()\-:\n\r]/g, '');
            if (textarea.value !== value) textarea.value = value;
            
            const isValid = textarea.value.trim().length > 0;
            elements.nextBtn.disabled = !isValid;
            
            if (isValid) {
                state.answers[state.currentQuestionId] = {
                    type: 'text',
                    value: textarea.value.trim()
                };
            }
        }, 300);
        
        textarea.addEventListener('input', validateInput);
        setTimeout(() => textarea.focus(), 100);
        
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
                elements.nextBtn.disabled = false;
            }
        } else if (question.type === 'multi') {
            answer.values.forEach(value => {
                const button = document.querySelector(`.option-btn[data-value="${value}"]`);
                if (button) button.classList.add('selected');
            });
            elements.nextBtn.disabled = answer.values.length === 0;
        } else if (question.type.includes('text')) {
            const textarea = document.querySelector('.text-input');
            if (textarea && answer.value) {
                textarea.value = answer.value;
                elements.nextBtn.disabled = false;
            }
        }
    }

    async function goToNextQuestion() {
        const question = surveyData[state.currentQuestionId];
        if (!question) return;
        
        let nextId;
        if (typeof question.next === 'object') {
            const answer = state.answers[state.currentQuestionId];
            nextId = answer ? question.next[answer.value] : Object.values(question.next)[0];
        } else {
            nextId = question.next;
        }
        
        state.questionHistory.push(state.currentQuestionId);
        updateProgress();
        
        if (nextId === 'thank-you') {
            await showThankYouScreen();
        } else if (surveyData[nextId]) {
            elements.questionContainer.style.opacity = '0';
            setTimeout(() => loadQuestion(nextId), 200);
        }
    }

    function goToPreviousQuestion() {
        if (state.questionHistory.length <= 1) return;
        
        state.questionHistory.pop();
        state.currentQuestionNumber--;
        
        const prevId = state.questionHistory[state.questionHistory.length - 1];
        
        if (prevId === 'welcome') {
            switchScreen('welcome');
        } else {
            elements.questionContainer.style.opacity = '0';
            setTimeout(() => loadQuestion(prevId), 200);
        }
        
        updateProgress();
    }

    async function showThankYouScreen() {
        // Update completion UI
        elements.completionPercent.textContent = '100%';
        const circumference = 2 * Math.PI * 52;
        elements.progressRingCircle.style.strokeDashoffset = 0;
        
        // Set thank you message
        const messages = {
            'Sports': "Thank you for sharing your sports journey!",
            'E-Sports': "Thank you for sharing your esports experience!",
            'Non-Player': "Thank you for sharing your perspective!"
        };
        
        const message = messages[state.currentPath] || "Thank you for your feedback!";
        document.querySelector('.completion-message').textContent = message;
        
        // Save to Firebase (without showing reference ID)
        await saveSurveyToFirebase();
        
        // Celebrate
        triggerConfetti();
        switchScreen('thank-you');
        
        // Update progress bar
        elements.progressFill.style.width = '100%';
        elements.progressPercent.textContent = '100%';
        elements.progressMessage.textContent = 'Complete!';
        
        console.log('Survey completed:', state.answers);
    }

    function updateProgress() {
        let totalInPath = 1;
        let completed = state.questionHistory.length - 1;
        
        if (state.currentPath === 'Sports') totalInPath = 20;
        else if (state.currentPath === 'E-Sports') totalInPath = 24;
        else if (state.currentPath === 'Non-Player') totalInPath = 2;
        
        if (state.currentQuestionId === 'initial' || state.currentQuestionId === 'player-type') {
            totalInPath = 3;
        }
        
        const percentage = Math.min(Math.round((completed / totalInPath) * 100), 100);
        
        elements.progressFill.style.width = `${percentage}%`;
        elements.progressPercent.textContent = `${percentage}%`;
        
        const messages = [
            "Starting...", "Moving ahead!", "Great progress!", "Halfway there!", 
            "Almost done!", "Final stretch!", "Complete!"
        ];
        const msgIndex = Math.min(Math.floor(percentage / 15), messages.length - 1);
        elements.progressMessage.textContent = messages[msgIndex] || "Almost there!";
        
        elements.progressFill.style.transform = 'scaleY(1.2)';
        setTimeout(() => elements.progressFill.style.transform = '', 300);
    }

    function switchScreen(screenName) {
        elements.welcomeScreen.classList.remove('active');
        elements.questionContainer.classList.remove('active');
        elements.thankYouScreen.classList.remove('active');
        
        if (screenName === 'welcome') elements.welcomeScreen.classList.add('active');
        else if (screenName === 'thank-you') elements.thankYouScreen.classList.add('active');
        else elements.questionContainer.classList.add('active');
    }

    function restartSurvey() {
        state.currentQuestionId = 'welcome';
        state.answers = {};
        state.questionHistory = ['welcome'];
        state.currentPath = '';
        state.currentQuestionNumber = 0;
        state.surveySessionId = generateSessionId();
        state.userStartedAt = new Date();
        
        switchScreen('welcome');
        updateProgress();
    }

    function handleKeyboardNavigation(e) {
        if (!elements.questionContainer.classList.contains('active')) return;
        
        const question = surveyData[state.currentQuestionId];
        if (!question) return;
        
        if (e.key === 'Enter' && !elements.nextBtn.disabled) {
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
            confetti.style.backgroundColor = ['#6d28d9', '#0ea5e9', '#f59e0b', '#10b981'][i % 4];
            confetti.style.animationDelay = `${Math.random() * 2}s`;
            confetti.style.animationDuration = `${1 + Math.random() * 1}s`;
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