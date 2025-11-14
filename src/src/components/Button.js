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

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        ...styles.button,
        backgroundColor: disabled ? styles.disabledButton.backgroundColor : isHovered ? '#2980b9' : '#3498db',
        ...style 
      }}
      {...props}
    >
      {children}
    </button>
  );
};

const styles = {
  button: {
    padding: '10px 18px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    fontFamily: '"Fredoka", sans-serif',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    cursor: 'not-allowed',
  }
};

export default Button;