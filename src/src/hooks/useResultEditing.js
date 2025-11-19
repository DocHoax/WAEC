// hooks/useResultEditing.js
import { useState } from 'react';
import axios from 'axios';

export const useResultEditing = () => {
  const [editingResultId, setEditingResultId] = useState(null);
  const [editScore, setEditScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const startEditing = (result) => {
    setEditingResultId(result._id);
    setEditScore(result.score);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingResultId(null);
    setEditScore(0);
    setError(null);
    setSuccess(null);
  };

  const saveScore = async (resultId, onSuccess) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `https://waec-gfv0.onrender.com/api/results/${resultId}`, // FIXED API URL
        { score: Number(editScore) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Result updated:', response.data);
      setSuccess('Result updated successfully.');
      setEditingResultId(null);
      
      if (onSuccess) {
        onSuccess(resultId, Number(editScore));
      }
    } catch (error) {
      console.error('Update error:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Failed to update result');
    } finally {
      setLoading(false);
    }
  };

  return {
    editingResultId,
    editScore,
    setEditScore,
    loading,
    error,
    success,
    setError,
    setSuccess,
    startEditing,
    cancelEditing,
    saveScore
  };
};