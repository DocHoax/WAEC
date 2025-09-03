import api from './axiosInstance';

export const transcriptAPI = {
  getTranscript: (studentId) => api.get(`/api/transcript/${studentId}`)
};