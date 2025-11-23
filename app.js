const App = {
    currentUser: null,
    selectedItems: [],
    selectedSide: 'H',
    joiningCoinflipId: null,
    chatSubscription: null,
    coinflipSubscription: null,

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
                        robloxId: user.roblox_id,
                        avatar: user.avatar,
                        level: user.level,
                        isAdmin: user.is_admin,
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
        this.generateVerificationCode();
        const code = localStorage.getItem('brainrotflip_verification_code') || 'BRF-XXXXXX';
        
        const html = '<div class="modal-overlay">' +
            '<div class="modal">' +
            '<div class="modal-header"><h2>🎮 Login with Roblox</h2></div>' +
            '<input type="text" class="modal-input" id="loginUsername" placeholder="Your Roblox Username">' +
            '<div class="verification-box">' +
            '<label>Put this code in your Roblox profile description:</label>' +
            '<div class="verification-code">' +
            '<code>' + code + '</code>' +
            '<button class="copy-btn" onclick="App.copyVerificationCode(\'' + code + '\')">Copy</button>' +
            '</div>' +
            '</div>' +
            '<button class="modal-btn" onclick="App.verifyAndLogin()">Verify & Login</button>' +
            '<p class="modal-note">Add the code to your Roblox description, then click login</p>' +
            '</div>' +
            '</div>';
        
        document.getElementById('root').innerHTML = html;
    },

    generateVerificationCode() {
        const code = 'BRF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem('brainrotflip_verification_code', code);
        return code;
    },

    copyVerificationCode(code) {
        navigator.clipboard.writeText(code);
        this.showToast('Code copied!', 'success');
    },

    async verifyAndLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        if (!username) {
            this.showToast('Enter username!', 'error');
            return;
        }

        this.showToast('Verifying...', 'info');

        if (this.isOnline) {
            const verification = await SupaDB.verifyRobloxUser(username);
            
            if (!verification.success) {
                this.showToast(verification.error, 'error');
                return;
            }

            const user = await SupaDB.createOrGetUser(
                verification.user.username,
                verification.user.robloxId,
                verification.user.avatar
            );

            if (!user) {
                this.showToast('Failed to create user', 'error');
                return;
            }

            this.currentUser = {
                username: user.username,
                robloxId: user.roblox_id,
                avatar: user.avatar,
                level: user.level,
                isAdmin: user.is_admin,
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
            if (!user) {
                const robloxId = Math.floor(Math.random() * 9999999999);
                user = DB.createUser(username, robloxId);
            }
            this.currentUser = user;
        }

        localStorage.setItem('brainrotflip_current_user', username);
        this.showToast('Welcome!', 'success');
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
            '<div class="nav-section-title">Games</div>' +
            '<div class="nav-item active" onclick="App.navigateTo(\'home\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' +
            'Home</div>' +
            '<div class="nav-item" onclick="App.navigateTo(\'coinflip\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>' +
            'Coinflip</div>' +
            '</div>' +
            '<div class="nav-section">' +
            '<div class="nav-section-title">More</div>' +
            '<div class="nav-item" onclick="App.navigateTo(\'profile\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
            'Profile</div>' +
            '<div class="nav-item" onclick="App.navigateTo(\'leaderboard\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>' +
            'Leaderboard</div>' +
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
            this.chatSubscription = SupaDB.subscribeToChatUpdates((newMessage) => {
                this.loadChat();
            });
            this.coinflipSubscription = SupaDB.subscribeToCoinflipUpdates((payload) => {
                this.loadCoinflips();
            });
        }

        if (this.currentUser.isAdmin) {
            document.getElementById('adminNavItem').style.display = 'flex';
            this.loadAdminPanel();
        }
    },

    startIntervals() {
        if (!this.isOnline) {
            setInterval(() => this.loadCoinflips(), 3000);
            setInterval(() => this.loadChat(), 2000);
        }
    },

    navigateTo(page) {
        const content = document.getElementById('pageContent');
        if (!content) return;

        if (page === 'home') {
            content.innerHTML = this.getHomeHTML();
        } else if (page === 'coinflip') {
            content.innerHTML = this.getCoinflipHTML();
            this.loadCoinflips();
        } else if (page === 'profile') {
            content.innerHTML = this.getProfileHTML();
            this.updateUI();
        } else if (page === 'leaderboard') {
            content.innerHTML = this.getLeaderboardHTML();
            this.loadLeaderboard();
        } else if (page === 'admin') {
            content.innerHTML = this.getAdminHTML();
            this.loadAdminPanel();
        }

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItems = document.querySelectorAll('.nav-item');
        for (let i = 0; i < navItems.length; i++) {
            if (navItems[i].textContent.toLowerCase().includes(page)) {
                navItems[i].classList.add('active');
                break;
            }
        }
    },

    getHomeHTML() {
        return '<div class="page active">' +
            '<div class="hero-section">' +
            '<div class="hero-card welcome">' +
            '<h3>Welcome to</h3><h2>BrainrotFlip</h2>' +
            '<p>Best <strong>brainrot</strong> gambling</p>' +
            '<button class="hero-btn primary" onclick="App.navigateTo(\'coinflip\')">Play Now</button>' +
            '<div class="hero-decoration">🎰</div>' +
            '</div>' +
            '<div class="hero-card race">' +
            '<h3>Compete</h3><h2>WAGER RACE</h2>' +
            '<p>Win <strong>prizes</strong></p>' +
            '<button class="hero-btn secondary">Join</button>' +
            '</div>' +
            '</div>' +
            '<div class="games-grid">' +
            '<div class="game-card" onclick="App.navigateTo(\'coinflip\')">' +
            '<div class="game-card-icon">🪙</div><h3>COINFLIP</h3>' +
            '</div>' +
            '<div class="game-card disabled">' +
            '<div class="game-card-icon">🎰</div><h3>JACKPOT</h3>' +
            '<div style="font-size:0.8rem;opacity:0.8;">Soon</div>' +
            '</div>' +
            '<div class="game-card disabled">' +
            '<div class="game-card-icon">📈</div><h3>UPGRADER</h3>' +
            '<div style="font-size:0.8rem;opacity:0.8;">Soon</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    },

    getCoinflipHTML() {
        return '<div class="page active">' +
            '<h1 class="page-title">🪙 Coinflip</h1>' +
            '<div class="stats-row">' +
            '<div class="stat-card"><div class="value" id="cfStatRooms">0</div><div class="label">Rooms</div></div>' +
            '<div class="stat-card"><div class="value" id="cfStatValue">0</div><div class="label">Value</div></div>' +
            '<div class="stat-card"><div class="value" id="cfStatItems">0</div><div class="label">Items</div></div>' +
            '</div>' +
            '<div class="actions-row">' +
            '<button class="action-btn create" onclick="App.openCreateModal()">Create</button>' +
            '</div>' +
            '<div class="filters-row">' +
            '<div class="filter-group"><span>🟢</span><span id="filterHeadsCount">0</span></div>' +
            '<div class="filter-group"><span>🔴</span><span id="filterTailsCount">0</span></div>' +
            '</div>' +
            '<div class="coinflip-list" id="coinflipList"></div>' +
            '</div>';
    },

    getProfileHTML() {
        return '<div class="page active">' +
            '<div class="profile-header-card">' +
            '<img class="profile-avatar-large" id="profileAvatar" src="">' +
            '<div class="profile-details">' +
            '<h2 id="profileUsername">' + this.currentUser.username + '</h2>' +
            '<div>Level <span id="profileLevel">' + this.currentUser.level + '</span></div>' +
            '</div>' +
            '</div>' +
            '<div class="profile-stats-grid">' +
            '<div class="profile-stat-card"><div class="icon">💎</div><div class="value" id="profileWagered">0</div><div class="label">Wagered</div></div>' +
            '<div class="profile-stat-card"><div class="icon">🏆</div><div class="value" id="profileWon">0</div><div class="label">Won</div></div>' +
            '<div class="profile-stat-card"><div class="icon">📉</div><div class="value" id="profileLost">0</div><div class="label">Lost</div></div>' +
            '</div>' +
            '<div class="inventory-section">' +
            '<h3>📦 Inventory</h3>' +
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

    getAdminHTML() {
        return '<div class="page active">' +
            '<h1 class="page-title">🛡️ Admin</h1>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">' +
            '<h3 style="margin-bottom:1rem;">➕ Add Items</h3>' +
            '<input type="text" class="modal-input" id="adminAddUsername" placeholder="Username" style="margin-bottom:0;">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">' +
            '<select class="modal-input" id="adminAddItem" style="margin-bottom:0;"></select>' +
            '<input type="number" class="modal-input" id="adminAddQty" value="1" min="1" style="margin-bottom:0;">' +
            '</div>' +
            '<button class="modal-btn" onclick="App.adminAddItem()">Add</button>' +
            '</div>' +
            '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;padding:1.5rem;">' +
            '<h3 style="margin-bottom:1rem;">👥 Users</h3>' +
            '<div id="adminUsersList"></div>' +
            '</div>' +
            '</div>';
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

        const profileAvatar = document.getElementById('profileAvatar');
        const profileWagered = document.getElementById('profileWagered');
        const profileWon = document.getElementById('profileWon');
        const profileLost = document.getElementById('profileLost');

        if (profileAvatar) profileAvatar.src = this.currentUser.avatar;
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
            container.innerHTML = '<div class="empty-inventory">No items</div>';
            return;
        }

        let html = '';
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            html += '<div class="inventory-item">' +
                '<div class="icon">' + item.icon + '</div>' +
                '<div class="name">' + item.name + '</div>' +
                '<div class="value">' + item.value + ' 💎</div>' +
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
        const coinflips = this.isOnline 
            ? await SupaDB.getActiveCoinflips()
            : DB.getActiveCoinflips();
            
        const container = document.getElementById('coinflipList');
        if (!container) return;

        const roomsEl = document.getElementById('cfStatRooms');
        const valueEl = document.getElementById('cfStatValue');
        const itemsEl = document.getElementById('cfStatItems');
        const headsEl = document.getElementById('filterHeadsCount');
        const tailsEl = document.getElementById('filterTailsCount');

        if (roomsEl) roomsEl.textContent = coinflips.length;
        
        let totalValue = 0;
        let totalItems = 0;
        let headsCount = 0;
        
        for (let i = 0; i < coinflips.length; i++) {
            const cf = coinflips[i];
            totalValue += this.isOnline ? cf.total_value : cf.totalValue;
            totalItems += this.isOnline ? cf.creator_items.length : cf.creatorItems.length;
            const side = this.isOnline ? cf.creator_side : cf.creatorSide;
            if (side === 'H') headsCount++;
        }
        
        if (valueEl) valueEl.textContent = this.formatNumber(totalValue);
        if (itemsEl) itemsEl.textContent = totalItems;
        if (headsEl) headsEl.textContent = headsCount;
        if (tailsEl) tailsEl.textContent = coinflips.length - headsCount;

        if (coinflips.length === 0) {
            container.innerHTML = '<div class="no-games-message"><div class="icon">🪙</div><p>No active games</p></div>';
            return;
        }

        let html = '';
        for (let i = 0; i < coinflips.length; i++) {
            const cf = coinflips[i];
            const creator = this.isOnline ? cf.creator : cf.creator;
            const creatorAvatar = this.isOnline ? cf.creator_avatar : cf.creatorAvatar;
            const creatorSide = this.isOnline ? cf.creator_side : cf.creatorSide;
            const creatorItems = this.isOnline ? cf.creator_items : cf.creatorItems;
            const totalValue = this.isOnline ? cf.total_value : cf.totalValue;
            const cfId = this.isOnline ? cf.id : cf.id;
            
            const sideClass = creatorSide === 'H' ? 'green' : 'red';
            
            html += '<div class="coinflip-card">' +
                '<div class="cf-players">' +
                '<div class="cf-player ' + sideClass + '">' +
                '<img class="cf-player-avatar" src="' + creatorAvatar + '">' +
                '<div class="cf-player-info">' +
                '<div class="name ' + sideClass + '">' + creator + '</div>' +
                '<div style="font-size:0.8rem;color:var(--text-secondary);">' + creatorItems.length + ' items</div>' +
                '</div>' +
                '</div>' +
                '<div class="vs-badge">VS</div>' +
                '<div class="cf-player waiting">' +
                '<img class="cf-player-avatar" src="https://tr.rbxcdn.com/30DAY-AvatarHeadshot-B0C12D22C5A8D936F9DD4B5C5A770B8E-Png/150/150/AvatarHeadshot/Webp/noFilter">' +
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
                html += '<span style="color:var(--text-secondary);font-style:italic;">Your game</span>';
            }
            
            html += '</div>';
        }
        
        container.innerHTML = html;
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
            itemsHtml = '<p style="color:var(--text-secondary);grid-column:span 4;text-align:center;padding:2rem;">No items</p>';
        } else {
            for (let i = 0; i < this.currentUser.inventory.length; i++) {
                const item = this.currentUser.inventory[i];
                itemsHtml += '<div class="item-card" data-id="' + item.uniqueId + '" data-value="' + item.value + '" onclick="App.toggleItem(this,\'create\')">' +
                    '<div class="icon">' + item.icon + '</div>' +
                    '<div class="name">' + item.name + '</div>' +
                    '<div class="value">' + item.value + ' 💎</div>' +
                    '</div>';
            }
        }
        
        modal.innerHTML = '<div class="modal wide">' +
            '<div class="modal-header">' +
            '<h2>🎰 Create Coinflip</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'createCfModal\')">×</button>' +
            '</div>' +
            '<p style="color:var(--text-secondary);margin-bottom:1rem;">Select items:</p>' +
            '<div class="items-grid" id="createItemsGrid">' + itemsHtml + '</div>' +
            '<div class="selected-summary">' +
            '<span class="label">Total:</span>' +
            '<span class="total" id="createTotal">0 💎</span>' +
            '</div>' +
            '<p style="color:var(--text-secondary);margin-bottom:0.75rem;">Choose side:</p>' +
            '<div class="side-selector">' +
            '<div class="side-option green selected" data-side="H" onclick="App.selectSide(\'H\',this)">' +
            '<div class="icon">🟢</div><div>Heads</div>' +
            '</div>' +
            '<div class="side-option" data-side="T" onclick="App.selectSide(\'T\',this)">' +
            '<div class="icon">🔴</div><div>Tails</div>' +
            '</div>' +
            '</div>' +
            '<button class="modal-btn success" onclick="App.createCoinflip()">Create</button>' +
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
            itemsHtml = '<p style="color:var(--text-secondary);grid-column:span 4;text-align:center;padding:2rem;">No items</p>';
        } else {
            for (let i = 0; i < this.currentUser.inventory.length; i++) {
                const item = this.currentUser.inventory[i];
                itemsHtml += '<div class="item-card" data-id="' + item.uniqueId + '" data-value="' + item.value + '" onclick="App.toggleItem(this,\'join\')">' +
                    '<div class="icon">' + item.icon + '</div>' +
                    '<div class="name">' + item.name + '</div>' +
                    '<div class="value">' + item.value + ' 💎</div>' +
                    '</div>';
            }
        }
        
        modal.innerHTML = '<div class="modal wide">' +
            '<div class="modal-header">' +
            '<h2>⚔️ Join Coinflip</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'joinCfModal\')">×</button>' +
            '</div>' +
            '<p>Joining: <strong>' + creator + '</strong></p>' +
            '<p style="color:var(--text-secondary);margin-bottom:1rem;">Required: <strong style="color:var(--accent-green);">' + this.formatNumber(totalValue) + ' 💎</strong></p>' +
            '<div class="items-grid" id="joinItemsGrid">' + itemsHtml + '</div>' +
            '<div class="selected-summary">' +
            '<span class="label">Total:</span>' +
            '<span class="total" id="joinTotal">0 💎</span>' +
            '</div>' +
            '<button class="modal-btn success" onclick="App.confirmJoinCoinflip()">Join</button>' +
            '</div>';
            
        document.body.appendChild(modal);
    },

    toggleItem(el, modalType) {
        const uniqueId = el.dataset.id;
        if (el.classList.contains('selected')) {
            el.classList.remove('selected');
            this.selectedItems = this.selectedItems.filter(function(i) {
                return i.uniqueId !== uniqueId;
            });
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
            total += this.selectedItems[i].value;
        }
        
        const totalEl = document.getElementById(modalType === 'create' ? 'createTotal' : 'joinTotal');
        if (totalEl) totalEl.textContent = this.formatNumber(total) + ' 💎';
    },

    selectSide(side, el) {
        this.selectedSide = side;
        const options = document.querySelectorAll('.side-option');
        for (let i = 0; i < options.length; i++) {
            options[i].classList.remove('selected', 'green', 'red');
            if (options[i] === el) {
                options[i].classList.add('selected', side === 'H' ? 'green' : 'red');
            }
        }
    },

    async createCoinflip() {
        if (this.selectedItems.length === 0) {
            this.showToast('Select items!', 'error');
            return;
        }

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
    },

    async confirmJoinCoinflip() {
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
            return;
        }

        const joined = this.isOnline
            ? await SupaDB.joinCoinflip(this.joiningCoinflipId, this.currentUser.username, this.selectedItems)
            : DB.joinCoinflip(this.joiningCoinflipId, this.currentUser.username, this.selectedItems);
            
        if (joined) {
            this.closeModal('joinCfModal');
            this.startCoinflipAnimation(joined);
        }
    },

    async startCoinflipAnimation(cf) {
        const winnerSide = Math.random() < 0.5 ? 'H' : 'T';
        const videoSrc = winnerSide === 'H' ? 'assets/H_Tiles.mp4' : 'assets/T_Tails.mp4';

        const creator = this.isOnline ? cf.creator : cf.creator;
        const creatorAvatar = this.isOnline ? cf.creator_avatar : cf.creatorAvatar;
        const opponent = this.isOnline ? cf.opponent : cf.opponent;
        const opponentAvatar = this.isOnline ? cf.opponent_avatar : cf.opponentAvatar;
        const creatorValue = this.isOnline ? cf.total_value : cf.totalValue;
        
        let opponentValue = 0;
        const opponentItems = this.isOnline ? cf.opponent_items : cf.opponentItems;
        for (let i = 0; i < opponentItems.length; i++) {
            opponentValue += opponentItems[i].value;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'cfAnimationModal';
        modal.innerHTML = '<div class="modal" style="max-width:520px;text-align:center;">' +
            '<h2 style="margin-bottom:1rem;">⚡ COINFLIP ⚡</h2>' +
            '<div class="cf-arena">' +
            '<div class="arena-players">' +
            '<div class="arena-player">' +
            '<img src="' + creatorAvatar + '">' +
            '<div class="name">' + creator + '</div>' +
            '<div class="value">' + this.formatNumber(creatorValue) + ' 💎</div>' +
            '</div>' +
            '<div class="vs-badge">VS</div>' +
            '<div class="arena-player red">' +
            '<img src="' + opponentAvatar + '">' +
            '<div class="name">' + opponent + '</div>' +
            '<div class="value">' + this.formatNumber(opponentValue) + ' 💎</div>' +
            '</div>' +
            '</div>' +
            '<div class="coin-container">' +
            '<video id="coinVideo" style="width:300px;height:300px;border-radius:16px;" autoplay muted>' +
            '<source src="' + videoSrc + '" type="video/mp4">' +
            '</video>' +
            '</div>' +
            '</div>' +
            '<div class="winner-banner" id="winnerBanner">🏆 <span id="winnerName"></span> WINS!</div>' +
            '</div>';
            
        document.body.appendChild(modal);

        const video = document.getElementById('coinVideo');
        const self = this;
        video.onended = async function() {
            const cfId = self.isOnline ? cf.id : cf.id;
            const result = self.isOnline
                ? await SupaDB.finishCoinflip(cfId, winnerSide)
                : DB.finishCoinflip(cfId, winnerSide);
                
            const banner = document.getElementById('winnerBanner');
            const winnerName = document.getElementById('winnerName');
            
            if (winnerName) winnerName.textContent = result.winner;
            
            const isWinner = result.winner === self.currentUser.username;
            if (banner) banner.classList.add('show', isWinner ? 'win' : 'loss');

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
                self.currentUser = DB.getUser(self.currentUser.username);
            }
            
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
        if (onlineCount) onlineCount.textContent = Math.floor(Math.random() * 50) + 10;
    },

    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        if (!input) return;

        const msg = input.value.trim();
        if (!msg) return;

        if (this.isOnline) {
            await SupaDB.sendChatMessage(this.currentUser.username, msg);
        } else {
            DB.addChatMessage(this.currentUser.username, msg);
        }
        
        input.value = '';
        this.loadChat();
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
                html += '<option value="' + items[i].id + '">' + items[i].icon + ' ' + items[i].name + '</option>';
            }
            select.innerHTML = html;
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
                    
                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem;border-bottom:1px solid var(--border-color);">' +
                    '<div style="display:flex;align-items:center;gap:0.75rem;">' +
                    '<img src="' + u.avatar + '" style="width:38px;height:38px;border-radius:50%;">' +
                    '<div>' +
                    '<div style="font-weight:600;">' + u.username + '</div>' +
                    '<div style="font-size:0.8rem;color:var(--text-secondary);">Balance: ' + this.formatNumber(balance) + ' 💎</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }
            usersList.innerHTML = html;
        }
    },

    async adminAddItem() {
        const usernameEl = document.getElementById('adminAddUsername');
        const itemIdEl = document.getElementById('adminAddItem');
        const qtyEl = document.getElementById('adminAddQty');

        if (!usernameEl || !itemIdEl || !qtyEl) return;

        const username = usernameEl.value.trim();
        const itemId = itemIdEl.value;
        const qty = parseInt(qtyEl.value) || 1;

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

        if (this.isOnline) {
            await SupaDB.addItemToUser(username, itemId, qty);
        } else {
            DB.addItemToUser(username, itemId, qty);
        }
        
        this.showToast('Added ' + qty + 'x to ' + username, 'success');
        usernameEl.value = '';
        this.loadAdminPanel();
    },

    openWalletModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'walletModal';
        modal.innerHTML = '<div class="modal">' +
            '<div class="modal-header">' +
            '<h2>💎 Deposit</h2>' +
            '<button class="modal-close" onclick="App.closeModal(\'walletModal\')">×</button>' +
            '</div>' +
            '<p style="color:var(--text-secondary);margin-bottom:1rem;">Contact staff on Discord to deposit.</p>' +
            '<div style="background:var(--bg-tertiary);padding:1.25rem;border-radius:12px;margin-bottom:1rem;">' +
            '<p style="font-weight:600;margin-bottom:0.75rem;">How to Deposit:</p>' +
            '<ol style="color:var(--text-secondary);font-size:0.9rem;margin-left:1.25rem;">' +
            '<li>Join Discord</li>' +
            '<li>Open ticket</li>' +
            '<li>Trade items to staff</li>' +
            '<li>Items added to account</li>' +
            '</ol>' +
            '</div>' +
            '</div>';
        document.body.appendChild(modal);
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
        }, 3000);
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