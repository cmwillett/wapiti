import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import './index.css';
import { supabase } from './supabaseClient';
import { notificationService } from './services/notificationService';

// Make supabase and notification service globally available for debugging and testing
window.supabase = supabase;
window.notificationService = notificationService;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);