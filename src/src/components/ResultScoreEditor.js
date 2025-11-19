// components/ResultScoreEditor.js
import React from 'react';

const ResultScoreEditor = ({
  result,
  editingResultId,
  editScore,
  setEditScore,
  loading,
  onSave,
  onCancel,
  maxScore = 100,
  minScore = 0
}) => {
  const isEditing = editingResultId === result._id;

  if (!isEditing) {
    return (
      <span>{`${result.score}%`}</span>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="number"
        value={editScore}
        onChange={(e) => setEditScore(Number(e.target.value))}
        min={minScore}
        max={maxScore}
        style={{
          padding: '5px',
          border: '1px solid #D3D3D3',
          borderRadius: '4px',
          width: '80px',
          fontFamily: 'sans-serif',
          fontSize: '14px'
        }}
        disabled={loading}
      />
      <button
        onClick={() => onSave(result._id)}
        disabled={loading}
        style={{
          padding: '5px 10px',
          backgroundColor: '#28a745',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '4px',
          fontFamily: 'sans-serif',
          fontSize: '12px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
      <button
        onClick={onCancel}
        disabled={loading}
        style={{
          padding: '5px 10px',
          backgroundColor: '#6c757d',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '4px',
          fontFamily: 'sans-serif',
          fontSize: '12px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1
        }}
      >
        Cancel
      </button>
    </div>
  );
};

export default ResultScoreEditor;