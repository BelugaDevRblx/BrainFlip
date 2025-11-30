const DB = {
    STORAGE_KEY: 'brainrotflip_db',
    SHARED_KEY: 'brainrotflip_shared',
    data: null,
    shared: null,

    async init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            this.data = JSON.parse(saved);
            
            if (this.data.items && this.data.items.skibidi_toilet) {
                localStorage.removeItem(this.STORAGE_KEY);
                this.data = this.getDefaultData();
            }
        } else {
            this.data = this.getDefaultData();
        }

        const sharedData = localStorage.getItem(this.SHARED_KEY);
        if (sharedData) {
            this.shared = JSON.parse(sharedData);
        } else {
            this.shared = {
                coinflips: [],
                coinflipsHistory: [],
                chat: []
            };
            this.saveShared();
        }

        if (!this.data.users['Brainflip']) {
            this.data.users['Brainflip'] = {
                id: 'usr_admin_brainflip',
                username: 'Brainflip',
                password: 'Beluga.2009',
                robloxId: '1',
                verified: true,
                isAdmin: true,
                level: 99,
                discordLinked: false,
                discordUsername: null,
                badges: ['👑', '⭐', '🎮'],
                stats: { wagered: 0, won: 0, lost: 0, gamesPlayed: 0, gamesWon: 0 },
                inventory: [],
                avatar: 'https://ui-avatars.com/api/?name=Brainflip&background=3b82f6&color=fff&size=128',
                ip: '127.0.0.1',
                createdAt: new Date().toISOString()
            };
            this.save();
        } else if (this.data.users['Brainflip'].password !== 'Beluga.2009') {
            this.data.users['Brainflip'].password = 'Beluga.2009';
            this.data.users['Brainflip'].isAdmin = true;
            this.save();
        }

        this.save();
        this._protectStorage();
        return this.data;
    },

    _protectStorage() {
        const self = this;
        
        const originalClear = Storage.prototype.clear;
        Storage.prototype.clear = function() {
        };
        
        const originalRemoveItem = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function(key) {
            if (key === self.STORAGE_KEY || key === self.SHARED_KEY) {
                return;
            }
            return originalRemoveItem.call(this, key);
        };
        
        setInterval(function() {
            const data = localStorage.getItem(self.STORAGE_KEY);
            const shared = localStorage.getItem(self.SHARED_KEY);
            if (data && shared) {
                sessionStorage.setItem('backup_' + self.STORAGE_KEY, data);
                sessionStorage.setItem('backup_' + self.SHARED_KEY, shared);
            }
        }, 30000);
        
        setInterval(function() {
            const data = localStorage.getItem(self.STORAGE_KEY);
            const shared = localStorage.getItem(self.SHARED_KEY);
            
            if (!data || !shared) {
                const backupData = sessionStorage.getItem('backup_' + self.STORAGE_KEY);
                const backupShared = sessionStorage.getItem('backup_' + self.SHARED_KEY);
                
                if (backupData) localStorage.setItem(self.STORAGE_KEY, backupData);
                if (backupShared) localStorage.setItem(self.SHARED_KEY, backupShared);
            }
        }, 5000);
        
    },

    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    },

    saveShared() {
        localStorage.setItem(this.SHARED_KEY, JSON.stringify(this.shared));
    },

    getDefaultData() {
        return {
            users: {},
            bannedIPs: [],
            items: {
                dragon_canneloni: { 
                    id: 'dragon_canneloni',
                    name: 'Dragon canneloni',
                    value: 5000,
                    icon: 'item_assets/Dragoncanneloni.png'
                }
            }
        };
    },

    createUser(username, robloxId, password) {
        const bannedWords = ['hitler', 'nazi', 'fuck', 'shit', 'bitch', 'ass', 'nigga', 'nigger', 'cunt', 'dick', 'cock', 'pussy', 'retard', 'rape', 'slave', 'kill'];
        
        const lowerUsername = username.toLowerCase();
        for (let i = 0; i < bannedWords.length; i++) {
            if (lowerUsername.includes(bannedWords[i])) {
                return { error: 'Username contains inappropriate words' };
            }
        }
        
        const fakeIP = Math.floor(Math.random() * 255) + '.' + 
                       Math.floor(Math.random() * 255) + '.' + 
                       Math.floor(Math.random() * 255) + '.' + 
                       Math.floor(Math.random() * 255);
        
        const user = {
            id: 'usr_' + Date.now(),
            username: username,
            password: password,
            robloxId: robloxId,
            verified: true,
            isAdmin: username === 'Brainflip',
            level: 1,
            discordLinked: false,
            discordUsername: null,
            badges: [],
            stats: { wagered: 0, won: 0, lost: 0, gamesPlayed: 0, gamesWon: 0 },
            inventory: [],
            avatar: 'https://www.roblox.com/headshot-thumbnail/image?userId=' + robloxId + '&width=150&height=150&format=png',
            ip: fakeIP,
            createdAt: new Date().toISOString()
        };
        this.data.users[username] = user;
        this.save();
        return user;
    },

    getUser(username) {
        return this.data.users[username] || null;
    },

    getAllUsers() {
        return Object.values(this.data.users);
    },

    removeItemsFromUser(username, uniqueIds) {
        const user = this.data.users[username];
        if (!user) return false;
        user.inventory = user.inventory.filter(function(item) {
            return !uniqueIds.includes(item.uniqueId);
        });
        this.save();
        return true;
    },

    getUserBalance(username) {
        const user = this.data.users[username];
        if (!user) return 0;
        return user.inventory.reduce(function(sum, item) { 
            return sum + (item.finalValue || item.value || 0); 
        }, 0);
    },

    getAllItems() {
        return Object.values(this.data.items);
    },

    banIP(ip) {
        if (!this.data.bannedIPs) this.data.bannedIPs = [];
        if (!this.data.bannedIPs.includes(ip)) {
            this.data.bannedIPs.push(ip);
            this.save();
        }
    },

    unbanIP(ip) {
        if (!this.data.bannedIPs) this.data.bannedIPs = [];
        this.data.bannedIPs = this.data.bannedIPs.filter(function(bannedIP) {
            return bannedIP !== ip;
        });
        this.save();
    },

    isIPBanned(ip) {
        if (!this.data.bannedIPs) return false;
        return this.data.bannedIPs.includes(ip);
    },

    deleteUser(username) {
        if (this.data.users[username]) {
            delete this.data.users[username];
            this.save();
            return true;
        }
        return false;
    },

    _deleteUser(username) {
        return this.deleteUser(username);
    },

    _banIP(ip) {
        return this.banIP(ip);
    },

    _unbanIP(ip) {
        return this.unbanIP(ip);
    },

    calculateItemValue(item) {
        let finalValue = item.value || 0;
        
        const traitMultipliers = {
            shiny: 1.5,
            blessed: 2.0,
            cursed: 0.5,
            corrupted: 0.25
        };
        
        if (item.traits && item.traits.length > 0) {
            for (let i = 0; i < item.traits.length; i++) {
                const trait = item.traits[i];
                if (traitMultipliers[trait]) {
                    finalValue *= traitMultipliers[trait];
                }
            }
        }
        
        const mutationMultipliers = {
            rainbow: 2.0,
            lava: 3.0,
            galaxy: 4.0,
            yinyang: 2.5,
            gold: 5.0,
            diamond: 10.0,
            bloodrot: 0.1,
            candy: 1.5,
            radioactive: 7.0
        };
        
        if (item.mutation && mutationMultipliers[item.mutation]) {
            finalValue *= mutationMultipliers[item.mutation];
        }
        
        return Math.floor(finalValue);
    },

    addItemToUser(username, itemData) {
        const user = this.data.users[username];
        if (!user) return null;

        const baseItem = this.data.items[itemData.itemId];
        if (!baseItem) return null;

        const newItem = {
            uniqueId: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            id: baseItem.id,
            name: baseItem.name,
            value: baseItem.value,
            icon: baseItem.icon,
            traits: itemData.traits || [],
            mutation: itemData.mutation || null
        };

        newItem.finalValue = this.calculateItemValue(newItem);
        user.inventory.push(newItem);
        this.save();
        return newItem;
    },

    createCoinflip(creatorUsername, items, side) {
        const creator = this.data.users[creatorUsername];
        if (!creator) return null;

        const totalValue = items.reduce(function(sum, item) { 
            return sum + (item.finalValue || item.value || 0); 
        }, 0);
        
        const coinflip = {
            id: 'cf_' + Date.now(),
            creator: creatorUsername,
            creatorAvatar: creator.avatar,
            creatorItems: items,
            creatorSide: side,
            opponent: null,
            opponentAvatar: null,
            opponentItems: [],
            totalValue: totalValue,
            status: 'waiting',
            createdAt: new Date().toISOString()
        };

        const uniqueIds = items.map(function(i) { return i.uniqueId; });
        this.removeItemsFromUser(creatorUsername, uniqueIds);
        this.shared.coinflips.push(coinflip);
        this.saveShared();
        
        
        return coinflip;
    },

    getCoinflip(id) {
        return this.shared.coinflips.find(function(cf) { return cf.id === id; });
    },

    getActiveCoinflips() {
        return this.shared.coinflips.filter(function(cf) { return cf.status === 'waiting'; });
    },

    getAllActiveCoinflips() {
        return this.shared.coinflips;
    },

    getAllCoinflips() {
        return this.shared.coinflips;
    },

    joinCoinflip(coinflipId, opponentUsername, items) {
        const cf = this.getCoinflip(coinflipId);
        const opponent = this.data.users[opponentUsername];
        if (!cf || !opponent || cf.status !== 'waiting') return null;

        cf.opponent = opponentUsername;
        cf.opponentAvatar = opponent.avatar;
        cf.opponentItems = items;
        cf.status = 'playing';
        
        // CALCULER LE WINNER MAINTENANT (avant l'animation)
        // Comme ça, les 2 joueurs auront le même résultat !
        const winnerSide = Math.random() < 0.5 ? cf.creatorSide : (cf.creatorSide === 'H' ? 'T' : 'H');
        const winner = winnerSide === cf.creatorSide ? cf.creator : opponentUsername;
        
        cf.winnerSide = winnerSide;
        cf.winner = winner;
        

        const uniqueIds = items.map(function(i) { return i.uniqueId; });
        this.removeItemsFromUser(opponentUsername, uniqueIds);
        this.saveShared();
        return cf;
    },

    finishCoinflip(coinflipId, winnerSide) {
        const cf = this.getCoinflip(coinflipId);
        if (!cf) return null;

        if (cf.winner && cf.winnerSide) {
            return { winner: cf.winner, winnerSide: cf.winnerSide };
        }

        if (cf.status !== 'playing') return null;

        if (!winnerSide) {
            winnerSide = Math.random() < 0.5 ? cf.creatorSide : (cf.creatorSide === 'H' ? 'T' : 'H');
        }

        const winner = winnerSide === cf.creatorSide ? cf.creator : cf.opponent;
        const loser = winner === cf.creator ? cf.opponent : cf.creator;

        cf.winner = winner;
        cf.winnerSide = winnerSide;

        const allItems = cf.creatorItems.concat(cf.opponentItems);
        if (this.data.users[winner]) {
            for (let i = 0; i < allItems.length; i++) {
                this.data.users[winner].inventory.push(allItems[i]);
            }
        }

        const totalPot = cf.totalValue * 2;

        if (this.data.users[winner]) {
            this.data.users[winner].stats.won += totalPot;
            this.data.users[winner].stats.wagered += cf.totalValue;
            this.data.users[winner].stats.gamesPlayed++;
            this.data.users[winner].stats.gamesWon++;
        }

        if (this.data.users[loser]) {
            this.data.users[loser].stats.lost += cf.totalValue;
            this.data.users[loser].stats.wagered += cf.totalValue;
            this.data.users[loser].stats.gamesPlayed++;
        }

        cf.status = 'finished';
        cf.finishedAt = new Date().toISOString();

        const self = this;
        setTimeout(function() {
            self.shared.coinflips = self.shared.coinflips.filter(function(c) {
                return c.id !== coinflipId;
            });
            self.saveShared();
        }, 30000); // 30 secondes au lieu de 5

        this.save();
        this.saveShared();
        
        return { winner: winner, winnerSide: winnerSide };
    },

    cancelCoinflip(coinflipId, username) {
        const cf = this.getCoinflip(coinflipId);
        if (!cf || cf.creator !== username || cf.status !== 'waiting') return false;

        if (this.data.users[username]) {
            for (let i = 0; i < cf.creatorItems.length; i++) {
                this.data.users[username].inventory.push(cf.creatorItems[i]);
            }
        }

        this.shared.coinflips = this.shared.coinflips.filter(function(c) {
            return c.id !== coinflipId;
        });
        
        this.save();
        this.saveShared();
        return true;
    },

    addChatMessage(username, message) {
        const msg = {
            id: 'msg_' + Date.now(),
            username: username,
            message: message,
            timestamp: new Date().toISOString()
        };
        this.shared.chat.push(msg);
        if (this.shared.chat.length > 100) {
            this.shared.chat = this.shared.chat.slice(-50);
        }
        this.saveShared();
        return msg;
    },

    getChatMessages(limit) {
        limit = limit || 50;
        return this.shared.chat.slice(-limit);
    },

    filterBadWords(message) {
        const badWords = ['fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'bastard', 'dick', 'pussy', 'cock', 'nigga', 'nigger', 'retard', 'faggot'];
        let filtered = message;
        for (let i = 0; i < badWords.length; i++) {
            const word = badWords[i];
            const regex = new RegExp(word, 'gi');
            filtered = filtered.replace(regex, '*'.repeat(word.length));
        }
        return filtered;
    },

    getLeaderboard(type, limit) {
        type = type || 'wagered';
        limit = limit || 20;
        
        const users = Object.values(this.data.users);
        users.sort(function(a, b) {
            if (type === 'wagered') return b.stats.wagered - a.stats.wagered;
            if (type === 'won') return b.stats.won - a.stats.won;
            if (type === 'gamesWon') return b.stats.gamesWon - a.stats.gamesWon;
            return 0;
        });
        
        return users.slice(0, limit);
    }
};