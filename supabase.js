// SUPABASE CONFIG
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SupaDB = {
    // USER MANAGEMENT
    async verifyRobloxUser(username) {
        try {
            // Vérifier le code dans la description Roblox via API
            const response = await fetch(`https://users.roblox.com/v1/users/search?keyword=${username}&limit=1`);
            const data = await response.json();
            
            if (!data.data || data.data.length === 0) {
                return { success: false, error: 'User not found' };
            }

            const robloxUser = data.data[0];
            const userId = robloxUser.id;

            // Récupérer la description
            const descResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
            const descData = await descResponse.json();
            
            const description = descData.description || '';
            const verificationCode = localStorage.getItem('brainrotflip_verification_code');

            // Vérifier si le code est dans la description
            if (!description.includes(verificationCode)) {
                return { success: false, error: 'Code not found in description' };
            }

            return { 
                success: true, 
                user: {
                    username: robloxUser.name,
                    robloxId: userId,
                    avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`
                }
            };
        } catch (error) {
            console.error('Verification error:', error);
            return { success: false, error: 'Verification failed' };
        }
    },

    async createOrGetUser(username, robloxId, avatar) {
        // Vérifier si l'utilisateur existe
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

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
            .single();

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

        // Supprimer le coinflip
        await supabase
            .from('coinflips')
            .delete()
            .eq('id', coinflipId);

        return { ...cf, winner, winner_side: winnerSide };
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
            { id: "skibidi_toilet", name: "Skibidi Toilet", value: 100, icon: "🚽" },
            { id: "cameraman", name: "Cameraman", value: 250, icon: "📹" },
            { id: "tv_man", name: "TV Man", value: 500, icon: "📺" },
            { id: "speakerman", name: "Speakerman", value: 750, icon: "🔊" },
            { id: "gman", name: "G-Man", value: 1000, icon: "🕴️" },
            { id: "titan_cameraman", name: "Titan Cameraman", value: 2500, icon: "🎥" },
            { id: "titan_speakerman", name: "Titan Speakerman", value: 2500, icon: "📢" },
            { id: "titan_tvman", name: "Titan TV Man", value: 3000, icon: "🖥️" },
            { id: "chill_guy", name: "Chill Guy", value: 150, icon: "😎" },
            { id: "sigma", name: "Sigma", value: 300, icon: "🐺" },
            { id: "ohio_boss", name: "Ohio Boss", value: 10000, icon: "👹" },
            { id: "rizz_god", name: "Rizz God", value: 7500, icon: "💫" },
            { id: "gyatt", name: "Gyatt", value: 200, icon: "🍑" },
            { id: "kai_cenat", name: "Kai Cenat", value: 5000, icon: "📺" },
            { id: "ishowspeed", name: "IShowSpeed", value: 6000, icon: "⚡" }
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
    }
};

window.SupaDB = SupaDB;