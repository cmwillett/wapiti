import { useEffect, useState } from 'react';
import ListSidebar from './components/ListSidebar';
import TaskList from './components/TaskList';
import UserPreferences from './components/UserPreferences';
import Login from './Login';
import { supabase } from './supabaseClient';
import { listsService, tasksService, subscriptionsService, debugService } from './services/supabaseService';
import { initializeNotifications } from './services/notificationService';
import { browserReminderChecker } from './services/browserReminderChecker';

export default function App() {
  const [user, setUser] = useState(null);
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeList, setActiveList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);

  // Check for user on mount and on auth state change
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Load initial data when user is authenticated
  useEffect(() => {
    if (user) {
      loadInitialData();
      // Only call initializeNotifications - it handles permission request and service worker registration
      initializeNotifications();
    } else {
      setLists([]);
      setTasks([]);
      setActiveList(null);
      setLoading(false);
    }
  }, [user]);

  // Make debug function available in browser console for testing
  useEffect(() => {
    window.debugSupabase = debugService.testConnection;
    console.log('Debug function available: window.debugSupabase()');
  }, []);

  // Subscribe to real-time updates for active list
  useEffect(() => {
    if (!activeList) return;

    const subscription = subscriptionsService.subscribeToTasks(activeList, () => {
      loadTasksForActiveList();
    });

    return () => {
      subscriptionsService.unsubscribe(subscription);
    };
  }, [activeList]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const listsData = await listsService.getAllLists();
      setLists(listsData);
      
      if (listsData.length > 0 && !activeList) {
        setActiveList(listsData[0].id);
      }
    } catch (error) {
      console.error('Error loading lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasksForActiveList = async () => {
    if (!activeList) return;
    
    try {
      const tasksData = await tasksService.getTasksForList(activeList);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  // Load tasks when active list changes
  useEffect(() => {
    if (activeList) {
      loadTasksForActiveList();
    }
  }, [activeList]);

  // Placeholder: Only show lists/tasks if logged in
  if (!user) {
    return (
      <div className="flex h-screen justify-center items-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Wapiti To-Do</h1>
          <Login user={user} setUser={setUser} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen justify-center items-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full items-center">
      <div className="w-full flex justify-between items-center mt-4 px-4">
        <button
          onClick={() => setShowPreferences(true)}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
        >
          ⚙️ Notification Settings
        </button>
        <Login user={user} setUser={setUser} />
      </div>
      <div className="flex max-w-4xl mt-8 items-stretch w-full justify-center flex-none">
        <div className="flex flex-col relative" style={{ borderTop: '4px solid black', borderLeft: '4px solid black', borderBottom: '4px solid black' }}>
          <ListSidebar
            lists={lists}
            activeList={activeList}
            setActiveList={setActiveList}
            setLists={setLists}
            onListsChange={loadInitialData}
          />
        </div>
        <div style={{ background: 'black', width: '4px', alignSelf: 'stretch' }} />
        <div className="flex flex-col relative" style={{ borderTop: '4px solid black', borderRight: '4px solid black', borderBottom: '4px solid black' }}>
          <TaskList
            tasks={tasks}
            setTasks={setTasks}
            activeList={activeList}
            onTasksChange={loadTasksForActiveList}
          />
        </div>
      </div>
      {showPreferences && (
        <div className="fixed inset-0 flex items-center justify-center z-40 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
          <div className="rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 relative border-4 border-blue-500 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'white' }}>
            <button
              onClick={() => setShowPreferences(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-red-600 text-2xl font-bold bg-gray-100 hover:bg-red-100 rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
              style={{ lineHeight: '1' }}
            >
              ×
            </button>
            <UserPreferences user={user} />
          </div>
        </div>
      )}
    </div>
  );
}