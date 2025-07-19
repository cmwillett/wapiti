// ...existing code...
// forcing vercel update
// ...existing code...
import Drawer from "@mui/material/Drawer";
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
  // ...existing code...
  // Example tasks for the selected list
  const [editTaskIdx, setEditTaskIdx] = useState(null);
  // Delete a task and its details from Supabase
  const handleDeleteTask = async (id) => {
    if (!id) return;
    // Delete details
    await supabase.from('task_details').delete().eq('task_id', id);
    // Delete task
    await supabase.from('tasks').delete().eq('id', id);
    // Update UI
    setTasks(tasks => tasks.filter(task => task.id !== id));
    setSelectedTask(null);
    setDetailOpen(false);
  };
  // ...existing code...
  // Delete a list and its tasks/details from Supabase
  const handleDeleteList = async (idx) => {
    const list = lists[idx];
    if (!list?.id) return;
    // Delete all tasks for this list
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id')
      .eq('list_id', list.id);
    if (tasksData && tasksData.length > 0) {
      for (const task of tasksData) {
        await supabase.from('task_details').delete().eq('task_id', task.id);
      }
      await supabase.from('tasks').delete().eq('list_id', list.id);
    }
    await supabase.from('lists').delete().eq('id', list.id);
    // Update UI synchronously
    setLists(prevLists => prevLists.filter((_, i) => i !== idx));
    setSelectedList(0);
    setTasks([]);
  };
  const [selectedList, setSelectedList] = useState(0);
  const [lists, setLists] = useState([]);
  const [editListIdx, setEditListIdx] = useState(null);
  const [editListValue, setEditListValue] = useState("");
  // Add new list
  const handleAddList = async () => {
    // Insert new list into Supabase with a generated UUID and correct field name
    const newList = { id: uuidv4(), name: "New List" };
    const { data, error } = await supabase
      .from('lists')
      .insert(newList)
      .select();
    if (data && data[0]) {
      setLists(lists => [...lists, data[0]]);
      setEditListIdx(lists.length);
      setEditListValue("New List");
      setSelectedList(lists.length);
      setTasks([]); // Reset tasks for new list
    }
  };
  // Load lists from Supabase on mount
  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('*');
      if (data) setLists(data);
    })();
  }, []);

  // Edit list name
  const handleEditListClick = (idx, title) => {
    setEditListIdx(idx);
    setEditListValue(title);
  };
  const handleEditListSave = async (idx) => {
    const list = lists[idx];
    if (!list) return;
    // Update list name in Supabase
    const { data, error } = await supabase
      .from('lists')
      .update({ name: editListValue })
      .eq('id', list.id)
      .select();
    if (data && data[0]) {
      setLists(lists => lists.map((l, i) => i === idx ? data[0] : l));
    } else {
      setLists(lists => lists.map((l, i) => i === idx ? { ...l, name: editListValue } : l));
    }
    setEditListIdx(null);
  };

  // Example tasks for the selected list
  const [tasks, setTasks] = useState([]);
  // Handler to update a task's name
  const handleTaskNameChange = async (id, newTitle) => {
    // Update task title in Supabase
    const { data, error } = await supabase
      .from('tasks')
      .update({ title: newTitle })
      .eq('id', id)
      .select();
    if (data && data[0]) {
      setTasks(tasks => tasks.map(task =>
        task.id === id ? data[0] : task
      ));
    } else {
      setTasks(tasks => tasks.map(task =>
        task.id === id ? { ...task, title: newTitle } : task
      ));
    }
  }
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // When a task is clicked, open the detail dialog
  const handleTaskClick = async (task) => {
    // Load details from Supabase for this task
    if (task?.id) {
      const { data: detailDataArr, error } = await supabase
        .from('task_details')
        .select('*')
        .eq('task_id', task.id);
      if (detailDataArr && detailDataArr.length > 0) {
        const detailData = detailDataArr[0];
        setSelectedTask({ ...task, notes: detailData.notes, reminder: detailData.reminder, detailId: detailData.id });
      } else {
        setSelectedTask({ ...task, notes: '', reminder: '', detailId: null });
      }
    } else {
      setSelectedTask(task);
    }
    setDetailOpen(true);
  };

  // When details are saved, reload from Supabase
  const handleDetailSave = async (updatedTask) => {
    if (updatedTask?.id) {
      // Reload details from Supabase
      const { data: detailDataArr, error } = await supabase
        .from('task_details')
        .select('*')
        .eq('task_id', updatedTask.id);
      let detailData = detailDataArr && detailDataArr.length > 0 ? detailDataArr[0] : null;
      // Update the task in the tasks array
      setTasks(tasks => tasks.map(task =>
        task.id === updatedTask.id
          ? { ...task, title: updatedTask.title, notes: detailData?.notes || '', reminder: detailData?.reminder || '', detailId: detailData?.id || null }
          : task
      ));
      setSelectedTask({ ...updatedTask, notes: detailData?.notes || '', reminder: detailData?.reminder || '', detailId: detailData?.id || null });
    }
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedTask(null);
  };

  return (
    <Box sx={{ display: "flex", bgcolor: "#424242", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box', bgcolor: '#b9fbc0', color: '#222' },
        }}
      >
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
            <ListItem disablePadding>
              <ListItemButton onClick={handleAddList}>
                <AddIcon sx={{ mr: 1 }} />
                <ListItemText primary="Add new list" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
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
        <TaskList
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onTaskNameChange={handleTaskNameChange}
          onDelete={handleDeleteTask}
          editIdx={editTaskIdx !== null ? editTaskIdx : (tasks.length - 1)}
          setEditIdx={setEditTaskIdx}
        />
        <TaskDetail open={detailOpen} task={selectedTask} onClose={handleDetailClose} onSave={handleDetailSave} onDelete={handleDeleteTask} />
        <Fab color="primary" aria-label="add" sx={{ position: "fixed", bottom: 72, right: 16 }} onClick={async () => {
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
    </Box>
  );
}

