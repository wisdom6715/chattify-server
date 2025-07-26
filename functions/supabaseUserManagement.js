import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from '../config/supabase.js';

// Register a new user
export const registerUser = async (userData) => {
  try {
    const { user_name, phone_number } = userData;
    
    if (!user_name || !phone_number) {
      throw new Error('Username and phone number are required');
    }

    // Check if phone number already exists
    const { data: existingUser, error: checkError } = await supabase
      .from(TABLES.USERS)
      .select('user_id')
      .eq('phone_number', phone_number)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }

    if (existingUser) {
      throw new Error('Phone number already registered');
    }

    // Insert new user
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .insert([{
        user_name: user_name.trim(),
        phone_number: phone_number.trim(),
        online: true,
        status: 'Available'
      }])
      .select()
      .single();

    if (error) throw error;

    console.log(`User registered: ${user_name} (${data.user_id})`);
    return handleSupabaseSuccess(data, 'User registered successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get user by phone number
export const getUserByPhone = async (phoneNumber) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Update user online status
export const updateUserOnlineStatus = async (userId, online) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update({ 
        online: online,
        last_seen: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const allowedFields = ['user_name', 'profile_picture', 'status'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update(filteredUpdates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return handleSupabaseSuccess(data, 'Profile updated successfully');
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Add friend relationship
export const addFriend = async (userId, friendId) => {
  try {
    if (userId === friendId) {
      throw new Error('Cannot add yourself as friend');
    }

    // Check if both users exist
    const { data: user, error: userError } = await supabase
      .from(TABLES.USERS)
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (userError) throw new Error('User not found');

    const { data: friend, error: friendError } = await supabase
      .from(TABLES.USERS)
      .select('user_id, user_name, phone_number, online, last_seen, profile_picture, status')
      .eq('user_id', friendId)
      .single();

    if (friendError) throw new Error('Friend not found');

    // Check if friendship already exists
    const { data: existingFriendship, error: checkError } = await supabase
      .from(TABLES.FRIENDS)
      .select('*')
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (existingFriendship) {
      throw new Error('Already friends');
    }

    // Add friendship (bidirectional)
    const { error: insertError } = await supabase
      .from(TABLES.FRIENDS)
      .insert([
        { user_id: userId, friend_id: friendId },
        { user_id: friendId, friend_id: userId }
      ]);

    if (insertError) throw insertError;

    console.log(`Friendship created between ${userId} and ${friendId}`);
    return handleSupabaseSuccess(friend, 'Friend added successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Remove friend relationship
export const removeFriend = async (userId, friendId) => {
  try {
    // Remove friendship (bidirectional)
    const { error } = await supabase
      .from(TABLES.FRIENDS)
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    if (error) throw error;

    console.log(`Friendship removed between ${userId} and ${friendId}`);
    return handleSupabaseSuccess(null, 'Friend removed successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get user's friends list
export const getUserFriends = async (userId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.FRIENDS)
      .select(`
        friend_id,
        users!friends_friend_id_fkey (
          user_id,
          user_name,
          phone_number,
          online,
          last_seen,
          profile_picture,
          status
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const friends = data.map(item => item.users);
    return handleSupabaseSuccess(friends);

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get recommended friends (random users excluding current friends)
export const getRecommendedFriends = async (userId, limit = 10) => {
  try {
    // Get current friends list
    const { data: friendsData, error: friendsError } = await supabase
      .from(TABLES.FRIENDS)
      .select('friend_id')
      .eq('user_id', userId);

    if (friendsError) throw friendsError;

    const friendIds = friendsData.map(f => f.friend_id);
    const excludeIds = [userId, ...friendIds];

    // Get random users excluding current user and friends
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('user_id, user_name, phone_number, online, last_seen, profile_picture, status')
      .not('user_id', 'in', `(${excludeIds.join(',')})`)
      .limit(limit);

    if (error) throw error;

    // Shuffle the results
    const shuffled = data.sort(() => 0.5 - Math.random());
    return handleSupabaseSuccess(shuffled.slice(0, limit));

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Search users by name or phone number
export const searchUsers = async (query, excludeUserId = null, limit = 20) => {
  try {
    let queryBuilder = supabase
      .from(TABLES.USERS)
      .select('user_id, user_name, phone_number, online, last_seen, profile_picture, status')
      .or(`user_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
      .limit(limit);

    if (excludeUserId) {
      queryBuilder = queryBuilder.neq('user_id', excludeUserId);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return handleSupabaseSuccess(data);

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Check if users are friends
export const areFriends = async (userId, friendId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.FRIENDS)
      .select('*')
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return handleSupabaseSuccess(!!data);

  } catch (error) {
    return handleSupabaseError(error);
  }
};