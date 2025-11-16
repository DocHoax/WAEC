import React from 'react';
import { FiUser, FiLogOut } from 'react-icons/fi';

const Header = ({ user, onLogout }) => {
  return (
    <header style={{
      backgroundColor: '#2c3e50',
      color: '#FFFFFF',
      padding: '15px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      borderBottom: '1px solid #000000',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: '60px',
      fontFamily: '"Fredoka", sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <img src="/uploads/sanni.png" alt="Sanniville Academy" style={{
          height: '40px'
        }} onError={(e) => e.target.style.display = 'none'} />
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 'bold',
          fontFamily: '"Fredoka", sans-serif'
        }}>Student Dashboard</h1>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontFamily: '"Fredoka", sans-serif'
        }}>
          <FiUser style={{
            fontSize: '18px'
          }} /> {user.name}
        </span>
        <button
          onClick={onLogout}
          style={{
            backgroundColor: '#3498db',
            color: '#2c3e50',
            border: '1px solid #000000',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.2s',
            fontFamily: '"Fredoka", sans-serif'
          }}
          onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <FiLogOut style={{
            fontSize: '18px'
          }} /> Logout
        </button>
      </div>
    </header>
  );
};

export default Header;