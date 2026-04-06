import { createApp, ref } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './index.css';

// Views
const Login = () => import('./views/Login.vue');
const Dashboard = () => import('./views/Dashboard.vue');
const ExamSession = () => import('./views/ExamSession.vue');
const AdminDashboard = () => import('./views/AdminDashboard.vue');
const QuestionManager = () => import('./views/QuestionManager.vue');
const AdminResults = () => import('./views/AdminResults.vue');

const routes = [
  { path: '/login', component: Login },
  { path: '/', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/exam/:id', component: ExamSession, meta: { requiresAuth: true } },
  { path: '/admin', component: AdminDashboard, meta: { requiresAuth: true, adminOnly: true } },
  { path: '/admin/exams/:id/questions', component: QuestionManager, meta: { requiresAuth: true, adminOnly: true } },
  { path: '/admin/results', component: AdminResults, meta: { requiresAuth: true, adminOnly: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (to.meta.requiresAuth && !user) {
    next('/login');
  } else if (to.meta.adminOnly && user?.role !== 'admin') {
    next('/');
  } else {
    next();
  }
});

const app = createApp(App);

const auth = {
  user: ref(JSON.parse(localStorage.getItem('user') || 'null')),
  token: ref(localStorage.getItem('token') || 'null'),
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

const api = {
  async request(url: string, options: any = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(auth.token.value ? { 'Authorization': `Bearer ${auth.token.value}` } : {}),
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },
  get(url: string) { return this.request(url); },
  post(url: string, data: any) { return this.request(url, { method: 'POST', body: JSON.stringify(data) }); },
  put(url: string, data: any) { return this.request(url, { method: 'PUT', body: JSON.stringify(data) }); },
  delete(url: string) { return this.request(url, { method: 'DELETE' }); },
};

app.provide('auth', auth);
app.provide('api', api);
app.use(router);
app.mount('#root');
