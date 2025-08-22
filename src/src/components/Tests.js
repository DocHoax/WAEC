import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const Tests = () => {
  const { user } = useContext(AuthContext);
  const [tests, setTests] = useState([]);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/tests', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        console.log('Fetched tests:', res.data);
        setTests(res.data);
      } catch (error) {
        console.error('Error fetching tests:', error.response?.data);
      }
    };
    fetchTests();
  }, []);

  return (
    <div>
      <h2>Available Tests</h2>
      {tests.length === 0 ? (
        <p>No tests available</p>
      ) : (
        <ul>
          {tests.map((test) => (
            <li key={test._id}>
              {test.title} ({test.subject}/{test.class})
              <button onClick={() => window.location.href=`/test/${test._id}`}>Take Test</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Tests;   