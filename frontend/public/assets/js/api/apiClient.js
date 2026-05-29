'use strict';
const API_BASE = '/api/v1';

const getToken = () => localStorage.getItem('inkuai_token');
const getUser  = () => JSON.parse(localStorage.getItem('inkuai_user') || 'null');

const setAuth = (token, user) => {
  localStorage.setItem('inkuai_token', token);
  localStorage.setItem('inkuai_user', JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem('inkuai_token');
  localStorage.removeItem('inkuai_user');
};

async function request(method, endpoint, body = null, isFormData = false) {
  const token = getToken();
  const headers = { 'Authorization': token ? `Bearer ${token}` : '' };
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const config = { method, headers };
  if (body) config.body = isFormData ? body : JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();

    if (res.status === 401) {
      clearAuth();
      window.location.href = '/pages/login.html';
      return;
    }
    if (!res.ok) throw { status: res.status, message: data.message || 'Erro na requisição', errors: data.errors };
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') throw { message: 'Sem ligação ao servidor. Verifique a sua conexão.' };
    throw err;
  }
}

const api = {
  get:    (ep)          => request('GET', ep),
  post:   (ep, body)    => request('POST', ep, body),
  put:    (ep, body)    => request('PUT', ep, body),
  patch:  (ep, body)    => request('PATCH', ep, body),
  delete: (ep)          => request('DELETE', ep),
  upload: (ep, formData) => request('POST', ep, formData, true)
};

window.InkuAPI = api;
window.InkuAuth = { getToken, getUser, setAuth, clearAuth };
