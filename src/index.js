import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify'; // Add this
import 'react-toastify/dist/ReactToastify.css'; // Add this

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
    <ToastContainer /> {/* Add this */}
  </AuthProvider>
);