import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useParams } from 'react-router-dom';
import { 
  LogOut, 
  User, 
  Shield, 
  Clock, 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  AlertTriangle,
  Menu,
  X,
  ChevronRight,
  Timer,
  Eye,
  BarChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Auth Context ---
const AuthContext = createContext<any>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const login = (userData: any, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// --- Protected Routes ---
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
};

// --- API Helper ---
const api = {
  get: async (url: string, token: string | null) => {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async (url: string, data: any, token: string | null = null) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  put: async (url: string, data: any, token: string | null) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  delete: async (url: string, token: string | null) => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

// --- Components ---

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-indigo-600" />
            <Link to="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              在线考试系统
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                    后台管理
                  </Link>
                )}
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{user.username}</span>
                </div>
                <button 
                  onClick={() => { logout(); navigate('/login'); }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link to="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const data = await api.post('/api/login', { username, password });
        login(data.user, data.token);
        navigate('/');
      } else {
        await api.post('/api/register', { username, password });
        setIsLogin(true);
        alert('注册成功，请登录');
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl shadow-indigo-100 w-full max-w-md border border-gray-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{isLogin ? '欢迎回来' : '创建账户'}</h2>
          <p className="text-gray-500 mt-2">{isLogin ? '请输入您的凭据以访问考试' : '加入我们的在线考试平台'}</p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入用户名"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入密码"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            {isLogin ? '立即登录' : '立即注册'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
          >
            {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const [exams, setExams] = useState<any[]>([]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/exams', token).then(setExams).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">我的考试</h1>
        <p className="text-gray-500 mt-2 text-lg">查看并参加当前正在进行的考试</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">暂无考试</h3>
          <p className="text-gray-500 mt-2">当前没有正在进行的考试，请稍后再来。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {exams.map((exam) => (
            <motion.div 
              key={exam.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full uppercase tracking-wider">
                  进行中
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h3>
              <p className="text-gray-500 text-sm mb-6 flex-grow line-clamp-2">{exam.description}</p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2 text-indigo-400" />
                  <span>时长: {exam.duration} 分钟</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Timer className="w-4 h-4 mr-2 text-indigo-400" />
                  <span>截止: {new Date(exam.endTime).toLocaleString()}</span>
                </div>
              </div>

              <Link 
                to={`/exam/${exam.id}`}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-center hover:bg-indigo-700 transition-all flex items-center justify-center group"
              >
                开始考试
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const ExamSession = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [examData, setExamData] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [cheated, setCheated] = useState(false);
  const [startTime] = useState(new Date().toISOString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/api/exams/${id}`, token)
      .then(data => {
        setExamData(data);
        setTimeLeft(data.exam.duration * 60);
      })
      .catch(err => {
        alert(err.message);
        navigate('/');
      });
  }, [id, token, navigate]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 && examData) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, examData]);

  // Anti-cheat: Blur detection
  useEffect(() => {
    const handleBlur = () => {
      setCheated(true);
      alert('警告：检测到您离开了考试页面。此行为已被记录。');
    };
    window.addEventListener('blur', handleBlur);
    
    // Disable right click and copy
    const handleContextMenu = (e: any) => e.preventDefault();
    const handleCopy = (e: any) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
    };
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post(`/api/exams/${id}/submit`, { answers, cheated, startTime }, token);
      alert('考试已提交！');
      navigate('/');
    } catch (err: any) {
      alert('提交失败: ' + err.message);
      setIsSubmitting(false);
    }
  };

  if (!examData) return <div className="flex items-center justify-center h-screen">加载中...</div>;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-900">{examData.exam.title}</h2>
            <div className={cn(
              "flex items-center px-3 py-1 rounded-full text-sm font-bold",
              timeLeft < 300 ? "bg-red-50 text-red-600 animate-pulse" : "bg-indigo-50 text-indigo-600"
            )}>
              <Timer className="w-4 h-4 mr-2" />
              {formatTime(timeLeft)}
            </div>
          </div>
          <button 
            onClick={() => { if(confirm('确定要提交吗？')) handleSubmit(); }}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            提交试卷
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-8">
        {examData.questions.map((q: any, idx: number) => (
          <div key={q.id} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-start mb-6">
              <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-4 shrink-0">
                {idx + 1}
              </span>
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                  {q.type === 'choice' ? '单选题' : q.type === 'fill' ? '填空题' : '简答题'}
                </span>
                <p className="text-lg text-gray-900 font-medium leading-relaxed">{q.content}</p>
              </div>
            </div>

            {q.type === 'choice' && (
              <div className="grid grid-cols-1 gap-3">
                {q.options.map((opt: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                    className={cn(
                      "flex items-center p-4 rounded-xl border-2 transition-all text-left",
                      answers[q.id] === opt 
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                        : "border-gray-100 hover:border-gray-200 text-gray-600"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center",
                      answers[q.id] === opt ? "border-indigo-600" : "border-gray-300"
                    )}>
                      {answers[q.id] === opt && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                    </div>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'fill' && (
              <input 
                type="text"
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="请输入答案..."
              />
            )}

            {q.type === 'text' && (
              <textarea 
                rows={5}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="请输入详细回答..."
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Admin Components ---

const AdminDashboard = () => {
  const [exams, setExams] = useState<any[]>([]);
  const { token } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [newExam, setNewExam] = useState({ title: '', description: '', startTime: '', endTime: '', duration: 60, status: 'closed' });

  const fetchExams = () => api.get('/api/admin/exams', token).then(setExams);
  useEffect(() => { fetchExams(); }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/admin/exams', newExam, token);
    setShowAdd(false);
    fetchExams();
  };

  const toggleStatus = async (exam: any) => {
    const newStatus = exam.status === 'open' ? 'closed' : 'open';
    await api.put(`/api/admin/exams/${exam.id}`, { ...exam, status: newStatus }, token);
    fetchExams();
  };

  const deleteExam = async (id: number) => {
    if (confirm('确定删除吗？')) {
      await api.delete(`/api/admin/exams/${id}`, token);
      fetchExams();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">考试管理</h1>
          <p className="text-gray-500 mt-1">创建、编辑和监控所有考试</p>
        </div>
        <div className="flex space-x-4">
          <Link to="/admin/results" className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium">
            <BarChart className="w-4 h-4 mr-2" />
            查看成绩
          </Link>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="w-5 h-5 mr-2" />
            创建考试
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">考试名称</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">状态</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">时间范围</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {exams.map(exam => (
              <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-6">
                  <div className="font-bold text-gray-900">{exam.title}</div>
                  <div className="text-sm text-gray-400 mt-1">{exam.duration} 分钟</div>
                </td>
                <td className="px-8 py-6">
                  <button 
                    onClick={() => toggleStatus(exam)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      exam.status === 'open' ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {exam.status === 'open' ? '开启中' : '已关闭'}
                  </button>
                </td>
                <td className="px-8 py-6">
                  <div className="text-sm text-gray-600">{new Date(exam.startTime).toLocaleString()}</div>
                  <div className="text-sm text-gray-400">至 {new Date(exam.endTime).toLocaleString()}</div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end space-x-2">
                    <Link to={`/admin/exams/${exam.id}/questions`} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button onClick={() => deleteExam(exam.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">创建新考试</h2>
                <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">考试标题</label>
                  <input 
                    type="text" 
                    required
                    value={newExam.title}
                    onChange={e => setNewExam({...newExam, title: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">描述</label>
                  <textarea 
                    value={newExam.description}
                    onChange={e => setNewExam({...newExam, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">开始时间</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={newExam.startTime}
                    onChange={e => setNewExam({...newExam, startTime: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">结束时间</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={newExam.endTime}
                    onChange={e => setNewExam({...newExam, endTime: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">时长 (分钟)</label>
                  <input 
                    type="number" 
                    required
                    value={newExam.duration}
                    onChange={e => setNewExam({...newExam, duration: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="col-span-2 mt-4">
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    确认创建
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuestionManager = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState({ type: 'choice', content: '', options: ['', '', '', ''], answer: '' });

  const fetchQuestions = () => api.get(`/api/admin/exams/${id}/questions`, token).then(setQuestions);
  useEffect(() => { fetchQuestions(); }, [id, token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/api/admin/exams/${id}/questions`, newQ, token);
    setShowAdd(false);
    setNewQ({ type: 'choice', content: '', options: ['', '', '', ''], answer: '' });
    fetchQuestions();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center space-x-4">
          <Link to="/admin" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">题目管理</h1>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          添加题目
        </button>
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                {q.type === 'choice' ? '单选题' : q.type === 'fill' ? '填空题' : '简答题'}
              </span>
              <span className="text-gray-400 font-medium">#{idx + 1}</span>
            </div>
            <p className="text-lg text-gray-900 font-medium mb-6">{q.content}</p>
            {q.type === 'choice' && (
              <div className="grid grid-cols-2 gap-4">
                {q.options.map((opt: string, i: number) => (
                  <div key={i} className={cn(
                    "p-3 rounded-xl border text-sm",
                    q.answer === opt ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-100 text-gray-500"
                  )}>
                    {opt}
                  </div>
                ))}
              </div>
            )}
            {(q.type === 'fill' || q.type === 'text') && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <span className="text-xs font-bold text-green-600 uppercase block mb-1">参考答案</span>
                <p className="text-green-700">{q.answer || '暂无参考答案'}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">添加题目</h2>
                <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">题目类型</label>
                  <select 
                    value={newQ.type}
                    onChange={e => setNewQ({...newQ, type: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="choice">单选题</option>
                    <option value="fill">填空题</option>
                    <option value="text">简答题</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">题目内容</label>
                  <textarea 
                    required
                    value={newQ.content}
                    onChange={e => setNewQ({...newQ, content: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    rows={3}
                  />
                </div>
                {newQ.type === 'choice' && (
                  <div className="grid grid-cols-2 gap-4">
                    {newQ.options.map((opt, i) => (
                      <div key={i}>
                        <label className="block text-xs font-bold text-gray-400 mb-1">选项 {String.fromCharCode(65 + i)}</label>
                        <input 
                          type="text" 
                          required
                          value={opt}
                          onChange={e => {
                            const opts = [...newQ.options];
                            opts[i] = e.target.value;
                            setNewQ({...newQ, options: opts});
                          }}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">正确答案</label>
                  {newQ.type === 'choice' ? (
                    <select 
                      value={newQ.answer}
                      onChange={e => setNewQ({...newQ, answer: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    >
                      <option value="">请选择正确答案</option>
                      {newQ.options.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      required
                      value={newQ.answer}
                      onChange={e => setNewQ({...newQ, answer: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="请输入参考答案"
                    />
                  )}
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all">
                  确认添加
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminResults = () => {
  const [results, setResults] = useState<any[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    api.get('/api/admin/results', token).then(setResults);
  }, [token]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12 flex items-center space-x-4">
        <Link to="/admin" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">考试成绩</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">考生</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">考试</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">得分</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">状态</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">提交时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {results.map(res => (
              <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-6 font-bold text-gray-900">{res.username}</td>
                <td className="px-8 py-6 text-gray-600">{res.examTitle}</td>
                <td className="px-8 py-6 font-mono font-bold text-indigo-600">{res.score}</td>
                <td className="px-8 py-6">
                  {res.cheated ? (
                    <span className="flex items-center text-red-500 text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      疑似作弊
                    </span>
                  ) : (
                    <span className="flex items-center text-green-500 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      正常
                    </span>
                  )}
                </td>
                <td className="px-8 py-6 text-sm text-gray-400">{new Date(res.endTime).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/exam/:id" element={<ProtectedRoute><ExamSession /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/exams/:id/questions" element={<ProtectedRoute adminOnly><QuestionManager /></ProtectedRoute>} />
            <Route path="/admin/results" element={<ProtectedRoute adminOnly><AdminResults /></ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}
