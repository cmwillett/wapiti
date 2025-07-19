import React, { useState } from "react";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from '@mui/icons-material/Edit';
import TextField from '@mui/material/TextField';
import CheckIcon from '@mui/icons-material/Check';

export default function TaskList({ tasks, onTaskClick, onTaskNameChange, editIdx, onDelete }) {
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuIdx, setMenuIdx] = useState(null);

  const handleMenuOpen = (event, idx) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuIdx(idx);
  };
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuIdx(null);
  };
  const [editIdxState, setEditIdxState] = useState(editIdx ?? null);
  const [editValue, setEditValue] = useState("");
  const [ignoreEditIdxProp, setIgnoreEditIdxProp] = useState(false);

  // Only set editIdxState from editIdx prop for new task, then ignore until next new task
  React.useEffect(() => {
    if (!ignoreEditIdxProp && typeof editIdx === 'number' && editIdx !== null && editIdx !== editIdxState) {
      setEditIdxState(editIdx);
      if (tasks[editIdx]) setEditValue(tasks[editIdx].title);
    }
  }, [editIdx, tasks, ignoreEditIdxProp, editIdxState]);

  const handleEditClick = (idx, title) => {
    if (typeof setEditIdx === 'function') setEditIdx(idx);
    else {
      setEditIdxState(idx);
      setEditValue(title);
    }
  };

  const handleEditSave = (task, idx) => {
    if (onTaskNameChange) {
      onTaskNameChange(task.id, editValue);
    }
    if (typeof setEditIdx === 'function') setEditIdx(null);
    setEditIdxState(null);
    setIgnoreEditIdxProp(true);
  };

  return (
    <Box sx={{ p: 2 }}>
      {tasks.map((task, idx) => (
        <Paper
          key={task.id}
          sx={{ mb: 2, p: 2, display: "flex", alignItems: "center", cursor: "pointer" }}
        >
          <Box sx={{ flexGrow: 1 }}>
            {editIdxState === idx ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  size="small"
                  autoFocus
                  fullWidth
                  onClick={e => e.stopPropagation()}
                  onDoubleClick={e => e.stopPropagation()}
                />
                <IconButton size="small" sx={{ ml: 1 }} onClick={e => { e.stopPropagation(); handleEditSave(task, idx); }}>
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ mr: 1 }}>{task.title}</Typography>
              </Box>
            )}
            {/* Notes removed, only show title */}
          </Box>
          <IconButton onClick={e => { e.stopPropagation(); handleMenuOpen(e, idx); }}>
            <MoreVertIcon />
          </IconButton>
          {/* Dropdown menu for edit/delete */}
          <Menu
            anchorEl={menuAnchorEl}
            open={menuIdx === idx}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => {
              handleMenuClose();
              handleEditClick(idx, task.title);
            }}>Edit Task Name</MenuItem>
            <MenuItem onClick={() => {
              handleMenuClose();
              onTaskClick(task);
            }}>Edit Task Details/Reminders</MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); if (typeof onDelete === 'function') onDelete(task.id); }}>Delete</MenuItem>
          </Menu>
        </Paper>
      ))}
    </Box>
  );
}
