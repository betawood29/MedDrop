// Prescription service — upload, list, and delete prescriptions

import api from './api';

export const uploadPrescription = (formData) =>
  api.post('/prescriptions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getMyPrescriptions = () =>
  api.get('/prescriptions');

export const getPrescription = (id) =>
  api.get(`/prescriptions/${id}`);

export const deletePrescription = (id) =>
  api.delete(`/prescriptions/${id}`);
