const DB = {
    STORAGE_KEY: 'brainrotflip_db',
    SHARED_KEY: 'brainrotflip_shared',
    data: null,
    shared: null,

    async init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            this.data = JSON.parse(saved);
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

        // NETTOYER TOUS LES COINFLIPS AU DÉMARRAGE
        this.shared.coinflips = [];
        this.saveShared();

        this.save();
        return this.data;
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
            items: {
                skibidi_toilet: { id: "skibidi_toilet", name: "Skibidi Toilet", value: 100, icon: "Item_Assets/skibidi_toilet.png" },
                cameraman: { id: "cameraman", name: "Cameraman", value: 250, icon: "Item_Assets/cameraman.png" },
                tv_man: { id: "tv_man", name: "TV Man", value: 500, icon: "Item_Assets/tv_man.png" },
                speakerman: { id: "speakerman", name: "Speakerman", value: 750, icon: "Item_Assets/speakerman.png" },
                gman: { id: "gman", name: "G-Man", value: 1000, icon: "Item_Assets/gman.png" },
                titan_cameraman: { id: "titan_cameraman", name: "Titan Cameraman", value: 2500, icon: "Item_Assets/titan_cameraman.png" },
                titan_speakerman: { id: "titan_speakerman", name: "Titan Speakerman", value: 2500, icon: "Item_Assets/titan_speakerman.png" },
                titan_tvman: { id: "titan_tvman", name: "Titan TV Man", value: 3000, icon: "Item_Assets/titan_tvman.png" },
                chill_guy: { id: "chill_guy", name: "Chill Guy", value: 150, icon: "Item_Assets/chill_guy.png" },
                sigma: { id: "sigma", name: "Sigma", value: 300, icon: "Item_Assets/sigma.png" },
                ohio_boss: { id: "ohio_boss", name: "Ohio Boss", value: 10000, icon: "Item_Assets/ohio_boss.png" },
                rizz_god: { id: "rizz_god", name: "Rizz God", value: 7500, icon: "Item_Assets/rizz_god.png" },
                gyatt: { id: "gyatt", name: "Gyatt", value: 200, icon: "Item_Assets/gyatt.png" },
                kai_cenat: { id: "kai_cenat", name: "Kai Cenat", value: 5000, icon: "Item_Assets/kai_cenat.png" },
                ishowspeed: { id: "ishowspeed", name: "IShowSpeed", value: 6000, icon: "Item_Assets/ishowspeed.png" }
            }
        };
    },

    getUser(username) {
        return this.data.users[username] || null;
    },

    createUser(username, robloxId, password) {
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
            createdAt: new Date().toISOString()
        };
        this.data.users[username] = user;
        this.save();
        return user;
    },

    addItemToUser(username, itemId, qty) {
        if (!qty) qty = 1;
        const user = this.data.users[username];
        const item = this.data.items[itemId];
        if (!user || !item) return false;

        for (let i = 0; i < qty; i++) {
            user.inventory.push({
                id: item.id,
                name: item.name,
                value: item.value,
                icon: item.icon,
                uniqueId: 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            });
        }
        this.save();
        return true;
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
        return user.inventory.reduce(function(sum, item) { return sum + item.value; }, 0);
    },

    createCoinflip(creatorUsername, items, side) {
        const creator = this.data.users[creatorUsername];
        if (!creator) return null;

        const totalValue = items.reduce(function(sum, item) { return sum + item.value; }, 0);
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

        const uniqueIds = items.map(function(i) { return i.uniqueId; });
        this.removeItemsFromUser(opponentUsername, uniqueIds);
        this.saveShared();
        return cf;
    },

    finishCoinflip(coinflipId, winnerSide) {
        const cf = this.getCoinflip(coinflipId);
        if (!cf || cf.status !== 'playing') return null;

        const winner = winnerSide === cf.creatorSide ? cf.creator : cf.opponent;
        const loser = winner === cf.creator ? cf.opponent : cf.creator;

        // Donner items au gagnant
        const allItems = [];
        for (let i = 0; i < cf.creatorItems.length; i++) {
            allItems.push(Object.assign({}, cf.creatorItems[i]));
        }
        for (let i = 0; i < cf.opponentItems.length; i++) {
            allItems.push(Object.assign({}, cf.opponentItems[i]));
        }

        const winnerUser = this.data.users[winner];
        if (winnerUser) {
            for (let i = 0; i < allItems.length; i++) {
                winnerUser.inventory.push(allItems[i]);
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

        // SUPPRIMER IMMÉDIATEMENT
        this.shared.coinflips = this.shared.coinflips.filter(function(c) {
            return c.id !== coinflipId;
        });

        this.shared.coinflipsHistory.unshift(cf);
        if (this.shared.coinflipsHistory.length > 50) {
            this.shared.coinflipsHistory = this.shared.coinflipsHistory.slice(0, 50);
        }

        this.save();
        this.saveShared();
        
        return { winner: winner, winnerSide: winnerSide };
    },

    cancelCoinflip(coinflipId, username) {
        const cf = this.getCoinflip(coinflipId);
        if (!cf || cf.status !== 'waiting' || cf.creator !== username) return null;

        const creator = this.data.users[cf.creator];
        if (creator) {
            creator.inventory = creator.inventory.concat(cf.creatorItems);
        }

        this.shared.coinflips = this.shared.coinflips.filter(function(c) {
            return c.id !== coinflipId;
        });
        this.save();
        this.saveShared();
        return true;
    },

    getCoinflipsHistory(limit) {
        if (!limit) limit = 10;
        return this.shared.coinflipsHistory.slice(0, limit);
    },

    tipUser(fromUsername, toUsername, itemUniqueIds) {
        const fromUser = this.data.users[fromUsername];
        const toUser = this.data.users[toUsername];
        if (!fromUser || !toUser) return false;

        const itemsToTip = fromUser.inventory.filter(function(item) {
            return itemUniqueIds.includes(item.uniqueId);
        });
        if (itemsToTip.length === 0) return false;

        fromUser.inventory = fromUser.inventory.filter(function(item) {
            return !itemUniqueIds.includes(item.uniqueId);
        });
        toUser.inventory = toUser.inventory.concat(itemsToTip);

        this.save();
        return itemsToTip;
    },

    updateUserAvatar(username, avatarUrl) {
        const user = this.data.users[username];
        if (!user) return false;
        user.avatar = avatarUrl;
        this.save();
        return true;
    },

    addChatMessage(username, message) {
        const user = this.data.users[username];
        if (!user) return null;

        const msg = {
            id: 'msg_' + Date.now(),
            username: username,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
            message: message.substring(0, 200),
            timestamp: new Date().toISOString()
        };

        this.shared.chat.push(msg);
        if (this.shared.chat.length > 100) {
            this.shared.chat = this.shared.chat.slice(-100);
        }
        this.saveShared();
        return msg;
    },

    getChatMessages(limit) {
        if (!limit) limit = 50;
        return this.shared.chat.slice(-limit);
    },

    getLeaderboard(type, limit) {
        if (!type) type = 'wagered';
        if (!limit) limit = 20;
        return Object.values(this.data.users)
            .sort(function(a, b) { return (b.stats[type] || 0) - (a.stats[type] || 0); })
            .slice(0, limit);
    },

    getAllItems() {
        return Object.values(this.data.items);
    },

    getAllUsers() {
        return Object.values(this.data.users);
    },

    filterBadWords(message) {
        const badWords = ['nigga', 'nigger', 'fuck', 'shit', 'bitch', 'ass', 'dick', 'pussy', 'porn', 'sex', 'rape', 'kill', 'suicide', 'nazi', 'hitler'];
        let filtered = message.toLowerCase();
        for (let i = 0; i < badWords.length; i++) {
            const word = badWords[i];
            const regex = new RegExp(word, 'gi');
            filtered = filtered.replace(regex, '***');
        }
        return filtered;
    },

    resetUserInventory(username) {
        const user = this.data.users[username];
        if (!user) return false;
        user.inventory = [];
        this.shared.coinflips = this.shared.coinflips.filter(function(cf) {
            return cf.creator !== username && cf.opponent !== username;
        });
        this.save();
        this.saveShared();
        return true;
    },

    cancelAllCoinflips(returnItems) {
        const coinflips = this.shared.coinflips;
        if (returnItems) {
            for (let i = 0; i < coinflips.length; i++) {
                const cf = coinflips[i];
                const creator = this.data.users[cf.creator];
                if (creator && cf.creatorItems) {
                    for (let j = 0; j < cf.creatorItems.length; j++) {
                        creator.inventory.push(cf.creatorItems[j]);
                    }
                }
                if (cf.opponent && cf.opponentItems) {
                    const opponent = this.data.users[cf.opponent];
                    if (opponent) {
                        for (let j = 0; j < cf.opponentItems.length; j++) {
                            opponent.inventory.push(cf.opponentItems[j]);
                        }
                    }
                }
            }
        }
        this.shared.coinflips = [];
        this.save();
        this.saveShared();
        return true;
    },

    wipeAllData() {
        const users = Object.keys(this.data.users);
        for (let i = 0; i < users.length; i++) {
            const username = users[i];
            this.data.users[username].inventory = [];
            this.data.users[username].stats = { wagered: 0, won: 0, lost: 0, gamesPlayed: 0, gamesWon: 0 };
        }
        this.shared.coinflips = [];
        this.shared.coinflipsHistory = [];
        this.shared.chat = [];
        this.save();
        this.saveShared();
        return true;
    },

    isMaintenanceMode() {
        return this.data.maintenance || false;
    },

    setMaintenanceMode(enabled) {
        this.data.maintenance = enabled;
        this.save();
    }
};

window.DB = DB;