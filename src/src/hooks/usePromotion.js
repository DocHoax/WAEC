import { useState } from 'react';
import { promotionAPI } from '../api/promotion';

const usePromotion = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const promoteStudents = async (studentIds, targetClassId, session, term) => {
    setLoading(true);
    setError(null);
    
    try {
      await promotionAPI.promoteStudents(studentIds, targetClassId, session, term);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to promote students');
      return { success: false, error: err.response?.data?.message || 'Failed to promote students' };
    } finally {
      setLoading(false);
    }
  };

  return {
    promoteStudents,
    loading,
    error
  };
};

export default usePromotion;