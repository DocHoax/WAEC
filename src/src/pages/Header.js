import React from 'react';
import { FiUser, FiLogOut } from 'react-icons/fi';

const Header = ({ user, onLogout }) => {
  return (
    <header style={{
      backgroundColor: '#4B5320',
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
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <img src="/images/sanni.png" alt="Sanniville Academy" style={{
          height: '40px'
        }} onError={(e) => e.target.style.display = 'none'} />
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 'bold'
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
          gap: '5px'
        }}>
          <FiUser style={{
            fontSize: '18px'
          }} /> {user.name}
        </span>
        <button
          onClick={onLogout}
          style={{
            backgroundColor: '#D4A017',
            color: '#000000',
            border: '1px solid #000000',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.2s'
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