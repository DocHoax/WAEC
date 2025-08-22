import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);

  if (!user) return <p>Please log in.</p>;

  return (
    <div className="container mt-4">
      <h2>Teacher Dashboard</h2>
      <p>Welcome, {user.name}!</p>
      <h4>Your Assigned Subjects and Classes</h4>
      {user.subjects && user.subjects.length > 0 ? (
        <ul className="list-group">
          {user.subjects.map((item, index) => (
            <li key={index} className="list-group-item">
              {item.subject} - {item.class}
              <a href="/test-creation" className="btn btn-sm btn-primary ms-2">Create Test</a>
              <a href="/results" className="btn btn-sm btn-secondary ms-2">View Results</a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No subjects or classes assigned.</p>
      )}
    </div>
  );
};

export default TeacherDashboard;