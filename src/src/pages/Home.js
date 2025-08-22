import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Welcome to WAEC CBT WebApp</h1>
      <p>Prepare for WAEC exams with our computer-based testing platform.</p>
      {user ? (
        <div>
          <p>Hello, {user.name} ({user.role})</p>
          <button onClick={() => navigate(`/${user.role}`)}>
            Go to {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
          </button>
          <button onClick={logout} style={{ marginLeft: '10px' }}>Logout</button>
        </div>
      ) : (
        <div>
          <Link to="/login">
            <button>Login</button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Home;