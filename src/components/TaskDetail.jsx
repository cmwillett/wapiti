import React, { useState } from "react";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import AccessAlarmIcon from "@mui/icons-material/AccessAlarm";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import Paper from '@mui/material/Paper';

const TaskDetail = ({ task, onClose, onSave }) => {
  const [reminder, setReminder] = useState(task?.reminder ? dayjs(task.reminder) : null);
  const [notes, setNotes] = useState(task?.notes || "");
  const [title, setTitle] = useState(task?.title || "");
  const [dirty, setDirty] = useState(false);

  React.useEffect(() => {
    setTitle(task?.title || "");
    setNotes(task?.notes || "");
    setReminder(task?.reminder ? dayjs(task.reminder) : null);
    setDirty(false);
  }, [task]);

  return (
    <Card variant="outlined" sx={{ m: 2, minWidth: 320, maxWidth: 480, flex: 1 }}>
      <CardContent>
        <TextField
          label="Task Name"
          value={title}
          onChange={e => { setTitle(e.target.value); setDirty(true); }}
          variant="standard"
          fullWidth
          sx={{ mb: 2 }}
        />
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Notes</div>
        <Paper variant="outlined" sx={{ minHeight: 120, p: 1, boxShadow: 'none', mb: 2 }}>
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
              setDirty(true);
            }}
          />
        </Paper>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="Reminder"
            value={reminder}
            onChange={newValue => { setReminder(newValue); setDirty(true); }}
            renderInput={(params) => (
              <TextField {...params} fullWidth sx={{ minWidth: 220 }} InputProps={{ ...params.InputProps, endAdornment: (
                <InputAdornment position="end">
                  <IconButton>
                    <AccessAlarmIcon />
                  </IconButton>
                </InputAdornment>
              ) }} />
            )}
          />
        </LocalizationProvider>
      </CardContent>
      <CardActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={!dirty}
          onClick={async () => {
            // ...existing save logic...
            console.log('Save clicked', { task, title, notes, reminder });
            let savedTask = { ...task, title, notes, reminder: reminder ? reminder.toISOString() : null };
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
                      reminder: reminder ? reminder.toISOString() : null
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
                      reminder: reminder ? reminder.toISOString() : null
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
                let listId = task.listId;
                if (!listId || !/^[0-9a-fA-F-]{36}$/.test(listId)) {
                  listId = uuidv4();
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
                      reminder: reminder ? reminder.toISOString() : null
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
            setDirty(false);
            onClose();
          }}
        >
          Save
        </Button>
      </CardActions>
    </Card>
  );
};

export default TaskDetail;