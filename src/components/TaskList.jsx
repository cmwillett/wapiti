import { useState } from 'react';
import ReactQuill from 'react-quill';
import DatePicker from 'react-datepicker';
import 'react-quill/dist/quill.snow.css';
import 'react-datepicker/dist/react-datepicker.css';
import { tasksService } from '../services/supabaseService';

export default function TaskList({ tasks, setTasks, activeList, onTasksChange }) {
  const [newTask, setNewTask] = useState('');
  const [showNotes, setShowNotes] = useState({});
  const [showReminder, setShowReminder] = useState({});
  const [selectedDate, setSelectedDate] = useState({});

  // Don't render if no active list
  if (!activeList) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Select a list to view tasks</div>
      </div>
    );
  }

  // Separate incomplete and completed tasks
  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const addTask = async () => {
    if (newTask.trim()) {
      try {
        const newTaskData = await tasksService.createTask(activeList, newTask);
        setTasks([...tasks, newTaskData]);
        setNewTask('');
        onTasksChange && onTasksChange();
      } catch (error) {
        console.error('Error creating task:', error);
        alert('Failed to create task. Please try again.');
      }
    }
  };

  const toggleTask = async (id) => {
    try {
      const task = tasks.find(t => t.id === id);
      const updatedTask = await tasksService.updateTask(id, { 
        completed: !task.completed 
      });
      
      setTasks(
        tasks.map((task) =>
          task.id === id ? updatedTask : task
        )
      );
      setShowNotes((prev) => ({ ...prev, [id]: false })); // Hide notes on complete
      onTasksChange && onTasksChange();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const deleteTask = async (id) => {
    try {
      await tasksService.deleteTask(id);
      setTasks(tasks.filter((task) => task.id !== id));
      onTasksChange && onTasksChange();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const updateNote = async (id, note) => {
    try {
      const updatedTask = await tasksService.updateTask(id, { notes: note });
      setTasks(
        tasks.map((task) =>
          task.id === id ? updatedTask : task
        )
      );
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleShowNotes = (id) => {
    setShowNotes((prev) => ({ ...prev, [id]: true }));
  };

  const handleHideNotes = (id) => {
    setShowNotes((prev) => ({ ...prev, [id]: false }));
  };

  const handleShowReminder = (id) => {
    setShowReminder((prev) => ({ ...prev, [id]: true }));
    // Set current reminder as selected date if it exists
    const task = tasks.find(t => t.id === id);
    if (task?.reminder_time) {
      setSelectedDate((prev) => ({ ...prev, [id]: new Date(task.reminder_time) }));
    } else {
      setSelectedDate((prev) => ({ ...prev, [id]: new Date() }));
    }
  };

  const handleHideReminder = (id) => {
    setShowReminder((prev) => ({ ...prev, [id]: false }));
    setSelectedDate((prev) => ({ ...prev, [id]: null }));
  };

  const updateReminder = async (id, date) => {
    if (date) {
      try {
        const updatedTask = await tasksService.setReminder(id, date.toISOString());
        setTasks(
          tasks.map((task) =>
            task.id === id ? updatedTask : task
          )
        );
        setShowReminder((prev) => ({ ...prev, [id]: false }));
        setSelectedDate((prev) => ({ ...prev, [id]: null }));
        onTasksChange && onTasksChange();
      } catch (error) {
        console.error('Error setting reminder:', error);
        alert('Failed to set reminder. Please try again.');
      }
    }
  };

  const removeReminder = async (id) => {
    try {
      const updatedTask = await tasksService.removeReminder(id);
      setTasks(
        tasks.map((task) =>
          task.id === id ? updatedTask : task
        )
      );
      onTasksChange && onTasksChange();
    } catch (error) {
      console.error('Error removing reminder:', error);
      alert('Failed to remove reminder. Please try again.');
    }
  };

  return (
    <div className="flex-1" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px' }}>
      <h2 className="font-bold text-lg mb-4">Tasks</h2>
      <div>
        {/* Incomplete tasks */}
        {incompleteTasks.map((task, index) => (
          <div key={task.id} className={`${(task.notes || showNotes[task.id]) ? 'mb-6' : 'mb-12'}`}>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
              />
              <span
                className={`${task.completed ? 'line-through text-gray-500' : ''} flex-1`}
              >
                {task.text}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-red-500 opacity-0 group-hover:opacity-100"
                title="Delete task"
              >
                &times;
              </button>
            </div>
            {(task.notes || showNotes[task.id]) ? (
              <div className="mt-3" style={{ marginLeft: '32px', paddingLeft: '16px' }}>
                <ReactQuill
                  theme="snow"
                  value={task.notes || ''}
                  onChange={note => updateNote(task.id, note)}
                  className="bg-white"
                  style={{ minHeight: 60 }}
                />
                <button
                  className="text-blue-500 text-xs mt-2"
                  onClick={() => handleHideNotes(task.id)}
                >
                  Hide notes
                </button>
                {/* Reminder section */}
                <div className="mt-3">
                  {task.reminder_time ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600 text-xs">
                        Reminder: {new Date(task.reminder_time).toLocaleString()}
                      </span>
                      <button
                        className="text-blue-500 text-xs"
                        onClick={() => handleShowReminder(task.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-500 text-xs"
                        onClick={() => removeReminder(task.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : showReminder[task.id] ? (
                    <div className="space-y-2">
                      <DatePicker
                        selected={selectedDate[task.id]}
                        onChange={(date) => setSelectedDate((prev) => ({ ...prev, [task.id]: date }))}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="border p-1 rounded text-sm"
                        placeholderText="Select date and time"
                        minDate={new Date()}
                      />
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-500 text-xs"
                          onClick={() => updateReminder(task.id, selectedDate[task.id])}
                          disabled={!selectedDate[task.id]}
                        >
                          Save
                        </button>
                        <button
                          className="text-gray-500 text-xs"
                          onClick={() => handleHideReminder(task.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="text-blue-500 text-xs"
                      onClick={() => handleShowReminder(task.id)}
                    >
                      Add reminder
                    </button>
                  )}
                </div>
                <div style={{ height: '32px' }} />
              </div>
            ) : (
              <>
                <div className="mt-3" style={{ marginLeft: '32px', paddingLeft: '16px' }}>
                  <button
                    className="text-blue-500 text-xs"
                    onClick={() => handleShowNotes(task.id)}
                  >
                    Add notes
                  </button>
                </div>
                {/* Reminder section when notes are collapsed */}
                <div className="mt-3" style={{ marginLeft: '32px', paddingLeft: '16px' }}>
                  {task.reminder_time ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600 text-xs">
                        Reminder: {new Date(task.reminder_time).toLocaleString()}
                      </span>
                      <button
                        className="text-blue-500 text-xs"
                        onClick={() => handleShowReminder(task.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-500 text-xs"
                        onClick={() => removeReminder(task.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : showReminder[task.id] ? (
                    <div className="space-y-2">
                      <DatePicker
                        selected={selectedDate[task.id]}
                        onChange={(date) => setSelectedDate((prev) => ({ ...prev, [task.id]: date }))}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="border p-1 rounded text-sm"
                        placeholderText="Select date and time"
                        minDate={new Date()}
                      />
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-500 text-xs"
                          onClick={() => updateReminder(task.id, selectedDate[task.id])}
                          disabled={!selectedDate[task.id]}
                        >
                          Save
                        </button>
                        <button
                          className="text-gray-500 text-xs"
                          onClick={() => handleHideReminder(task.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="text-blue-500 text-xs"
                      onClick={() => handleShowReminder(task.id)}
                    >
                      Add reminder
                    </button>
                  )}
                </div>
                <div style={{ height: '32px' }} />
              </>
            )}
          </div>
        ))}
        {/* New task input always after incomplete tasks, before divider */}
        <div className="flex items-center space-x-2 mb-8">
          <input
            type="checkbox"
            disabled
            className="border border-gray-400 rounded opacity-70"
            style={{ width: '16px', height: '16px' }}
          />
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="New task..."
            className="border p-2 flex-1 rounded"
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
          />
          <button
            onClick={addTask}
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            Add
          </button>
        </div>
      </div>
      
      {/* Completed tasks section - outside of space-y-8 for independent spacing */}
      {completedTasks.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          {incompleteTasks.length > 0 && (
            <div className="w-full" style={{ marginBottom: '2px' }}>
              <div className="w-full border-t border-gray-300 mb-4"></div>
              <h3 className="font-bold text-lg text-gray-700 mb-4">Completed Tasks</h3>
            </div>
          )}
          <div className="flex flex-col">
            {completedTasks.map((task) => (
              <div key={task.id} className="mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                  />
                  <span
                    className={`${task.completed ? 'line-through text-gray-500' : ''} flex-1`}
                  >
                    {task.text}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-red-500 opacity-0 group-hover:opacity-100"
                    title="Delete task"
                  >
                    &times;
                  </button>
                </div>
                {task.notes ? (
                  showNotes[task.id] ? (
                    <div className="mt-3" style={{ marginLeft: '32px', paddingLeft: '16px' }}>
                      <ReactQuill
                        theme="snow"
                        value={task.notes || ''}
                        onChange={note => updateNote(task.id, note)}
                        className="bg-white"
                        style={{ minHeight: 60 }}
                        readOnly
                      />
                      <button
                        className="text-blue-500 text-xs mt-2"
                        onClick={() => handleHideNotes(task.id)}
                      >
                        Hide notes
                      </button>
                      {/* Reminder section for completed tasks with notes - show only if exists */}
                      {task.reminder_time && (
                        <div className="mt-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600 text-xs">
                              Reminder: {new Date(task.reminder_time).toLocaleString()}
                            </span>
                            <button
                              className="text-red-500 text-xs"
                              onClick={() => removeReminder(task.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3" style={{ marginLeft: '32px', paddingLeft: '16px' }}>
                      <button
                        className="text-blue-500 text-xs"
                        onClick={() => handleShowNotes(task.id)}
                      >
                        View notes
                      </button>
                    </div>
                  )
                ) : (
                  /* Task has no notes, show reminder section only if reminder exists */
                  task.reminder_time && (
                    <div className="mt-3" style={{ marginLeft: '32px', paddingLeft: '16px' }}>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 text-xs">
                          Reminder: {new Date(task.reminder_time).toLocaleString()}
                        </span>
                        <button
                          className="text-red-500 text-xs"
                          onClick={() => removeReminder(task.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}