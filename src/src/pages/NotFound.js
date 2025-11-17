import Navbar from '../components/Navbar';

const NotFound = () => {
  return (
    <>
      <Navbar />
      <div className="container mt-4" style={{
        backgroundColor: '#b8c2cc',
        fontFamily: '"Fredoka", sans-serif',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <h2>404 - Page Not Found</h2>
        <p>The page you are looking for does not exist.</p>
      </div>
    </>
  );
};

export default NotFound;