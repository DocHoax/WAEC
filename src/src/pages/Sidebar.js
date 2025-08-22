import React from 'react';
import { FiLogOut } from 'react-icons/fi';

const Sidebar = ({ navItems, location, onNavigate }) => {
  return (
    <div style={{
      width: '250px',
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E0E0E0',
      padding: '20px',
      minHeight: 'calc(100vh - 60px)',
      fontFamily: 'sans-serif',
      position: 'fixed',
      top: '60px',
      left: 0
    }}>
      {navItems.map((item) => (
        <div
          key={item.path}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: location.pathname === `/student/${item.path}` ? '#F8F9FA' : 'transparent',
            color: location.pathname === `/student/${item.path}` ? '#4B5320' : '#6B7280',
            fontWeight: location.pathname === `/student/${item.path}` ? '600' : '400',
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'background-color 0.2s, color 0.2s'
          }}
          onClick={() => onNavigate(item.path)}
          onMouseOver={(e) => {
            if (location.pathname !== `/student/${item.path}`) {
              e.currentTarget.style.backgroundColor = '#F8F9FA';
              e.currentTarget.style.color = '#4B5320';
            }
          }}
          onMouseOut={(e) => {
            if (location.pathname !== `/student/${item.path}`) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6B7280';
            }
          }}
          role="button"
          aria-label={`Navigate to ${item.label}`}
        >
          <span style={{ marginRight: '10px' }}>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px',
          color: '#B22222',
          cursor: 'pointer',
          borderRadius: '4px',
          transition: 'background-color 0.2s'
        }}
        onClick={() => onNavigate('logout')}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FFF3F3')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        role="button"
        aria-label="Log out"
      >
        <span style={{ marginRight: '10px' }}><FiLogOut /></span>
        <span>Logout</span>
      </div>
    </div>
  );
};

export default Sidebar;