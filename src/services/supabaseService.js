import { supabase } from '../supabaseClient';

// Debug function to test database connection and authentication
export const debugService = {
  async testConnection() {
    console.log('=== Supabase Debug Test ===');
    
    // Test 1: Check authentication
    console.log('1. Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User:', user);
    console.log('Auth Error:', authError);
    
    if (!user) {
      console.log('❌ User not authenticated');
      return { authenticated: false };
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Test 2: Check if tables exist by trying a simple select
    console.log('2. Testing database tables...');
    
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('count(*)')
        .limit(1);
      
      if (error) {
        console.log('❌ Lists table error:', error);
        return { authenticated: true, tablesExist: false, error };
      }
      
      console.log('✅ Lists table exists');
      
      // Test 3: Try to insert a test record
      console.log('3. Testing insert permission...');
      const { data: insertData, error: insertError } = await supabase
        .from('lists')
        .insert([{ name: 'TEST_LIST_DELETE_ME', user_id: user.id }])
        .select()
        .single();
      
      if (insertError) {
        console.log('❌ Insert failed:', insertError);
        return { authenticated: true, tablesExist: true, canInsert: false, insertError };
      }
      
      console.log('✅ Insert successful:', insertData);
      
      // Clean up the test record
      await supabase.from('lists').delete().eq('id', insertData.id);
      console.log('✅ Test record cleaned up');
      
      return { authenticated: true, tablesExist: true, canInsert: true };
      
    } catch (error) {
      console.log('❌ Database test failed:', error);
      return { authenticated: true, error };
    }
  }
};

// Lists operations
export const listsService = {
  async getAllLists() {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async createList(name) {
    console.log('Creating list:', name);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Current user:', user);
    console.log('Auth error:', authError);
    
    if (authError) throw new Error(`Authentication error: ${authError.message}`);
    if (!user) throw new Error('User not authenticated');

    console.log('Attempting to insert list with user_id:', user.id);
    
    const { data, error } = await supabase
      .from('lists')
      .insert([{ name, user_id: user.id }])
      .select()
      .single();
    
    console.log('Insert result:', { data, error });
    
    if (error) {
      console.error('Database error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Handle different types of Supabase errors
      let errorMessage = 'Unknown database error';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.hint) {
        errorMessage = error.hint;
      } else if (error.code) {
        errorMessage = `Error code: ${error.code}`;
      }
      
      throw new Error(`Database error: ${errorMessage}`);
    }
    return data;
  },

  async updateList(id, name) {
    const { data, error } = await supabase
      .from('lists')
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteList(id) {
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Tasks operations
export const tasksService = {
  async getTasksForList(listId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async createTask(listId, text) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        text,
        list_id: listId,
        user_id: user.id,
        completed: false,
        notes: '',
        reminder_time: null,
        reminder_sent: false
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateTask(id, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteTask(id) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async setReminder(id, reminderTime) {
    return this.updateTask(id, {
      reminder_time: reminderTime,
      reminder_sent: false
    });
  },

  async removeReminder(id) {
    return this.updateTask(id, {
      reminder_time: null,
      reminder_sent: false
    });
  }
};

// User preferences operations
export const userPreferencesService = {
  async getUserPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateUserPreferences(preferences) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert([{
        user_id: user.id,
        ...preferences
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Real-time subscriptions
export const subscriptionsService = {
  subscribeToLists(callback) {
    return supabase
      .channel('lists_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lists' },
        callback
      )
      .subscribe();
  },

  subscribeToTasks(listId, callback) {
    return supabase
      .channel(`tasks_changes_${listId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `list_id=eq.${listId}`
        },
        callback
      )
      .subscribe();
  },

  unsubscribe(subscription) {
    return supabase.removeChannel(subscription);
  }
};
