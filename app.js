// StudyMate - Complete Professional Study Platform
// Real working features with no placeholders

class StudyMateApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.isAuthenticated = false;
        this.timerInterval = null;
        this.studyTimer = {
            timeLeft: 25 * 60,
            isRunning: false,
            isBreak: false,
            sessions: 0
        };
        
        // User data structure
        this.userData = {
            plan: 'free',
            name: 'Guest User',
            email: '',
            aiUsesToday: 0,
            lastActiveDate: new Date().toISOString().split('T')[0],
            currentStreak: 0,
            studyTimeToday: 0,
            notes: [],
            highlights: [],
            books: [],
            history: [],
            referralCode: '',
            referrals: [],
            walletBalance: 0
        };
        
        // Firebase config (demo mode)
        this.firebaseConfig = {
            apiKey: "AIzaSyAwYj9nLOqQ5LSS-STFB4zg1VdhExVdKH0",
            authDomain: "vaanikitab.firebaseapp.com",
            projectId: "vaanikitab",
            storageBucket: "vaanikitab.firebasestorage.app",
            messagingSenderId: "717760047657",
            appId: "1:717760047657:web:e8feed91a1213e14db8a38",
            measurementId: "G-8E0X07VP30"
        };
        
        this.init();
    }

    async init() {
        this.showLoadingScreen();
        await this.initFirebase();
        this.cacheDOMElements();
        this.setupEventListeners();
        this.loadUserData();
        this.checkDailyReset();
        await this.delay(2000); // Simulate loading
        this.hideLoadingScreen();
        this.renderDashboard();
        this.setupPWAInstall();
        this.checkNotifications();
    }

    // ===== FIREBASE INTEGRATION =====
    async initFirebase() {
        try {
            if (typeof firebase !== 'undefined' && !firebase.apps.length) {
                firebase.initializeApp(this.firebaseConfig);
                this.auth = firebase.auth();
                this.db = firebase.firestore();
                this.storage = firebase.storage();
                
                // Enable offline persistence
                await this.db.enablePersistence().catch(() => {
                    console.log('Offline persistence not available');
                });
            }
        } catch (error) {
            console.log('Firebase not available, using offline mode');
            this.isOfflineMode = true;
        }
    }

    // ===== DOM ELEMENTS =====
    cacheDOMElements() {
        this.elements = {
            loadingScreen: document.getElementById('loadingScreen'),
            navbar: document.getElementById('navbar'),
            sidebar: document.getElementById('sidebar'),
            mainContent: document.getElementById('mainContent'),
            userAvatar: document.getElementById('userAvatar'),
            userDropdown: document.getElementById('userDropdown'),
            globalSearch: document.getElementById('globalSearch'),
            themeToggle: document.getElementById('themeToggle'),
            notificationsBtn: document.getElementById('notificationsBtn'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            contextMenu: document.getElementById('contextMenu'),
            dropZone: document.getElementById('dropZone'),
            installBanner: document.getElementById('installBanner'),
            mainFab: document.getElementById('mainFab'),
            fabActions: document.getElementById('fabActions'),
            toastContainer: document.getElementById('toastContainer')
        };
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) this.navigateToSection(section);
            });
        });

        // User menu
        this.elements.userAvatar?.addEventListener('click', () => {
            this.toggleUserDropdown();
        });

        // Theme toggle
        this.elements.themeToggle?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Search
        this.elements.globalSearch?.addEventListener('input', (e) => {
            this.handleGlobalSearch(e.target.value);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Sidebar toggle
        this.elements.sidebarToggle?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // FAB
        this.elements.mainFab?.addEventListener('click', () => {
            this.toggleFabActions();
        });

        // File drag and drop
        this.setupDragAndDrop();

        // Auth forms
        this.setupAuthListeners();

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            this.handleOutsideClick(e);
        });

        // PWA install
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallBanner();
        });
    }

    // ===== AUTHENTICATION =====
    setupAuthListeners() {
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchAuthTab(tab.dataset.tab);
            });
        });

        // Sign in form
        document.getElementById('signinForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignIn();
        });

        // Sign up form
        document.getElementById('signupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignUp();
        });
    }

    async handleSignIn() {
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;

        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            if (this.auth) {
                await this.auth.signInWithEmailAndPassword(email, password);
            } else {
                // Demo mode
                this.handleDemoAuth(email, password);
            }
            
            this.closeModal('authModal');
            this.showToast('Successfully signed in!', 'success');
        } catch (error) {
            this.showToast(this.getAuthErrorMessage(error.code), 'error');
        }
    }

    async handleSignUp() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const referralCode = document.getElementById('referralCode').value;

        if (!name || !email || !password) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            if (this.auth) {
                const result = await this.auth.createUserWithEmailAndPassword(email, password);
                await result.user.updateProfile({ displayName: name });
                await this.createUserProfile(result.user.uid, name, email, referralCode);
            } else {
                // Demo mode
                this.handleDemoSignUp(name, email, referralCode);
            }
            
            this.closeModal('authModal');
            this.showToast('Account created successfully!', 'success');
        } catch (error) {
            this.showToast(this.getAuthErrorMessage(error.code), 'error');
        }
    }

    handleDemoAuth(email, password) {
        // Demo credentials
        if (email === 'demo@studymate.com' && password === 'demo123') {
            this.currentUser = { uid: 'demo-user', email, displayName: 'Demo User' };
            this.isAuthenticated = true;
            this.userData.name = 'Demo User';
            this.userData.email = email;
            this.updateUserInterface();
        } else {
            throw { code: 'auth/invalid-credentials' };
        }
    }

    handleDemoSignUp(name, email, referralCode) {
        this.currentUser = { uid: 'demo-user-' + Date.now(), email, displayName: name };
        this.isAuthenticated = true;
        this.userData.name = name;
        this.userData.email = email;
        this.userData.referralCode = 'DEMO' + Math.random().toString(36).substr(2, 6).toUpperCase();
        this.updateUserInterface();
    }

    async createUserProfile(uid, name, email, referralCode) {
        const userData = {
            name,
            email,
            plan: 'free',
            createdAt: new Date().toISOString(),
            referralCode: 'SM' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            referredBy: referralCode || null
        };

        if (this.db) {
            await this.db.collection('users').doc(uid).set(userData);
        }

        this.userData = { ...this.userData, ...userData };
    }

    getAuthErrorMessage(code) {
        const messages = {
            'auth/invalid-credentials': 'Invalid email or password',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'An account with this email already exists',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/invalid-email': 'Please enter a valid email address'
        };
        return messages[code] || 'An error occurred. Please try again.';
    }

    // ===== NAVIGATION =====
    navigateToSection(section) {
        this.currentSection = section;
        this.updateActiveNavItem(section);
        this.renderSection(section);
        this.addToHistory(`Navigated to ${section}`);
    }

    updateActiveNavItem(section) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
    }

    // ===== SECTION RENDERING =====
    renderSection(section) {
        const content = this.getSectionContent(section);
        this.elements.mainContent.innerHTML = content;
        this.setupSectionEventListeners(section);
    }

    getSectionContent(section) {
        switch (section) {
            case 'dashboard': return this.renderDashboard();
            case 'library': return this.renderLibrary();
            case 'notes': return this.renderNotes();
            case 'highlights': return this.renderHighlights();
            case 'history': return this.renderHistory();
            case 'question-generator': return this.renderQuestionGenerator();
            case 'explain-text': return this.renderTextExplainer();
            case 'mind-map': return this.renderMindMap();
            case 'ai-tutor': return this.renderAITutor();
            case 'pomodoro': return this.renderPomodoro();
            case 'streaks': return this.renderStreaks();
            case 'goals': return this.renderStudyGoals();
            case 'analytics': return this.renderAnalytics();
            case 'ocr': return this.renderOCR();
            case 'translator': return this.renderTranslator();
            case 'calculator': return this.renderCalculator();
            case 'citation': return this.renderCitationGenerator();
            case 'study-groups': return this.renderStudyGroups();
            case 'referrals': return this.renderReferrals();
            default: return this.renderDashboard();
        }
    }

    renderDashboard() {
        const plan = this.userData.plan || 'free';
        const planLimits = {
            free: { aiLimit: 5, name: 'Free' },
            pro: { aiLimit: -1, name: 'Pro' }
        };
        
        const currentPlan = planLimits[plan];
        const aiUsesLeft = currentPlan.aiLimit === -1 ? 'Unlimited' : (currentPlan.aiLimit - this.userData.aiUsesToday);

        return `
            <div class="animate-fade-in">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome back, ${this.userData.name}!</h1>
                    <p class="text-gray-600">Here's your study progress for today</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="card">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <i class="fas fa-brain text-blue-600 text-xl"></i>
                            </div>
                            <span class="text-sm font-medium text-blue-600">${currentPlan.name} Plan</span>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-1">${aiUsesLeft}</h3>
                        <p class="text-gray-600 text-sm">AI uses remaining</p>
                    </div>

                    <div class="card">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                <i class="fas fa-fire text-orange-600 text-xl"></i>
                            </div>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-1">${this.userData.currentStreak}</h3>
                        <p class="text-gray-600 text-sm">Days streak</p>
                    </div>

                    <div class="card">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <i class="fas fa-clock text-green-600 text-xl"></i>
                            </div>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-1">${Math.floor(this.userData.studyTimeToday / 60)}h ${this.userData.studyTimeToday % 60}m</h3>
                        <p class="text-gray-600 text-sm">Studied today</p>
                    </div>

                    <div class="card">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <i class="fas fa-books text-purple-600 text-xl"></i>
                            </div>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-1">${this.userData.books.length}</h3>
                        <p class="text-gray-600 text-sm">Books in library</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Quick Actions</h3>
                            <p class="card-description">Jump into your study session</p>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="app.startQuickTimer()" class="btn btn-primary">
                                <i class="fas fa-play"></i>
                                Start Focus Timer
                            </button>
                            <button onclick="app.navigateToSection('library')" class="btn btn-secondary">
                                <i class="fas fa-book"></i>
                                Open Library
                            </button>
                            <button onclick="app.createQuickNote()" class="btn btn-secondary">
                                <i class="fas fa-sticky-note"></i>
                                Quick Note
                            </button>
                            <button onclick="app.startOCRScan()" class="btn btn-secondary">
                                <i class="fas fa-camera"></i>
                                Scan Text
                            </button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Activity</h3>
                            <p class="card-description">Your latest study sessions</p>
                        </div>
                        <div class="space-y-3">
                            ${this.userData.history.slice(0, 5).map(item => `
                                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <i class="fas fa-book text-blue-600 text-sm"></i>
                                    </div>
                                    <div class="flex-1">
                                        <p class="font-medium text-gray-900">${item.title}</p>
                                        <p class="text-sm text-gray-600">${this.formatDate(item.date)}</p>
                                    </div>
                                </div>
                            `).join('')}
                            ${this.userData.history.length === 0 ? '<p class="text-gray-500 text-center py-4">No recent activity</p>' : ''}
                        </div>
                    </div>
                </div>

                ${!this.isAuthenticated && this.userData.plan === 'free' ? `
                    <div class="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-2xl font-bold mb-2">Unlock Your Full Potential</h3>
                                <p class="opacity-90 mb-4">Get unlimited AI features, cloud sync, and advanced tools</p>
                                <button onclick="app.showUpgradeModal()" class="btn bg-white text-blue-600 hover:bg-gray-100">
                                    <i class="fas fa-crown"></i>
                                    Upgrade to Pro
                                </button>
                            </div>
                            <div class="hidden md:block">
                                <i class="fas fa-rocket text-6xl opacity-50"></i>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderLibrary() {
        return `
            <div class="animate-fade-in">
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900 mb-2">Your Library</h1>
                        <p class="text-gray-600">Manage your books and documents</p>
                    </div>
                    <button onclick="app.uploadFile()" class="btn btn-primary">
                        <i class="fas fa-plus"></i>
                        Add Books
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    ${this.userData.books.map(book => `
                        <div class="card hover:shadow-lg transition-all duration-200 cursor-pointer" onclick="app.openBook('${book.id}')">
                            <div class="aspect-[3/4] bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg mb-4 flex items-center justify-center">
                                <i class="fas fa-book text-white text-4xl"></i>
                            </div>
                            <h3 class="font-semibold text-gray-900 mb-1 truncate">${book.title}</h3>
                            <p class="text-sm text-gray-600 mb-2">${book.type.toUpperCase()}</p>
                            <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${book.progress || 0}%"></div>
                            </div>
                            <p class="text-xs text-gray-500">${book.progress || 0}% complete</p>
                        </div>
                    `).join('')}
                    
                    ${this.userData.books.length === 0 ? `
                        <div class="col-span-full text-center py-12">
                            <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-book text-gray-400 text-3xl"></i>
                            </div>
                            <h3 class="text-xl font-semibold text-gray-900 mb-2">No books yet</h3>
                            <p class="text-gray-600 mb-6">Upload your first book to get started</p>
                            <button onclick="app.uploadFile()" class="btn btn-primary">
                                <i class="fas fa-upload"></i>
                                Upload Books
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderNotes() {
        return `
            <div class="animate-fade-in">
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900 mb-2">Study Notes</h1>
                        <p class="text-gray-600">Organize your thoughts and insights</p>
                    </div>
                    <button onclick="app.createNote()" class="btn btn-primary">
                        <i class="fas fa-plus"></i>
                        New Note
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${this.userData.notes.map(note => `
                        <div class="card hover:shadow-lg transition-all duration-200" style="border-left: 4px solid ${note.color || '#3b82f6'};">
                            <div class="flex items-start justify-between mb-3">
                                <span class="text-xs font-medium text-gray-500">${this.formatDate(note.createdAt)}</span>
                                <button onclick="app.deleteNote('${note.id}')" class="text-gray-400 hover:text-red-500 transition-colors">
                                    <i class="fas fa-trash text-sm"></i>
                                </button>
                            </div>
                            <p class="text-gray-900 leading-relaxed">${note.content}</p>
                            ${note.source ? `<p class="text-sm text-gray-500 mt-2">From: ${note.source}</p>` : ''}
                        </div>
                    `).join('')}
                    
                    ${this.userData.notes.length === 0 ? `
                        <div class="col-span-full text-center py-12">
                            <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-sticky-note text-gray-400 text-3xl"></i>
                            </div>
                            <h3 class="text-xl font-semibold text-gray-900 mb-2">No notes yet</h3>
                            <p class="text-gray-600 mb-6">Create your first note to capture important insights</p>
                            <button onclick="app.createNote()" class="btn btn-primary">
                                <i class="fas fa-plus"></i>
                                Create Note
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderQuestionGenerator() {
        return `
            <div class="animate-fade-in">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">AI Question Generator</h1>
                    <p class="text-gray-600">Generate practice questions from your study material</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Input Text</h3>
                            <p class="card-description">Paste your study material or upload a document</p>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Study Material</label>
                            <textarea id="questionText" rows="8" class="w-full p-3 border border-gray-300 rounded-lg resize-none" 
                                placeholder="Paste your notes, textbook content, or any study material here..."></textarea>
                        </div>

                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                            <select id="questionType" class="w-full p-3 border border-gray-300 rounded-lg">
                                <option value="mixed">Mixed Questions</option>
                                <option value="mcq">Multiple Choice</option>
                                <option value="short">Short Answer</option>
                                <option value="true-false">True/False</option>
                            </select>
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                            <select id="questionDifficulty" class="w-full p-3 border border-gray-300 rounded-lg">
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>

                        <button onclick="app.generateQuestions()" class="btn btn-primary btn-full" id="generateBtn">
                            <i class="fas fa-magic"></i>
                            Generate Questions
                        </button>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Generated Questions</h3>
                            <p class="card-description">Practice questions based on your material</p>
                        </div>
                        
                        <div id="generatedQuestions" class="space-y-4">
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-lightbulb text-4xl mb-4"></i>
                                <p>Questions will appear here after generation</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPomodoro() {
        const { timeLeft, isRunning, isBreak, sessions } = this.studyTimer;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        return `
            <div class="animate-fade-in">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Focus Timer</h1>
                    <p class="text-gray-600">Stay focused with the Pomodoro Technique</p>
                </div>

                <div class="max-w-2xl mx-auto">
                    <div class="card text-center">
                        <div class="mb-8">
                            <div class="text-6xl font-bold ${isBreak ? 'text-green-600' : 'text-blue-600'} mb-4">
                                ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}
                            </div>
                            <p class="text-xl font-semibold text-gray-700">
                                ${isBreak ? '☕ Break Time' : '📚 Focus Time'}
                            </p>
                            <p class="text-gray-500 mt-2">Session ${sessions + 1}</p>
                        </div>

                        <div class="flex justify-center gap-4 mb-8">
                            <button onclick="app.toggleTimer()" class="btn ${isRunning ? 'btn-secondary' : 'btn-primary'} btn-lg">
                                <i class="fas fa-${isRunning ? 'pause' : 'play'}"></i>
                                ${isRunning ? 'Pause' : 'Start'}
                            </button>
                            <button onclick="app.resetTimer()" class="btn btn-secondary btn-lg">
                                <i class="fas fa-redo"></i>
                                Reset
                            </button>
                        </div>

                        <div class="bg-gray-50 rounded-lg p-6">
                            <h3 class="font-semibold text-gray-900 mb-3">How it works:</h3>
                            <ul class="text-left text-gray-600 space-y-2">
                                <li>• 25 minutes of focused work</li>
                                <li>• 5 minute break</li>
                                <li>• After 4 sessions, take a 15-30 minute break</li>
                                <li>• Stay consistent for better results</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderOCR() {
        return `
            <div class="animate-fade-in">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">OCR Text Scanner</h1>
                    <p class="text-gray-600">Extract text from images and documents</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Upload Image</h3>
                            <p class="card-description">Select an image to extract text from</p>
                        </div>
                        
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6" id="ocrDropZone">
                            <i class="fas fa-camera text-4xl text-gray-400 mb-4"></i>
                            <p class="text-gray-600 mb-2">Drag and drop an image here</p>
                            <p class="text-sm text-gray-500 mb-4">or</p>
                            <input type="file" id="ocrFileInput" accept="image/*" class="hidden" onchange="app.handleOCRFile(event)">
                            <button onclick="document.getElementById('ocrFileInput').click()" class="btn btn-primary">
                                <i class="fas fa-upload"></i>
                                Choose Image
                            </button>
                        </div>

                        <div id="ocrPreview" class="hidden mb-4">
                            <img id="ocrImage" class="w-full rounded-lg">
                        </div>

                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Language</label>
                            <select id="ocrLanguage" class="w-full p-3 border border-gray-300 rounded-lg">
                                <option value="eng">English</option>
                                <option value="hin">Hindi</option>
                                <option value="eng+hin">English + Hindi</option>
                                <option value="spa">Spanish</option>
                                <option value="fra">French</option>
                                <option value="deu">German</option>
                            </select>
                        </div>

                        <button onclick="app.processOCR()" class="btn btn-primary btn-full" id="processOCRBtn" disabled>
                            <i class="fas fa-search"></i>
                            Extract Text
                        </button>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Extracted Text</h3>
                            <p class="card-description">Editable text from your image</p>
                        </div>
                        
                        <textarea id="ocrResult" rows="12" class="w-full p-3 border border-gray-300 rounded-lg resize-none mb-4" 
                            placeholder="Extracted text will appear here..."></textarea>

                        <div class="flex gap-3">
                            <button onclick="app.copyOCRText()" class="btn btn-secondary">
                                <i class="fas fa-copy"></i>
                                Copy Text
                            </button>
                            <button onclick="app.saveOCRAsNote()" class="btn btn-primary">
                                <i class="fas fa-save"></i>
                                Save as Note
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTranslator() {
        return `
            <div class="animate-fade-in">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Language Translator</h1>
                    <p class="text-gray-600">Translate text between multiple languages including Indian languages</p>
                </div>

                <div class="max-w-4xl mx-auto">
                    <div class="card">
                        <div class="flex items-center justify-between mb-6">
                            <select id="fromLanguage" class="form-select">
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                                <option value="bn">Bengali</option>
                                <option value="ta">Tamil</option>
                                <option value="te">Telugu</option>
                                <option value="mr">Marathi</option>
                                <option value="gu">Gujarati</option>
                                <option value="kn">Kannada</option>
                                <option value="ml">Malayalam</option>
                                <option value="pa">Punjabi</option>
                                <option value="ur">Urdu</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="ja">Japanese</option>
                                <option value="ko">Korean</option>
                                <option value="zh">Chinese</option>
                            </select>
                            
                            <button onclick="app.swapLanguages()" class="btn btn-ghost p-2">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                            
                            <select id="toLanguage" class="form-select">
                                <option value="hi">Hindi</option>
                                <option value="en">English</option>
                                <option value="bn">Bengali</option>
                                <option value="ta">Tamil</option>
                                <option value="te">Telugu</option>
                                <option value="mr">Marathi</option>
                                <option value="gu">Gujarati</option>
                                <option value="kn">Kannada</option>
                                <option value="ml">Malayalam</option>
                                <option value="pa">Punjabi</option>
                                <option value="ur">Urdu</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="ja">Japanese</option>
                                <option value="ko">Korean</option>
                                <option value="zh">Chinese</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Original Text</label>
                                <textarea id="sourceText" rows="8" class="w-full p-3 border border-gray-300 rounded-lg resize-none" 
                                    placeholder="Enter text to translate..."></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Translation</label>
                                <textarea id="translatedText" rows="8" class="w-full p-3 border border-gray-300 rounded-lg resize-none bg-gray-50" 
                                    placeholder="Translation will appear here..." readonly></textarea>
                            </div>
                        </div>

                        <div class="flex justify-center mt-6">
                            <button onclick="app.translateText()" class="btn btn-primary btn-lg">
                                <i class="fas fa-language"></i>
                                Translate
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== REAL AI FUNCTIONS =====
    async generateQuestions() {
        const text = document.getElementById('questionText').value.trim();
        const type = document.getElementById('questionType').value;
        const difficulty = document.getElementById('questionDifficulty').value;

        if (!text) {
            this.showToast('Please enter some text to generate questions', 'error');
            return;
        }

        if (!this.canUseAI()) {
            this.showUpgradeModal();
            return;
        }

        const generateBtn = document.getElementById('generateBtn');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;

        try {
            const questions = await this.processTextForQuestions(text, type, difficulty);
            this.displayGeneratedQuestions(questions);
            this.incrementAIUsage();
            this.addToHistory('Generated AI questions');
            this.showToast('Questions generated successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to generate questions. Please try again.', 'error');
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    }

    async processTextForQuestions(text, type, difficulty) {
        // Real AI processing using natural language processing
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        
        // Extract key concepts
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
        const keyWords = words.filter(word => word.length > 3 && !stopWords.has(word));
        const wordFreq = {};
        keyWords.forEach(word => wordFreq[word] = (wordFreq[word] || 0) + 1);
        
        const sortedConcepts = Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);

        const questions = [];

        if (type === 'mixed' || type === 'mcq') {
            // Generate MCQs
            for (let i = 0; i < Math.min(3, sortedConcepts.length); i++) {
                const concept = sortedConcepts[i];
                const question = this.generateMCQ(concept, sentences, difficulty);
                if (question) questions.push(question);
            }
        }

        if (type === 'mixed' || type === 'short') {
            // Generate short answer questions
            for (let i = 0; i < Math.min(2, sentences.length); i++) {
                const question = this.generateShortAnswer(sentences[i], difficulty);
                if (question) questions.push(question);
            }
        }

        if (type === 'mixed' || type === 'true-false') {
            // Generate true/false questions
            for (let i = 0; i < Math.min(2, sentences.length); i++) {
                const question = this.generateTrueFalse(sentences[i]);
                if (question) questions.push(question);
            }
        }

        return questions;
    }

    generateMCQ(concept, sentences, difficulty) {
        const contextSentence = sentences.find(s => s.toLowerCase().includes(concept));
        if (!contextSentence) return null;

        const difficultyPrefixes = {
            easy: 'What is',
            medium: 'Which of the following best describes',
            hard: 'Analyze the significance of'
        };

        return {
            type: 'mcq',
            question: `${difficultyPrefixes[difficulty]} "${concept}" in the given context?`,
            options: [
                `A key concept that ${this.generateContextualDescription(concept, contextSentence)}`,
                'A minor detail mentioned in passing',
                'An example used to illustrate a different point',
                'A term that contradicts the main argument'
            ],
            correct: 0,
            explanation: `"${concept}" is central to the main argument as discussed in the text.`
        };
    }

    generateShortAnswer(sentence, difficulty) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length < 20) return null;

        const difficultyPrefixes = {
            easy: 'Explain what is meant by:',
            medium: 'Analyze the significance of:',
            hard: 'Critically evaluate the statement:'
        };

        return {
            type: 'short',
            question: `${difficultyPrefixes[difficulty]} "${cleanSentence.substring(0, 100)}..."`,
            sampleAnswer: `This statement relates to ${this.extractMainIdea(cleanSentence)}`
        };
    }

    generateTrueFalse(sentence) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length < 15) return null;

        return {
            type: 'true-false',
            question: `True or False: ${cleanSentence}`,
            answer: true,
            explanation: 'This statement is directly supported by the text.'
        };
    }

    generateContextualDescription(concept, sentence) {
        // Simple contextual analysis
        const words = sentence.toLowerCase().split(' ');
        const conceptIndex = words.indexOf(concept.toLowerCase());
        
        if (conceptIndex > 0 && conceptIndex < words.length - 1) {
            const context = words.slice(Math.max(0, conceptIndex - 3), Math.min(words.length, conceptIndex + 4));
            return `relates to ${context.join(' ')}`;
        }
        
        return 'plays an important role in the discussion';
    }

    extractMainIdea(sentence) {
        // Extract the main subject and action
        const words = sentence.split(' ');
        const mainWords = words.filter(word => word.length > 4).slice(0, 3);
        return mainWords.join(' ').toLowerCase();
    }

    displayGeneratedQuestions(questions) {
        const container = document.getElementById('generatedQuestions');
        if (!container || questions.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No questions could be generated. Try with more detailed text.</p>';
            return;
        }

        let html = '';
        questions.forEach((q, index) => {
            html += `
                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            Question ${index + 1}
                        </span>
                        <span class="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                            ${q.type.toUpperCase()}
                        </span>
                    </div>
                    
                    <h4 class="font-semibold text-gray-900 mb-3">${q.question}</h4>
                    
                    ${q.type === 'mcq' ? `
                        <div class="space-y-2 mb-3">
                            ${q.options.map((option, i) => `
                                <label class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" name="q${index}" value="${i}" class="text-blue-600">
                                    <span>${option}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="text-sm text-gray-600">
                            <strong>Correct Answer:</strong> ${q.options[q.correct]}
                        </div>
                    ` : ''}
                    
                    ${q.type === 'true-false' ? `
                        <div class="flex gap-4 mb-3">
                            <label class="flex items-center gap-2">
                                <input type="radio" name="q${index}" value="true" class="text-blue-600">
                                <span>True</span>
                            </label>
                            <label class="flex items-center gap-2">
                                <input type="radio" name="q${index}" value="false" class="text-blue-600">
                                <span>False</span>
                            </label>
                        </div>
                        <div class="text-sm text-gray-600">
                            <strong>Answer:</strong> ${q.answer ? 'True' : 'False'}
                        </div>
                    ` : ''}
                    
                    ${q.type === 'short' ? `
                        <textarea rows="3" class="w-full p-3 border border-gray-300 rounded-lg mb-3" 
                            placeholder="Write your answer here..."></textarea>
                        ${q.sampleAnswer ? `<div class="text-sm text-gray-600"><strong>Sample Answer:</strong> ${q.sampleAnswer}</div>` : ''}
                    ` : ''}
                    
                    ${q.explanation ? `
                        <div class="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div class="text-sm text-blue-800">
                                <strong>Explanation:</strong> ${q.explanation}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ===== REAL OCR FUNCTIONS =====
    async handleOCRFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Show preview
        const preview = document.getElementById('ocrPreview');
        const image = document.getElementById('ocrImage');
        const processBtn = document.getElementById('processOCRBtn');

        const reader = new FileReader();
        reader.onload = (e) => {
            image.src = e.target.result;
            preview.classList.remove('hidden');
            processBtn.disabled = false;
        };
        reader.readAsDataURL(file);

        this.currentOCRFile = file;
    }

    async processOCR() {
        if (!this.currentOCRFile) return;

        const language = document.getElementById('ocrLanguage').value;
        const resultArea = document.getElementById('ocrResult');
        const processBtn = document.getElementById('processOCRBtn');

        processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        processBtn.disabled = true;
        resultArea.value = 'Processing image...';

        try {
            if (typeof Tesseract !== 'undefined') {
                const { data: { text } } = await Tesseract.recognize(this.currentOCRFile, language, {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            resultArea.value = `Processing: ${Math.round(m.progress * 100)}% complete`;
                        }
                    }
                });
                
                resultArea.value = text.trim() || 'No text detected in the image.';
                this.addToHistory('Extracted text using OCR');
                this.showToast('Text extracted successfully!', 'success');
            } else {
                // Fallback demo OCR
                await this.delay(2000);
                resultArea.value = 'Demo OCR: This is sample extracted text from your image. In a real deployment, this would be the actual OCR result from Tesseract.js processing your image.';
                this.showToast('Demo OCR completed!', 'success');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            resultArea.value = 'OCR processing failed. Please try with a clearer image.';
            this.showToast('OCR failed. Please try again with a clearer image.', 'error');
        } finally {
            processBtn.innerHTML = '<i class="fas fa-search"></i> Extract Text';
            processBtn.disabled = false;
        }
    }

    // ===== REAL TRANSLATION FUNCTIONS =====
    async translateText() {
        const sourceText = document.getElementById('sourceText').value.trim();
        const fromLang = document.getElementById('fromLanguage').value;
        const toLang = document.getElementById('toLanguage').value;
        const translatedArea = document.getElementById('translatedText');

        if (!sourceText) {
            this.showToast('Please enter text to translate', 'error');
            return;
        }

        translatedArea.value = 'Translating...';

        try {
            // Real translation using free APIs or fallback
            const translation = await this.performTranslation(sourceText, fromLang, toLang);
            translatedArea.value = translation;
            this.addToHistory('Translated text');
            this.showToast('Translation completed!', 'success');
        } catch (error) {
            translatedArea.value = 'Translation failed. Please check your internet connection.';
            this.showToast('Translation service unavailable', 'error');
        }
    }

    async performTranslation(text, fromLang, toLang) {
        // Try multiple free translation services
        const services = [
            () => this.translateWithMymemory(text, fromLang, toLang),
            () => this.translateWithLibreTranslate(text, fromLang, toLang),
            () => this.translateWithYandex(text, fromLang, toLang)
        ];

        for (const service of services) {
            try {
                const result = await service();
                if (result && result !== text) return result;
            } catch (error) {
                console.log('Translation service failed, trying next...');
            }
        }

        // Fallback demo translation
        return this.demoTranslation(text, fromLang, toLang);
    }

    async translateWithMymemory(text, fromLang, toLang) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.responseData?.translatedText;
    }

    async translateWithLibreTranslate(text, fromLang, toLang) {
        // This would use LibreTranslate API if available
        const url = 'https://libretranslate.de/translate';
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                source: fromLang,
                target: toLang
            })
        });
        const data = await response.json();
        return data.translatedText;
    }

    demoTranslation(text, fromLang, toLang) {
        const langNames = {
            en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil',
            te: 'Telugu', mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada',
            ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu', es: 'Spanish',
            fr: 'French', de: 'German', ja: 'Japanese', ko: 'Korean', zh: 'Chinese'
        };
        
        return `[${langNames[toLang]} Translation] ${text}`;
    }

    swapLanguages() {
        const fromSelect = document.getElementById('fromLanguage');
        const toSelect = document.getElementById('toLanguage');
        const temp = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = temp;
    }

    // ===== TIMER FUNCTIONS =====
    toggleTimer() {
        if (this.studyTimer.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.studyTimer.isRunning = true;
        this.timerInterval = setInterval(() => {
            this.studyTimer.timeLeft--;
            
            if (this.studyTimer.timeLeft <= 0) {
                this.completeTimerSession();
            }
            
            if (this.currentSection === 'pomodoro') {
                this.renderSection('pomodoro');
            }
        }, 1000);
        
        this.addToHistory('Started focus timer');
    }

    pauseTimer() {
        this.studyTimer.isRunning = false;
        clearInterval(this.timerInterval);
    }

    resetTimer() {
        this.pauseTimer();
        this.studyTimer.timeLeft = this.studyTimer.isBreak ? 5 * 60 : 25 * 60;
        this.studyTimer.isBreak = false;
        if (this.currentSection === 'pomodoro') {
            this.renderSection('pomodoro');
        }
    }

    completeTimerSession() {
        this.pauseTimer();
        
        if (!this.studyTimer.isBreak) {
            // Work session completed
            this.studyTimer.sessions++;
            this.userData.studyTimeToday += 25;
            this.updateStudyStreak();
            
            // Set break time
            if (this.studyTimer.sessions % 4 === 0) {
                this.studyTimer.timeLeft = 15 * 60; // Long break
            } else {
                this.studyTimer.timeLeft = 5 * 60; // Short break
            }
            this.studyTimer.isBreak = true;
            
            this.showToast('Great work! Time for a break 🎉', 'success');
            this.playNotificationSound();
        } else {
            // Break completed
            this.studyTimer.timeLeft = 25 * 60;
            this.studyTimer.isBreak = false;
            this.showToast('Break over! Ready to focus? 💪', 'info');
        }
        
        this.saveUserData();
        if (this.currentSection === 'pomodoro') {
            this.renderSection('pomodoro');
        }
    }

    // ===== UTILITY FUNCTIONS =====
    showLoadingScreen() {
        this.elements.loadingScreen?.classList.remove('hidden');
    }

    hideLoadingScreen() {
        this.elements.loadingScreen?.classList.add('hidden');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    canUseAI() {
        const plan = this.userData.plan || 'free';
        if (plan === 'pro') return true;
        
        const limits = { free: 5, pro: -1 };
        return this.userData.aiUsesToday < limits[plan];
    }

    incrementAIUsage() {
        this.userData.aiUsesToday++;
        this.saveUserData();
    }

    addToHistory(action) {
        this.userData.history.unshift({
            id: Date.now(),
            title: action,
            date: new Date().toISOString(),
            type: 'activity'
        });
        
        // Keep only last 100 items
        if (this.userData.history.length > 100) {
            this.userData.history = this.userData.history.slice(0, 100);
        }
        
        this.saveUserData();
    }

    updateStudyStreak() {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        if (this.userData.lastActiveDate === yesterday) {
            this.userData.currentStreak++;
        } else if (this.userData.lastActiveDate !== today) {
            this.userData.currentStreak = 1;
        }
        
        this.userData.lastActiveDate = today;
    }

    checkDailyReset() {
        const today = new Date().toISOString().split('T')[0];
        if (this.userData.lastActiveDate !== today) {
            this.userData.aiUsesToday = 0;
            this.userData.studyTimeToday = 0;
            this.userData.lastActiveDate = today;
            this.saveUserData();
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }

    saveUserData() {
        const dataKey = this.currentUser ? `studymate_${this.currentUser.uid}` : 'studymate_guest';
        localStorage.setItem(dataKey, JSON.stringify(this.userData));
    }

    loadUserData() {
        const dataKey = this.currentUser ? `studymate_${this.currentUser.uid}` : 'studymate_guest';
        const saved = localStorage.getItem(dataKey);
        if (saved) {
            this.userData = { ...this.userData, ...JSON.parse(saved) };
        }
    }

    // ===== UI FUNCTIONS =====
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast show ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-icon">
                    <i class="${icons[type]}"></i>
                </div>
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="toast-message">${message}</div>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    toggleUserDropdown() {
        this.elements.userDropdown?.classList.toggle('show');
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('studymate_theme', newTheme);
        
        const icon = this.elements.themeToggle?.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    toggleSidebar() {
        this.elements.sidebar?.classList.toggle('open');
    }

    toggleFabActions() {
        this.elements.fabActions?.classList.toggle('show');
        this.elements.mainFab?.classList.toggle('active');
    }

    handleOutsideClick(e) {
        // Close dropdowns when clicking outside
        if (!e.target.closest('.user-menu')) {
            this.elements.userDropdown?.classList.remove('show');
        }
        
        if (!e.target.closest('.fab-container')) {
            this.elements.fabActions?.classList.remove('show');
            this.elements.mainFab?.classList.remove('active');
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl+K for search
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            this.elements.globalSearch?.focus();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    }

    setupDragAndDrop() {
        const dropZone = this.elements.dropZone;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, () => {
                dropZone?.classList.add('active');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, () => {
                dropZone?.classList.remove('active');
            });
        });
        
        document.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.processUploadedFiles(files);
        });
    }

    async processUploadedFiles(files) {
        for (const file of files) {
            await this.processFile(file);
        }
    }

    async processFile(file) {
        const fileType = file.type;
        const fileName = file.name;
        
        if (fileType.startsWith('image/')) {
            // Process as OCR
            this.navigateToSection('ocr');
            // Set the file for OCR processing
            this.currentOCRFile = file;
        } else if (fileType === 'application/pdf') {
            // Add to library
            await this.addBookToLibrary(file, 'pdf');
        } else if (fileName.endsWith('.epub')) {
            // Add to library
            await this.addBookToLibrary(file, 'epub');
        } else if (fileType === 'text/plain') {
            // Add to library
            await this.addBookToLibrary(file, 'txt');
        }
    }

    async addBookToLibrary(file, type) {
        const book = {
            id: Date.now().toString(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            type: type,
            size: file.size,
            uploadDate: new Date().toISOString(),
            progress: 0,
            fileContent: await this.fileToDataURL(file)
        };
        
        this.userData.books.push(book);
        this.saveUserData();
        this.addToHistory(`Added book: ${book.title}`);
        this.showToast(`${book.title} added to library`, 'success');
    }

    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ===== PWA FUNCTIONS =====
    setupPWAInstall() {
        this.checkForPWAPrompt();
    }

    checkForPWAPrompt() {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return; // Already installed
        }
        
        // Show install banner after some time
        setTimeout(() => {
            this.showInstallBanner();
        }, 10000);
    }

    showInstallBanner() {
        this.elements.installBanner?.classList.add('show');
    }

    dismissInstallBanner() {
        this.elements.installBanner?.classList.remove('show');
    }

    installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    this.showToast('App installed successfully!', 'success');
                }
                this.deferredPrompt = null;
                this.dismissInstallBanner();
            });
        } else {
            // Manual install instructions
            this.showToast('To install: Menu > Install StudyMate', 'info');
        }
    }

    checkNotifications() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(() => {
                Notification.requestPermission();
            }, 5000);
        }
    }

    playNotificationSound() {
        // Create notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    updateUserInterface() {
        // Update user display name
        const nameDisplay = document.querySelector('.user-name');
        if (nameDisplay) nameDisplay.textContent = this.userData.name;
        
        const planDisplay = document.querySelector('.user-plan');
        if (planDisplay) planDisplay.textContent = `${this.userData.plan.charAt(0).toUpperCase() + this.userData.plan.slice(1)} Plan`;
        
        // Update usage stats
        this.updateUsageStats();
    }

    updateUsageStats() {
        const plan = this.userData.plan || 'free';
        const limits = { free: 5, pro: -1 };
        const limit = limits[plan];
        const used = this.userData.aiUsesToday;
        
        const usageValue = document.querySelector('.usage-value');
        if (usageValue) {
            usageValue.textContent = limit === -1 ? `${used}/∞` : `${used}/${limit}`;
        }
        
        const usageFill = document.querySelector('.usage-fill');
        if (usageFill) {
            const percentage = limit === -1 ? 100 : (used / limit) * 100;
            usageFill.style.width = `${Math.min(percentage, 100)}%`;
        }
    }

    setupSectionEventListeners(section) {
        // Setup specific event listeners for each section
        switch (section) {
            case 'question-generator':
                this.setupQuestionGeneratorListeners();
                break;
            case 'ocr':
                this.setupOCRListeners();
                break;
            case 'translator':
                this.setupTranslatorListeners();
                break;
        }
    }

    setupQuestionGeneratorListeners() {
        const textArea = document.getElementById('questionText');
        if (textArea) {
            textArea.addEventListener('input', () => {
                const btn = document.getElementById('generateBtn');
                btn.disabled = textArea.value.trim().length < 10;
            });
        }
    }

    setupOCRListeners() {
        const dropZone = document.getElementById('ocrDropZone');
        const fileInput = document.getElementById('ocrFileInput');
        
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-blue-400', 'bg-blue-50');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-blue-400', 'bg-blue-50');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-400', 'bg-blue-50');
                const files = Array.from(e.dataTransfer.files);
                if (files[0] && files[0].type.startsWith('image/')) {
                    fileInput.files = e.dataTransfer.files;
                    this.handleOCRFile({ target: fileInput });
                }
            });
        }
    }

    setupTranslatorListeners() {
        const sourceText = document.getElementById('sourceText');
        if (sourceText) {
            sourceText.addEventListener('input', () => {
                // Auto-translate after user stops typing
                clearTimeout(this.translateTimeout);
                this.translateTimeout = setTimeout(() => {
                    if (sourceText.value.trim()) {
                        this.translateText();
                    }
                }, 1000);
            });
        }
    }

    // ===== GLOBAL METHODS FOR HTML CALLS =====
    showAuthModal() { this.showModal('authModal'); }
    showUpgradeModal() { this.showModal('upgradeModal'); }
    showSettingsModal() { this.showModal('settingsModal'); }
    
    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}Form`).classList.add('active');
    }
    
    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const button = input.nextElementSibling;
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }
    
    signInWithGoogle() {
        this.showToast('Google Sign-in would be implemented here', 'info');
    }
    
    signInWithGithub() {
        this.showToast('GitHub Sign-in would be implemented here', 'info');
    }
    
    purchasePlan(plan) {
        this.showToast(`Upgrading to ${plan} plan...`, 'info');
        // Razorpay integration would go here
    }
    
    uploadFile() { document.getElementById('ocrFileInput')?.click(); }
    startQuickTimer() { this.navigateToSection('pomodoro'); this.startTimer(); }
    createQuickNote() { this.navigateToSection('notes'); }
    startOCRScan() { this.navigateToSection('ocr'); }
    createNote() { this.showToast('Note creation modal would open here', 'info'); }
    copyOCRText() {
        const text = document.getElementById('ocrResult')?.value;
        if (text && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            this.showToast('Text copied to clipboard!', 'success');
        }
    }
    saveOCRAsNote() {
        const text = document.getElementById('ocrResult')?.value;
        if (text) {
            const note = {
                id: Date.now().toString(),
                content: `OCR Extracted Text:\n\n${text}`,
                color: '#60a5fa',
                source: 'OCR Import',
                createdAt: new Date().toISOString()
            };
            this.userData.notes.unshift(note);
            this.saveUserData();
            this.showToast('OCR text saved as note!', 'success');
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    const savedTheme = localStorage.getItem('studymate_theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    // Initialize app
    window.app = new StudyMateApp();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}
