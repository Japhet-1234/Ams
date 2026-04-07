import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
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
  storage,
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
  getDocs,
  or
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  FileSpreadsheet, 
  MessageSquare, 
  LogOut, 
  LogIn,
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
  FileText,
  Camera,
  User,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Moon,
  Sun,
  Building2,
  UserCog,
  ArrowLeft,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Memoized Components for Performance ---
const StudentRow = memo(({ student, onEdit, onDelete }: { 
  student: Student, 
  onEdit: (s: Student) => void,
  onDelete: (id: string) => void
}) => (
  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
    <td className="px-6 py-4">
      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden">
        {student.photo_url ? (
          <img 
            src={student.photo_url} 
            alt="" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
            loading="lazy"
          />
        ) : (
          <User size={20} className="text-indigo-600 dark:text-indigo-400" />
        )}
      </div>
    </td>
    <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">{student.full_name}</td>
    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{student.registration_number}</td>
    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{student.class_id}</td>
    <td className="px-6 py-4 text-right space-x-2">
      <button 
        onClick={() => onEdit(student)}
        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
      >
        <Edit2 size={16} />
      </button>
      <button 
        onClick={() => onDelete(student.id)}
        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
      >
        <Trash2 size={16} />
      </button>
    </td>
  </tr>
));

const StaffRow = memo(({ member, onEdit, onToggleApproval, onDelete }: { 
  member: UserProfile, 
  onEdit: (s: UserProfile) => void,
  onToggleApproval: (id: string, current: boolean) => void,
  onDelete: (id: string) => void
}) => (
  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
    <td className="px-6 py-4 text-sm font-bold text-indigo-600 dark:text-indigo-400">{member.staffCode}</td>
    <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">{member.name}</td>
    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{member.role}</td>
    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
      {member.role === 'Teacher' ? `${member.subject} (${member.class_id})` : '-'}
    </td>
    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{member.phone}</td>
    <td className="px-6 py-4 text-sm text-slate-400 dark:text-slate-500 italic">
      {member.lastLogin ? new Date(member.lastLogin.seconds * 1000).toLocaleString('sw-TZ', { 
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
      }) : 'Bado'}
    </td>
    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
      <button 
        onClick={() => onEdit(member)}
        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
      >
        <Edit2 size={18} />
      </button>
      <button 
        onClick={() => onDelete(member.uid)}
        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
      >
        <Trash2 size={18} />
      </button>
      <button 
        onClick={() => onToggleApproval(member.uid, !!member.isApproved)}
        className={`px-3 py-1 rounded-full text-xs font-bold ${member.isApproved ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}
      >
        {member.isApproved ? 'Ameidhinishwa' : 'Subiri Idhini'}
      </button>
    </td>
  </tr>
));

const AttendanceRow = memo(({ student, status, onStatusChange }: { 
  student: Student, 
  status: string, 
  onStatusChange: (id: string, s: string) => void 
}) => (
  <motion.div 
    layout
    className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4"
  >
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden">
        {student.photo_url ? (
          <img src={student.photo_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
        ) : (
          <User size={24} />
        )}
      </div>
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm md:text-base">{student.full_name}</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500">{student.registration_number}</p>
      </div>
    </div>

    <div className="flex items-center gap-1 md:gap-2">
      <button 
        onClick={() => onStatusChange(student.id, 'Present')}
        className={`p-2 md:px-4 md:py-2 rounded-xl flex items-center gap-1 transition-all ${
          status === 'Present' 
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 dark:shadow-none' 
            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <CheckCircle2 size={18} />
        <span className="hidden md:inline text-xs font-bold">Yupo</span>
      </button>
      <button 
        onClick={() => onStatusChange(student.id, 'Late')}
        className={`p-2 md:px-4 md:py-2 rounded-xl flex items-center gap-1 transition-all ${
          status === 'Late' 
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-100 dark:shadow-none' 
            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <Clock size={18} />
        <span className="hidden md:inline text-xs font-bold">Kachelewa</span>
      </button>
      <button 
        onClick={() => onStatusChange(student.id, 'Absent')}
        className={`p-2 md:px-4 md:py-2 rounded-xl flex items-center gap-1 transition-all ${
          status === 'Absent' 
            ? 'bg-red-500 text-white shadow-lg shadow-red-100 dark:shadow-none' 
            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <XCircle size={18} />
        <span className="hidden md:inline text-xs font-bold">Hayupo</span>
      </button>
    </div>
  </motion.div>
));

const DisciplineRow = memo(({ student, onReport }: { student: Student, onReport: (s: Student) => void }) => (
  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
    <td className="px-6 py-4">
      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{student.full_name}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">{student.registration_number}</p>
    </td>
    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{student.class_id}</td>
    <td className="px-6 py-4">
      <p className="text-sm text-slate-600 dark:text-slate-400 italic truncate max-w-xs">
        {student.discipline_remarks || 'Hakuna maelezo bado.'}
      </p>
    </td>
    <td className="px-6 py-4 text-right">
      <button 
        onClick={() => onReport(student)}
        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
      >
        <FileText size={18} />
      </button>
    </td>
  </tr>
));

const BroadsheetRow = memo(({ student, rank }: { student: any, rank: number }) => (
  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
    <td className="px-6 py-4 text-sm font-bold text-indigo-600 dark:text-indigo-400">{rank}</td>
    <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">{student.full_name}</td>
    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{student.class_id}</td>
    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{student.total}</td>
    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200">{student.average.toFixed(1)}%</td>
    <td className="px-6 py-4">
      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-bold">{student.grade}</span>
    </td>
    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 italic max-w-xs truncate">
      {student.discipline_remarks || '-'}
    </td>
  </tr>
));
type UserRole = 'HeadOffice' | 'Academic' | 'Discipline' | 'Teacher';

interface UserProfile {
  uid: string;
  name: string;
  role: UserRole;
  staffCode: string;
  password?: string;
  photoURL?: string;
  subject?: string;
  class_id?: string;
  phone?: string;
  isApproved?: boolean;
  lastLogin?: any;
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
  photo_url?: string;
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

const PageLoading = () => (
  <div className="flex items-center justify-center py-20 w-full">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-slate-400 font-medium">Inapakia taarifa...</p>
    </motion.div>
  </div>
);

const Login = () => {
  const [step, setStep] = useState<'type' | 'office' | 'credentials'>('type');
  const [loginType, setLoginType] = useState<'Staff' | 'Officer'>('Staff');
  const [selectedOffice, setSelectedOffice] = useState<UserRole | null>(null);
  
  const [name, setName] = useState(() => localStorage.getItem('ams_remembered_name') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('ams_remembered_name'));
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const trimmedName = loginType === 'Officer' ? (selectedOffice === 'HeadOffice' ? 'Head Master' : selectedOffice === 'Academic' ? 'Academic Officer' : 'Discipline Officer') : name.trim();
    
    if (loginType === 'Staff' && trimmedName.length < 3) {
      setError('Tafadhali weka jina lako kamili (angalau herufi 3).');
      setIsLoading(false);
      return;
    }

    if (rememberMe) {
      localStorage.setItem('ams_remembered_name', trimmedName);
    } else {
      localStorage.removeItem('ams_remembered_name');
    }

    const officerPasswords: Record<string, string> = {
      'HeadOffice': 'head123',
      'Academic': 'acad456',
      'Discipline': 'disc789'
    };

    try {
      if (loginType === 'Officer') {
        const correctPassword = officerPasswords[selectedOffice as string];
        if (password !== correctPassword) {
          setError('Nywila ya ofisi si sahihi.');
          setIsLoading(false);
          return;
        }

        const q = query(collection(db, 'users'), where('role', '==', selectedOffice));
        const result = await getDocs(q);

        if (result.empty) {
          const uid = `officer_${selectedOffice}_${Date.now()}`;
          const officerData = {
            uid,
            name: selectedOffice === 'HeadOffice' ? 'Head Master' : selectedOffice === 'Academic' ? 'Academic Officer' : 'Discipline Officer',
            password: correctPassword,
            role: selectedOffice,
            staffCode: selectedOffice === 'HeadOffice' ? 'ADM' : selectedOffice === 'Academic' ? 'ACD' : 'DCP',
            isApproved: true,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          };
          await setDoc(doc(db, 'users', uid), officerData);
          localStorage.setItem('ams_user_uid', uid);
          window.location.href = '/';
          return;
        } else {
          const userData = result.docs[0].data() as UserProfile;
          await updateDoc(doc(db, 'users', userData.uid), {
            lastLogin: serverTimestamp()
          });
          localStorage.setItem('ams_user_uid', userData.uid);
          window.location.href = '/';
          return;
        }
      } else {
        // Staff login logic - Only Name
        let q = query(collection(db, 'users'), where('name', '==', trimmedName));
        let result = await getDocs(q);
        
        if (result.empty) {
          q = query(collection(db, 'users'), where('staffCode', '==', trimmedName.toUpperCase()));
          result = await getDocs(q);
        }
        
        if (result.empty) {
          setError('Jina lako halijapatikana. Tafadhali wasiliana na Mtaaluma (Academic Office) ili usajiliwe.');
        } else {
          const userData = result.docs[0].data() as UserProfile;
          await updateDoc(doc(db, 'users', userData.uid), {
            lastLogin: serverTimestamp()
          });

          localStorage.setItem('ams_user_uid', userData.uid);
          window.location.href = '/';
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError('Kuna tatizo la kiufundi. Tafadhali jaribu tena.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'type':
        return (
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => { setLoginType('Staff'); setStep('credentials'); }}
              className="p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-3 group"
            >
              <div className="p-4 bg-indigo-100 rounded-full text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Users size={32} />
              </div>
              <span className="font-bold text-slate-700">Walimu (Staff)</span>
            </button>
            <button 
              onClick={() => { setLoginType('Officer'); setStep('office'); }}
              className="p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-3 group"
            >
              <div className="p-4 bg-purple-100 rounded-full text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Building2 size={32} />
              </div>
              <span className="font-bold text-slate-700">Ofisi (Officers)</span>
            </button>
          </div>
        );
      case 'office':
        return (
          <div className="space-y-4">
            <button onClick={() => setStep('type')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-4 transition-all">
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Rudi Nyuma</span>
            </button>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'HeadOffice', label: 'Mkuu wa Shule (Head Office)', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
                { id: 'Academic', label: 'Taaluma (Academic Office)', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                { id: 'Discipline', label: 'Nidhamu (Discipline Office)', icon: ShieldCheck, color: 'text-red-600', bg: 'bg-red-50' }
              ].map((office) => (
                <button 
                  key={office.id}
                  onClick={() => { setSelectedOffice(office.id as UserRole); setStep('credentials'); }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
                >
                  <div className={`p-3 ${office.bg} ${office.color} rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all`}>
                    <office.icon size={24} />
                  </div>
                  <span className="font-bold text-slate-700">{office.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 'credentials':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button onClick={() => setStep(loginType === 'Officer' ? 'office' : 'type')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-4 transition-all">
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Rudi Nyuma</span>
            </button>

            {loginType === 'Staff' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Majina Matatu (Full Name)</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="mf. Japhet Sunday"
                />
              </div>
            ) : (
              <>
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 mb-4">
                  <p className="text-sm text-indigo-600 font-medium">Unaingia kama:</p>
                  <p className="text-lg font-bold text-indigo-900">
                    {selectedOffice === 'HeadOffice' ? 'Head Master' : selectedOffice === 'Academic' ? 'Academic Officer' : 'Discipline Officer'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nywila (Password)</label>
                  <input 
                    required
                    type="password" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="******"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="rememberMe" className="text-sm text-slate-600 cursor-pointer font-medium">Nikumbuke (Remember Me)</label>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {isLoading ? 'Inapakia...' : 'Ingia (Login)'}
            </button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="mb-6 inline-flex p-4 bg-indigo-100 rounded-full text-indigo-600">
            <GraduationCap size={48} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Academic Management</h1>
          <p className="text-slate-500">
            Chagua aina ya akaunti yako.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {renderStep()}
      </motion.div>
    </div>
  );
};

const Sidebar = ({ user, onLogout, isOpen, onClose }: { user: UserProfile, onLogout: () => void, isOpen: boolean, onClose: () => void }) => {
  const location = useLocation();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['HeadOffice', 'Academic', 'Discipline', 'Teacher'] },
    { icon: ShieldCheck, label: 'Walimu', path: '/staff', roles: ['HeadOffice'] },
    { icon: ShieldCheck, label: 'Nidhamu', path: '/discipline', roles: ['Discipline'] },
    { icon: Users, label: 'Wanafunzi', path: '/students', roles: ['HeadOffice', 'Academic'] },
    { icon: Settings, label: 'Gredi', path: '/grading', roles: ['HeadOffice', 'Academic'] },
    { icon: FileSpreadsheet, label: 'Alama', path: '/results', roles: ['HeadOffice', 'Academic', 'Teacher'] },
    { icon: CalendarCheck, label: 'Mahudhurio', path: '/attendance', roles: ['HeadOffice', 'Academic', 'Teacher'] },
    { icon: FileText, label: 'Broadsheet', path: '/broadsheet', roles: ['HeadOffice', 'Academic'] },
    { icon: MessageSquare, label: 'Ujumbe', path: '/messages', roles: ['HeadOffice', 'Academic', 'Discipline', 'Teacher'] },
    { icon: FileText, label: 'Nyaraka', path: '/documents', roles: ['HeadOffice', 'Academic', 'Discipline', 'Teacher'] },
    { icon: Users, label: 'Profile', path: '/profile', roles: ['HeadOffice', 'Academic', 'Discipline', 'Teacher'] },
    { icon: Settings, label: 'Mipangilio', path: '/settings', roles: ['HeadOffice'] },
  ];

  const [schoolName, setSchoolName] = useState('AMS System');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'school_info'), (snap) => {
      if (snap.exists()) {
        setSchoolName(snap.data().schoolName);
      }
    });
    return unsub;
  }, []);

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:inset-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <GraduationCap size={24} />
            </div>
            <span className="font-bold text-slate-800 dark:text-white text-lg truncate">{schoolName}</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              onClick={() => { if (window.innerWidth < 1024) onClose(); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{user.staffCode}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-semibold"
          >
            <LogOut size={20} />
            Ondoka
          </button>
        </div>
      </div>
    </>
  );
};

const SystemSettings = () => {
  const [schoolName, setSchoolName] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'settings', 'school_info'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSchoolName(data.schoolName || '');
        setIsDarkMode(data.isDarkMode || false);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings');
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <PageLoading />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'school_info'), { 
        schoolName,
        isDarkMode
      });
      alert('Mipangilio imehifadhiwa!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Mipangilio ya Mfumo</h2>
      <form onSubmit={handleSave} className="space-y-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Jina la Shule</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="mf. Shule ya Sekondari ya Mlimani"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-600 text-white' : 'bg-amber-100 text-amber-600'}`}>
                {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Dark Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Badili mwonekano wa mfumo</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-14 h-7 rounded-full transition-all relative ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isDarkMode ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          {isSaving ? 'Inahifadhi...' : 'Hifadhi Mabadiliko'}
        </button>
      </form>
    </div>
  );
};

// --- Pages ---

const Dashboard = ({ user }: { user: UserProfile }) => {
  const [stats, setStats] = useState({ students: 0, staff: 0, results: 0, unapproved: 0, disciplineCount: 0 });
  const [allStaff, setAllStaff] = useState<UserProfile[]>([]);
  const [schoolName, setSchoolName] = useState('AMS System');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubSettings = onSnapshot(doc(db, 'settings', 'school_info'), (snap) => {
      if (snap.exists()) {
        setSchoolName(snap.data().schoolName);
      }
    });

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      const studentData = snap.docs.map(doc => doc.data() as Student);
      setStats(prev => ({ 
        ...prev, 
        students: snap.size,
        disciplineCount: studentData.filter(s => s.discipline_remarks).length
      }));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'students');
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const userData = snap.docs.map(doc => doc.data() as UserProfile);
      setAllStaff(userData);
      const currentUid = localStorage.getItem('ams_user_uid');
      setStats(prev => ({ 
        ...prev, 
        staff: snap.size - 1,
        unapproved: userData.filter(u => !u.isApproved && u.uid !== currentUid).length
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubResults = onSnapshot(collection(db, 'exam_results'), (snap) => {
      setStats(prev => ({ ...prev, results: snap.size }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'exam_results'));

    return () => {
      unsubSettings();
      unsubStudents();
      unsubUsers();
      unsubResults();
    };
  }, [user]);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.name} className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 shadow-sm" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold border-2 border-white shadow-sm">
            {user.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{schoolName}</h1>
          <p className="text-slate-500">Karibu, <span className="font-bold text-indigo-600">{user.name}</span> ({user.role})</p>
          {user.lastLogin && (
            <p className="text-[10px] text-slate-400 mt-1 italic">Login ya mwisho: {new Date(user.lastLogin.seconds * 1000).toLocaleString('sw-TZ')}</p>
          )}
        </div>
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
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
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

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Taarifa za Staff</h2>
              <p className="text-sm text-slate-500 mb-4">Hapa unaweza kuona taarifa zako zilizohifadhiwa kwenye mfumo.</p>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Staff Code:</span>
                  <span className="font-bold text-indigo-600">{user.staffCode}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Jina Kamili:</span>
                  <span className="font-semibold text-slate-800">{user.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Namba ya Simu:</span>
                  <span className="font-semibold text-slate-800">{user.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Hali ya Idhini:</span>
                  <span className={`font-bold ${user.isApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {user.isApproved ? 'Ameidhinishwa' : 'Inasubiri Idhini'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Orodha ya Wafanyakazi (Staff List)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Kodi</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Jina</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Idara</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Somo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allStaff.filter(s => s.uid !== user.uid).map((s) => (
                      <tr key={s.uid} className="hover:bg-slate-50 transition-all">
                        <td className="px-4 py-3 text-sm font-bold text-indigo-600">{s.staffCode}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{s.role}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{s.subject || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Persistence: Load last used role/class for staff registration
  const [formData, setFormData] = useState(() => {
    const savedRole = localStorage.getItem('ams_last_staff_role') as UserRole;
    const savedClass = localStorage.getItem('ams_last_staff_class');
    return { 
      name: '', 
      role: savedRole || 'Teacher' as UserRole, 
      subject: '', 
      class_id: savedClass || '', 
      phone: ''
    };
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('ams_last_staff_role', formData.role);
    if (formData.class_id) localStorage.setItem('ams_last_staff_class', formData.class_id);
  }, [formData.role, formData.class_id]);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const currentUid = localStorage.getItem('ams_user_uid');
      setStaff(snap.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== currentUid));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
      setLoading(false);
    });
    return unsub;
  }, []);

  const toggleApproval = useCallback(async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isApproved: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  }, []);

  const handleDelete = useCallback(async (uid: string) => {
    if (confirm('Je, una uhakika unataka kufuta mfanyakazi huyu?')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'users');
      }
    }
  }, []);

  const handleEdit = useCallback((member: UserProfile) => {
    setIsEditing(member.uid);
    setFormData({
      name: member.name,
      role: member.role,
      subject: member.subject || '',
      class_id: member.class_id || '',
      phone: member.phone || ''
    });
    setIsAdding(true);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isEditing) {
        await updateDoc(doc(db, 'users', isEditing), {
          name: formData.name,
          role: formData.role,
          subject: formData.subject,
          class_id: formData.class_id,
          phone: formData.phone
        });
      } else {
        let staffCode = '';
        if (formData.role === 'Academic') staffCode = 'ACD';
        else if (formData.role === 'HeadOffice') staffCode = 'ADM';
        else if (formData.role === 'Discipline') staffCode = 'DCP';
        else {
          const teachers = staff.filter(s => s.role === 'Teacher');
          staffCode = `STF${(teachers.length + 1).toString().padStart(3, '0')}`;
        }

        const uid = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, 'users', uid), {
          uid,
          ...formData,
          password: '', // No password for staff
          staffCode,
          isApproved: true,
          createdAt: serverTimestamp()
        });
      }
      setIsAdding(false);
      setIsEditing(null);
      // Keep role and class_id to reduce repetition
      setFormData(prev => ({ ...prev, name: '', subject: '', phone: '' }));
      alert('Mfanyakazi amehifadhiwa kwa mafanikio!');
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'users');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usimamizi wa Wafanyakazi</h1>
          <p className="text-slate-500">Angalia na uidhinishe walimu na idara nyingine.</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(true);
            setFormData({ name: '', role: 'Teacher', subject: '', class_id: '', phone: '', password: '' });
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
        >
          <Plus size={20} />
          Mfanyakazi Mpya
        </button>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Kodi</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Jina</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Somo/Darasa</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Mawasiliano</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Login ya Mwisho</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Vitendo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {staff.map((s) => (
              <StaffRow 
                key={s.uid} 
                member={s} 
                onEdit={handleEdit}
                onToggleApproval={toggleApproval}
                onDelete={handleDelete}
              />
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
                  {isEditing ? 'Hariri Mfanyakazi' : 'Ongeza Mfanyakazi'}
                </h2>
                <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jina Kamili</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nafasi (Role)</label>
                  <select 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Academic">Academic</option>
                    <option value="Discipline">Discipline</option>
                    <option value="HeadOffice">Head Office</option>
                  </select>
                </div>
                {formData.role === 'Teacher' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Somo</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.subject}
                        onChange={e => setFormData({...formData, subject: e.target.value})}
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
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Namba ya Simu</label>
                  <input 
                    required
                    type="tel" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Inahifadhi...' : 'Hifadhi'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
        updatedBy: localStorage.getItem('ams_user_uid')
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Persistence: Load last used class filter
  const [classFilter, setClassFilter] = useState(() => {
    return localStorage.getItem('ams_last_discipline_class') || 'All';
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('ams_last_discipline_class', classFilter);
  }, [classFilter]);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'students');
      setLoading(false);
    });
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

  if (loading) return <PageLoading />;

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                           s.registration_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesClass = classFilter === 'All' || s.class_id === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [students, debouncedSearchTerm, classFilter]);

  const classes = useMemo(() => ['All', ...new Set(students.map(s => s.class_id))], [students]);

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

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Mwanafunzi</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Darasa</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Hali ya Nidhamu</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400 text-right">Vitendo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.map((student) => (
              <DisciplineRow 
                key={student.id} 
                student={student} 
                onReport={(s) => {
                  setIsEditing(s.id);
                  setRemarks(s.discipline_remarks || '');
                }} 
              />
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'students');
      setLoading(false);
    });

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

  if (loading) return <PageLoading />;

  const getGrade = (score: number) => {
    const grade = grading.find(g => score >= g.min_score && score <= g.max_score);
    return grade ? grade.grade_name : '-';
  };

  const processedData = useMemo(() => {
    return students.map(student => {
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
  }, [students, results, grading]);

  const exportCSV = useCallback(() => {
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
    document.body.removeChild(link);
  }, [processedData]);

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

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Nafasi</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Jina</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Darasa</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Jumla</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Wastani</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Gredi</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Nidhamu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {processedData.map((s, i) => (
              <BroadsheetRow key={s.id} student={s} rank={i + 1} />
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
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(() => {
    const savedClass = localStorage.getItem('ams_last_reg_class');
    return { full_name: '', registration_number: '', class_id: savedClass || '', photo_url: '' };
  });

  // Save class_id to localStorage when it changes
  useEffect(() => {
    if (formData.class_id) {
      localStorage.setItem('ams_last_reg_class', formData.class_id);
    }
  }, [formData.class_id]);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'students');
      setLoading(false);
    });
    return unsub;
  }, []);

  const handlePhotoUpload = useCallback(async (file: File, studentId: string) => {
    const storageRef = ref(storage, `students/${studentId}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const docRef = await addDoc(collection(db, 'students'), {
        full_name: formData.full_name,
        registration_number: formData.registration_number,
        class_id: formData.class_id,
        photo_url: ''
      });

      if (photoFile) {
        const url = await handlePhotoUpload(photoFile, docRef.id);
        await updateDoc(docRef, { photo_url: url });
      }

      // Keep class_id to avoid repetitive selection
      setFormData(prev => ({ ...prev, full_name: '', registration_number: '', photo_url: '' }));
      setPhotoFile(null);
      setIsAdding(false);
      alert('Mwanafunzi ameongezwa kwa mafanikio!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'students');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    setIsUploading(true);
    try {
      let url = formData.photo_url;
      if (photoFile) {
        url = await handlePhotoUpload(photoFile, isEditing);
      }

      await updateDoc(doc(db, 'students', isEditing), {
        ...formData,
        photo_url: url
      });
      setIsEditing(null);
      setFormData({ full_name: '', registration_number: '', class_id: '', photo_url: '' });
      setPhotoFile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'students');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                           s.registration_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesClass = classFilter === 'All' || s.class_id === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [students, debouncedSearchTerm, classFilter]);

  const classes = useMemo(() => ['All', ...new Set(students.map(s => s.class_id))], [students]);

  if (loading) return <PageLoading />;

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('Je, una uhakika unataka kufuta mwanafunzi huyu?')) {
      try {
        await deleteDoc(doc(db, 'students', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'students');
      }
    }
  }, []);

  const handleEdit = useCallback((student: Student) => {
    setIsEditing(student.id);
    setFormData({
      full_name: student.full_name,
      registration_number: student.registration_number,
      class_id: student.class_id,
      photo_url: student.photo_url || ''
    });
    setIsAdding(false);
  }, []);

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
            setFormData({ full_name: '', registration_number: '', class_id: '', photo_url: '' });
            setPhotoFile(null);
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Picha</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Jina Kamili</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Namba ya Usajili</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Darasa</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400 text-right">Vitendo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.map((student) => (
              <StudentRow 
                key={student.id} 
                student={student} 
                onEdit={(s) => {
                  setIsEditing(s.id);
                  setFormData({
                    full_name: s.full_name,
                    registration_number: s.registration_number,
                    class_id: s.class_id,
                    photo_url: s.photo_url || ''
                  });
                  setPhotoFile(null);
                }}
                onDelete={handleDelete}
              />
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
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200">
                      {photoFile ? (
                        <img src={URL.createObjectURL(photoFile)} alt="Preview" className="w-full h-full object-cover" />
                      ) : formData.photo_url ? (
                        <img src={formData.photo_url} alt="Current" className="w-full h-full object-cover" />
                      ) : (
                        <User size={40} className="text-slate-400" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700 transition-all shadow-lg">
                      <Camera size={16} />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

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
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setIsEditing(null);
                      setPhotoFile(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                  >
                    Ghairi
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isUploading ? 'Inapakia...' : isEditing ? 'Sasisha' : 'Hifadhi'}
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

const GradingSettings = () => {
  const [settings, setSettings] = useState<GradingSetting[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<GradingSetting>>({
    grade_name: '',
    min_score: 0,
    max_score: 0,
    remarks: ''
  });

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'grading_settings'), (snap) => {
      setSettings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GradingSetting)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'grading_settings');
      setLoading(false);
    });
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

  if (loading) return <PageLoading />;

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
  const [loading, setLoading] = useState(true);
  
  // Persistence: Load last used subject and class from localStorage or user profile
  const [subject, setSubject] = useState(() => {
    const saved = localStorage.getItem(`ams_last_subject_${user.uid}`);
    return saved || user.subject || '';
  });
  
  const [classFilter, setClassFilter] = useState(() => {
    const saved = localStorage.getItem(`ams_last_class_${user.uid}`);
    return saved || user.class_id || 'All';
  });

  // Save to localStorage when changed
  useEffect(() => {
    if (subject) localStorage.setItem(`ams_last_subject_${user.uid}`, subject);
  }, [subject, user.uid]);

  useEffect(() => {
    if (classFilter) localStorage.setItem(`ams_last_class_${user.uid}`, classFilter);
  }, [classFilter, user.uid]);

  useEffect(() => {
    setLoading(true);
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
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'students');
      setLoading(false);
    });

    const unsubResults = onSnapshot(query(collection(db, 'exam_results'), where('teacher_id', '==', user.uid)), (snap) => {
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'exam_results'));

    return () => {
      unsubStatus();
      unsubStudents();
      unsubResults();
    };
  }, [user.uid, user.class_id, user.role, classFilter]);

  if (loading) return <PageLoading />;

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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Mwanafunzi</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Namba ya Usajili</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase w-32">Alama</th>
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
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            Hifadhi Alama Zote
          </button>
        </div>
      </form>
    </div>
    </div>
  );
};

const Attendance = ({ user }: { user: UserProfile }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<{ [key: string]: string }>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [examStatus, setExamStatus] = useState<ExamStatus | null>(null);
  
  // Persistence: Load last used class filter
  const [classFilter, setClassFilter] = useState(() => {
    const saved = localStorage.getItem(`ams_last_attendance_class_${user.uid}`);
    return saved || user.class_id || 'All';
  });

  // Fetch exam status for term/year
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'exam_status', 'current'), (snap) => {
      if (snap.exists()) setExamStatus(snap.data() as ExamStatus);
    });
    return unsub;
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (classFilter) localStorage.setItem(`ams_last_attendance_class_${user.uid}`, classFilter);
  }, [classFilter, user.uid]);

  useEffect(() => {
    setLoading(true);
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
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'students');
      setLoading(false);
    });

    // Fetch existing attendance for this date and class
    let qAttendance;
    const currentClass = user.role === 'Teacher' ? user.class_id : classFilter;
    
    if (currentClass && currentClass !== 'All') {
      qAttendance = query(
        collection(db, 'attendance'), 
        where('date', '==', date),
        where('class_id', '==', currentClass)
      );
    } else {
      qAttendance = query(
        collection(db, 'attendance'), 
        where('date', '==', date)
      );
    }

    const unsubAttendance = onSnapshot(qAttendance, (snap) => {
      const existing: { [key: string]: string } = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        existing[data.student_id] = data.status;
      });
      setAttendance(existing);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, [user.uid, user.class_id, user.role, classFilter, date]);

  const onStatusChange = useCallback(async (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
    
    try {
      const student = students.find(s => s.id === studentId);
      const studentClass = student?.class_id || (user.role === 'Teacher' ? user.class_id : classFilter);

      // Find existing record for this student/date
      const q = query(
        collection(db, 'attendance'), 
        where('student_id', '==', studentId),
        where('date', '==', date)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        await addDoc(collection(db, 'attendance'), {
          student_id: studentId,
          date,
          status,
          class_id: studentClass,
          teacher_id: user.uid,
          term: examStatus?.term || 'Term 1',
          year: examStatus?.year || new Date().getFullYear().toString(),
          createdAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'attendance', snap.docs[0].id), {
          status,
          term: examStatus?.term || 'Term 1',
          year: examStatus?.year || new Date().getFullYear().toString(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  }, [students, user.uid, user.class_id, user.role, classFilter, date, examStatus]);

  const markAll = async (status: string) => {
    setIsSaving(true);
    try {
      const promises = students.map(s => onStatusChange(s.id, status));
      await Promise.all(promises);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  const classes = ['All', ...new Set(students.map(s => s.class_id))];

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mahudhurio ya Darasani</h1>
          <p className="text-slate-500">Chukua mahudhurio ya kila siku ya wanafunzi.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <Calendar size={20} className="text-indigo-600 ml-2" />
          <input 
            type="date" 
            className="outline-none bg-transparent text-slate-700 font-medium"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {user.role !== 'Teacher' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500">Darasa:</span>
            <select 
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none bg-slate-50"
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
            >
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500 mr-2">Weka Wote:</span>
          <button 
            onClick={() => markAll('Present')}
            disabled={isSaving}
            className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs hover:bg-emerald-100 transition-all"
          >
            Wote Wapo
          </button>
          <button 
            onClick={() => markAll('Absent')}
            disabled={isSaving}
            className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-all"
          >
            Wote Hawapo
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {students.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center border border-slate-100 dark:border-slate-800">
            <Users size={48} className="text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Hakuna wanafunzi waliopatikana kwa darasa hili.</p>
          </div>
        ) : (
          students.map(student => (
            <AttendanceRow 
              key={student.id} 
              student={student} 
              status={attendance[student.id]} 
              onStatusChange={onStatusChange} 
            />
          ))
        )}
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
    subject: user.subject || '',
    class_id: user.class_id || '',
    phone: user.phone || '',
    photoURL: user.photoURL || ''
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, photoURL: url }));
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        isApproved: ['HeadOffice', 'Academic', 'Discipline'].includes(formData.role) ? true : user.isApproved
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
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              {formData.photoURL ? (
                <img src={formData.photoURL} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-indigo-50 shadow-lg" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border-4 border-white shadow-lg">
                  <Camera size={32} />
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer shadow-md hover:bg-indigo-700 transition-all">
                <Plus size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-2">{isUploading ? 'Inapakia...' : 'Pakia picha ya profaili'}</p>
          </div>

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
            <label className="block text-sm font-medium text-slate-700 mb-1">Nafasi yako (Position)</label>
            <select 
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none bg-white"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
            >
              <option value="Teacher">Mwalimu (Staff)</option>
              <option value="Academic">Academic Officer</option>
              <option value="Discipline">Discipline Officer</option>
              <option value="HeadOffice">Head Master/Mistress</option>
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

const RoleRedirect = ({ user }: { user: UserProfile }) => {
  switch (user.role) {
    case 'HeadOffice':
      return <Navigate to="/staff" replace />;
    case 'Academic':
      return <Navigate to="/students" replace />;
    case 'Discipline':
      return <Navigate to="/discipline" replace />;
    case 'Teacher':
      return <Navigate to="/results" replace />;
    default:
      return <Dashboard user={user} />;
  }
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'school_info'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsDarkMode(data.isDarkMode || false);
        if (data.isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'grading_settings', 'A'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

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
        console.log("Grading already seeded");
      }
    };

    const localUid = localStorage.getItem('ams_user_uid');
    if (localUid && localUid !== 'undefined' && localUid !== 'null') {
      console.log("Loading user with UID:", localUid);
      seedGrading();
      
      // Safety timeout for loading
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 8000);

      const unsub = onSnapshot(doc(db, 'users', localUid), async (snap) => {
        if (snap.exists()) {
          const userData = snap.data() as UserProfile;
          console.log("User found:", userData.name);
          
          // Auto-approve unique roles if they somehow got unapproved
          if (['Academic', 'Discipline'].includes(userData.role) && !userData.isApproved) {
            console.log("Auto-approving unique role:", userData.role);
            await updateDoc(doc(db, 'users', localUid), { isApproved: true });
          }
          
          setUser(userData);
          setLoading(false);
          clearTimeout(timeoutId);
        } else {
          console.warn("User document not found for UID:", localUid);
          // Don't clear immediately, maybe it's a sync delay
          // But if it's been a while, we should clear
          setUser(null);
          // Only clear if we are reasonably sure it's gone
          // localStorage.removeItem('ams_user_uid');
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }, (err) => {
        console.error("User fetch error:", err);
        setLoading(false);
        clearTimeout(timeoutId);
      });
      return () => {
        unsub();
        clearTimeout(timeoutId);
      };
    } else {
      console.log("No local user found");
      setUser(null);
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ams_user_uid');
    window.location.href = '/';
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;

  // Force profile setup for users who have logged in but haven't filled it yet
  if (user.role !== 'HeadOffice' && (!user.role || !user.phone)) {
    return <ProfileSetup user={user} onComplete={() => window.location.href = '/'} />;
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
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Sidebar 
          user={user} 
          onLogout={handleLogout} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <GraduationCap size={20} />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">AMS</span>
            </div>
            <div className="w-10" /> {/* Spacer */}
          </header>

          <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
            <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<RoleRedirect user={user} />} />
              <Route path="/dashboard" element={<Dashboard user={user} />} />
              
              {/* HeadOffice Routes */}
              <Route path="/staff" element={user.role === 'HeadOffice' ? <StaffManagement /> : <Navigate to="/" />} />
              <Route path="/settings" element={user.role === 'HeadOffice' ? <SystemSettings /> : <Navigate to="/" />} />

              {/* Academic & HeadOffice Routes */}
              <Route path="/students" element={(user.role === 'Academic' || user.role === 'HeadOffice') ? <StudentManagement /> : <Navigate to="/" />} />
              <Route path="/grading" element={(user.role === 'Academic' || user.role === 'HeadOffice') ? <GradingSettings /> : <Navigate to="/" />} />
              <Route path="/broadsheet" element={(user.role === 'Academic' || user.role === 'HeadOffice') ? <Broadsheet /> : <Navigate to="/" />} />
              
              {/* Teacher, Academic & HeadOffice Routes */}
              <Route path="/results" element={<ExamResults user={user} />} />
              <Route path="/attendance" element={<Attendance user={user} />} />
              <Route path="/messages" element={<Messaging user={user} />} />
              <Route path="/documents" element={<SharedDocuments user={user} />} />
              <Route path="/profile" element={<ProfileSetup user={user} onComplete={() => window.location.href = '/'} />} />
              
              {/* Discipline Routes */}
              <Route path="/discipline" element={user.role === 'Discipline' ? <DisciplineOffice /> : <Navigate to="/" />} />

              {/* Default Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  </Router>
  );
}
