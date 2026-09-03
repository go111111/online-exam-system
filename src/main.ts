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
const AdminQuestionBank = () => import('./views/AdminQuestionBank.vue');
const AdminPeople = () => import('./views/AdminPeople.vue');

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
  { path: '/admin/question-bank', component: AdminQuestionBank, meta: { requiresAuth: true, adminOnly: true } },
  { path: '/admin/people', component: AdminPeople, meta: { requiresAuth: true, adminOnly: true } },
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

const dialogDragCleanup = new WeakMap<HTMLElement, () => void>();

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

app.directive('dialog-drag', {
  mounted(el: HTMLElement, binding) {
    const config =
      typeof binding.value === 'string'
        ? { handle: binding.value }
        : binding.value || {};
    const handleSelector = config.handle || '[data-dialog-drag-handle]';
    const handle = el.querySelector<HTMLElement>(handleSelector) || el;

    let dragging = false;
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let originWidth = 0;
    let originHeight = 0;

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      pointerId = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || pointerId !== event.pointerId) return;
      const nextLeft = clamp(
        originLeft + (event.clientX - startX),
        12,
        Math.max(12, window.innerWidth - originWidth - 12)
      );
      const nextTop = clamp(
        originTop + (event.clientY - startY),
        12,
        Math.max(12, window.innerHeight - originHeight - 12)
      );

      el.style.left = `${nextLeft}px`;
      el.style.top = `${nextTop}px`;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      stopDrag();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if ((event.target as HTMLElement | null)?.closest('button, a, input, textarea, select, option')) return;

      const rect = el.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;
      originWidth = rect.width;
      originHeight = rect.height;
      startX = event.clientX;
      startY = event.clientY;
      pointerId = event.pointerId;
      dragging = true;

      el.style.position = 'fixed';
      el.style.margin = '0';
      el.style.transform = 'none';
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    };

    handle.classList.add('dialog-drag-handle');
    handle.addEventListener('pointerdown', onPointerDown);
    dialogDragCleanup.set(el, () => {
      stopDrag();
      handle.removeEventListener('pointerdown', onPointerDown);
    });
  },
  unmounted(el: HTMLElement) {
    dialogDragCleanup.get(el)?.();
    dialogDragCleanup.delete(el);
  }
});
app.use(ElementPlus);
app.use(router);
app.mount('#root');
