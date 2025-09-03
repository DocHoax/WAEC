// Promotion API calls
export const promotionAPI = {
  getClasses: () => axios.get('/api/classes'),
  getEligibleStudents: (classId, session, term) => 
    axios.get(`/api/promotion/${classId}?session=${session}&term=${term}`),
  promoteStudents: (studentIds, targetClassId, session, term) => 
    axios.post('/api/promotion', { studentIds, targetClassId, session, term })
};

// Transcript API calls
export const transcriptAPI = {
  getTranscript: (studentId) => axios.get(`/api/transcript/${studentId}`)
};