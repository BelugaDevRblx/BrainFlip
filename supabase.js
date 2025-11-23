// SUPABASE CONFIG
const SUPABASE_URL = 'https://woudapshwmdrogvbxviw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cBiEzbOnw-oMNxQkqFgJXA_-jgAR3Y8';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: {
        schema: 'public'
    },
    auth: {
        persistSession: false
    }
});

const SupaDB = {
    // USER MANAGEMENT
    async verifyRobloxUser(username) {
        try {
            // TEMPORAIRE : Vérification simplifiée sans API Roblox
            // Pour activer la vraie vérification, il faudra un backend
            const robloxId = Math.floor(Math.random() * 9999999999);
            
            return { 
                success: true, 
                user: {
                    username: username,
                    robloxId: robloxId,
                    avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=150&height=150&format=png`
                }
            };
        } catch (error) {
            console.error('Verification error:', error);
            return { success: false, error: 'Verification failed' };
        }
    },

    async registerUser(username, email, password) {
        try {
            // Vérifier si l'utilisateur existe déjà
            const existing = await this.getUser(username);
            if (existing) {
                return { success: false, error: 'Username already exists' };
            }

            const robloxId = Math.floor(Math.random() * 9999999999);
            
            const newUser = {
                username: username,
                email: email,
                password: password,
                roblox_id: robloxId,
                avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=150&height=150&format=png`,
                level: 1,
                discord_linked: false,
                discord_username: null,
                badges: [],
                stats_wagered: 0,
                stats_won: 0,
                stats_lost: 0,
                stats_games_played: 0,
                stats_games_won: 0,
                is_admin: username === 'DimaWarm_BlueHive',
                inventory: [],
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();

            if (error) {
                console.error('Error registering user:', error);
                return { success: false, error: 'Failed to create account' };
            }

            return { success: true, user: data };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: 'Registration failed' };
        }
    },

    async loginUser(username, password) {
        try {
            const user = await this.getUser(username);
            
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            if (user.password !== password) {
                return { success: false, error: 'Invalid password' };
            }

            return { success: true, user: user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Login failed' };
        }
    },

    async createOrGetUser(username, robloxId, avatar) {
        // Vérifier si l'utilisateur existe
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();

        if (existingUser) {
            return existingUser;
        }

        // Créer nouvel utilisateur
        const newUser = {
            username: username,
            roblox_id: robloxId,
            avatar: avatar,
            level: 1,
            stats_wagered: 0,
            stats_won: 0,
            stats_lost: 0,
            stats_games_played: 0,
            stats_games_won: 0,
            is_admin: username === 'DimaWarm_BlueHive',
            inventory: [],
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            return null;
        }

        return data;
    },

    async getUser(username) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }

        return data;
    },

    async updateUserStats(username, updates) {
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('username', username);

        if (error) {
            console.error('Error updating stats:', error);
        }
    },

    async getUserBalance(username) {
        const user = await this.getUser(username);
        if (!user || !user.inventory) return 0;
        return user.inventory.reduce((sum, item) => sum + item.value, 0);
    },

    async addItemToUser(username, itemId, qty = 1) {
        const user = await this.getUser(username);
        if (!user) return false;

        const items = await this.getAllItems();
        const item = items.find(i => i.id === itemId);
        if (!item) return false;

        const inventory = user.inventory || [];
        for (let i = 0; i < qty; i++) {
            inventory.push({
                ...item,
                uniqueId: 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            });
        }

        const { error } = await supabase
            .from('users')
            .update({ inventory: inventory })
            .eq('username', username);

        return !error;
    },

    async removeItemsFromUser(username, uniqueIds) {
        const user = await this.getUser(username);
        if (!user) return false;

        const inventory = (user.inventory || []).filter(item => !uniqueIds.includes(item.uniqueId));

        const { error } = await supabase
            .from('users')
            .update({ inventory: inventory })
            .eq('username', username);

        return !error;
    },

    // COINFLIPS
    async createCoinflip(creatorUsername, items, side) {
        const creator = await this.getUser(creatorUsername);
        if (!creator) return null;

        const totalValue = items.reduce((sum, item) => sum + item.value, 0);
        
        const coinflip = {
            creator: creatorUsername,
            creator_avatar: creator.avatar,
            creator_items: items,
            creator_side: side,
            total_value: totalValue,
            status: 'waiting',
            created_at: new Date().toISOString()
        };

        // Retirer items de l'inventaire
        await this.removeItemsFromUser(creatorUsername, items.map(i => i.uniqueId));

        const { data, error } = await supabase
            .from('coinflips')
            .insert([coinflip])
            .select()
            .single();

        if (error) {
            console.error('Error creating coinflip:', error);
            return null;
        }

        return data;
    },

    async getActiveCoinflips() {
        const { data, error } = await supabase
            .from('coinflips')
            .select('*')
            .eq('status', 'waiting')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching coinflips:', error);
            return [];
        }

        return data || [];
    },

    async getAllActiveCoinflips() {
        const { data, error } = await supabase
            .from('coinflips')
            .select('*')
            .in('status', ['waiting', 'playing'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all coinflips:', error);
            return [];
        }

        return data || [];
    },

    async getCoinflip(id) {
        const { data, error } = await supabase
            .from('coinflips')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching coinflip:', error);
            return null;
        }

        return data;
    },

    async joinCoinflip(coinflipId, opponentUsername, items) {
        const cf = await this.getCoinflip(coinflipId);
        const opponent = await this.getUser(opponentUsername);
        
        if (!cf || !opponent || cf.status !== 'waiting') return null;

        await this.removeItemsFromUser(opponentUsername, items.map(i => i.uniqueId));

        const { data, error } = await supabase
            .from('coinflips')
            .update({
                opponent: opponentUsername,
                opponent_avatar: opponent.avatar,
                opponent_items: items,
                status: 'playing'
            })
            .eq('id', coinflipId)
            .select()
            .single();

        if (error) {
            console.error('Error joining coinflip:', error);
            return null;
        }

        return data;
    },

    async finishCoinflip(coinflipId, winnerSide) {
        const cf = await this.getCoinflip(coinflipId);
        if (!cf || cf.status !== 'playing') return null;

        const winner = winnerSide === cf.creator_side ? cf.creator : cf.opponent;
        const loser = winner === cf.creator ? cf.opponent : cf.creator;

        // Donner items au gagnant
        const allItems = [...cf.creator_items, ...cf.opponent_items];
        const winnerUser = await this.getUser(winner);
        if (winnerUser) {
            const newInventory = [...(winnerUser.inventory || []), ...allItems];
            await supabase
                .from('users')
                .update({ inventory: newInventory })
                .eq('username', winner);
        }

        // Update stats
        const totalPot = cf.total_value * 2;
        const winnerData = await this.getUser(winner);
        if (winnerData) {
            await this.updateUserStats(winner, {
                stats_won: (winnerData.stats_won || 0) + totalPot,
                stats_wagered: (winnerData.stats_wagered || 0) + cf.total_value,
                stats_games_played: (winnerData.stats_games_played || 0) + 1,
                stats_games_won: (winnerData.stats_games_won || 0) + 1
            });
        }

        const loserData = await this.getUser(loser);
        if (loserData) {
            await this.updateUserStats(loser, {
                stats_lost: (loserData.stats_lost || 0) + cf.total_value,
                stats_wagered: (loserData.stats_wagered || 0) + cf.total_value,
                stats_games_played: (loserData.stats_games_played || 0) + 1
            });
        }

        // SUPPRIMER IMMÉDIATEMENT
        await supabase
            .from('coinflips')
            .delete()
            .eq('id', coinflipId);

        return { winner: winner, winner_side: winnerSide };
    },

    // CHAT
    async sendChatMessage(username, message) {
        const user = await this.getUser(username);
        if (!user) return null;

        const msg = {
            username: username,
            avatar: user.avatar,
            is_admin: user.is_admin,
            message: message.substring(0, 200),
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('chat_messages')
            .insert([msg])
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            return null;
        }

        return data;
    },

    async getChatMessages(limit = 50) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }

        return (data || []).reverse();
    },

    // Subscribe to real-time chat updates
    subscribeToChatUpdates(callback) {
        return supabase
            .channel('chat_messages')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_messages' 
            }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    },

    // Subscribe to coinflip updates
    subscribeToCoinflipUpdates(callback) {
        return supabase
            .channel('coinflips')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'coinflips' 
            }, (payload) => {
                callback(payload);
            })
            .subscribe();
    },

    // LEADERBOARD
    async getLeaderboard(limit = 20) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('stats_wagered', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }

        return data || [];
    },

    // ITEMS
    async getAllItems() {
        return [
            { id: "skibidi_toilet", name: "Skibidi Toilet", value: 100, icon: "Item_Assets/skibidi_toilet.png" },
            { id: "cameraman", name: "Cameraman", value: 250, icon: "Item_Assets/cameraman.png" },
            { id: "tv_man", name: "TV Man", value: 500, icon: "Item_Assets/tv_man.png" },
            { id: "speakerman", name: "Speakerman", value: 750, icon: "Item_Assets/speakerman.png" },
            { id: "gman", name: "G-Man", value: 1000, icon: "Item_Assets/gman.png" },
            { id: "titan_cameraman", name: "Titan Cameraman", value: 2500, icon: "Item_Assets/titan_cameraman.png" },
            { id: "titan_speakerman", name: "Titan Speakerman", value: 2500, icon: "Item_Assets/titan_speakerman.png" },
            { id: "titan_tvman", name: "Titan TV Man", value: 3000, icon: "Item_Assets/titan_tvman.png" },
            { id: "chill_guy", name: "Chill Guy", value: 150, icon: "Item_Assets/chill_guy.png" },
            { id: "sigma", name: "Sigma", value: 300, icon: "Item_Assets/sigma.png" },
            { id: "ohio_boss", name: "Ohio Boss", value: 10000, icon: "Item_Assets/ohio_boss.png" },
            { id: "rizz_god", name: "Rizz God", value: 7500, icon: "Item_Assets/rizz_god.png" },
            { id: "gyatt", name: "Gyatt", value: 200, icon: "Item_Assets/gyatt.png" },
            { id: "kai_cenat", name: "Kai Cenat", value: 5000, icon: "Item_Assets/kai_cenat.png" },
            { id: "ishowspeed", name: "IShowSpeed", value: 6000, icon: "Item_Assets/ishowspeed.png" }
        ];
    },

    async getAllUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return data || [];
    },

    async cancelCoinflip(coinflipId, username) {
        const cf = await this.getCoinflip(coinflipId);
        if (!cf || cf.status !== 'waiting' || cf.creator !== username) {
            return null;
        }

        // Rendre les items au créateur
        const creator = await this.getUser(cf.creator);
        if (creator) {
            const newInventory = [...(creator.inventory || []), ...cf.creator_items];
            await supabase
                .from('users')
                .update({ inventory: newInventory })
                .eq('username', cf.creator);
        }

        await supabase
            .from('coinflips')
            .delete()
            .eq('id', coinflipId);

        return true;
    },

    async getCoinflipsHistory(limit = 10) {
        const { data, error } = await supabase
            .from('coinflips')
            .select('*')
            .eq('status', 'finished')
            .order('finished_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching history:', error);
            return [];
        }

        return data || [];
    },

    async tipUser(fromUsername, toUsername, itemUniqueIds) {
        const fromUser = await this.getUser(fromUsername);
        const toUser = await this.getUser(toUsername);

        if (!fromUser || !toUser) return false;

        const itemsToTip = fromUser.inventory.filter(item => 
            itemUniqueIds.includes(item.uniqueId)
        );

        if (itemsToTip.length === 0) return false;

        // Retirer items de l'expéditeur
        const newFromInventory = fromUser.inventory.filter(item => 
            !itemUniqueIds.includes(item.uniqueId)
        );

        // Ajouter items au destinataire
        const newToInventory = [...(toUser.inventory || []), ...itemsToTip];

        await supabase
            .from('users')
            .update({ inventory: newFromInventory })
            .eq('username', fromUsername);

        await supabase
            .from('users')
            .update({ inventory: newToInventory })
            .eq('username', toUsername);

        return itemsToTip;
    },

    async updateUserAvatar(username, avatarUrl) {
        const { error } = await supabase
            .from('users')
            .update({ avatar: avatarUrl })
            .eq('username', username);

        if (error) {
            console.error('Error updating avatar:', error);
            return false;
        }

        return true;
    },

    async resetUserInventory(username) {
        const { error } = await supabase
            .from('users')
            .update({ inventory: [] })
            .eq('username', username);

        if (error) {
            console.error('Error resetting inventory:', error);
            return false;
        }

        // Supprimer les coinflips de cet user
        await supabase
            .from('coinflips')
            .delete()
            .or('creator.eq.' + username + ',opponent.eq.' + username);

        return true;
    },

    async cancelAllCoinflips(returnItems) {
        try {
            if (returnItems) {
                // Récupérer tous les coinflips
                const { data: coinflips, error: fetchError } = await supabase
                    .from('coinflips')
                    .select('*');

                if (!fetchError && coinflips) {
                    // Rendre items à chaque user
                    for (let i = 0; i < coinflips.length; i++) {
                        const cf = coinflips[i];
                        
                        // Rendre au créateur
                        const creator = await this.getUser(cf.creator);
                        if (creator && cf.creator_items) {
                            const newInventory = [...(creator.inventory || []), ...cf.creator_items];
                            await supabase
                                .from('users')
                                .update({ inventory: newInventory })
                                .eq('username', cf.creator);
                        }
                        
                        // Rendre à l'opponent si il existe
                        if (cf.opponent && cf.opponent_items) {
                            const opponent = await this.getUser(cf.opponent);
                            if (opponent) {
                                const newInventory = [...(opponent.inventory || []), ...cf.opponent_items];
                                await supabase
                                    .from('users')
                                    .update({ inventory: newInventory })
                                    .eq('username', cf.opponent);
                            }
                        }
                    }
                }
            }
            
            // Supprimer tous les coinflips
            await supabase
                .from('coinflips')
                .delete()
                .neq('id', 'impossible_id');

            return true;
        } catch (error) {
            console.error('Cancel all coinflips error:', error);
            return false;
        }
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

    async wipeAllData() {
        try {
            // Reset tous les inventaires et stats
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('username');

            if (!usersError && users) {
                for (let i = 0; i < users.length; i++) {
                    await supabase
                        .from('users')
                        .update({
                            inventory: [],
                            stats_wagered: 0,
                            stats_won: 0,
                            stats_lost: 0,
                            stats_games_played: 0,
                            stats_games_won: 0
                        })
                        .eq('username', users[i].username);
                }
            }

            // Supprimer tous les coinflips
            await supabase
                .from('coinflips')
                .delete()
                .neq('id', 'impossible_id');

            // Supprimer tous les messages
            await supabase
                .from('chat_messages')
                .delete()
                .neq('id', 'impossible_id');

            return true;
        } catch (error) {
            console.error('Wipe error:', error);
            return false;
        }
    }
};

window.SupaDB = SupaDB;