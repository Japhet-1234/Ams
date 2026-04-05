import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useLocation 
} from 'react-router-dom';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  serverTimestamp,
  getDocFromServer,
  or
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  FileSpreadsheet, 
  MessageSquare, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  ChevronRight,
  Search,
  Bell,
  Settings,
  ShieldCheck,
  BookOpen,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type UserRole = 'HeadOffice' | 'Academic' | 'Discipline' | 'Teacher';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  subject?: string;
  class_id?: string;
  phone?: string;
  isApproved?: boolean;
}

interface ExamStatus {
  isActive: boolean;
  term: string;
  year: string;
}

interface Student {
  id: string;
  full_name: string;
  registration_number: string;
  class_id: string;
  discipline_remarks?: string;
  discipline_updated_at?: any;
}

interface GradingSetting {
  id: string;
  grade_name: string;
  min_score: number;
  max_score: number;
  remarks: string;
}

interface ExamResult {
  id: string;
  student_id: string;
  subject_name: string;
  score: number;
  teacher_id: string;
  term: string;
  year: string;
}

// --- Components ---

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-600 font-medium">Inapakia mfumo...</p>
    </motion.div>
  </div>
);

const Login = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore, if not create with default role 'Teacher'
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Default admin check, others stay without role until ProfileSetup
        const isAdmin = user.email === "japhetsunday0106@gmail.com";
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email,
          role: isAdmin ? 'HeadOffice' : '', // Empty role forces ProfileSetup
          isApproved: isAdmin ? true : false
        });
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
      >
        <div className="mb-6 inline-flex p-4 bg-indigo-100 rounded-full text-indigo-600">
          <GraduationCap size={48} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Academic Management</h1>
        <p className="text-slate-500 mb-8">Karibu kwenye mfumo wa usimamizi wa kitaaluma. Tafadhali ingia ili kuendelea.</p>
        
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3 px-4 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Ingia na Google
        </button>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ user, onLogout }: { user: UserProfile, onLogout: () => void }) => {
  const location = useLocation();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['HeadOffice', 'Academic', 'Discipline', 'Teacher'] },
    { icon: ShieldCheck, label: 'Walimu', path: '/staff', roles: ['HeadOffice'] },
    { icon: ShieldCheck, label: 'Nidhamu', path: '/discipline', roles: ['Discipline'] },
    { icon: Users, label: 'Wanafunzi', path: '/students', roles: ['HeadOffice', 'Academic'] },
    { icon: Settings, label: 'Gredi', path: '/grading', roles: ['HeadOffice', 'Academic'] },
    { icon: FileSpreadsheet, label: 'Alama', path: '/results', roles: ['HeadOffice', 'Academic', 'Teacher'] },
    { icon: FileText, label: 'Broadsheet', path: '/broadsheet', roles: ['HeadOffice', 'Academic'] },
    { icon: MessageSquare, label: 'Ujumbe', path: '/messages', roles: ['HeadOffice', 'Academic', 'Discipline', 'Teacher'] },
    { icon: FileText, label: 'Nyaraka', path: '/documents', roles: ['HeadOffice', 'Academic', 'Discipline', 'Teacher'] },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="bg-indigo-600 p-2 rounded-lg text-white">
          <GraduationCap size={24} />
        </div>
        <span className="font-bold text-slate-800 text-lg">AMS System</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.filter(item => item.roles.includes(user.role)).map((item) => (
          <Link 
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              location.pathname === item.path 
                ? 'bg-indigo-50 text-indigo-600 font-semibold' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.role}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Ondoka</span>
        </button>
      </div>
    </div>
  );
};

// --- Pages ---

const Dashboard = ({ user }: { user: UserProfile }) => {
  const [stats, setStats] = useState({ students: 0, staff: 0, results: 0, unapproved: 0, disciplineCount: 0 });

  useEffect(() => {
    if (!user) return;

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      const studentData = snap.docs.map(doc => doc.data() as Student);
      setStats(prev => ({ 
        ...prev, 
        students: snap.size,
        disciplineCount: studentData.filter(s => s.discipline_remarks).length
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const userData = snap.docs.map(doc => doc.data() as UserProfile);
      setStats(prev => ({ 
        ...prev, 
        staff: snap.size - 1,
        unapproved: userData.filter(u => !u.isApproved && u.role !== 'HeadOffice').length
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubResults = onSnapshot(collection(db, 'exam_results'), (snap) => {
      setStats(prev => ({ ...prev, results: snap.size }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'exam_results'));

    return () => {
      unsubStudents();
      unsubUsers();
      unsubResults();
    };
  }, [user]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Karibu, {user.name}</h1>
        <p className="text-slate-500">Ofisi: <span className="text-indigo-600 font-bold">{user.role}</span></p>
      </header>

      {/* Stats Grid - Visible to HeadOffice and Academic */}
      {(user.role === 'HeadOffice' || user.role === 'Academic') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Wanafunzi', value: stats.students, icon: Users, color: 'bg-blue-500' },
            { label: 'Wafanyakazi', value: stats.staff, icon: ShieldCheck, color: 'bg-indigo-500' },
            { label: 'Matokeo', value: stats.results, icon: FileText, color: 'bg-emerald-500' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
            >
              <div className={`${stat.color} p-3 rounded-xl text-white`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic Controls - Only for Academic Office */}
        {user.role === 'Academic' && (
          <div className="lg:col-span-3">
            <AcademicControls />
          </div>
        )}

        {/* Teacher Specific View */}
        {user.role === 'Teacher' && (
          <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Hali ya Kazi Yako</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-indigo-50 rounded-xl">
                <p className="text-xs text-indigo-600 font-bold uppercase mb-1">Somo</p>
                <p className="text-lg font-bold text-slate-800">{user.subject}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-xs text-purple-600 font-bold uppercase mb-1">Darasa</p>
                <p className="text-lg font-bold text-slate-800">{user.class_id}</p>
              </div>
            </div>
            <div className="mt-6">
              <Link to="/results" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
                Ingiza Alama Sasa
                <ChevronRight size={20} />
              </Link>
            </div>
          </div>
        )}

        {/* Discipline Specific View */}
        {user.role === 'Discipline' && (
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Ofisi ya Nidhamu</h2>
              <p className="text-slate-500 mb-6">Simamia mienendo na nidhamu ya wanafunzi wote shuleni.</p>
              <Link to="/discipline" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
                Fungua Ofisi ya Nidhamu
                <ChevronRight size={20} />
              </Link>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <ShieldCheck size={32} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Wanafunzi wenye Ripoti</p>
                <p className="text-3xl font-bold text-slate-800">{stats.disciplineCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity - Visible to HeadOffice */}
        {user.role === 'HeadOffice' && (
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">Wafanyakazi Wapya</h3>
                  <p className="text-sm text-slate-500">Wanasubiri idhini yako.</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600">{stats.unapproved}</p>
                  <Link to="/staff" className="text-xs font-bold text-indigo-600 hover:underline">Angalia Wote</Link>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">Nyaraka za Shule</h3>
                  <p className="text-sm text-slate-500">Nyaraka zote za idara.</p>
                </div>
                <Link to="/documents" className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all">
                  <FileText size={24} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StaffManagement = () => {
  const [staff, setStaff] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setStaff(snap.docs.map(doc => doc.data() as UserProfile).filter(u => u.role !== 'HeadOffice'));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    return unsub;
  }, []);

  const toggleApproval = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isApproved: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Usimamizi wa Wafanyakazi</h1>
        <p className="text-slate-500">Angalia na uidhinishe walimu na idara nyingine.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Jina</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Somo/Darasa</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Mawasiliano</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Hali</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => (
              <tr key={s.uid} className="hover:bg-slate-50 transition-all">
                <td className="px-6 py-4 text-sm font-medium text-slate-800">{s.name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{s.role}</td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {s.role === 'Teacher' ? `${s.subject} (${s.class_id})` : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{s.phone}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => toggleApproval(s.uid, !!s.isApproved)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${s.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    {s.isApproved ? 'Ameidhinishwa' : 'Subiri Idhini'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AcademicControls = () => {
  const [status, setStatus] = useState<ExamStatus | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'exam_status', 'current'), (snap) => {
      if (snap.exists()) setStatus(snap.data() as ExamStatus);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'exam_status/current'));
    return unsub;
  }, []);

  const toggleStatus = async () => {
    try {
      await setDoc(doc(db, 'exam_status', 'current'), {
        isActive: !status?.isActive,
        term: status?.term || 'Term 1',
        year: status?.year || '2026',
        updatedBy: auth.currentUser?.uid
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'exam_status');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Hali ya Uingizaji Alama</h2>
        <p className="text-sm text-slate-500">Fungua au funga uwezo wa walimu kuingiza alama.</p>
      </div>
      <button 
        onClick={toggleStatus}
        className={`px-6 py-2 rounded-xl font-bold transition-all ${
          status?.isActive 
            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
        }`}
      >
        {status?.isActive ? 'Funga Uingizaji Alama' : 'Fungua Uingizaji Alama'}
      </button>
    </div>
  );
};

const DisciplineOffice = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));
    return unsub;
  }, []);

  const handleUpdateDiscipline = async (id: string) => {
    try {
      await updateDoc(doc(db, 'students', id), {
        discipline_remarks: remarks,
        discipline_updated_at: serverTimestamp()
      });
      setIsEditing(null);
      setRemarks('');
      alert('Taarifa za nidhamu zimehifadhiwa!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'students');
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.registration_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'All' || s.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  const classes = ['All', ...new Set(students.map(s => s.class_id))];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Ofisi ya Nidhamu</h1>
        <p className="text-slate-500">Simamia mienendo na nidhamu ya wanafunzi wote.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Tafuta mwanafunzi..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-sm font-medium text-slate-500">Chuja Darasa:</span>
          <select 
            className="px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
          >
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Mwanafunzi</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Darasa</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Hali ya Nidhamu</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Vitendo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-all">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-800">{student.full_name}</p>
                  <p className="text-xs text-slate-400">{student.registration_number}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{student.class_id}</td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600 italic truncate max-w-xs">
                    {student.discipline_remarks || 'Hakuna maelezo bado.'}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => {
                      setIsEditing(student.id);
                      setRemarks(student.discipline_remarks || '');
                    }}
                    className="text-indigo-600 text-sm font-bold hover:underline"
                  >
                    Jaza Ripoti
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-4">Ripoti ya Nidhamu</h2>
              <p className="text-sm text-slate-500 mb-4">Mwanafunzi: {students.find(s => s.id === isEditing)?.full_name}</p>
              
              <textarea 
                rows={6}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none resize-none mb-6"
                placeholder="Andika mienendo na nidhamu ya mwanafunzi hapa..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditing(null)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Ghairi
                </button>
                <button 
                  onClick={() => handleUpdateDiscipline(isEditing)}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
                >
                  Hifadhi Ripoti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Broadsheet = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [grading, setGrading] = useState<GradingSetting[]>([]);

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));

    const unsubResults = onSnapshot(collection(db, 'exam_results'), (snap) => {
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'exam_results'));

    const unsubGrading = onSnapshot(collection(db, 'grading_settings'), (snap) => {
      setGrading(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GradingSetting)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'grading_settings'));

    return () => {
      unsubStudents();
      unsubResults();
      unsubGrading();
    };
  }, []);

  const getGrade = (score: number) => {
    const grade = grading.find(g => score >= g.min_score && score <= g.max_score);
    return grade ? grade.grade_name : '-';
  };

  const processedData = students.map(student => {
    const studentResults = results.filter(r => r.student_id === student.id);
    const total = studentResults.reduce((acc, curr) => acc + curr.score, 0);
    const average = studentResults.length > 0 ? total / studentResults.length : 0;
    return {
      ...student,
      results: studentResults,
      total,
      average,
      grade: getGrade(average)
    };
  }).sort((a, b) => b.average - a.average);

  const exportCSV = () => {
    const headers = ['Jina', 'Namba ya Usajili', 'Darasa', 'Jumla', 'Wastani', 'Gredi', 'Nafasi'];
    const rows = processedData.map((s, i) => [
      s.full_name, s.registration_number, s.class_id, s.total, s.average.toFixed(2), s.grade, i + 1
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "academic_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Broadsheet & Evaluation</h1>
          <p className="text-slate-500">Ripoti kamili ya matokeo ya kitaaluma.</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition-all"
        >
          <FileSpreadsheet size={20} />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nafasi</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Jina</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Darasa</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Jumla</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Wastani</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Gredi</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nidhamu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedData.map((s, i) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-all">
                <td className="px-6 py-4 text-sm font-bold text-indigo-600">{i + 1}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-800">{s.full_name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{s.class_id}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{s.total}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-800">{s.average.toFixed(1)}%</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{s.grade}</span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">
                  {s.discipline_remarks || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ full_name: '', registration_number: '', class_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));
    return unsub;
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.registration_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'All' || s.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  const classes = ['All', ...new Set(students.map(s => s.class_id))];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'students'), formData);
      setFormData({ full_name: '', registration_number: '', class_id: '' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'students');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    try {
      await updateDoc(doc(db, 'students', isEditing), formData);
      setIsEditing(null);
      setFormData({ full_name: '', registration_number: '', class_id: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'students');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Je, una uhakika unataka kufuta mwanafunzi huyu?')) {
      try {
        await deleteDoc(doc(db, 'students', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'students');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usimamizi wa Wanafunzi</h1>
          <p className="text-slate-500">Ongeza, hariri au futa taarifa za wanafunzi.</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(true);
            setFormData({ full_name: '', registration_number: '', class_id: '' });
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
        >
          <Plus size={20} />
          Mwanafunzi Mpya
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Tafuta mwanafunzi..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-sm font-medium text-slate-500">Chuja Darasa:</span>
          <select 
            className="px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
          >
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Jina Kamili</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Namba ya Usajili</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Darasa</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Vitendo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-all">
                <td className="px-6 py-4 text-sm font-medium text-slate-800">{student.full_name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{student.registration_number}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{student.class_id}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => {
                      setIsEditing(student.id);
                      setFormData({
                        full_name: student.full_name,
                        registration_number: student.registration_number,
                        class_id: student.class_id
                      });
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(student.id)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {(isAdding || isEditing) && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                  {isEditing ? 'Hariri Mwanafunzi' : 'Ongeza Mwanafunzi'}
                </h2>
                <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={isEditing ? handleUpdate : handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jina Kamili</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Namba ya Usajili</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.registration_number}
                    onChange={e => setFormData({...formData, registration_number: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Darasa</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.class_id}
                    onChange={e => setFormData({...formData, class_id: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all">
                  {isEditing ? 'Hifadhi Marekebisho' : 'Hifadhi'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GradingSettings = () => {
  const [settings, setSettings] = useState<GradingSetting[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<GradingSetting>>({
    grade_name: '',
    min_score: 0,
    max_score: 0,
    remarks: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'grading_settings'), (snap) => {
      setSettings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GradingSetting)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'grading_settings'));
    return unsub;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = formData.grade_name || Date.now().toString();
      await setDoc(doc(db, 'grading_settings', id), formData);
      setIsAdding(false);
      setFormData({ grade_name: '', min_score: 0, max_score: 0, remarks: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'grading_settings');
    }
  };

  const handleUpdate = async (id: string, data: Partial<GradingSetting>) => {
    try {
      await updateDoc(doc(db, 'grading_settings', id), data);
      setIsEditing(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'grading_settings');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Je, una uhakika unataka kufuta gredi hii?')) {
      try {
        await deleteDoc(doc(db, 'grading_settings', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'grading_settings');
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mipangilio ya Gredi</h1>
          <p className="text-slate-500">Panga viwango vya alama kwa ajili ya gredi (A, B, C, n.k.)</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(true);
            setFormData({ grade_name: '', min_score: 0, max_score: 0, remarks: '' });
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
        >
          <Plus size={20} />
          Gredi Mpya
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settings.map((setting) => (
          <motion.div 
            key={setting.id}
            layout
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl">
                {setting.grade_name}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsEditing(setting.id);
                    setFormData(setting);
                  }}
                  className="text-slate-400 hover:text-indigo-600"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(setting.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Masafa:</span>
                <span className="font-bold text-slate-800">{setting.min_score} - {setting.max_score}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 italic">"{setting.remarks}"</p>
            </div>
          </motion.div>
        ))}
        
      </div>

      <AnimatePresence>
        {(isAdding || isEditing) && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                {isEditing ? 'Hariri Gredi' : 'Ongeza Gredi Mpya'}
              </h2>
              <form onSubmit={isEditing ? (e) => { e.preventDefault(); handleUpdate(isEditing, formData); } : handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jina la Gredi (mf. A)</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={formData.grade_name}
                    onChange={e => setFormData({...formData, grade_name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Score</label>
                    <input 
                      required
                      type="number" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                      value={formData.min_score}
                      onChange={e => setFormData({...formData, min_score: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Score</label>
                    <input 
                      required
                      type="number" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                      value={formData.max_score}
                      onChange={e => setFormData({...formData, max_score: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Maoni (Remarks)</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={formData.remarks}
                    onChange={e => setFormData({...formData, remarks: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setIsAdding(false); setIsEditing(null); }}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Ghairi
                  </button>
                  <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all">
                    Hifadhi
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

const ExamResults = ({ user }: { user: UserProfile }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [examStatus, setExamStatus] = useState<ExamStatus | null>(null);
  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [subject, setSubject] = useState(user.subject || '');
  const [classFilter, setClassFilter] = useState(user.class_id || 'All');

  useEffect(() => {
    const unsubStatus = onSnapshot(doc(db, 'exam_status', 'current'), (snap) => {
      if (snap.exists()) setExamStatus(snap.data() as ExamStatus);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'exam_status/current'));
    
    // Fetch students based on role and filter
    let q;
    if (user.role === 'Teacher') {
      q = query(collection(db, 'students'), where('class_id', '==', user.class_id));
    } else if (classFilter !== 'All') {
      q = query(collection(db, 'students'), where('class_id', '==', classFilter));
    } else {
      q = collection(db, 'students');
    }
      
    const unsubStudents = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));

    const unsubResults = onSnapshot(query(collection(db, 'exam_results'), where('teacher_id', '==', user.uid)), (snap) => {
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'exam_results'));

    return () => {
      unsubStatus();
      unsubStudents();
      unsubResults();
    };
  }, [user.uid, user.class_id, user.role, classFilter]);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examStatus?.isActive) return alert('Uingizaji alama umefungwa kwa sasa.');
    
    try {
      for (const studentId in scores) {
        // Check for existing result to prevent duplicates
        const existing = results.find(r => r.student_id === studentId && r.subject_name === subject);
        if (existing) continue;

        await addDoc(collection(db, 'exam_results'), {
          student_id: studentId,
          subject_name: subject,
          score: scores[studentId],
          teacher_id: user.uid,
          term: examStatus.term,
          year: examStatus.year
        });
      }
      alert('Alama zimehifadhiwa kwa mafanikio!');
      setScores({});
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'exam_results');
    }
  };

  if (!examStatus?.isActive && user.role === 'Teacher') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 max-w-md">
          <ShieldCheck size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-amber-900 mb-2">Uingizaji Alama Umefungwa</h2>
          <p className="text-amber-700">Academic Office bado hajafungua fomu ya uingizaji alama. Tafadhali wasiliana na ofisi kwa maelezo zaidi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ingiza Alama</h1>
          <p className="text-slate-500">
            {user.role === 'Teacher' 
              ? `Darasa: ${user.class_id} | Somo: ${subject}` 
              : 'Usimamizi wa alama za shule nzima.'}
          </p>
        </div>
        {user.role !== 'Teacher' && <AcademicControls />}
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-slate-800">Orodha ya Wanafunzi</h2>
          <div className="flex items-center gap-4">
            {user.role !== 'Teacher' && (
              <select 
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
              >
                <option value="All">Madarasa Yote</option>
                {/* We could fetch unique classes here, but for now let's assume common ones or just let them type */}
                <option value="Form 1">Form 1</option>
                <option value="Form 2">Form 2</option>
                <option value="Form 3">Form 3</option>
                <option value="Form 4">Form 4</option>
              </select>
            )}
            <input 
              type="text" 
              placeholder="Somo..." 
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>
        </div>
        
        <form onSubmit={handleBulkSubmit}>
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Mwanafunzi</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Namba ya Usajili</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase w-32">Alama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => (
                <tr key={student.id}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{student.full_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{student.registration_number}</td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      min="0" max="100"
                      placeholder="0"
                      className="w-20 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold"
                      value={scores[student.id] || ''}
                      onChange={e => setScores({ ...scores, [student.id]: Number(e.target.value) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
              Hifadhi Alama Zote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Messaging = ({ user }: { user: UserProfile }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== user.uid));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const q = query(
      collection(db, 'messages'),
      where('receiver_id', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubMsgs = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));

    return () => {
      unsubUsers();
      unsubMsgs();
    };
  }, [user.uid]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !content) return;
    try {
      await addDoc(collection(db, 'messages'), {
        sender_id: user.uid,
        sender_name: user.name,
        receiver_id: selectedUser,
        content,
        createdAt: serverTimestamp()
      });
      setContent('');
      alert('Ujumbe umetumwa!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Ujumbe wa Ndani</h1>
        <p className="text-slate-500">Wasiliana na wafanyakazi wengine wa shule.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={sendMessage} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="font-bold text-slate-800 mb-2">Tuma Ujumbe</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mpokeaji</label>
              <select 
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
              >
                <option value="">Chagua Mfanyakazi</option>
                {users.map(u => <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ujumbe</label>
              <textarea 
                required
                rows={4}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none resize-none"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Andika ujumbe wako hapa..."
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all">Tuma</button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800">Inbox Yako</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Hakuna ujumbe mpya.</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="p-4 hover:bg-slate-50 transition-all">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-800 text-sm">{msg.sender_name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        {msg.createdAt?.toDate().toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SharedDocuments = ({ user }: { user: UserProfile }) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ file_name: '', category: 'Memo', receiver_role: 'Teacher' });

  useEffect(() => {
    // Fetch all documents and filter on client for now to avoid permission/index issues
    const q = query(collection(db, 'shared_documents'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (user.role === 'HeadOffice') {
        setDocs(allDocs);
      } else {
        setDocs(allDocs.filter(d => d.receiver_role === user.role || d.sender_id === user.uid));
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'shared_documents'));
    return unsub;
  }, [user.uid, user.role]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'shared_documents'), {
        ...formData,
        sender_id: user.uid,
        sender_name: user.name,
        file_path: 'mock_path/' + formData.file_name, // In real app, use Firebase Storage
        createdAt: serverTimestamp()
      });
      setIsUploading(false);
      setFormData({ file_name: '', category: 'Memo', receiver_role: 'Teacher' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shared_documents');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nyaraka na Mafaili</h1>
          <p className="text-slate-500">Shiriki ripoti, mitihani na memo na wafanyakazi wengine.</p>
        </div>
        <button 
          onClick={() => setIsUploading(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
        >
          <Plus size={20} />
          Pakia Faili
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {docs.map((doc) => (
          <div key={doc.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                <FileText size={24} />
              </div>
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                doc.category === 'Exam' ? 'bg-red-100 text-red-600' : 
                doc.category === 'Report' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {doc.category}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 mb-1 truncate">{doc.file_name}</h3>
            <p className="text-xs text-slate-500 mb-4">Kutoka: {doc.sender_name}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <span className="text-[10px] text-slate-400">Kwa: {doc.receiver_role}</span>
              <button className="text-indigo-600 text-xs font-bold hover:underline">Pakua</button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isUploading && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Pakia Faili</h2>
                <button onClick={() => setIsUploading(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jina la Faili</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={formData.file_name}
                    onChange={e => setFormData({...formData, file_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kundi (Category)</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="Exam">Exam</option>
                    <option value="Report">Report</option>
                    <option value="Memo">Memo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mpokeaji (Role)</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={formData.receiver_role}
                    onChange={e => setFormData({...formData, receiver_role: e.target.value})}
                  >
                    <option value="Teacher">Walimu Wote</option>
                    <option value="Academic">Academic Office</option>
                    <option value="HeadOffice">Head Office</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all">Pakia</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfileSetup = ({ user, onComplete }: { user: UserProfile, onComplete: () => void }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    role: user.role || 'Teacher',
    subject: '',
    class_id: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        isApproved: false // Requires HeadOffice approval
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full"
      >
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Kamilisha Profaili Yako</h2>
        <p className="text-slate-500 mb-6">Tafadhali jaza taarifa zako za kikazi ili uweze kutumia mfumo.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Majina Matatu</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role (Jukumu)</label>
            <select 
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
            >
              <option value="Teacher">Mwalimu</option>
              <option value="Academic">Academic Office</option>
              <option value="Discipline">Discipline Office</option>
            </select>
          </div>
          {formData.role === 'Teacher' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Somo Unalofundisha</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Darasa Unalofundisha</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                  value={formData.class_id}
                  onChange={e => setFormData({...formData, class_id: e.target.value})}
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Namba ya Simu</label>
            <input 
              required
              type="tel" 
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all">Hifadhi na Tuma kwa Mkuu</button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const seedGrading = async () => {
      try {
        const snap = await getDocFromServer(doc(db, 'grading_settings', 'A'));
        if (!snap.exists()) {
          const initialGrades = [
            { id: 'A', grade_name: 'A', min_score: 75, max_score: 100, remarks: 'Excellent' },
            { id: 'B', grade_name: 'B', min_score: 65, max_score: 74, remarks: 'Very Good' },
            { id: 'C', grade_name: 'C', min_score: 45, max_score: 64, remarks: 'Good' },
            { id: 'D', grade_name: 'D', min_score: 30, max_score: 44, remarks: 'Satisfactory' },
            { id: 'F', grade_name: 'F', min_score: 0, max_score: 29, remarks: 'Fail' },
          ];
          for (const grade of initialGrades) {
            await setDoc(doc(db, 'grading_settings', grade.id), grade);
          }
        }
      } catch (e) {
        console.log("Grading already seeded or permission denied during seed");
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Seed grading only after auth
        seedGrading();
        
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data() as UserProfile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => signOut(auth);

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;

  // Force profile setup for users who haven't filled it yet (except HeadOffice who is pre-configured)
  if (user.role !== 'HeadOffice' && (!user.role || !user.phone)) {
    return <ProfileSetup user={user} onComplete={() => window.location.reload()} />;
  }

  // Block unapproved staff (except HeadOffice)
  if (user.role !== 'HeadOffice' && !user.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <ShieldCheck size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Subiri Idhini</h2>
          <p className="text-slate-500 mb-6">Taarifa zako zimetumwa kwa Mkuu wa Shule. Tafadhali subiri uidhinishwe ili uweze kutumia mfumo.</p>
          <button onClick={handleLogout} className="text-indigo-600 font-semibold hover:underline">Ondoka</button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar user={user} onLogout={handleLogout} />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              
              {/* HeadOffice Routes */}
              {user.role === 'HeadOffice' && (
                <Route path="/staff" element={<StaffManagement />} />
              )}

              {/* Academic & HeadOffice Routes */}
              {(user.role === 'Academic' || user.role === 'HeadOffice') && (
                <>
                  <Route path="/students" element={<StudentManagement />} />
                  <Route path="/grading" element={<GradingSettings />} />
                  <Route path="/broadsheet" element={<Broadsheet />} />
                </>
              )}
              
              {/* Teacher, Academic & HeadOffice Routes */}
              {(['Teacher', 'Academic', 'HeadOffice'].includes(user.role)) && (
                <>
                  <Route path="/results" element={<ExamResults user={user} />} />
                  <Route path="/messages" element={<Messaging user={user} />} />
                  <Route path="/documents" element={<SharedDocuments user={user} />} />
                </>
              )}
              
              {/* Discipline Routes */}
              {user.role === 'Discipline' && (
                <Route path="/discipline" element={<DisciplineOffice />} />
              )}

              {/* Default Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}
