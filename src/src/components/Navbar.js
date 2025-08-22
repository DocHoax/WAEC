import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">WAEC CBT</Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {user && (
              <>
                <li className="nav-item">
                  <span className="nav-link">Welcome, {user.name}</span>
                </li>
                {user.role === 'admin' && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin">Dashboard</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/users">Manage Users</Link>
                    </li>
                  </>
                )}
                {user.role === 'teacher' && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/teacher">Dashboard</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/test-creation">Create Test</Link>
                    </li>
                  </>
                )}
                {user.role === 'student' && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/student">Dashboard</Link>
                  </li>
                )}
                <li className="nav-item">
                  <button className="nav-link btn" onClick={handleLogout}>Logout</button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;