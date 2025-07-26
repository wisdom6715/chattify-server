import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from '../config/supabase.js';

// Create a new group
export const createGroup = async (groupData) => {
  try {
    const { group_name, group_description, created_by } = groupData;
    
    if (!group_name || !created_by) {
      throw new Error('Group name and creator ID are required');
    }

    // Insert new group
    const { data: group, error: groupError } = await supabase
      .from(TABLES.GROUPS)
      .insert([{
        group_name: group_name.trim(),
        group_description: group_description?.trim() || null,
        created_by: created_by
      }])
      .select()
      .single();

    if (groupError) throw groupError;

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .insert([{
        group_id: group.group_id,
        user_id: created_by,
        role: 'admin'
      }]);

    if (memberError) throw memberError;

    console.log(`Group created: ${group_name} (${group.group_id}) by ${created_by}`);
    return handleSupabaseSuccess(group, 'Group created successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get group by ID with members
export const getGroupById = async (groupId) => {
  try {
    const { data: group, error: groupError } = await supabase
      .from(TABLES.GROUPS)
      .select('*')
      .eq('group_id', groupId)
      .single();

    if (groupError) throw groupError;

    // Get group members
    const { data: members, error: membersError } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select(`
        role,
        joined_at,
        users!group_members_user_id_fkey (
          user_id,
          user_name,
          phone_number,
          online,
          last_seen,
          profile_picture,
          status
        )
      `)
      .eq('group_id', groupId);

    if (membersError) throw membersError;

    const groupWithMembers = {
      ...group,
      members: members.map(member => ({
        ...member.users,
        role: member.role,
        joined_at: member.joined_at
      }))
    };

    return handleSupabaseSuccess(groupWithMembers);

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get user's groups
export const getUserGroups = async (userId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select(`
        role,
        joined_at,
        groups!group_members_group_id_fkey (
          group_id,
          group_name,
          group_description,
          created_by,
          created_at,
          group_picture
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const groups = data.map(item => ({
      ...item.groups,
      user_role: item.role,
      joined_at: item.joined_at
    }));

    return handleSupabaseSuccess(groups);

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Add member to group
export const addGroupMember = async (groupId, userId, addedBy, role = 'member') => {
  try {
    // Check if the person adding is an admin
    const { data: adminCheck, error: adminError } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', addedBy)
      .single();

    if (adminError) throw new Error('You are not a member of this group');
    if (adminCheck.role !== 'admin') throw new Error('Only admins can add members');

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from(TABLES.USERS)
      .select('user_id, user_name')
      .eq('user_id', userId)
      .single();

    if (userError) throw new Error('User not found');

    // Check if user is already a member
    const { data: existingMember, error: checkError } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existingMember) throw new Error('User is already a member');

    // Add member
    const { data, error } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .insert([{
        group_id: groupId,
        user_id: userId,
        role: role
      }])
      .select(`
        role,
        joined_at,
        users!group_members_user_id_fkey (
          user_id,
          user_name,
          phone_number,
          online,
          last_seen,
          profile_picture,
          status
        )
      `)
      .single();

    if (error) throw error;

    const memberData = {
      ...data.users,
      role: data.role,
      joined_at: data.joined_at
    };

    console.log(`User ${user.user_name} added to group ${groupId}`);
    return handleSupabaseSuccess(memberData, 'Member added successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Remove member from group
export const removeGroupMember = async (groupId, userId, removedBy) => {
  try {
    // Check if the person removing is an admin
    const { data: adminCheck, error: adminError } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', removedBy)
      .single();

    if (adminError) throw new Error('You are not a member of this group');
    if (adminCheck.role !== 'admin') throw new Error('Only admins can remove members');

    // Check if user is the group creator
    const { data: group, error: groupError } = await supabase
      .from(TABLES.GROUPS)
      .select('created_by')
      .eq('group_id', groupId)
      .single();

    if (groupError) throw groupError;
    if (group.created_by === userId) throw new Error('Cannot remove group creator');

    // Remove member
    const { error } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`User ${userId} removed from group ${groupId}`);
    return handleSupabaseSuccess(null, 'Member removed successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Update member role
export const updateMemberRole = async (groupId, userId, newRole, updatedBy) => {
  try {
    // Check if the person updating is an admin
    const { data: adminCheck, error: adminError } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', updatedBy)
      .single();

    if (adminError) throw new Error('You are not a member of this group');
    if (adminCheck.role !== 'admin') throw new Error('Only admins can update member roles');

    // Check if user is the group creator
    const { data: group, error: groupError } = await supabase
      .from(TABLES.GROUPS)
      .select('created_by')
      .eq('group_id', groupId)
      .single();

    if (groupError) throw groupError;
    if (group.created_by === userId) throw new Error('Cannot change creator role');

    // Update member role
    const { data, error } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .update({ role: newRole })
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .select(`
        role,
        joined_at,
        users!group_members_user_id_fkey (
          user_id,
          user_name,
          phone_number,
          online,
          last_seen,
          profile_picture,
          status
        )
      `)
      .single();

    if (error) throw error;

    const memberData = {
      ...data.users,
      role: data.role,
      joined_at: data.joined_at
    };

    console.log(`User ${userId} role updated to ${newRole} in group ${groupId}`);
    return handleSupabaseSuccess(memberData, 'Member role updated successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Update group details
export const updateGroup = async (groupId, updates, updatedBy) => {
  try {
    // Check if the person updating is an admin
    const { data: adminCheck, error: adminError } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', updatedBy)
      .single();

    if (adminError) throw new Error('You are not a member of this group');
    if (adminCheck.role !== 'admin') throw new Error('Only admins can update group details');

    const allowedFields = ['group_name', 'group_description', 'group_picture'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const { data, error } = await supabase
      .from(TABLES.GROUPS)
      .update(filteredUpdates)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) throw error;

    console.log(`Group ${groupId} updated`);
    return handleSupabaseSuccess(data, 'Group updated successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Delete group
export const deleteGroup = async (groupId, deletedBy) => {
  try {
    // Check if the person deleting is the creator
    const { data: group, error: groupError } = await supabase
      .from(TABLES.GROUPS)
      .select('created_by')
      .eq('group_id', groupId)
      .single();

    if (groupError) throw groupError;
    if (group.created_by !== deletedBy) throw new Error('Only group creator can delete the group');

    // Delete group (cascade will handle members)
    const { error } = await supabase
      .from(TABLES.GROUPS)
      .delete()
      .eq('group_id', groupId);

    if (error) throw error;

    console.log(`Group ${groupId} deleted`);
    return handleSupabaseSuccess(null, 'Group deleted successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Leave group
export const leaveGroup = async (groupId, userId) => {
  try {
    // Check if user is the group creator
    const { data: group, error: groupError } = await supabase
      .from(TABLES.GROUPS)
      .select('created_by')
      .eq('group_id', groupId)
      .single();

    if (groupError) throw groupError;
    if (group.created_by === userId) throw new Error('Group creator cannot leave. Transfer ownership or delete the group.');

    // Remove user from group
    const { error } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`User ${userId} left group ${groupId}`);
    return handleSupabaseSuccess(null, 'Left group successfully');

  } catch (error) {
    return handleSupabaseError(error);
  }
};