const App = {
    currentUser: null,
    selectedItems: [],
    selectedSide: 'H',
    joiningCoinflipId: null,
    chatSubscription: null,
    coinflipSubscription: null,
    isCreatingCoinflip: false,
    isJoiningCoinflip: false,
    lastChatTime: 0,
    walletTab: 'deposit',
    selectedWalletItems: [],

    async init() {
        this.isOnline = typeof SupaDB !== 'undefined';
        if (!this.isOnline) {
            await DB.init();
        }
        this.simulateLoading();
    },

    simulateLoading() {
        const bar = document.getElementById('loadingBar');
        const text = document.getElementById('loadingText');
        if (!bar || !text) {
            this.checkAuth();
            return;
        }
        
        const steps = [
            { p: 20, t: 'Loading...' },
            { p: 40, t: 'Connecting...' },
            { p: 60, t: 'Loading items...' },
            { p: 80, t: 'Preparing...' },
            { p: 100, t: 'Ready!' }
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                bar.style.width = steps[i].p + '%';
                text.textContent = steps[i].t;
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    document.getElementById('loadingScreen').classList.add('hidden');
                    this.checkAuth();
                }, 400);
            }
        }, 350);
    },

    async checkAuth() {
        const saved = localStorage.getItem('brainrotflip_current_user');
        if (saved) {
            if (this.isOnline) {
                const user = await SupaDB.getUser(saved);
                if (user) {
                    this.currentUser = {
                        username: user.username,
                        email: user.email,
                        avatar: user.avatar,
                        level: user.level,
                        isAdmin: user.is_admin,
                        discordLinked: user.discord_linked || false,
                        discordUsername: user.discord_username || null,
                        badges: user.badges || [],
                        stats: {
                            wagered: user.stats_wagered || 0,
                            won: user.stats_won || 0,
                            lost: user.stats_lost || 0,
                            gamesPlayed: user.stats_games_played || 0,
                            gamesWon: user.stats_games_won || 0
                        },
                        inventory: user.inventory || []
                    };
                    this.showApp();
                    return;
                }
            } else {
                const user = DB.getUser(saved);
                if (user) {
                    this.currentUser = user;
                    this.showApp();
                    return;
                }
            }
        }
        this.showLogin();
    },

    showLogin() {
        const html = '<div class="modal-overlay">' +
            '<div class="modal">' +
            '<div class="modal-header"><h2>🎮 Welcome to BrainrotFlip</h2></div>' +
            '<div class="modal-tabs">' +
            '<div class="modal-tab active" onclick="App.switchLoginTab(\'login\', this)">Login</div>' +
            '<div class="modal-tab" onclick="App.switchLoginTab(\'register\', this)">Register</div>' +
            '</div>' +
            '<div id="loginForm">' +
            '<input type="text" class="modal-input" id="loginUsername" placeholder="Username">' +
            '<input type="password" class="modal-input" id="loginPassword" placeholder="Password">' +
            '<button class="modal-btn" onclick="App.login()">Login</button>' +
            '</div>' +
            '<div id="registerForm" style="display:none;">' +
            '<input type="text" class="modal-input" id="regUsername" placeholder="Username">' +
            '<input type="email" class="modal-input" id="regEmail" placeholder="Email">' +
            '<input type="password" class="modal-input" id="regPassword" placeholder="Password">' +
            '<input type="password" class="modal-input" id="regPasswordConfirm" placeholder="Confirm Password">' +
            '<button class="modal-btn success" onclick="App.register()">Create Account</button>' +
            '</div>' +
            '</div>' +
            '</div>';
        
        document.getElementById('root').innerHTML = html;
    },

    switchLoginTab(tab, el) {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        
        if (tab === 'login') {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
        } else {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'block';
        }
    },

    async login() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            this.showToast('Fill all fields!', 'error');
            return;
        }

        this.showToast('Logging in...', 'info');

        if (this.isOnline) {
            const result = await SupaDB.loginUser(username, password);
            if (!result.success) {
                this.showToast(result.error, 'error');
                return;
            }
            
            const user = result.user;
            this.currentUser = {
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                level: user.level,
                isAdmin: user.is_admin,
                discordLinked: user.discord_linked || false,
                discordUsername: user.discord_username || null,
                badges: user.badges || [],
                stats: {
                    wagered: user.stats_wagered || 0,
                    won: user.stats_won || 0,
                    lost: user.stats_lost || 0,
                    gamesPlayed: user.stats_games_played || 0,
                    gamesWon: user.stats_games_won || 0
                },
                inventory: user.inventory || []
            };
        } else {
            let user = DB.getUser(username);
            if (!user || user.password !== password) {
                this.showToast('Invalid credentials!', 'error');
                return;
            }
            this.currentUser = {
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                level: user.level,
                isAdmin: user.isAdmin,
                discordLinked: user.discordLinked || false,
                discordUsername: user.discordUsername || null,
                badges: user.badges || [],
                stats: user.stats,
                inventory: user.inventory
            };
        }

        localStorage.setItem('brainrotflip_current_user', username);
        this.showToast('Welcome back!', 'success');
        this.showApp();
    },

    async register() {
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;

        if (!username || !email || !password || !passwordConfirm) {
            this.showToast('Fill all fields!', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            this.showToast('Passwords don\'t match!', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be 6+ characters!', 'error');
            return;
        }

        this.showToast('Creating account...', 'info');

        if (this.isOnline) {
            const result = await SupaDB.registerUser(username, email, password);
            if (!result.success) {
                this.showToast(result.error, 'error');
                return;
            }

            const user = result.user;
            this.currentUser = {
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                level: user.level,
                isAdmin: user.is_admin,
                discordLinked: false,
                discordUsername: null,
                badges: [],
                stats: {
                    wagered: 0,
                    won: 0,
                    lost: 0,
                    gamesPlayed: 0,
                    gamesWon: 0
                },
                inventory: user.inventory || []
            };
        } else {
            if (DB.getUser(username)) {
                this.showToast('Username already exists!', 'error');
                return;
            }
            const robloxId = Math.floor(Math.random() * 9999999999);
            const user = DB.createUser(username, robloxId, email, password);
            this.currentUser = {
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                level: user.level,
                isAdmin: user.isAdmin,
                discordLinked: user.discordLinked || false,
                discordUsername: user.discordUsername || null,
                badges: user.badges || [],
                stats: user.stats,
                inventory: user.inventory
            };
        }

        localStorage.setItem('brainrotflip_current_user', username);
        this.showToast('Account created!', 'success');
        this.showApp();
    },

    showApp() {
        const html = '<div class="toast-container" id="toastContainer"></div>' +
            '<div class="app-container">' +
            '<nav class="sidebar">' +
            '<div class="sidebar-logo">' +
            '<div class="logo-icon">B</div>' +
            '<span class="logo-text">BrainrotFlip</span>' +
            '</div>' +
            '<div class="sidebar-nav">' +
            '<div class="nav-section">' +
            '<div class="nav-section-title">GAMES</div>' +
            '<div class="nav-item active" onclick="App.navigateTo(\'home\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' +
            'Home</div>' +
            '<div class="nav-item" onclick="App.navigateTo(\'coinflip\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>' +
            'Coinflip</div>' +
            '</div>' +
            '<div class="nav-section">' +
            '<div class="nav-section-title">MORE</div>' +
            '<div class="nav-item" onclick="App.navigateTo(\'profile\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
            'My Profile</div>' +
            '<div class="nav-item" onclick="App.navigateTo(\'leaderboard\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>' +
            'Leaderboard</div>' +
            '<div class="nav-item" onclick="App.navigateTo(\'settings\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m5.196-13.196L13.393 9.607m-2.786 2.786L6.804 16.196m10.392-.393l-3.803-3.803m-2.786-2.786L5.804 5.411"/></svg>' +
            'Settings</div>' +
            '<div class="nav-item" id="adminNavItem" style="display:none;" onclick="App.navigateTo(\'admin\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
            'Admin</div>' +
            '</div>' +
            '<div class="nav-section">' +
            '<div class="nav-item logout" onclick="App.logout()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>' +
            'Logout</div>' +
            '</div>' +
            '</div>' +
            '<div class="sidebar-footer">' +
            '<div class="discord-promo">' +
            '<p>Join our Discord!</p>' +
            '<a href="#" class="discord-btn">Join Discord</a>' +
            '</div>' +
            '</div>' +
            '</nav>' +
            '<main class="main-content">' +
            '<header class="header">' +
            '<div class="header-left">' +
            '<div class="balance-display"><span>💎</span><span id="headerBalance">0</span></div>' +
            '<button class="wallet-btn" onclick="App.openWalletModal()">Wallet</button>' +
            '</div>' +
            '<div class="header-right">' +
            '<div class="level-badge"><span class="level-number" id="headerLevel">1</span><span>Level</span></div>' +
            '<img class="user-avatar" id="headerAvatar" src="" onclick="App.navigateTo(\'profile\')">' +
            '</div>' +
            '</header>' +
            '<div class="page-content" id="pageContent"></div>' +
            '</main>' +
            '<aside class="chat-sidebar">' +
            '<div class="chat-header"><h3>💬 Chat</h3></div>' +
            '<div class="chat-messages" id="chatMessages"></div>' +
            '<div class="chat-input-area">' +
            '<div class="chat-input-row">' +
            '<input type="text" class="chat-input" id="chatInput" placeholder="Message..." maxlength="200" onkeypress="if(event.key===\'Enter\')App.sendChatMessage()">' +
            '<button class="chat-send-btn" onclick="App.sendChatMessage()">➤</button>' +
            '</div>' +
            '</div>' +
            '<div class="chat-online-count"><span class="online-indicator"></span><span id="onlineCount">0</span> online</div>' +
            '</aside>' +
            '</div>';
        
        document.getElementById('root').innerHTML = html;
        this.updateUI();
        this.loadCoinflips();
        this.loadChat();
        this.startIntervals();

        if (this.isOnline) {
            this.chatSubscription = SupaDB.subscribeToChatUpdates(() => this.loadChat());
            this.coinflipSubscription = SupaDB.subscribeToCoinflipUpdates(() => this.loadCoinflips());
        }

        if (this.currentUser.isAdmin) {
            document.getElementById('adminNavItem').style.display = 'flex';
        }
        
        this.navigateTo('home');
    },

    startIntervals() {
        if (this.isOnline) {
            setInterval(() => {
                this.loadCoinflips();
                this.checkForActiveCoinflip();
            }, 3000);
            setInterval(() => this.loadChat(), 2000);
        } else {
            setInterval(() => {
                this.loadCoinflips();
                this.checkForActiveCoinflip();
            }, 3000);
            setInterval(() => this.loadChat(), 2000);
        }
    },

    async checkForActiveCoinflip() {
        const coinflips = this.isOnline 
            ? await SupaDB.getAllActiveCoinflips()
            : DB.getAllActiveCoinflips();

        for (let i = 0; i < coinflips.length; i++) {
            const cf = coinflips[i];
            const status = this.isOnline ? cf.status : cf.status;
            const creator = this.isOnline ? cf.creator : cf.creator;
            const cfId = this.isOnline ? cf.id : cf.id;

            if (creator === this.currentUser.username && status === 'playing') {
                const activeCfId = localStorage.getItem('brainrotflip_active_coinflip');
                if (!activeCfId || activeCfId !== cfId) {
                    localStorage.setItem('brainrotflip_active_coinflip', cfId);
                    this.startCoinflipAnimation(cf);
                    break;
                }
            }
        }
    },

    navigateTo(page) {
        const content = document.getElementById('pageContent');
        if (!content) return;

        if (page === 'home') content.innerHTML = this.getHomeHTML();
        else if (page === 'coinflip') {
            content.innerHTML = this.getCoinflipHTML();
            this.loadCoinflips();
        }
        else if (page === 'profile') {
            content.innerHTML = this.getProfileHTML();
            this.updateUI();
        }
        else if (page === 'leaderboard') {
            content.innerHTML = this.getLeaderboardHTML();
            this.loadLeaderboard();
        }
        else if (page === 'settings') {
            content.innerHTML = this.getSettingsHTML();
        }
        else if (page === 'admin') {
            content.innerHTML = this.getAdminHTML();
            // Attendre que le DOM soit prêt
            setTimeout(() => {
                this.loadAdminPanel();
            }, 100);
        }

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItems = document.querySelectorAll('.nav-item');
        for (let i = 0; i < navItems.length; i++) {
            const text = navItems[i].textContent.toLowerCase().trim();
            if (text.includes(page)) {
                navItems[i].classList.add('active');
                break;
            }
        }
    },

    getHomeHTML() {
        return '<div class="page active">' +
            '<div class="hero-section">' +
            '<div class="hero-card">' +
            '<h3>Welcome to</h3><h2>BrainrotFlip</h2>' +
            '<p>The most <strong>epic</strong> gambling experience</p>' +
            '<button class="hero-btn primary" onclick="App.navigateTo(\'coinflip\')">Play Now</button>' +
            '</div>' +
            '<div class="hero-card">' +
            '<h3>Compete in</h3><h2>WAGER RACE</h2>' +
            '<p>Win <strong>massive prizes</strong></p>' +
            '<button class="hero-btn secondary">Coming Soon</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    },

    getCoinflipHTML() {
        return '<div class="page active">' +
            '<h1 class="page-title">🪙 Coinflip</h1>' +
            '<div class="stats-row">' +
            '<div class="stat-card"><div class="value" id="cfStatRooms">0</div><div class="label">Active Rooms</div></div>' +
            '<div class="stat-card"><div class="value" id="cfStatValue">0</div><div class="label">Total Value</div></div>' +
            '<div class="stat-card"><div class="value" id="cfStatItems">0</div><div class="label">Items Wagered</div></div>' +
            '</div>' +
            '<div class="actions-row">' +
            '<button class="action-btn create" onclick="App.openCreateModal()">Create Coinflip</button>' +
            '</div>' +
            '<div class="modal-tabs" style="margin-bottom:2rem;">' +
            '<div class="modal-tab active" onclick="App.switchCoinflipTab(\'active\', this)">Active Games</div>' +
            '<div class="modal-tab" onclick="App.switchCoinflipTab(\'history\', this)">History</div>' +
            '</div>' +
            '<div id="activeGamesSection">' +
            '<div class="filters-row">' +
            '<div class="filter-group"><img src="Head_Tile.png" style="width:24px;height:24px;"><span id="filterHeadsCount">0</span> Heads</div>' +
            '<div class="filter-group"><img src="Tails_Tile.png" style="width:24px;height:24px;"><span id="filterTailsCount">0</span> Tails</div>' +
            '</div>' +
            '<div class="coinflip-list" id="coinflipList"></div>' +
            '</div>' +
            '<div id="historySection" style="display:none;">' +
            '<div class="coinflip-list" id="coinflipHistory"></div>' +
            '</div>' +
            '</div>';
    },

    getProfileHTML() {
        const badges = this.renderBadges();
        return '<div class="page active">' +
            '<div class="profile-header-card">' +
            '<img class="profile-avatar-large" id="profileAvatar" src="' + this.currentUser.avatar + '">' +
            '<div class="profile-details">' +
            '<h2 id="profileUsername">' + this.currentUser.username + badges + '</h2>' +
            '<div>Level <span id="profileLevel">' + this.currentUser.level + '</span></div>' +
            (this.currentUser.discordLinked ? '<div style="color:var(--accent-green);margin-top:0.5rem;">✅ Discord: ' + this.currentUser.discordUsername + '</div>' : '') +
            '</div>' +
            '</div>' +
            '<div class="profile-stats-grid">' +
            '<div class="profile-stat-card"><div class="icon">💎</div><div class="value" id="profileWagered">0</div><div class="label">Total Wagered</div></div>' +
            '<div class="profile-stat-card"><div class="icon">🏆</div><div class="value" id="profileWon">0</div><div class="label">Total Won</div></div>' +
            '<div class="profile-stat-card"><div class="icon">📉</div><div class="value" id="profileLost">0</div><div class="label">Total Lost</div></div>' +
            '</div>' +
            '<div class="inventory-section">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">' +
            '<h3>📦 My Inventory</h3>' +
            '<button class="action-btn create" onclick="App.openWithdrawModal()">Withdraw Items</button>' +
            '</div>' +
            '<div class="inventory-grid" id="profileInventory"></div>' +
            '</div>' +
            '</div>';
    },

    getLeaderboardHTML() {
        return '<div class="page active">' +
            '<h1 class="page-title">🏆 Leaderboard</h1>' +
            '<div class="leaderboard-list" id="leaderboardList"></div>' +
            '</div>';
    },

    getSettingsHTML() {
        return '<div class="page active">' +
            '<h1 class="page-title">⚙️ Settings</h1>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;padding:2rem;margin-bottom:1.5rem;">' +
            '<h3 style="margin-bottom:1.5rem;">🖼️ Change Avatar</h3>' +
            '<div style="display:flex;align-items:center;gap:1.5rem;margin-bottom:1.5rem;">' +
            '<img src="' + this.currentUser.avatar + '" style="width:80px;height:80px;border-radius:50%;border:3px solid var(--accent-purple);">' +
            '<div style="flex:1;">' +
            '<input type="text" class="modal-input" id="avatarUrlInput" placeholder="Enter image URL" value="' + this.currentUser.avatar + '">' +
            '<p style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.5rem;">Use a direct image link (PNG, JPG, GIF)</p>' +
            '</div>' +
            '</div>' +
            '<button class="modal-btn" onclick="App.changeAvatar()">Update Avatar</button>' +
            '</div>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;padding:2rem;margin-bottom:1.5rem;">' +
            '<h3 style="margin-bottom:1.5rem;">🔗 Link Discord Account</h3>' +
            (this.currentUser.discordLinked ? 
                '<div style="color:var(--accent-green);font-weight:600;">✅ Discord linked: ' + this.currentUser.discordUsername + '</div>' :
                '<p style="color:var(--text-secondary);margin-bottom:1rem;">Link your Discord to receive withdrawal notifications</p>' +
                '<button class="modal-btn" onclick="App.linkDiscord()">Link Discord</button>'
            ) +
            '</div>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;padding:2rem;">' +
            '<h3 style="margin-bottom:1rem;">👤 Account Info</h3>' +
            '<p style="color:var(--text-secondary);">Username: <strong style="color:var(--text-primary);">' + this.currentUser.username + '</strong></p>' +
            '<p style="color:var(--text-secondary);margin-top:0.5rem;">Email: <strong style="color:var(--text-primary);">' + (this.currentUser.email || 'Not set') + '</strong></p>' +
            '</div>' +
            '</div>';
    },

    getAdminHTML() {
        return '<div class="page active">' +
            '<h1 class="page-title">🛡️ Admin Panel</h1>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;padding:2rem;margin-bottom:1.5rem;">' +
            '<h3 style="margin-bottom:1.5rem;">⚠️ Site Maintenance</h3>' +
            '<p style="color:var(--text-secondary);margin-bottom:1rem;">Enable maintenance mode to block all users from accessing the site</p>' +
            '<button class="modal-btn" style="background:var(--accent-orange);" onclick="App.toggleMaintenance()">Toggle Maintenance</button>' +
            '</div>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;padding:2rem;margin-bottom:1.5rem;">' +
            '<h3 style="margin-bottom:1.5rem;">🚫 Cancel All Coinflips</h3>' +
            '<p style="color:var(--text-secondary);margin-bottom:1rem;">Cancel all active coinflips on the site</p>' +
            '<div style="display:flex;gap:1rem;">' +
            '<button class="modal-btn" style="background:var(--accent-purple);" onclick="App.adminCancelAllCoinflips(true)">Cancel & Return Items</button>' +
            '<button class="modal-btn" style="background:var(--accent-red);" onclick="App.adminCancelAllCoinflips(false)">Cancel & Delete Items</button>' +
            '</div>' +
            '</div>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;padding:2rem;margin-bottom:1.5rem;">' +
            '<h3 style="margin-bottom:1.5rem;">🗑️ Reset User Inventory</h3>' +
            '<input type="text" class="modal-input" id="adminResetUsername" placeholder="Username">' +
            '<button class="modal-btn" style="background:var(--accent-orange);" onclick="App.adminResetInventory()">Reset Inventory</button>' +
            '</div>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;padding:2rem;margin-bottom:1.5rem;">' +
            '<h3 style="margin-bottom:1.5rem;">💀 WIPE ALL DATA</h3>' +
            '<p style="color:var(--accent-red);margin-bottom:1rem;font-weight:600;">⚠️ WARNING: This will reset ALL inventories, stats, leaderboard, coinflips and chat!</p>' +
            '<button class="modal-btn" style="background:var(--accent-red);" onclick="App.adminWipeAll()">WIPE EVERYTHING</button>' +
            '</div>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;padding:2rem;margin-bottom:1.5rem;">' +
            '<h3 style="margin-bottom:1.5rem;">➕ Add Item with Traits & Mutation</h3>' +
            '<input type="text" class="modal-input" id="adminAddUsername" placeholder="Username" style="margin-bottom:1rem;">' +
            '<select class="modal-input" id="adminAddItem" style="margin-bottom:1rem;"></select>' +
            '<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin-bottom:1rem;">' +
            '<div style="font-weight:600;margin-bottom:0.5rem;">✨ Traits (Multiple):</div>' +
            '<div id="adminTraitsContainer" style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.5rem;"></div>' +
            '</div>' +
            '<div style="background:var(--bg-tertiary);padding:1rem;border-radius:8px;margin-bottom:1rem;">' +
            '<div style="font-weight:600;margin-bottom:0.5rem;">🔮 Mutation (Only 1):</div>' +
            '<select class="modal-input" id="adminAddMutation">' +
            '<option value="">None</option>' +
            '</select>' +
            '</div>' +
            '<button class="modal-btn" onclick="App.adminAddItemWithTraits()">Add Item</button>' +
            '</div>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:20px;padding:2rem;">' +
            '<h3 style="margin-bottom:1.5rem;">👥 All Users</h3>' +
            '<div id="adminUsersList"></div>' +
            '</div>' +
            '</div>';
    },

    renderBadges() {
        if (!this.currentUser.badges || this.currentUser.badges.length === 0) return '';
        let html = ' ';
        for (let i = 0; i < this.currentUser.badges.length; i++) {
            const badge = this.currentUser.badges[i];
            if (badge === 'lvl99') html += '<img src="Badge.99LvL.png" class="user-badge" title="Level 99">';
            else if (badge === 'whale') html += '<img src="Badge.Whale.png" class="user-badge" title="Whale">';
            else if (badge === 'highroller') html += '<img src="HighRoller.LvL.png" class="user-badge" title="High Roller">';
        }
        return html;
    },

    async updateUI() {
        const balance = this.isOnline 
            ? await SupaDB.getUserBalance(this.currentUser.username)
            : DB.getUserBalance(this.currentUser.username);
            
        const balanceEl = document.getElementById('headerBalance');
        const levelEl = document.getElementById('headerLevel');
        const avatarEl = document.getElementById('headerAvatar');
        
        if (balanceEl) balanceEl.textContent = this.formatNumber(balance);
        if (levelEl) levelEl.textContent = this.currentUser.level;
        if (avatarEl) avatarEl.src = this.currentUser.avatar;

        const profileWagered = document.getElementById('profileWagered');
        const profileWon = document.getElementById('profileWon');
        const profileLost = document.getElementById('profileLost');

        if (profileWagered) profileWagered.textContent = this.formatNumber(this.currentUser.stats.wagered);
        if (profileWon) profileWon.textContent = this.formatNumber(this.currentUser.stats.won);
        if (profileLost) profileLost.textContent = this.formatNumber(this.currentUser.stats.lost);

        this.renderInventory();
    },

    renderInventory() {
        const container = document.getElementById('profileInventory');
        if (!container) return;

        const items = this.currentUser.inventory;
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-inventory">No items in inventory</div>';
            return;
        }

        let html = '';
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemValue = item.finalValue || item.value || 0;
            
            // Ajouter classe d'effet si mutation existe
            let effectClass = '';
            if (item.mutation) {
                const mutationEffects = {
                    rainbow: 'rainbow-glow',
                    lava: 'lava-glow',
                    galaxy: 'galaxy-glow',
                    yinyang: 'yinyang-glow',
                    gold: 'gold-glow',
                    diamond: 'diamond-glow',
                    bloodrot: 'bloodrot-glow',
                    candy: 'candy-glow',
                    radioactive: 'radioactive-glow'
                };
                if (mutationEffects[item.mutation]) {
                    effectClass = ' mutation-' + mutationEffects[item.mutation];
                }
            }
            
            html += '<div class="inventory-item' + effectClass + '">' +
                '<div class="icon"><img src="' + item.icon + '" alt="' + item.name + '"></div>' +
                '<div class="name">' + item.name + '</div>' +
                '<div class="value">' + this.formatNumber(itemValue) + ' 💎</div>' +
                '</div>';
        }
        container.innerHTML = html;
    },

    formatNumber(num) {
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
    },

    async loadCoinflips() {
        let coinflips = [];
        if (this.isOnline) {
            coinflips = await SupaDB.getAllActiveCoinflips();
        } else {
            coinflips = DB.getAllActiveCoinflips();
        }
            
        const container = document.getElementById('coinflipList');
        if (!container) return;

        const roomsEl = document.getElementById('cfStatRooms');
        const valueEl = document.getElementById('cfStatValue');
        const itemsEl = document.getElementById('cfStatItems');
        const headsEl = document.getElementById('filterHeadsCount');
        const tailsEl = document.getElementById('filterTailsCount');

        const activeCoinflips = coinflips.filter(function(cf) {
            const status = this.isOnline ? cf.status : cf.status;
            const winner = this.isOnline ? cf.winner : cf.winner;
            return status === 'waiting' || (status === 'playing' && !winner);
        }.bind(this));

        if (roomsEl) roomsEl.textContent = activeCoinflips.length;
        
        let totalValue = 0;
        let totalItems = 0;
        let headsCount = 0;
        
        for (let i = 0; i < activeCoinflips.length; i++) {
            const cf = activeCoinflips[i];
            totalValue += this.isOnline ? cf.total_value : cf.totalValue;
            totalItems += this.isOnline ? cf.creator_items.length : cf.creatorItems.length;
            const side = this.isOnline ? cf.creator_side : cf.creatorSide;
            if (side === 'H') headsCount++;
        }
        
        if (valueEl) valueEl.textContent = this.formatNumber(totalValue);
        if (itemsEl) itemsEl.textContent = totalItems;
        if (headsEl) headsEl.textContent = headsCount;
        if (tailsEl) tailsEl.textContent = activeCoinflips.length - headsCount;

        if (coinflips.length === 0) {
            container.innerHTML = '<div class="no-games-message"><div class="icon">🪙</div><p>No active games</p><p style="font-size:0.9rem;margin-top:0.5rem;">Be the first to create one!</p></div>';
            return;
        }

        let html = '';
        for (let i = 0; i < coinflips.length; i++) {
            const cf = coinflips[i];
            const status = this.isOnline ? cf.status : cf.status;
            const creator = this.isOnline ? cf.creator : cf.creator;
            const creatorAvatar = this.isOnline ? cf.creator_avatar : cf.creatorAvatar;
            const creatorSide = this.isOnline ? cf.creator_side : cf.creatorSide;
            const creatorItems = this.isOnline ? cf.creator_items : cf.creatorItems;
            const totalValue = this.isOnline ? cf.total_value : cf.totalValue;
            const cfId = this.isOnline ? cf.id : cf.id;
            const winner = this.isOnline ? cf.winner : cf.winner;
            
            // Si le coinflip a un winner, c'est terminé
            if (winner) {
                const opponent = this.isOnline ? cf.opponent : cf.opponent;
                const opponentAvatar = this.isOnline ? cf.opponent_avatar : cf.opponentAvatar;
                const winnerSide = this.isOnline ? cf.winner_side : cf.winnerSide;
                const winnerSideImg = winnerSide === 'H' ? 'Head_Tile.png' : 'Tails_Tile.png';
                
                html += '<div class="coinflip-card finished">' +
                    '<div class="cf-players">' +
                    '<div class="cf-player' + (winner === creator ? '' : ' waiting') + '">' +
                    '<img class="cf-player-avatar" src="' + creatorAvatar + '">' +
                    '<div class="cf-player-info">' +
                    '<div class="name ' + (winner === creator ? 'purple' : 'waiting') + '">' + creator + (winner === creator ? ' 🏆' : ' ❌') + '</div>' +
                    '</div>' +
                    '</div>' +
                    '<img src="' + winnerSideImg + '" style="width:48px;height:48px;border-radius:50%;border:3px solid var(--accent-green);box-shadow:0 0 20px var(--accent-green);">' +
                    '<div class="vs-badge" style="background:var(--accent-green);font-size:1.5rem;">⚡</div>' +
                    '<div class="cf-player' + (winner === opponent ? '' : ' waiting') + '">' +
                    '<img class="cf-player-avatar" src="' + opponentAvatar + '">' +
                    '<div class="cf-player-info">' +
                    '<div class="name ' + (winner === opponent ? 'orange' : 'waiting') + '">' + opponent + (winner === opponent ? ' 🏆' : ' ❌') + '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '<div class="cf-value" style="background:linear-gradient(135deg,rgba(34,197,94,0.2),transparent);border:2px solid var(--accent-green);box-shadow:0 0 20px rgba(34,197,94,0.3);">' +
                    '<div class="amount" style="color:var(--accent-green);font-size:1.8rem;">' + this.formatNumber(totalValue * 2) + ' 💎</div>' +
                    '<div class="label" style="color:var(--accent-green);font-weight:700;">🎉 WINNER POT</div>' +
                    '</div>' +
                    '<button class="join-btn" style="background:var(--accent-green);pointer-events:none;cursor:default;">FINISHED</button>' +
                    '</div>';
                continue;
            }
            
            const sideImg = creatorSide === 'H' ? 'Head_Tile.png' : 'Tails_Tile.png';
            
            let itemsPreview = '';
            for (let j = 0; j < Math.min(4, creatorItems.length); j++) {
                itemsPreview += '<img src="' + creatorItems[j].icon + '" style="width:32px;height:32px;margin-right:-8px;border-radius:6px;border:2px solid var(--bg-secondary);">';
            }
            if (creatorItems.length > 4) {
                itemsPreview += '<span style="font-size:0.85rem;color:var(--text-secondary);margin-left:8px;">+' + (creatorItems.length - 4) + '</span>';
            }
            
            html += '<div class="coinflip-card">' +
                '<div class="cf-players">' +
                '<div class="cf-player">' +
                '<img class="cf-player-avatar" src="' + creatorAvatar + '">' +
                '<div class="cf-player-info">' +
                '<div class="name purple">' + creator + '</div>' +
                '<div style="display:flex;align-items:center;margin-top:0.25rem;">' + itemsPreview + '</div>' +
                '</div>' +
                '</div>' +
                '<img src="' + sideImg + '" style="width:42px;height:42px;border-radius:50%;border:2px solid var(--accent-purple);">' +
                '<div class="vs-badge">VS</div>' +
                '<div class="cf-player waiting">' +
                '<img class="cf-player-avatar" src="https://ui-avatars.com/api/?name=?&background=2a2e3a&color=8b8fa3&size=128">' +
                '<div class="cf-player-info">' +
                '<div class="name waiting">Waiting...</div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="cf-value">' +
                '<div class="amount">' + this.formatNumber(totalValue) + ' 💎</div>' +
                '<div class="label">Value</div>' +
                '</div>';
                
            if (creator !== this.currentUser.username) {
                html += '<button class="join-btn" onclick="App.openJoinModal(\'' + cfId + '\')">Join</button>';
            } else {
                html += '<button class="join-btn" style="background:var(--accent-red);" onclick="App.cancelCoinflip(\'' + cfId + '\')">Cancel</button>';
            }
            
            html += '</div>';
        }
        
        container.innerHTML = html;
    },

    linkDiscord() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'linkDiscordModal';
        modal.innerHTML = '<div class="modal">' +
            '<div class="modal-header">' +
            '<h2>🔗 Link Discord</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'linkDiscordModal\')">×</button>' +
            '</div>' +
            '<p style="color:var(--text-secondary);margin-bottom:1.5rem;">To link your Discord account, join our server and open a ticket in <strong>#link-account</strong></p>' +
            '<div style="background:var(--bg-tertiary);padding:1.25rem;border-radius:12px;margin-bottom:1.5rem;">' +
            '<p style="font-weight:600;margin-bottom:0.75rem;">Steps:</p>' +
            '<ol style="color:var(--text-secondary);font-size:0.95rem;margin-left:1.25rem;line-height:1.8;">' +
            '<li>Join our Discord server</li>' +
            '<li>Go to #link-account</li>' +
            '<li>Open a ticket</li>' +
            '<li>Provide your username: <strong style="color:var(--accent-purple);">' + this.currentUser.username + '</strong></li>' +
            '<li>Staff will link your account</li>' +
            '</ol>' +
            '</div>' +
            '<a href="#" class="discord-btn" style="width:100%;display:flex;justify-content:center;">Join Discord Server</a>' +
            '</div>';
        document.body.appendChild(modal);
    },

    openWithdrawModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'withdrawModal';
        modal.innerHTML = '<div class="modal wide">' +
            '<div class="modal-header">' +
            '<h2>💎 Withdraw Items</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'withdrawModal\')">×</button>' +
            '</div>' +
            '<p style="color:var(--text-secondary);margin-bottom:1rem;">Select items to withdraw:</p>' +
            '<div class="items-grid" id="withdrawItemsGrid">' +
            (this.currentUser.inventory.length === 0 ? 
                '<p style="color:var(--text-secondary);grid-column:span 4;text-align:center;padding:2rem;">No items to withdraw</p>' :
                this.currentUser.inventory.map((item, i) => 
                    '<div class="item-card" data-id="' + item.uniqueId + '" onclick="App.toggleWithdrawItem(this)">' +
                    '<div class="icon"><img src="' + item.icon + '" alt="' + item.name + '"></div>' +
                    '<div class="name">' + item.name + '</div>' +
                    '<div class="value">' + item.value + ' 💎</div>' +
                    '</div>'
                ).join('')
            ) +
            '</div>' +
            '<div class="selected-summary">' +
            '<span class="label">Selected Total:</span>' +
            '<span class="total" id="withdrawTotal">0 💎</span>' +
            '</div>' +
            '<button class="modal-btn success" onclick="App.confirmWithdraw()">Request Withdrawal</button>' +
            '</div>';
        document.body.appendChild(modal);
        this.selectedWithdrawItems = [];
    },

    toggleWithdrawItem(el) {
        const uniqueId = el.dataset.id;
        if (el.classList.contains('selected')) {
            el.classList.remove('selected');
            this.selectedWithdrawItems = this.selectedWithdrawItems.filter(id => id !== uniqueId);
        } else {
            el.classList.add('selected');
            this.selectedWithdrawItems.push(uniqueId);
        }

        let total = 0;
        for (let i = 0; i < this.selectedWithdrawItems.length; i++) {
            const item = this.currentUser.inventory.find(it => it.uniqueId === this.selectedWithdrawItems[i]);
            if (item) total += item.value;
        }
        
        const totalEl = document.getElementById('withdrawTotal');
        if (totalEl) totalEl.textContent = this.formatNumber(total) + ' 💎';
    },

    async confirmWithdraw() {
        if (!this.selectedWithdrawItems || this.selectedWithdrawItems.length === 0) {
            this.showToast('Select items to withdraw!', 'error');
            return;
        }

        if (!this.currentUser.discordLinked) {
            this.showToast('Link your Discord first!', 'error');
            this.closeModal('withdrawModal');
            setTimeout(() => this.navigateTo('settings'), 500);
            return;
        }

        this.closeModal('withdrawModal');
        this.showToast('Withdrawal requested! Open a ticket on Discord in #withdraw category.', 'success');
    },

    openWalletModal() {
        this.walletTab = 'deposit';
        this.selectedWalletItems = [];
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'walletModal';
        modal.innerHTML = '<div class="modal wallet-modal">' +
            '<div class="wallet-header">' +
            '<h2>💼 Wallet</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'walletModal\')">×</button>' +
            '</div>' +
            '<div class="wallet-tabs">' +
            '<button class="wallet-tab active" onclick="App.switchWalletTab(\'deposit\', this)">Deposit</button>' +
            '<button class="wallet-tab" onclick="App.switchWalletTab(\'withdraw\', this)">Withdraw</button>' +
            '</div>' +
            '<div class="wallet-filters">' +
            '<input type="text" class="wallet-search" id="walletSearch" placeholder="Search for an item..." oninput="App.filterWalletItems()">' +
            '<select class="wallet-sort" id="walletSort" onchange="App.filterWalletItems()">' +
            '<option value="highest">Highest to Lowest</option>' +
            '<option value="lowest">Lowest to Highest</option>' +
            '<option value="name">Name (A-Z)</option>' +
            '</select>' +
            '</div>' +
            '<div class="wallet-balance">' +
            '<span class="balance-icon">💎</span>' +
            '<span id="walletBalanceAmount">0B$</span>' +
            '<span class="balance-items" id="walletItemCount">0 items</span>' +
            '</div>' +
            '<div class="wallet-items-grid" id="walletItemsGrid"></div>' +
            '<div class="wallet-footer">' +
            '<button class="wallet-footer-btn secondary" onclick="App.selectAllWalletItems()">Select all</button>' +
            '<button class="wallet-footer-btn primary" onclick="App.withdrawItems()" id="withdrawBtn">Withdraw B$0</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(modal);
        
        this.loadWalletItems();
    },

    switchWalletTab(tab, el) {
        this.walletTab = tab;
        document.querySelectorAll('.wallet-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        
        this.selectedWalletItems = [];
        this.loadWalletItems();
    },

    async loadWalletItems() {
        if (this.isOnline) {
            const user = await SupaDB.getUser(this.currentUser.username);
            this.currentUser.inventory = user.inventory || [];
        } else {
            this.currentUser = DB.getUser(this.currentUser.username);
        }
        
        this.filterWalletItems();
    },

    filterWalletItems() {
        const search = document.getElementById('walletSearch');
        const sort = document.getElementById('walletSort');
        const grid = document.getElementById('walletItemsGrid');
        const balanceEl = document.getElementById('walletBalanceAmount');
        const countEl = document.getElementById('walletItemCount');
        
        if (!grid) return;
        
        let items = [...this.currentUser.inventory];
        
        // Recherche
        if (search && search.value) {
            const query = search.value.toLowerCase();
            items = items.filter(item => item.name.toLowerCase().includes(query));
        }
        
        // Tri
        if (sort) {
            if (sort.value === 'highest') {
                items.sort((a, b) => (b.finalValue || b.value) - (a.finalValue || a.value));
            } else if (sort.value === 'lowest') {
                items.sort((a, b) => (a.finalValue || a.value) - (b.finalValue || b.value));
            } else if (sort.value === 'name') {
                items.sort((a, b) => a.name.localeCompare(b.name));
            }
        }
        
        // Affichage
        if (items.length === 0) {
            grid.innerHTML = '<div class="wallet-empty">' +
                '<div>No items!</div>' +
                '<p>No items were found...</p>' +
                '<button class="wallet-deposit-btn" onclick="alert(\'Contact staff on Discord to deposit items\')">Deposit</button>' +
                '</div>';
            if (balanceEl) balanceEl.textContent = '0B$';
            if (countEl) countEl.textContent = '0 items';
            return;
        }
        
        let html = '';
        let totalValue = 0;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemValue = item.finalValue || item.value || 0;
            totalValue += itemValue;
            
            const isSelected = this.selectedWalletItems.includes(item.uniqueId);
            const selectedClass = isSelected ? ' selected' : '';
            
            let effectClass = '';
            if (item.mutation && !this.isOnline) {
                const mutation = DB.data.availableMutations[item.mutation];
                if (mutation && mutation.effect) {
                    effectClass = ' mutation-' + mutation.effect;
                }
            }
            
            html += '<div class="wallet-item' + selectedClass + effectClass + '" onclick="App.toggleWalletItem(\'' + item.uniqueId + '\')">' +
                '<img src="' + item.icon + '" alt="' + item.name + '">' +
                '<div class="wallet-item-name">' + item.name + '</div>' +
                '<div class="wallet-item-value">' + this.formatNumber(itemValue) + ' 💎</div>' +
                '</div>';
        }
        grid.innerHTML = html;
        
        if (balanceEl) balanceEl.textContent = this.formatNumber(totalValue / 1000) + 'B$';
        if (countEl) countEl.textContent = items.length + ' items';
        
        this.updateWithdrawButton();
    },

    toggleWalletItem(uniqueId) {
        const index = this.selectedWalletItems.indexOf(uniqueId);
        if (index === -1) {
            this.selectedWalletItems.push(uniqueId);
        } else {
            this.selectedWalletItems.splice(index, 1);
        }
        this.filterWalletItems();
    },

    selectAllWalletItems() {
        if (this.selectedWalletItems.length === this.currentUser.inventory.length) {
            this.selectedWalletItems = [];
        } else {
            this.selectedWalletItems = this.currentUser.inventory.map(item => item.uniqueId);
        }
        this.filterWalletItems();
    },

    updateWithdrawButton() {
        const btn = document.getElementById('withdrawBtn');
        if (!btn) return;
        
        let totalValue = 0;
        for (let i = 0; i < this.selectedWalletItems.length; i++) {
            const item = this.currentUser.inventory.find(it => it.uniqueId === this.selectedWalletItems[i]);
            if (item) {
                totalValue += item.finalValue || item.value || 0;
            }
        }
        
        btn.textContent = 'Withdraw B$' + this.formatNumber(totalValue / 1000);
        btn.disabled = this.selectedWalletItems.length === 0;
    },

    withdrawItems() {
        if (this.selectedWalletItems.length === 0) {
            this.showToast('Select items to withdraw!', 'error');
            return;
        }
        
        this.showToast('Contact staff on Discord to withdraw items', 'info');
    },

    async openCreateModal() {
        this.selectedItems = [];
        this.selectedSide = 'H';
        
        if (this.isOnline) {
            const user = await SupaDB.getUser(this.currentUser.username);
            this.currentUser.inventory = user.inventory || [];
        } else {
            this.currentUser = DB.getUser(this.currentUser.username);
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'createCfModal';
        
        let itemsHtml = '';
        if (this.currentUser.inventory.length === 0) {
            itemsHtml = '<p style="color:var(--text-secondary);grid-column:span 4;text-align:center;padding:2rem;">No items in inventory</p>';
        } else {
            for (let i = 0; i < this.currentUser.inventory.length; i++) {
                const item = this.currentUser.inventory[i];
                const itemValue = item.finalValue || item.value || 0;
                
                let effectClass = '';
                if (item.mutation) {
                    const mutationEffects = {
                        rainbow: 'rainbow-glow',
                        lava: 'lava-glow',
                        galaxy: 'galaxy-glow',
                        yinyang: 'yinyang-glow',
                        gold: 'gold-glow',
                        diamond: 'diamond-glow',
                        bloodrot: 'bloodrot-glow',
                        candy: 'candy-glow',
                        radioactive: 'radioactive-glow'
                    };
                    if (mutationEffects[item.mutation]) {
                        effectClass = ' mutation-' + mutationEffects[item.mutation];
                    }
                }
                
                itemsHtml += '<div class="item-card' + effectClass + '" data-id="' + item.uniqueId + '" data-value="' + itemValue + '" onclick="App.toggleItem(this,\'create\')">' +
                    '<div class="icon"><img src="' + item.icon + '" alt="' + item.name + '"></div>' +
                    '<div class="name">' + item.name + '</div>' +
                    '<div class="value">' + this.formatNumber(itemValue) + ' 💎</div>' +
                    '</div>';
            }
        }
        
        modal.innerHTML = '<div class="modal wide">' +
            '<div class="modal-header">' +
            '<h2>🎰 Create Coinflip</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'createCfModal\')">×</button>' +
            '</div>' +
            '<p style="color:var(--text-secondary);margin-bottom:1rem;">Select items to wager:</p>' +
            '<div class="items-grid" id="createItemsGrid">' + itemsHtml + '</div>' +
            '<div class="selected-summary">' +
            '<span class="label">Total:</span>' +
            '<span class="total" id="createTotal">0 💎</span>' +
            '</div>' +
            '<p style="color:var(--text-secondary);margin-bottom:0.75rem;">Choose your side:</p>' +
            '<div class="side-selector">' +
            '<div class="side-option purple selected" data-side="H" onclick="App.selectSide(\'H\',this)">' +
            '<img src="Head_Tile.png" style="width:64px;height:64px;margin-bottom:0.5rem;" onerror="this.style.display=\'none\'"><div>Heads</div>' +
            '</div>' +
            '<div class="side-option" data-side="T" onclick="App.selectSide(\'T\',this)">' +
            '<img src="Tails_Tile.png" style="width:64px;height:64px;margin-bottom:0.5rem;" onerror="this.style.display=\'none\'"><div>Tails</div>' +
            '</div>' +
            '</div>' +
            '<button class="modal-btn success" onclick="App.createCoinflip()">Create Coinflip</button>' +
            '</div>';
            
        document.body.appendChild(modal);
    },

    async openJoinModal(coinflipId) {
        this.selectedItems = [];
        this.joiningCoinflipId = coinflipId;
        
        if (this.isOnline) {
            const user = await SupaDB.getUser(this.currentUser.username);
            this.currentUser.inventory = user.inventory || [];
        } else {
            this.currentUser = DB.getUser(this.currentUser.username);
        }

        const cf = this.isOnline 
            ? await SupaDB.getCoinflip(coinflipId)
            : DB.getCoinflip(coinflipId);
            
        if (!cf) return;

        const creator = this.isOnline ? cf.creator : cf.creator;
        const totalValue = this.isOnline ? cf.total_value : cf.totalValue;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'joinCfModal';
        
        let itemsHtml = '';
        if (this.currentUser.inventory.length === 0) {
            itemsHtml = '<p style="color:var(--text-secondary);grid-column:span 4;text-align:center;padding:2rem;">No items in inventory</p>';
        } else {
            for (let i = 0; i < this.currentUser.inventory.length; i++) {
                const item = this.currentUser.inventory[i];
                const itemValue = item.finalValue || item.value || 0;
                
                let effectClass = '';
                if (item.mutation) {
                    const mutationEffects = {
                        rainbow: 'rainbow-glow',
                        lava: 'lava-glow',
                        galaxy: 'galaxy-glow',
                        yinyang: 'yinyang-glow',
                        gold: 'gold-glow',
                        diamond: 'diamond-glow',
                        bloodrot: 'bloodrot-glow',
                        candy: 'candy-glow',
                        radioactive: 'radioactive-glow'
                    };
                    if (mutationEffects[item.mutation]) {
                        effectClass = ' mutation-' + mutationEffects[item.mutation];
                    }
                }
                
                itemsHtml += '<div class="item-card' + effectClass + '" data-id="' + item.uniqueId + '" data-value="' + itemValue + '" onclick="App.toggleItem(this,\'join\')">' +
                    '<div class="icon"><img src="' + item.icon + '" alt="' + item.name + '"></div>' +
                    '<div class="name">' + item.name + '</div>' +
                    '<div class="value">' + this.formatNumber(itemValue) + ' 💎</div>' +
                    '</div>';
            }
        }
        
        modal.innerHTML = '<div class="modal wide">' +
            '<div class="modal-header">' +
            '<h2>⚔️ Join Coinflip</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'joinCfModal\')">×</button>' +
            '</div>' +
            '<p>Joining game by: <strong style="color:var(--accent-purple);">' + creator + '</strong></p>' +
            '<p style="color:var(--text-secondary);margin-bottom:1rem;">Required value: <strong style="color:var(--accent-purple);">' + this.formatNumber(totalValue) + ' 💎</strong> (90-110%)</p>' +
            '<div class="items-grid" id="joinItemsGrid">' + itemsHtml + '</div>' +
            '<div class="selected-summary">' +
            '<span class="label">Total:</span>' +
            '<span class="total" id="joinTotal">0 💎</span>' +
            '</div>' +
            '<button class="modal-btn success" onclick="App.confirmJoinCoinflip()">Join Game</button>' +
            '</div>';
            
        document.body.appendChild(modal);
    },

    toggleItem(el, modalType) {
        const uniqueId = el.dataset.id;
        if (el.classList.contains('selected')) {
            el.classList.remove('selected');
            this.selectedItems = this.selectedItems.filter(i => i.uniqueId !== uniqueId);
        } else {
            el.classList.add('selected');
            for (let i = 0; i < this.currentUser.inventory.length; i++) {
                if (this.currentUser.inventory[i].uniqueId === uniqueId) {
                    this.selectedItems.push(this.currentUser.inventory[i]);
                    break;
                }
            }
        }

        let total = 0;
        for (let i = 0; i < this.selectedItems.length; i++) {
            total += this.selectedItems[i].finalValue || this.selectedItems[i].value || 0;
        }
        
        const totalEl = document.getElementById(modalType === 'create' ? 'createTotal' : 'joinTotal');
        if (totalEl) totalEl.textContent = this.formatNumber(total) + ' 💎';
    },

    selectSide(side, el) {
        this.selectedSide = side;
        document.querySelectorAll('.side-option').forEach(opt => {
            opt.classList.remove('selected', 'purple', 'orange');
        });
        el.classList.add('selected');
        if (side === 'H') {
            el.classList.add('purple');
        } else {
            el.classList.add('orange');
        }
    },

    async createCoinflip() {
        if (this.selectedItems.length === 0) {
            this.showToast('Select items!', 'error');
            return;
        }

        // PROTECTION ANTI-SPAM
        if (this.isCreatingCoinflip) {
            return;
        }
        this.isCreatingCoinflip = true;

        const cf = this.isOnline
            ? await SupaDB.createCoinflip(this.currentUser.username, this.selectedItems, this.selectedSide)
            : DB.createCoinflip(this.currentUser.username, this.selectedItems, this.selectedSide);
            
        if (cf) {
            this.closeModal('createCfModal');
            this.showToast('Coinflip created!', 'success');
            this.loadCoinflips();
            
            if (this.isOnline) {
                const user = await SupaDB.getUser(this.currentUser.username);
                this.currentUser.inventory = user.inventory || [];
            } else {
                this.currentUser = DB.getUser(this.currentUser.username);
            }
            
            this.updateUI();
        }

        // Débloquer après 1 seconde
        setTimeout(() => {
            this.isCreatingCoinflip = false;
        }, 1000);
    },

    async confirmJoinCoinflip() {
        // PROTECTION ANTI-SPAM
        if (this.isJoiningCoinflip) {
            return;
        }
        this.isJoiningCoinflip = true;

        const cf = this.isOnline
            ? await SupaDB.getCoinflip(this.joiningCoinflipId)
            : DB.getCoinflip(this.joiningCoinflipId);
            
        if (!cf) return;

        let selectedTotal = 0;
        for (let i = 0; i < this.selectedItems.length; i++) {
            selectedTotal += this.selectedItems[i].value;
        }
        
        const cfValue = this.isOnline ? cf.total_value : cf.totalValue;
        const minReq = cfValue * 0.9;
        const maxReq = cfValue * 1.1;

        if (selectedTotal < minReq || selectedTotal > maxReq) {
            this.showToast('Value must be ' + this.formatNumber(minReq) + '-' + this.formatNumber(maxReq), 'error');
            this.isJoiningCoinflip = false;
            return;
        }

        const joined = this.isOnline
            ? await SupaDB.joinCoinflip(this.joiningCoinflipId, this.currentUser.username, this.selectedItems)
            : DB.joinCoinflip(this.joiningCoinflipId, this.currentUser.username, this.selectedItems);
            
        if (joined) {
            this.closeModal('joinCfModal');
            
            // Sauvegarder l'ID du coinflip en cours dans localStorage pour que le créateur le voit
            localStorage.setItem('brainrotflip_active_coinflip', this.joiningCoinflipId);
            
            // Démarrer l'animation immédiatement
            this.startCoinflipAnimation(joined);
        }

        // Débloquer après 1 seconde
        setTimeout(() => {
            this.isJoiningCoinflip = false;
        }, 1000);
    },

    async startCoinflipAnimation(cf) {
        // EMPÊCHER DOUBLE ANIMATION
        if (document.getElementById('cfAnimationModal')) {
            console.log('Animation already running, skipping...');
            return;
        }

        const cfId = this.isOnline ? cf.id : cf.id;

        const creator = this.isOnline ? cf.creator : cf.creator;
        const creatorAvatar = this.isOnline ? cf.creator_avatar : cf.creatorAvatar;
        const creatorSide = this.isOnline ? cf.creator_side : cf.creatorSide;
        const creatorItems = this.isOnline ? cf.creator_items : cf.creatorItems;
        const opponent = this.isOnline ? cf.opponent : cf.opponent;
        const opponentAvatar = this.isOnline ? cf.opponent_avatar : cf.opponentAvatar;
        const opponentItems = this.isOnline ? cf.opponent_items : cf.opponentItems;
        const totalValue = this.isOnline ? cf.total_value : cf.totalValue;

        const creatorSideImg = creatorSide === 'H' ? 'Head_Tile.png' : 'Tails_Tile.png';
        const opponentSide = creatorSide === 'H' ? 'T' : 'H';
        const opponentSideImg = opponentSide === 'H' ? 'Head_Tile.png' : 'Tails_Tile.png';

        // Vidéo aléatoire pour le suspense (sera ignorée, on attend le vrai résultat)
        const randomVideo = Math.random() < 0.5 ? 'assets/H_Tiles.mp4' : 'assets/T_Tails.mp4';

        let creatorTotal = 0;
        for (let i = 0; i < creatorItems.length; i++) {
            creatorTotal += creatorItems[i].finalValue || creatorItems[i].value || 0;
        }
        let opponentTotal = 0;
        for (let i = 0; i < opponentItems.length; i++) {
            opponentTotal += opponentItems[i].finalValue || opponentItems[i].value || 0;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'cfAnimationModal';
        modal.style.zIndex = '99999';
        
        let creatorItemsHtml = '';
        for (let i = 0; i < creatorItems.length; i++) {
            creatorItemsHtml += '<div class="bloxyx-item">' +
                '<img src="' + creatorItems[i].icon + '">' +
                '<div class="item-name">' + creatorItems[i].name + '</div>' +
                '<div class="item-value">B$' + this.formatNumber(creatorItems[i].value / 1000) + '</div>' +
                '</div>';
        }

        let opponentItemsHtml = '';
        for (let i = 0; i < opponentItems.length; i++) {
            opponentItemsHtml += '<div class="bloxyx-item">' +
                '<img src="' + opponentItems[i].icon + '">' +
                '<div class="item-name">' + opponentItems[i].name + '</div>' +
                '<div class="item-value">B$' + this.formatNumber(opponentItems[i].value / 1000) + '</div>' +
                '</div>';
        }

        modal.innerHTML = '<div class="bloxyx-modal">' +
            '<button class="bloxyx-close" onclick="App.closeModal(\'cfAnimationModal\')">×</button>' +
            '<div class="bloxyx-header">Bx | Bloxyx</div>' +
            '<div class="bloxyx-players-section">' +
            '<div class="bloxyx-player-card">' +
            '<img src="' + creatorAvatar + '" class="bloxyx-avatar">' +
            '<img src="' + creatorSideImg + '" class="bloxyx-side-badge-creator">' +
            '<div class="bloxyx-username">' + creator + '</div>' +
            '</div>' +
            '<div class="bloxyx-vs-coin">' +
            '<video id="coinVideo" class="bloxyx-coin-video" muted autoplay>' +
            '<source src="' + randomVideo + '" type="video/mp4">' +
            '</video>' +
            '</div>' +
            '<div class="bloxyx-player-card">' +
            '<img src="' + opponentAvatar + '" class="bloxyx-avatar">' +
            '<img src="' + opponentSideImg + '" class="bloxyx-side-badge-opponent">' +
            '<div class="bloxyx-username">' + opponent + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="bloxyx-game-id"># ' + String(cfId).substring(3, 20) + '</div>' +
            '<div class="bloxyx-items-section">' +
            '<div class="bloxyx-items-column">' +
            '<div class="bloxyx-total"><span class="coin-icon">💎</span> B$' + this.formatNumber(creatorTotal / 1000) + '</div>' +
            '<div class="bloxyx-percentage">' + ((creatorTotal / (creatorTotal + opponentTotal)) * 100).toFixed(2) + '%</div>' +
            '<div class="bloxyx-items-list">' + creatorItemsHtml + '</div>' +
            '</div>' +
            '<div class="bloxyx-items-column">' +
            '<div class="bloxyx-total"><span class="coin-icon">💎</span> B$' + this.formatNumber(opponentTotal / 1000) + '</div>' +
            '<div class="bloxyx-percentage">' + ((opponentTotal / (creatorTotal + opponentTotal)) * 100).toFixed(2) + '%</div>' +
            '<div class="bloxyx-items-list">' + opponentItemsHtml + '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
            
        document.body.appendChild(modal);

        const video = document.getElementById('coinVideo');
        const self = this;
        
        video.onended = async function() {
            // NE PAS passer winnerSide - il sera calculé par finishCoinflip
            const result = self.isOnline
                ? await SupaDB.finishCoinflip(cfId, null)
                : DB.finishCoinflip(cfId, null);

            if (self.isOnline) {
                const user = await SupaDB.getUser(self.currentUser.username);
                self.currentUser.inventory = user.inventory || [];
                self.currentUser.stats = {
                    wagered: user.stats_wagered || 0,
                    won: user.stats_won || 0,
                    lost: user.stats_lost || 0,
                    gamesPlayed: user.stats_games_played || 0,
                    gamesWon: user.stats_games_won || 0
                };
            } else {
                const user = DB.getUser(self.currentUser.username);
                self.currentUser.inventory = user.inventory;
                self.currentUser.stats = user.stats;
            }
            
            localStorage.removeItem('brainrotflip_active_coinflip');
            self.updateUI();
            self.loadCoinflips();

            setTimeout(function() {
                self.closeModal('cfAnimationModal');
            }, 3000);
        };
    },

    async loadChat() {
        const msgs = this.isOnline 
            ? await SupaDB.getChatMessages()
            : DB.getChatMessages();
            
        const container = document.getElementById('chatMessages');
        if (!container) return;

        let html = '';
        for (let i = 0; i < msgs.length; i++) {
            const m = msgs[i];
            const isAdmin = this.isOnline ? m.is_admin : m.isAdmin;
            const timestamp = this.isOnline ? m.created_at : m.timestamp;
            
            html += '<div class="chat-message">' +
                '<img src="' + m.avatar + '">' +
                '<div class="message-content">' +
                '<div class="message-header">' +
                '<span class="message-name ' + (isAdmin ? 'admin' : '') + '">' + m.username + '</span>' +
                '<span class="message-time">' + this.formatTime(timestamp) + '</span>' +
                '</div>' +
                '<div class="message-text">' + this.escapeHtml(m.message) + '</div>' +
                '</div>' +
                '</div>';
        }
        
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;

        const onlineCount = document.getElementById('onlineCount');
        if (onlineCount) {
            const realOnline = this.isOnline 
                ? 1 // Mode online = 1 (à implémenter avec realtime presence)
                : Object.keys(DB.data.users).length;
            onlineCount.textContent = realOnline;
        }
    },

    formatTime(ts) {
        const date = new Date(ts);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return hours + ':' + minutes;
    },

    escapeHtml(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    },

    async loadLeaderboard() {
        const users = this.isOnline
            ? await SupaDB.getLeaderboard(20)
            : DB.getLeaderboard('wagered', 20);
            
        const container = document.getElementById('leaderboardList');
        if (!container) return;

        let html = '';
        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            let rankClass = '';
            let rankText = '#' + (i + 1);
            
            if (i === 0) { rankClass = 'gold'; rankText = '🥇'; }
            else if (i === 1) { rankClass = 'silver'; rankText = '🥈'; }
            else if (i === 2) { rankClass = 'bronze'; rankText = '🥉'; }
            
            const wagered = this.isOnline ? u.stats_wagered : u.stats.wagered;
            
            html += '<div class="lb-item">' +
                '<div class="lb-rank ' + rankClass + '">' + rankText + '</div>' +
                '<div class="lb-player">' +
                '<img src="' + u.avatar + '">' +
                '<span>' + u.username + '</span>' +
                '</div>' +
                '<div class="lb-wagered">' + this.formatNumber(wagered) + ' 💎</div>' +
                '</div>';
        }
        
        container.innerHTML = html;
    },

    async loadAdminPanel() {
        const items = this.isOnline
            ? await SupaDB.getAllItems()
            : DB.getAllItems();
            
        const select = document.getElementById('adminAddItem');
        if (select) {
            let html = '';
            for (let i = 0; i < items.length; i++) {
                html += '<option value="' + items[i].id + '">' + items[i].name + '</option>';
            }
            select.innerHTML = html;
        }

        // Charger les TRAITS (checkboxes - multiple)
        const traitsContainer = document.getElementById('adminTraitsContainer');
        console.log('Traits container:', traitsContainer);
        if (traitsContainer) {
            const availableTraits = this.isOnline 
                ? {
                    shiny: { name: "Shiny", multiplier: 1.5, color: "#ffd700" },
                    blessed: { name: "Blessed", multiplier: 2.0, color: "#00ff00" },
                    cursed: { name: "Cursed", multiplier: 0.5, color: "#8b008b" },
                    corrupted: { name: "Corrupted", multiplier: 0.25, color: "#ff0000" }
                }
                : DB.data.availableTraits;
            console.log('Available traits:', availableTraits);
            let html = '';
            for (const traitKey in availableTraits) {
                const trait = availableTraits[traitKey];
                const multiplierText = trait.multiplier >= 1 
                    ? 'x' + trait.multiplier 
                    : '÷' + (1 / trait.multiplier);
                    
                html += '<label style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:var(--bg-primary);border-radius:6px;cursor:pointer;">' +
                    '<input type="checkbox" value="' + traitKey + '" class="admin-trait-checkbox">' +
                    '<span style="color:' + trait.color + ';">' + trait.name + '</span>' +
                    '<span style="font-size:0.85rem;color:var(--text-secondary);">(' + multiplierText + ')</span>' +
                    '</label>';
            }
            console.log('Traits HTML:', html);
            traitsContainer.innerHTML = html;
        }
        
        // Charger les MUTATIONS (select - un seul)
        const mutationSelect = document.getElementById('adminAddMutation');
        console.log('Mutation select:', mutationSelect);
        if (mutationSelect) {
            const availableMutations = this.isOnline
                ? {
                    rainbow: { name: "Rainbow", multiplier: 2.0, effect: "rainbow-glow" },
                    lava: { name: "Lava", multiplier: 3.0, effect: "lava-glow" },
                    galaxy: { name: "Galaxy", multiplier: 4.0, effect: "galaxy-glow" },
                    yinyang: { name: "YinYang", multiplier: 2.5, effect: "yinyang-glow" },
                    gold: { name: "Gold", multiplier: 5.0, effect: "gold-glow" },
                    diamond: { name: "Diamond", multiplier: 10.0, effect: "diamond-glow" },
                    bloodrot: { name: "Bloodrot", multiplier: 0.1, effect: "bloodrot-glow" },
                    candy: { name: "Candy", multiplier: 1.5, effect: "candy-glow" },
                    radioactive: { name: "Radioactive", multiplier: 7.0, effect: "radioactive-glow" }
                }
                : DB.data.availableMutations;
            console.log('Available mutations:', availableMutations);
            let html = '<option value="">None</option>';
            for (const mutKey in availableMutations) {
                const mut = availableMutations[mutKey];
                const multiplierText = mut.multiplier >= 1 
                    ? 'x' + mut.multiplier 
                    : '÷' + (1 / mut.multiplier);
                html += '<option value="' + mutKey + '">' + mut.name + ' (' + multiplierText + ')</option>';
            }
            console.log('Mutations HTML:', html);
            mutationSelect.innerHTML = html;
        }

        const users = this.isOnline
            ? await SupaDB.getAllUsers()
            : DB.getAllUsers();
            
        const usersList = document.getElementById('adminUsersList');
        if (usersList) {
            let html = '';
            for (let i = 0; i < users.length; i++) {
                const u = users[i];
                const balance = this.isOnline
                    ? await SupaDB.getUserBalance(u.username)
                    : DB.getUserBalance(u.username);
                    
                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem;border-bottom:1px solid var(--border-color);">' +
                    '<div style="display:flex;align-items:center;gap:0.75rem;">' +
                    '<img src="' + u.avatar + '" style="width:42px;height:42px;border-radius:50%;">' +
                    '<div>' +
                    '<div style="font-weight:700;">' + u.username + '</div>' +
                    '<div style="font-size:0.85rem;color:var(--text-secondary);">Balance: ' + this.formatNumber(balance) + ' 💎</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }
            usersList.innerHTML = html;
        }
    },

    async adminAddItemWithTraits() {
        const usernameEl = document.getElementById('adminAddUsername');
        const itemIdEl = document.getElementById('adminAddItem');
        const mutationEl = document.getElementById('adminAddMutation');
        const traitCheckboxes = document.querySelectorAll('.admin-trait-checkbox:checked');

        if (!usernameEl || !itemIdEl) return;

        const username = usernameEl.value.trim();
        const itemId = itemIdEl.value;
        const mutation = mutationEl.value || null;
        
        // Récupérer les traits sélectionnés
        const traits = [];
        for (let i = 0; i < traitCheckboxes.length; i++) {
            traits.push(traitCheckboxes[i].value);
        }

        if (!username) {
            this.showToast('Enter username!', 'error');
            return;
        }

        const user = this.isOnline
            ? await SupaDB.getUser(username)
            : DB.getUser(username);
            
        if (!user) {
            this.showToast('User not found!', 'error');
            return;
        }

        const itemData = {
            itemId: itemId,
            traits: traits,
            mutation: mutation
        };

        const addedItem = this.isOnline
            ? await SupaDB.addItemToUser(username, itemData)
            : DB.addItemToUser(username, itemData);
            
        if (addedItem) {
            this.showToast('Item added! Value: ' + this.formatNumber(addedItem.finalValue) + ' 💎', 'success');
            usernameEl.value = '';
            
            // Décocher les traits
            const allCheckboxes = document.querySelectorAll('.admin-trait-checkbox');
            for (let i = 0; i < allCheckboxes.length; i++) {
                allCheckboxes[i].checked = false;
            }
            
            // Reset mutation
            if (mutationEl) mutationEl.value = '';
        } else {
            this.showToast('Failed to add item!', 'error');
        }
    },

    async adminAddItem() {
        // Ancienne fonction - rediriger vers la nouvelle
        return this.adminAddItemWithTraits();
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.remove();
    },

    showToast(msg, type) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        
        toast.innerHTML = '<span>' + icon + '</span><span>' + msg + '</span>';
        container.appendChild(toast);

        setTimeout(function() {
            toast.style.opacity = '0';
            setTimeout(function() {
                toast.remove();
            }, 300);
        }, 3500);
    },

    async viewCoinflip(coinflipId) {
        const cf = this.isOnline
            ? await SupaDB.getCoinflip(coinflipId)
            : DB.getCoinflip(coinflipId);
            
        if (!cf) {
            this.showToast('Coinflip not found!', 'error');
            return;
        }

        const status = this.isOnline ? cf.status : cf.status;
        
        if (status === 'playing') {
            // Si le coinflip est en cours, montrer l'animation
            this.startCoinflipAnimation(cf);
        } else {
            // Sinon montrer les détails
            this.showCoinflipDetails(cf);
        }
    },

    showCoinflipDetails(cf) {
        const creator = this.isOnline ? cf.creator : cf.creator;
        const creatorAvatar = this.isOnline ? cf.creator_avatar : cf.creatorAvatar;
        const creatorSide = this.isOnline ? cf.creator_side : cf.creatorSide;
        const creatorItems = this.isOnline ? cf.creator_items : cf.creatorItems;
        const totalValue = this.isOnline ? cf.total_value : cf.totalValue;

        const creatorSideImg = creatorSide === 'H' ? 'Head_Tile.png' : 'Tails_Tile.png';
        const opponentSide = creatorSide === 'H' ? 'T' : 'H';
        const opponentSideImg = opponentSide === 'H' ? 'Head_Tile.png' : 'Tails_Tile.png';

        let creatorItemsHtml = '';
        for (let i = 0; i < creatorItems.length; i++) {
            creatorItemsHtml += '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:var(--bg-card);border-radius:8px;">' +
                '<img src="' + creatorItems[i].icon + '" style="width:32px;height:32px;">' +
                '<div style="flex:1;">' +
                '<div style="font-size:0.85rem;font-weight:600;">' + creatorItems[i].name + '</div>' +
                '<div style="font-size:0.75rem;color:var(--accent-purple);">' + creatorItems[i].value + ' 💎</div>' +
                '</div>' +
                '</div>';
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'viewCfModal';
        modal.innerHTML = '<div class="modal wide">' +
            '<div class="modal-header">' +
            '<h2>👁️ View Coinflip</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'viewCfModal\')">×</button>' +
            '</div>' +
            '<div style="background:var(--bg-tertiary);padding:1.5rem;border-radius:12px;margin-bottom:1.5rem;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">' +
            '<div style="text-align:center;flex:1;">' +
            '<img src="' + creatorAvatar + '" style="width:80px;height:80px;border-radius:50%;border:3px solid var(--accent-purple);margin-bottom:0.5rem;">' +
            '<div style="font-weight:700;font-size:1.1rem;margin-bottom:0.25rem;">' + creator + '</div>' +
            '<img src="' + creatorSideImg + '" style="width:42px;height:42px;border-radius:50%;border:2px solid var(--accent-purple);">' +
            '</div>' +
            '<div style="font-size:2rem;font-weight:900;color:var(--text-secondary);">VS</div>' +
            '<div style="text-align:center;flex:1;">' +
            '<img src="https://ui-avatars.com/api/?name=?&background=2a2e3a&color=8b8fa3&size=128" style="width:80px;height:80px;border-radius:50%;border:3px solid var(--border-color);margin-bottom:0.5rem;opacity:0.4;">' +
            '<div style="font-weight:700;font-size:1.1rem;margin-bottom:0.25rem;color:var(--text-secondary);">Waiting...</div>' +
            '<img src="' + opponentSideImg + '" style="width:42px;height:42px;border-radius:50%;border:2px solid var(--accent-orange);opacity:0.4;">' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div style="background:var(--bg-tertiary);padding:1.5rem;border-radius:12px;">' +
            '<h3 style="margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">' +
            '<span>📦</span> Items (' + creatorItems.length + ') - ' + this.formatNumber(totalValue) + ' 💎' +
            '</h3>' +
            '<div style="display:grid;grid-template-columns:1fr;gap:0.5rem;max-height:280px;overflow-y:auto;">' +
            creatorItemsHtml +
            '</div>' +
            '</div>' +
            '</div>';
            
        document.body.appendChild(modal);
    },

    switchCoinflipTab(tab, el) {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        
        if (tab === 'active') {
            document.getElementById('activeGamesSection').style.display = 'block';
            document.getElementById('historySection').style.display = 'none';
            this.loadCoinflips();
        } else {
            document.getElementById('activeGamesSection').style.display = 'none';
            document.getElementById('historySection').style.display = 'block';
            this.loadCoinflipsHistory();
        }
    },

    async loadCoinflipsHistory() {
        const history = this.isOnline
            ? await SupaDB.getCoinflipsHistory(20)
            : DB.getCoinflipsHistory(20);
            
        const container = document.getElementById('coinflipHistory');
        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = '<div class="no-games-message"><div class="icon">📜</div><p>No history yet</p></div>';
            return;
        }

        let html = '';
        for (let i = 0; i < history.length; i++) {
            const cf = history[i];
            const creator = this.isOnline ? cf.creator : cf.creator;
            const creatorAvatar = this.isOnline ? cf.creator_avatar : cf.creatorAvatar;
            const opponent = this.isOnline ? cf.opponent : cf.opponent;
            const opponentAvatar = this.isOnline ? cf.opponent_avatar : cf.opponentAvatar;
            const winner = this.isOnline ? cf.winner : cf.winner;
            const winnerSide = this.isOnline ? cf.winner_side : cf.winnerSide;
            const totalValue = this.isOnline ? cf.total_value : cf.totalValue;

            const winnerSideImg = winnerSide === 'H' ? 'Head_Tile.png' : 'Tails_Tile.png';
            
            html += '<div class="coinflip-card" style="opacity:0.85;">' +
                '<div class="cf-players">' +
                '<div class="cf-player' + (winner === creator ? ' winner-glow' : '') + '">' +
                '<img class="cf-player-avatar" src="' + creatorAvatar + '">' +
                '<div class="cf-player-info">' +
                '<div class="name ' + (winner === creator ? 'purple' : 'waiting') + '">' + creator + (winner === creator ? ' 🏆' : '') + '</div>' +
                '</div>' +
                '</div>' +
                '<img src="' + winnerSideImg + '" style="width:42px;height:42px;border-radius:50%;border:2px solid var(--accent-green);">' +
                '<div class="vs-badge">VS</div>' +
                '<div class="cf-player' + (winner === opponent ? ' winner-glow' : '') + '">' +
                '<img class="cf-player-avatar" src="' + opponentAvatar + '">' +
                '<div class="cf-player-info">' +
                '<div class="name ' + (winner === opponent ? 'orange' : 'waiting') + '">' + opponent + (winner === opponent ? ' 🏆' : '') + '</div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="cf-value">' +
                '<div class="amount">' + this.formatNumber(totalValue * 2) + ' 💎</div>' +
                '<div class="label">Total Pot</div>' +
                '</div>' +
                '</div>';
        }
        
        container.innerHTML = html;
    },

    async cancelCoinflip(coinflipId) {
        if (!confirm('Cancel this coinflip? Your items will be returned.')) return;

        const success = this.isOnline
            ? await SupaDB.cancelCoinflip(coinflipId, this.currentUser.username)
            : DB.cancelCoinflip(coinflipId, this.currentUser.username);

        if (success) {
            this.showToast('Coinflip cancelled!', 'success');
            this.loadCoinflips();
            
            if (this.isOnline) {
                const user = await SupaDB.getUser(this.currentUser.username);
                this.currentUser.inventory = user.inventory || [];
            } else {
                this.currentUser = DB.getUser(this.currentUser.username);
            }
            
            this.updateUI();
        } else {
            this.showToast('Failed to cancel!', 'error');
        }
    },

    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        if (!input) return;

        // COOLDOWN 5 SECONDES
        if (this.lastChatTime && Date.now() - this.lastChatTime < 5000) {
            const remaining = Math.ceil((5000 - (Date.now() - this.lastChatTime)) / 1000);
            this.showToast('Wait ' + remaining + 's before sending another message!', 'error');
            return;
        }

        let msg = input.value.trim();
        if (!msg) return;

        // Vérifier si c'est une commande /tip
        if (msg.startsWith('/tip ')) {
            const parts = msg.split(' ');
            if (parts.length >= 2) {
                const targetUser = parts[1];
                this.openTipModal(targetUser);
                input.value = '';
                return;
            }
        }

        // Filtrer les bad words (ACTIF)
        const originalMsg = msg;
        const filtered = this.isOnline
            ? SupaDB.filterBadWords(msg)
            : DB.filterBadWords(msg);

        // Vérifier si le message a été censuré
        if (filtered !== originalMsg) {
            this.showToast('Message contains inappropriate words!', 'error');
        }

        // Vérifier caractères spéciaux bizarres
        const validChars = /^[a-zA-Z0-9\s\-_!@#$%^&*(),.?":{}|<>\/\[\]\\+=]+$/;
        if (!validChars.test(filtered)) {
            this.showToast('Invalid characters detected!', 'error');
            input.value = '';
            return;
        }

        if (this.isOnline) {
            await SupaDB.sendChatMessage(this.currentUser.username, filtered);
        } else {
            DB.addChatMessage(this.currentUser.username, filtered);
        }
        
        // Enregistrer le timestamp du dernier message
        this.lastChatTime = Date.now();
        
        input.value = '';
        this.loadChat();
    },

    openTipModal(targetUsername) {
        if (targetUsername === this.currentUser.username) {
            this.showToast('You cannot tip yourself!', 'error');
            return;
        }

        this.selectedTipItems = [];
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'tipModal';
        
        let itemsHtml = '';
        if (this.currentUser.inventory.length === 0) {
            itemsHtml = '<p style="color:var(--text-secondary);grid-column:span 4;text-align:center;padding:2rem;">No items to tip</p>';
        } else {
            for (let i = 0; i < this.currentUser.inventory.length; i++) {
                const item = this.currentUser.inventory[i];
                itemsHtml += '<div class="item-card" data-id="' + item.uniqueId + '" onclick="App.toggleTipItem(this)">' +
                    '<div class="icon"><img src="' + item.icon + '" alt="' + item.name + '"></div>' +
                    '<div class="name">' + item.name + '</div>' +
                    '<div class="value">' + item.value + ' 💎</div>' +
                    '</div>';
            }
        }
        
        modal.innerHTML = '<div class="modal wide">' +
            '<div class="modal-header">' +
            '<h2>💝 Tip to ' + targetUsername + '</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'tipModal\')">×</button>' +
            '</div>' +
            '<p style="color:var(--text-secondary);margin-bottom:1rem;">Select items to send:</p>' +
            '<div class="items-grid" id="tipItemsGrid">' + itemsHtml + '</div>' +
            '<div class="selected-summary">' +
            '<span class="label">Total Value:</span>' +
            '<span class="total" id="tipTotal">0 💎</span>' +
            '</div>' +
            '<button class="modal-btn success" onclick="App.confirmTip(\'' + targetUsername + '\')">Send Tip</button>' +
            '</div>';
            
        document.body.appendChild(modal);
    },

    toggleTipItem(el) {
        const uniqueId = el.dataset.id;
        if (!this.selectedTipItems) this.selectedTipItems = [];
        
        if (el.classList.contains('selected')) {
            el.classList.remove('selected');
            this.selectedTipItems = this.selectedTipItems.filter(id => id !== uniqueId);
        } else {
            el.classList.add('selected');
            this.selectedTipItems.push(uniqueId);
        }

        let total = 0;
        for (let i = 0; i < this.selectedTipItems.length; i++) {
            const item = this.currentUser.inventory.find(it => it.uniqueId === this.selectedTipItems[i]);
            if (item) total += item.value;
        }
        
        const totalEl = document.getElementById('tipTotal');
        if (totalEl) totalEl.textContent = this.formatNumber(total) + ' 💎';
    },

    async confirmTip(targetUsername) {
        if (!this.selectedTipItems || this.selectedTipItems.length === 0) {
            this.showToast('Select items to tip!', 'error');
            return;
        }

        const items = this.isOnline
            ? await SupaDB.tipUser(this.currentUser.username, targetUsername, this.selectedTipItems)
            : DB.tipUser(this.currentUser.username, targetUsername, this.selectedTipItems);

        if (items) {
            const totalValue = items.reduce((sum, item) => sum + item.value, 0);
            this.showToast('Sent ' + this.formatNumber(totalValue) + ' 💎 to ' + targetUsername + '!', 'success');
            this.closeModal('tipModal');
            
            if (this.isOnline) {
                const user = await SupaDB.getUser(this.currentUser.username);
                this.currentUser.inventory = user.inventory || [];
            } else {
                this.currentUser = DB.getUser(this.currentUser.username);
            }
            
            this.updateUI();
        } else {
            this.showToast('Failed to send tip!', 'error');
        }
    },

    async adminCancelAllCoinflips(returnItems) {
        const action = returnItems ? 'cancel and RETURN items' : 'cancel and DELETE items';
        if (!confirm('Cancel ALL coinflips and ' + (returnItems ? 'return items to owners?' : 'DELETE all items?'))) return;

        const success = this.isOnline
            ? await SupaDB.cancelAllCoinflips(returnItems)
            : DB.cancelAllCoinflips(returnItems);

        if (success) {
            this.showToast('All coinflips cancelled!', 'success');
            this.loadCoinflips();
        } else {
            this.showToast('Failed to cancel coinflips!', 'error');
        }
    },

    async adminResetInventory() {
        const input = document.getElementById('adminResetUsername');
        if (!input) return;

        const username = input.value.trim();
        if (!username) {
            this.showToast('Enter username!', 'error');
            return;
        }

        if (!confirm('Reset inventory for ' + username + '?')) return;

        const success = this.isOnline
            ? await SupaDB.resetUserInventory(username)
            : DB.resetUserInventory(username);

        if (success) {
            this.showToast('Inventory reset for ' + username, 'success');
            input.value = '';
            this.loadAdminPanel();
        } else {
            this.showToast('Failed to reset!', 'error');
        }
    },

    async adminWipeAll() {
        if (!confirm('⚠️ WIPE ALL DATA? This cannot be undone!')) return;
        if (!confirm('Are you ABSOLUTELY sure? This will reset EVERYTHING!')) return;

        this.showToast('Wiping all data...', 'info');

        const success = this.isOnline
            ? await SupaDB.wipeAllData()
            : DB.wipeAllData();

        if (success) {
            this.showToast('All data wiped! Reloading...', 'success');
            setTimeout(function() {
                location.reload();
            }, 2000);
        } else {
            this.showToast('Failed to wipe data!', 'error');
        }
    },

    toggleMaintenance() {
        if (this.isOnline) {
            this.showToast('Maintenance mode not available in online mode yet', 'error');
        } else {
            const current = DB.isMaintenanceMode();
            DB.setMaintenanceMode(!current);
            this.showToast('Maintenance mode: ' + (!current ? 'ON' : 'OFF'), 'success');
        }
    },

    async changeAvatar() {
        const input = document.getElementById('avatarUrlInput');
        if (!input) return;

        const newAvatar = input.value.trim();
        if (!newAvatar) {
            this.showToast('Enter an image URL!', 'error');
            return;
        }

        // Vérifier si c'est une URL valide
        if (!newAvatar.startsWith('http://') && !newAvatar.startsWith('https://')) {
            this.showToast('Enter a valid URL!', 'error');
            return;
        }

        const success = this.isOnline
            ? await SupaDB.updateUserAvatar(this.currentUser.username, newAvatar)
            : DB.updateUserAvatar(this.currentUser.username, newAvatar);

        if (success) {
            this.currentUser.avatar = newAvatar;
            this.showToast('Avatar updated!', 'success');
            this.updateUI();
            
            // Rafraîchir la page settings
            this.navigateTo('settings');
        } else {
            this.showToast('Failed to update avatar!', 'error');
        }
    },

    logout() {
        localStorage.removeItem('brainrotflip_current_user');
        location.reload();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
window.App = App;