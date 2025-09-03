import React from 'react';
import { useAuth } from '../context/AuthContext';

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  permission, 
  style = {}, 
  ...props 
}) => {
  const { hasPermission } = useAuth();

  // If permission is required and user doesn't have it, don't render the button
  if (permission && !hasPermission(permission)) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles.button, ...style }}
      {...props}
    >
      {children}
    </button>
  );
};

const styles = {
  button: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#0056b3'
    },
    ':disabled': {
      backgroundColor: '#6c757d',
      cursor: 'not-allowed'
    }
  }
};

export default Button;