import api from './axiosInstance';

export const promotionAPI = {
  getClasses: () => api.get('/api/classes'),
  getEligibleStudents: (classId, session, term) => 
    api.get(`/api/promotion/${classId}?session=${session}&term=${term}`),
  promoteStudents: (studentIds, targetClassId, session, term) => 
    api.post('/api/promotion', { studentIds, targetClassId, session, term })
};