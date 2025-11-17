import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FiUsers, 
  FiBook, 
  FiClipboard, 
  FiAward, 
  FiUserCheck,
  FiArrowLeft,
  FiBarChart2,
  FiTrendingUp,
  FiActivity,
  FiAlertCircle
} from 'react-icons/fi';
import useTeacherData from '../hooks/useTeacherData';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import AccessDenied from '../components/AccessDenied';

const AnalyticsPage = () => {
  const { user } = useContext(AuthContext);
  const { analytics, tests, results, error: hookError, loading: hookLoading } = useTeacherData();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalTests: 0,
    totalExams: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('https://waec-gfv0.onrender.com/api/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSummary(res.data.summary || {
          totalStudents: 0,
          totalTeachers: 0,
          totalClasses: 0,
          totalTests: 0,
          totalExams: 0,
        });
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load analytics.');
        setLoading(false);
      }
    };

    if (user && (user.role === 'teacher' || user.role === 'admin')) {
      fetchAnalytics();
    } else {
      setError('Access restricted to teachers and admins.');
      setLoading(false);
    }
  }, [user]);

  const combinedError = hookError || error;
  const combinedLoading = hookLoading || loading;

  if (combinedLoading) {
    return <Loader message="Loading analytics data..." />;
  }

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return <AccessDenied message="Access restricted to teachers and admins." />;
  }

  if (combinedError) {
    return <ErrorMessage message={combinedError} />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#b8c2cc', fontFamily: '"Fredoka", sans-serif', animation: 'fadeIn 0.8s ease-in' }}>
      {/* Header */}
      <header className="bg-primary-800 text-white shadow-md" style={{ animation: 'slideDown 0.6s ease-out' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <img
                  className="h-12 w-12 rounded-md border-2 border-secondary-500 p-1 bg-white"
                  src="/uploads/sanni.png"
                  alt="Sanniville Academy"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">Sanniville Academy</h1>
                <p className="text-secondary-300 text-sm">Performance Analytics Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => navigate(user.role === 'admin' ? '/admin' : '/teacher')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-800 bg-secondary-500 hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 transition-all duration-300 hover:scale-105"
            >
              <FiArrowLeft className="mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8" style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiBarChart2 className="mr-2 text-primary-600" />
            Performance Analytics Overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive insights into academic performance and institutional metrics
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {/* Students Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg" style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <FiUsers className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Students</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{summary.totalStudents}</div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Teachers Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg" style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <FiUserCheck className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Teachers</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{summary.totalTeachers}</div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Classes Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg" style={{ animation: 'fadeInUp 0.6s ease-out 0.5s both' }}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <FiBook className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Classes</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{summary.totalClasses}</div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Tests Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg" style={{ animation: 'fadeInUp 0.6s ease-out 0.6s both' }}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <FiClipboard className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tests</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{summary.totalTests}</div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Exams Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg" style={{ animation: 'fadeInUp 0.6s ease-out 0.7s both' }}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <FiAward className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Exams</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{summary.totalExams}</div>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Analytics Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg" style={{ animation: 'fadeInUp 0.6s ease-out 0.8s both' }}>
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <FiActivity className="mr-2 text-primary-600" />
              Test & Exam Performance Metrics
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Detailed analysis of student performance across assessments
            </p>
          </div>
          
          {analytics.length === 0 ? (
            <div className="p-8 text-center">
              <FiAlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data available</h3>
              <p className="mt-1 text-sm text-gray-500">
                There are no test results to display at this time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FiTrendingUp className="inline mr-1" />
                      Avg Score
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Student
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.map((data, idx) => (
                    <tr key={data.testId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-all duration-200 hover:bg-blue-50`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {data.testTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {data.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {data.class}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {data.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full transition-all duration-300 ${data.averageScore >= 70 ? 'bg-green-100 text-green-800' : data.averageScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {data.averageScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-1000 ${data.completionRate >= 90 ? 'bg-green-600' : data.completionRate >= 70 ? 'bg-blue-600' : 'bg-yellow-500'}`} 
                            style={{ width: `${data.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">{data.completionRate}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {data.topStudent || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
const keyframes = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeInUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideDown {
  from { 
    opacity: 0;
    transform: translateY(-20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
`;

// Inject keyframes
if (styleSheet) {
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}

export default AnalyticsPage;