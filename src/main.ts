import { createApp, ref } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import axios from 'axios';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import './index.css';

// Views
const Login = () => import('./views/Login.vue');
const Register = () => import('./views/Register.vue');
const Dashboard = () => import('./views/Dashboard.vue');
const ExamSession = () => import('./views/ExamSession.vue');
const StudentResults = () => import('./views/StudentResults.vue');
const AdminDashboard = () => import('./views/AdminDashboard.vue');
const QuestionManager = () => import('./views/QuestionManager.vue');
const AdminResults = () => import('./views/AdminResults.vue');
const AdminGrading = () => import('./views/AdminGrading.vue');
const AdminNotifications = () => import('./views/AdminNotifications.vue');

const routes = [
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/results', component: StudentResults, meta: { requiresAuth: true } },
  { path: '/results/table', component: StudentResults, meta: { requiresAuth: true } },
  { path: '/exam/:id', component: ExamSession, meta: { requiresAuth: true } },
  { path: '/admin', component: AdminDashboard, meta: { requiresAuth: true, adminOnly: true } },
  { path: '/admin/grading', component: AdminGrading, meta: { requiresAuth: true, adminOnly: true } },
  { path: '/admin/notifications', component: AdminNotifications, meta: { requiresAuth: true, adminOnly: true } },
  { path: '/admin/exams/:id/questions', component: QuestionManager, meta: { requiresAuth: true, adminOnly: true } },
  { path: '/admin/results', component: AdminResults, meta: { requiresAuth: true, adminOnly: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (to.meta.requiresAuth && !user) {
    return '/login';
  } else if (to.meta.adminOnly && user?.role !== 'admin') {
    return '/';
  }
});

const app = createApp(App);
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const auth = {
  user: ref(JSON.parse(localStorage.getItem('user') || 'null')),
  token: ref<string | null>(localStorage.getItem('token')),
  login(user: any, token: string) {
    this.user.value = user;
    this.token.value = token;
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  },
  logout() {
    this.user.value = null;
    this.token.value = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
};

const axiosInstance = axios.create({
  // Empty baseURL works with Vite /api proxy in development.
  baseURL: API_BASE_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const token = auth.token.value;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Request failed';
    return Promise.reject(new Error(errorMessage));
  }
);

const api = {
  async get(url: string, config: any = {}) {
    const res = await axiosInstance.get(url, config);
    return res.data;
  },
  async post(url: string, data: any, config: any = {}) {
    const res = await axiosInstance.post(url, data, config);
    return res.data;
  },
  async put(url: string, data: any, config: any = {}) {
    const res = await axiosInstance.put(url, data, config);
    return res.data;
  },
  async delete(url: string, config: any = {}) {
    const res = await axiosInstance.delete(url, config);
    return res.data;
  },
};

app.provide('auth', auth);
app.provide('api', api);
app.use(ElementPlus);
app.use(router);
app.mount('#root');
