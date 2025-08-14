// ...existing code...
// forcing vercel update
// ...existing code...
import Drawer from "@mui/material/Drawer";
import Button from "@mui/material/Button";
import { supabase } from './supabaseClient';
// import only once
import { v4 as uuidv4 } from 'uuid';
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import { useState } from "react";
import TextField from '@mui/material/TextField';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShareIcon from "@mui/icons-material/Share";

import TaskList from "./components/TaskList";
import TaskDetail from "./components/TaskDetail";
import Auth from "./components/Auth";



// Quick add task bar
function QuickAddTask() {
  return (
    <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0, p: 1, display: "flex", alignItems: "center" }}>
      <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Quick add task..." />
      <IconButton color="primary">
        <AddIcon />
      </IconButton>
    </Paper>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editTaskIdx, setEditTaskIdx] = useState(null);
  const [selectedList, setSelectedList] = useState(0);
  const [lists, setLists] = useState([]);
  const [editListIdx, setEditListIdx] = useState(null);
  const [editListValue, setEditListValue] = useState("");
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addingList, setAddingList] = useState(false);
  const [newListValue, setNewListValue] = useState("");

  // Handler to close the task details panel
  const handleDetailClose = () => {
    setShowDetails(false);
    setSelectedTask(null);
  };

  // Handler to log out
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Check for existing session on mount
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Handler to mark a task as complete/incomplete
  const handleTaskComplete = async (task, completed) => {
    if (!task?.id) return;
    const { data, error } = await supabase
      .from('tasks')
      .update({ completed })
      .eq('id', task.id)
      .select();
    if (data && data[0]) {
      setTasks(tasks => tasks.map(t => t.id === task.id ? data[0] : t));
    } else {
      setTasks(tasks => tasks.map(t => t.id === task.id ? { ...t, completed } : t));
    }
  };
  // Handler to delete a list2
  const handleDeleteList = async (idx) => {
    const listId = lists[idx]?.id;
    if (!listId) return;
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', listId);
    if (!error) {
      setLists(lists => lists.filter((_, i) => i !== idx));
      // Optionally reset selectedList if needed
      if (selectedList === idx) setSelectedList(0);
    } else {
      alert("Error deleting list: " + error.message);
    }
  };
  // Handler to add a new list (inline input)
  const handleAddListSave = async () => {
    if (!newListValue.trim()) return;
    const { data, error } = await supabase
      .from('lists')
      console.log('Adding list for user: ', user)
      .insert([{ name: newListValue.trim(), user_id: user?.id }])
      console.log('Insert result: ', data, error)
      .select();
    if (data && data[0]) {
      setLists(lists => [...lists, data[0]]);
      setAddingList(false);
      setNewListValue("");
    } else if (error) {
      alert("Error adding list: " + error.message);
    }
  };
  const handleAddListCancel = () => {
    setAddingList(false);
    setNewListValue("");
  };
    // Handler to select a task and show details
  const handleTaskClick = async (task) => {
    setSelectedTask(task);
    setShowDetails(true);
    if (task?.id) {
      const { data, error } = await supabase
        .from('task_details')
        .select('*')
        .eq('task_id', task.id)
        .single();
      if (data) {
        setSelectedTaskDetails(data);
      } else {
        setSelectedTaskDetails(null);
      }
    } else {
      setSelectedTaskDetails(null);
    }
  };
    // Handler to change a task's name
  const handleTaskNameChange = async (taskId, newName) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ title: newName })
      .eq('id', taskId)
      .select();
    if (data && data[0]) {
      setTasks(tasks => tasks.map(t => t.id === taskId ? data[0] : t));
    } else if (error) {
      alert("Error updating task name: " + error.message);
    }
  };
    // Handler to delete a task
  const handleDeleteTask = async (taskId) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    if (!error) {
      setTasks(tasks => tasks.filter(t => t.id !== taskId));
    } else {
      alert("Error deleting task: " + error.message);
    }
  };
    // Handler to save task details (notes, reminder, etc)
  const handleDetailSave = async (taskId, details) => {
    const { data, error } = await supabase
      .from('task_details')
      .upsert({ ...details, task_id: taskId }, { onConflict: ['task_id'] })
      .select();
    if (data && data[0]) {
      setSelectedTaskDetails(data[0]);
    } else if (error) {
      alert("Error saving task details: " + error.message);
    }
  };
  // Expose handler for TaskList
  window.onTaskComplete = handleTaskComplete;

  // ...existing code...

  // Load lists for user whenever user changes (login, refresh)
  React.useEffect(() => {
    const loadLists = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('lists')
          .select('*')
          .eq('user_id', user.id);
        setLists(data || []);
      } else {
        setLists([]);
      }
    };
    if (user) {
      loadLists();
    }
  }, [user]);

  // Load tasks for selected list whenever lists or selectedList change
  React.useEffect(() => {
    const loadTasks = async () => {
      const listId = lists[selectedList]?.id;
      if (listId) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('list_id', listId);
        setTasks(data || []);
      } else {
        setTasks([]);
      }
    };
    if (lists.length > 0) {
      loadTasks();
    }
    setEditTaskIdx(null);
  }, [lists, selectedList]);

  return (
    !user ? (
      <Auth onLogin={setUser} />
    ) : (
      <Box sx={{ display: 'flex', bgcolor: '#424242', minHeight: '100vh', position: 'relative' }}>
        {/* Lists Section */}
        <Drawer
          variant="permanent"
          sx={{
            width: 240,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box', bgcolor: '#b9fbc0', color: '#222' },
          }}
        >
          {/* User Info in Sidebar Header */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            bgcolor: '#b9fbc0',
            px: 2,
            py: 1.5,
            borderBottom: '1px solid #34c759',
            minHeight: 48
          }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#222', mb: 1 }}>
              {user?.email || 'Unknown user'}
            </Typography>
            <Button variant="outlined" size="small" color="error" onClick={handleLogout}>
              Log out
            </Button>
          </Box>
          <Toolbar />
          <Box sx={{ overflow: 'auto' }}>
            <List>
              {lists.map((list, idx) => (
                <ListItem key={idx} disablePadding>
                  <ListItemButton
                    selected={selectedList === idx}
                    onClick={async () => {
                      setSelectedList(idx);
                      // Load tasks for this list from Supabase
                      const listId = lists[idx]?.id;
                      if (listId) {
                        const { data, error } = await supabase
                          .from('tasks')
                          .select('*')
                          .eq('list_id', listId);
                        setTasks(data || []);
                      } else {
                        setTasks([]);
                      }
                    }}
                    sx={selectedList === idx ? {
                      bgcolor: '#34c759 !important',
                      color: '#222',
                      borderRadius: '6px',
                      mx: 1,
                      '&:hover': { bgcolor: '#28a745 !important' }
                    } : {}}
                  >
                    {editListIdx === idx ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <TextField
                          value={editListValue}
                          onChange={e => setEditListValue(e.target.value)}
                          size="small"
                          autoFocus
                          fullWidth
                          onClick={e => e.stopPropagation()}
                          onDoubleClick={e => e.stopPropagation()}
                        />
                        <IconButton size="small" sx={{ ml: 1 }} onClick={e => { e.stopPropagation(); handleEditListSave(idx); }}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <ListItemText primary={list.name} />
                        <IconButton size="small" onClick={e => { e.stopPropagation(); handleEditListClick(idx, list.name); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" sx={{ ml: 1 }} onClick={e => { e.stopPropagation(); handleDeleteList(idx); }}>
                          {/* Delete icon */}
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </IconButton>
                      </Box>
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ bgcolor: '#636e72' }} />
            <List>
              {addingList ? (
                <ListItem disablePadding>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', p: 1 }}>
                    <TextField
                      value={newListValue}
                      onChange={e => setNewListValue(e.target.value)}
                      size="small"
                      autoFocus
                      fullWidth
                      placeholder="New list name"
                      onClick={e => e.stopPropagation()}
                    />
                    <IconButton size="small" sx={{ ml: 1 }} onClick={handleAddListSave}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ ml: 1 }} color="error" onClick={handleAddListCancel}>
                      {/* Cancel icon */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </IconButton>
                  </Box>
                </ListItem>
              ) : (
                <ListItem disablePadding>
                  <ListItemButton onClick={() => setAddingList(true)}>
                    <AddIcon sx={{ mr: 1 }} />
                    <ListItemText primary="Add new list" />
                  </ListItemButton>
                </ListItem>
              )}
            </List>
          </Box>
        </Drawer>
        {/* Tasks Section */}
        <Box sx={{ flexGrow: 1, p: 0, minWidth: 320, maxWidth: 480, bgcolor: '#fff' }}>
          <AppBar position="static" sx={{ bgcolor: "#b9fbc0", color: "#222" }}>
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {lists[selectedList]?.name || "No List Selected"}
              </Typography>
              <IconButton color="inherit">
                <SearchIcon />
              </IconButton>
              <IconButton color="inherit">
                <ShareIcon />
              </IconButton>
              <IconButton color="inherit">
                <MoreVertIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
          {/* Incomplete Tasks Section */}
          <Typography variant="h6" sx={{ mb: 2, color: '#222', fontWeight: 'bold' }}>Incomplete</Typography>
          <TaskList
            tasks={tasks.filter(task => !task.completed)}
            onTaskClick={handleTaskClick}
            onTaskNameChange={handleTaskNameChange}
            onDelete={handleDeleteTask}
            editIdx={editTaskIdx}
            setEditIdx={setEditTaskIdx}
            showDetails={showDetails}
            setShowDetails={setShowDetails}
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
          />
          {/* Completed Tasks Section */}
          {tasks.some(task => task.completed) && (
            <>
              <Divider sx={{ my: 4, bgcolor: '#636e72' }} />
              <Typography variant="h6" sx={{ mb: 2, color: '#222', fontWeight: 'bold' }}>Completed</Typography>
              <Box>
                <TaskList
                  tasks={tasks.filter(task => task.completed)}
                  onTaskClick={handleTaskClick}
                  onTaskNameChange={handleTaskNameChange}
                  onDelete={handleDeleteTask}
                  editIdx={null}
                  setEditIdx={setEditTaskIdx}
                  showDetails={showDetails}
                  setShowDetails={setShowDetails}
                  selectedTask={selectedTask}
                  setSelectedTask={setSelectedTask}
                />
              </Box>
            </>
          )}
          <Fab color="primary" aria-label="add" sx={{ position: "fixed", bottom: 72, left: 260 }} onClick={async () => {
            const currentList = lists[selectedList];
            if (!currentList?.id) return;
            // Insert new task in Supabase with default title
            const { data, error } = await supabase
              .from('tasks')
              .insert({
                list_id: currentList.id,
                title: "New Task"
                // Do NOT include id here, Supabase will generate it
              })
              .select();
            if (data && data[0]) {
              setTasks(tasks => [...tasks, data[0]]);
              setEditTaskIdx(tasks.length); // Open edit box for the new task
            }
          }}>
            <AddIcon />
          </Fab>
        </Box>
        {/* Task Details Section */}
        <Box sx={{ flexGrow: 1, p: 0, minWidth: 320, maxWidth: 480, bgcolor: '#b9fbc0', borderLeft: '1px solid #eee' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
            <Typography variant="h6" sx={{ color: '#222', fontWeight: 'bold' }}>
              {showDetails && selectedTask ? 'Details' : 'Details are hidden'}
            </Typography>
          </Box>
          {showDetails && selectedTask ? (
            <TaskDetail
              key={selectedTask?.id}
              task={selectedTask}
              details={selectedTaskDetails}
              onClose={handleDetailClose}
              onSave={handleDetailSave}
              onDelete={handleDeleteTask}
            />
          ) : (
            <Box sx={{ m: 4, color: '#888', textAlign: 'center' }}>
              {/* ...existing code... */}
            </Box>
          )}
        </Box>
      </Box>
    )
  );
}

