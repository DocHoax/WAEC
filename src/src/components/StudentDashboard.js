import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="container mt-4">
      <h2>Student Dashboard</h2>
      <p>Welcome, {user.name}!</p>
      <h4>Your Enrolled Subjects</h4>
      {user.enrolledSubjects && user.enrolledSubjects.length > 0 ? (
        <ul className="list-group">
          {user.enrolledSubjects.map((item, index) => (
            <li key={index} className="list-group-item">
              {item.subject} - {item.class}
              <a href="/tests" className="btn btn-sm btn-primary ms-2">View Tests</a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No subjects enrolled.</p>
      )}
    </div>
  );
};

export default StudentDashboard;