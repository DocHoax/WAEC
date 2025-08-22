import React from 'react';

const Notification = ({ message, type }) => {
  const styles = {
    info: 'background-color: #d1ecf1; color: #0c5460; padding: 10px; margin: 5px 0; border: 1px solid #bee5eb;',
    error: 'background-color: #f8d7da; color: #721c24; padding: 10px; margin: 5px 0; border: 1px solid #f5c6cb;',
  };

  return (
    <div style={{ ...styles[type] || styles.info }}>
      {message}
    </div>
  );
};

export default Notification;