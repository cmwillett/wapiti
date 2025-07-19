import React, { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import AccessAlarmIcon from "@mui/icons-material/AccessAlarm";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';


const TaskDetail = ({ open, onClose, task, onSave }) => {
  const [reminder, setReminder] = useState(task?.reminder || "");
  const [notes, setNotes] = useState(task?.notes || "");


  const [title, setTitle] = useState(task?.title || "");

  React.useEffect(() => {
    setTitle(task?.title || "");
    setNotes(task?.notes || "");
    setReminder(task?.reminder || "");
  }, [task]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <TextField
          label="Task Name"
          value={title}
          onChange={e => setTitle(e.target.value)}
          variant="standard"
          fullWidth
        />
      </DialogTitle>
      <DialogContent>
        <Box>
          <Stack spacing={2}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Notes</div>
            <Paper variant="outlined" sx={{ minHeight: 120, p: 1, boxShadow: 'none' }}>
              <CKEditor
                editor={ClassicEditor}
                data={notes}
                config={{
                  toolbar: [
                    'heading', 'bold', 'italic', 'bulletedList', 'numberedList'
                  ]
                }}
                onChange={(event, editor) => {
                  setNotes(editor.getData());
                }}
              />
            </Paper>
            <TextField
              label="Reminder"
              type="datetime-local"
              value={reminder}
              onChange={e => setReminder(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton>
                      <AccessAlarmIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              fullWidth
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
<Button variant="contained" onClick={async () => {
  console.log('Save clicked', { task, title, notes, reminder });
  let savedTask = { ...task, title, notes, reminder };
  try {
    let detailData = null;
    if (task?.id) {
      // Check if detail row exists
      let detailId = task.detailId;
      if (detailId && /^[0-9a-fA-F-]{36}$/.test(detailId)) {
        // Try update
        const { data: updateDetailData, error: detailError } = await supabase
          .from('task_details')
          .update({
            notes,
            reminder: reminder ? new Date(reminder).toISOString() : null
          })
          .eq('id', detailId)
          .select();
        detailData = updateDetailData && updateDetailData[0] ? updateDetailData[0] : null;
        console.log('Update task_details:', { sent: { notes, reminder }, returned: updateDetailData, error: detailError });
        if (detailError) console.error('Task detail error:', detailError);
      } else {
        // Insert new detail row
        const { data: insertDetailData, error: detailError } = await supabase
          .from('task_details')
          .insert({
            task_id: task.id,
            notes,
            reminder: reminder ? new Date(reminder).toISOString() : null
          })
          .select();
        detailData = insertDetailData && insertDetailData[0] ? insertDetailData[0] : null;
        console.log('Insert task_details:', { sent: { task_id: task.id, notes, reminder }, returned: insertDetailData, error: detailError });
        if (detailError) console.error('Task detail insert error:', detailError);
      }
      // Always update task title if valid UUID
      if (task.id && /^[0-9a-fA-F-]{36}$/.test(task.id)) {
        const { data: updateTaskData, error: taskError } = await supabase
          .from('tasks')
          .update({ title })
          .eq('id', task.id)
          .select();
        console.log('Update tasks:', { sent: { title }, returned: updateTaskData, error: taskError });
        if (taskError) console.error('Task update error:', taskError);
      }
      // Pass back the new detailId for parent reload
      savedTask = { ...savedTask, detailId: detailData?.id || null };
    } else {
      // Create new task and detail
      // Validate listId is a UUID
      let listId = task.listId;
      if (!listId || !/^[0-9a-fA-F-]{36}$/.test(listId)) {
        listId = uuidv4(); // fallback, but ideally should come from a real list
      }
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert({
          list_id: listId,
          title
        })
        .select();
      console.log('Insert tasks:', { sent: { list_id: listId, title }, returned: taskData, error: taskError });
      if (taskError) console.error('Task insert error:', taskError);

      const newTaskId = taskData?.[0]?.id;
      if (newTaskId && /^[0-9a-fA-F-]{36}$/.test(newTaskId)) {
        const { data: detailData, error: detailError } = await supabase
          .from('task_details')
          .insert({
            task_id: newTaskId,
            notes,
            reminder: reminder ? new Date(reminder).toISOString() : null
          });
        console.log('Insert task_details:', { sent: { task_id: newTaskId, notes, reminder }, returned: detailData, error: detailError });
        if (detailError) console.error('Task detail insert error:', detailError);
      }
    }
    if (onSave) {
      onSave(savedTask);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
  onClose();
}}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetail;