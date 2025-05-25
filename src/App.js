import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlusCircle, Wallet, TrendingUp, Download, Settings, Home, Calendar, CircleDollarSign, PiggyBank, Utensils, Car, Phone, BookOpen, ShoppingBag, Landmark, ChevronLeft, ChevronRight, X } from 'lucide-react';

// Tailwind CSS is assumed to be available

// Global variables from Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Context for Firebase and User
const AppContext = createContext(null);

const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [ledgerId, setLedgerId] = useState(localStorage.getItem('householdLedgerId') || '');
  const [showLedgerSetup, setShowLedgerSetup] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'input', 'history', 'settings'

  // Firebase Initialization and Authentication
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          console.log("Authenticated user ID:", user.uid);
        } else {
          console.log("No user signed in, attempting anonymous sign-in or custom token.");
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
              console.log("Signed in with custom token.");
            } else {
              await signInAnonymously(firebaseAuth);
              console.log("Signed in anonymously.");
            }
          } catch (error) {
            console.error("Firebase authentication failed:", error);
            setModalContent(`인증 실패: ${error.message}`);
            setShowModal(true);
          }
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      setModalContent(`Firebase 초기화 실패: ${error.message}`);
      setShowModal(true);
    }
  }, []);

  // Show ledger setup if no ledgerId is set
  useEffect(() => {
    if (isAuthReady && !ledgerId) {
      setShowLedgerSetup(true);
    } else if (isAuthReady && ledgerId) {
      setShowLedgerSetup(false);
    }
  }, [isAuthReady, ledgerId]);

  const showMessage = (message) => {
    setModalContent(message);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent('');
  };

  const handleCreateLedger = async () => {
    if (!db || !userId) {
      showMessage("Firebase가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    const newLedgerId = crypto.randomUUID();
    const ledgerRef = doc(db, `artifacts/${appId}/public/data/household_ledgers`, newLedgerId);
    try {
      await setDoc(ledgerRef, {
        ownerId: userId,
        createdAt: serverTimestamp(),
      });
      setLedgerId(newLedgerId);
      localStorage.setItem('householdLedgerId', newLedgerId);
      showMessage(`새 가계부가 생성되었습니다! 가계부 ID: ${newLedgerId}. 이 ID를 배우자와 공유하세요.`);
      setShowLedgerSetup(false);
    } catch (error) {
      console.error("가계부 생성 실패:", error);
      showMessage(`가계부 생성 실패: ${error.message}`);
    }
  };

  const handleJoinLedger = async (inputLedgerId) => {
    if (!db || !userId) {
      showMessage("Firebase가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (!inputLedgerId) {
      showMessage("가계부 ID를 입력해주세요.");
      return;
    }
    const ledgerRef = doc(db, `artifacts/${appId}/public/data/household_ledgers`, inputLedgerId);
    try {
      const docSnap = await getDoc(ledgerRef);
      if (docSnap.exists()) {
        setLedgerId(inputLedgerId);
        localStorage.setItem('householdLedgerId', inputLedgerId);
        showMessage(`가계부에 성공적으로 참여했습니다!`);
        setShowLedgerSetup(false);
      } else {
        showMessage("존재하지 않는 가계부 ID입니다.");
      }
    } catch (error) {
      console.error("가계부 참여 실패:", error);
      showMessage(`가계부 참여 실패: ${error.message}`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg font-semibold text-gray-700">로딩 중...</div>
      </div>
    );
  }

  if (showLedgerSetup) {
    return (
      <LedgerSetup
        onCreate={handleCreateLedger}
        onJoin={handleJoinLedger}
        userId={userId}
        showMessage={showMessage}
        closeModal={closeModal}
        showModal={showModal}
        modalContent={modalContent}
      />
    );
  }

  return (
    <AppContext.Provider value={{ db, auth, userId, ledgerId, showMessage }}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 font-inter text-gray-800 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-indigo-700">부부 가계부</h1>
          <div className="text-sm text-gray-500">
            <span className="font-semibold">ID:</span> {userId?.substring(0, 8)}...
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow p-4 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'input' && <InputTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'settings' && <SettingsTab setLedgerId={setLedgerId} setShowLedgerSetup={setShowLedgerSetup} />}
        </main>

        {/* Navigation Bar */}
        <nav className="bg-white shadow-lg p-3 flex justify-around items-center sticky bottom-0 z-10 rounded-t-xl">
          <NavItem icon={<Home className="w-6 h-6" />} label="대시보드" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<PlusCircle className="w-6 h-6" />} label="입력" active={activeTab === 'input'} onClick={() => setActiveTab('input')} />
          <NavItem icon={<Calendar className="w-6 h-6" />} label="내역" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavItem icon={<Settings className="w-6 h-6" />} label="설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        {/* Modal for messages */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
              <p className="text-lg font-medium text-gray-800 mb-6">{modalContent}</p>
              <button
                onClick={closeModal}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

const NavItem = ({ icon, label, active, onClick }) => (
  <button
    className={`flex flex-col items-center p-2 rounded-lg transition duration-200 ${active ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}
    onClick={onClick}
  >
    {icon}
    <span className="text-xs mt-1">{label}</span>
  </button>
);

const LedgerSetup = ({ onCreate, onJoin, userId, showMessage, closeModal, showModal, modalContent }) => {
  const [joinLedgerId, setJoinLedgerId] = useState('');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6">가계부 설정</h2>
        <p className="text-gray-600 mb-8">
          환영합니다! 가계부를 새로 만들거나, 배우자가 만든 가계부에 참여할 수 있습니다.
        </p>

        <div className="space-y-6">
          <div className="p-6 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="text-xl font-semibold text-indigo-800 mb-4">새 가계부 만들기</h3>
            <p className="text-gray-700 mb-4">
              새로운 가계부를 생성하고 배우자와 공유할 ID를 받으세요.
            </p>
            <button
              onClick={onCreate}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-indigo-700 transition duration-200 shadow-md"
            >
              새 가계부 만들기
            </button>
          </div>

          <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">기존 가계부 참여</h3>
            <p className="text-gray-700 mb-4">
              배우자가 알려준 가계부 ID를 입력하여 참여하세요.
            </p>
            <input
              type="text"
              value={joinLedgerId}
              onChange={(e) => setJoinLedgerId(e.target.value)}
              placeholder="가계부 ID 입력"
              className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={() => onJoin(joinLedgerId)}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-purple-700 transition duration-200 shadow-md"
            >
              가계부 참여하기
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          현재 사용자 ID: <span className="font-mono">{userId?.substring(0, 8)}...</span>
        </p>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
              <p className="text-lg font-medium text-gray-800 mb-6">{modalContent}</p>
              <button
                onClick={closeModal}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardTab = () => {
  const { db, ledgerId, showMessage } = useContext(AppContext);
  const [entries, setEntries] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!db || !ledgerId) return;

    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    const q = query(
      collection(db, `artifacts/${appId}/public/data/household_ledgers/${ledgerId}/entries`),
      // orderBy('date', 'desc') // Removed orderBy to avoid index issues. Data will be sorted in memory.
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(fetchedEntries);
    }, (error) => {
      console.error("Error fetching entries:", error);
      showMessage(`데이터 로딩 실패: ${error.message}`);
    });

    return () => unsubscribe();
  }, [db, ledgerId, currentMonth, showMessage]);

  const filteredEntries = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    return entries.filter(entry => {
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
      return entryDate >= start && entryDate <= end;
    });
  }, [entries, currentMonth]);

  const { totalIncome, totalExpense, netBalance, categoryExpenses } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const categories = {};

    filteredEntries.forEach(entry => {
      if (entry.type === 'income') {
        income += entry.amount;
      } else {
        expense += entry.amount;
        categories[entry.category] = (categories[entry.category] || 0) + entry.amount;
      }
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      categoryExpenses: Object.entries(categories).sort(([, a], [, b]) => b - a),
    };
  }, [filteredEntries]);

  const trendData = useMemo(() => {
    const monthlyData = {};
    const today = new Date();
    // Get data for the last 6 months including current
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyData[monthKey] = { income: 0, expense: 0, month: `${date.getMonth() + 1}월` };
    }

    entries.forEach(entry => {
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
      const monthKey = `${entryDate.getFullYear()}-${(entryDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        if (entry.type === 'income') {
          monthlyData[monthKey].income += entry.amount;
        } else {
          monthlyData[monthKey].expense += entry.amount;
        }
      }
    });

    return Object.values(monthlyData).sort((a, b) => {
      const [yearA, monthA] = a.month.split('월')[0].split('-').map(Number);
      const [yearB, monthB] = b.month.split('월')[0].split('-').map(Number);
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });
  }, [entries]);

  const formatCurrency = (amount) => amount.toLocaleString('ko-KR');

  const handleMonthChange = (direction) => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(prevMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const monthDisplay = currentMonth.toLocaleString('ko-KR', { year: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft /></button>
          <h2 className="text-xl font-bold text-center">{monthDisplay}</h2>
          <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight /></button>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">총 수입</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(totalIncome)}원</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600">총 지출</p>
            <p className="text-lg font-semibold text-red-700">{formatCurrency(totalExpense)}원</p>
          </div>
          <div className={`p-3 rounded-lg ${netBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <p className="text-sm text-gray-600">순수입/순지출</p>
            <p className={`text-lg font-semibold ${netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {formatCurrency(netBalance)}원
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4">월별 지출 카테고리</h3>
        {categoryExpenses.length > 0 ? (
          <div className="space-y-3">
            {categoryExpenses.map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <span className="text-gray-700">{category}</span>
                <span className="font-medium text-red-600">{formatCurrency(amount)}원</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">이번 달 지출 내역이 없습니다.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4">월별 수입/지출 추이 (지난 6개월)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={trendData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="month" stroke="#666" />
            <YAxis stroke="#666" tickFormatter={(value) => formatCurrency(value / 1000) + '천'} />
            <Tooltip formatter={(value) => `${formatCurrency(value)}원`} />
            <Legend />
            <Line type="monotone" dataKey="income" name="수입" stroke="#22c55e" activeDot={{ r: 8 }} strokeWidth={2} />
            <Line type="monotone" dataKey="expense" name="지출" stroke="#ef4444" activeDot={{ r: 8 }} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4">월별 지출 카테고리 비율</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={categoryExpenses.map(([name, value]) => ({ name, value }))}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" stroke="#666" />
            <YAxis stroke="#666" tickFormatter={(value) => formatCurrency(value / 1000) + '천'} />
            <Tooltip formatter={(value) => `${formatCurrency(value)}원`} />
            <Bar dataKey="value" fill="#8884d8" name="지출액" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const InputTab = () => {
  const { db, ledgerId, userId, showMessage } = useContext(AppContext);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const expenseCategories = ['식비', '교통비', '통신비', '문화생활비', '의료비', '교육비', '주거비', '경조사비', '의류/미용', '기타'];
  const incomeCategories = ['급여', '부수입', '투자수입', '상여금', '기타수입'];
  const paymentMethods = ['현금', '신용카드', '체크카드', '간편결제', '계좌이체', '기타'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!db || !ledgerId || !userId) {
      showMessage("Firebase가 준비되지 않았거나 가계부 ID가 설정되지 않았습니다.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showMessage("유효한 금액을 입력해주세요.");
      return;
    }
    if (!category) {
      showMessage("카테고리를 선택해주세요.");
      return;
    }
    if (type === 'expense' && !paymentMethod) {
      showMessage("결제 수단을 선택해주세요.");
      return;
    }

    const entryData = {
      date: new Date(date),
      type,
      amount: parsedAmount,
      category,
      memo,
      recordedBy: userId,
    };

    if (type === 'expense') {
      entryData.paymentMethod = paymentMethod;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/household_ledgers/${ledgerId}/entries`), entryData);
      showMessage("내역이 성공적으로 추가되었습니다!");
      // Reset form
      setAmount('');
      setCategory('');
      setPaymentMethod('');
      setMemo('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error("내역 추가 실패:", error);
      showMessage(`내역 추가 실패: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">새 내역 입력</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-3 px-4 rounded-md font-semibold transition duration-200 ${type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Wallet className="inline-block mr-2 w-5 h-5" /> 지출
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-3 px-4 rounded-md font-semibold transition duration-200 ${type === 'income' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <PiggyBank className="inline-block mr-2 w-5 h-5" /> 수입
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">금액 (원)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예: 15000"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            required
          >
            <option value="">선택하세요</option>
            {type === 'expense' ? (
              expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
            ) : (
              incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
            )}
          </select>
        </div>

        {type === 'expense' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">결제 수단</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              required
            >
              <option value="">선택하세요</option>
              {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택 사항)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="상세 내역을 입력하세요"
            rows="2"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          ></textarea>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-indigo-700 transition duration-200 shadow-lg"
        >
          내역 추가
        </button>
      </form>
    </div>
  );
};

const HistoryTab = () => {
  const { db, ledgerId, showMessage } = useContext(AppContext);
  const [entries, setEntries] = useState([]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'
  const [filterCategory, setFilterCategory] = useState('all'); // 'all', specific category
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all'); // 'all', specific method

  const expenseCategories = ['식비', '교통비', '통신비', '문화생활비', '의료비', '교육비', '주거비', '경조사비', '의류/미용', '기타'];
  const incomeCategories = ['급여', '부수입', '투자수입', '상여금', '기타수입'];
  const paymentMethods = ['현금', '신용카드', '체크카드', '간편결제', '계좌이체', '기타'];

  useEffect(() => {
    if (!db || !ledgerId) return;

    const q = query(
      collection(db, `artifacts/${appId}/public/data/household_ledgers/${ledgerId}/entries`),
      // orderBy('date', 'desc') // Removed orderBy to avoid index issues. Data will be sorted in memory.
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(fetchedEntries);
    }, (error) => {
      console.error("Error fetching entries:", error);
      showMessage(`데이터 로딩 실패: ${error.message}`);
    });

    return () => unsubscribe();
  }, [db, ledgerId, showMessage]);

  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries.filter(entry => {
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
      const entryMonth = entryDate.toISOString().substring(0, 7);

      const matchesMonth = filterMonth === 'all' || entryMonth === filterMonth;
      const matchesType = filterType === 'all' || entry.type === filterType;
      const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;
      const matchesPaymentMethod = filterPaymentMethod === 'all' || entry.paymentMethod === filterPaymentMethod;

      return matchesMonth && matchesType && matchesCategory && matchesPaymentMethod;
    });

    // Sort by date descending
    filtered.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB - dateA;
    });

    return filtered;
  }, [entries, filterMonth, filterType, filterCategory, filterPaymentMethod]);

  const handleDownloadCsv = () => {
    if (filteredAndSortedEntries.length === 0) {
      showMessage("다운로드할 내역이 없습니다.");
      return;
    }

    const headers = ["날짜", "유형", "카테고리", "금액", "결제수단", "메모", "기록자"];
    const csvRows = [];
    csvRows.push(headers.join(','));

    filteredAndSortedEntries.forEach(entry => {
      const dateStr = entry.date?.toDate ? entry.date.toDate().toLocaleDateString('ko-KR') : new Date(entry.date).toLocaleDateString('ko-KR');
      const row = [
        `"${dateStr}"`,
        `"${entry.type === 'income' ? '수입' : '지출'}"`,
        `"${entry.category}"`,
        entry.amount,
        `"${entry.paymentMethod || ''}"`,
        `"${entry.memo.replace(/"/g, '""')}"`, // Escape double quotes for CSV
        `"${entry.recordedBy?.substring(0, 8) || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `가계부_내역_${filterMonth || '전체'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage("CSV 파일이 다운로드되었습니다.");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">내역 조회 및 필터링</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">월 선택</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="all">전체</option>
              <option value="income">수입</option>
              <option value="expense">지출</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="all">전체</option>
              {filterType !== 'expense' && incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              {filterType !== 'income' && expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          {filterType !== 'income' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">결제 수단</label>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="all">전체</option>
                {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleDownloadCsv}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition duration-200 shadow-md flex items-center justify-center mb-6"
        >
          <Download className="w-5 h-5 mr-2" /> CSV로 내보내기
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4">내역 목록 ({filteredAndSortedEntries.length}건)</h3>
        {filteredAndSortedEntries.length > 0 ? (
          <div className="space-y-3">
            {filteredAndSortedEntries.map(entry => (
              <div key={entry.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 px-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-grow">
                  <p className="text-xs text-gray-500 mb-1">
                    {entry.date?.toDate ? entry.date.toDate().toLocaleDateString('ko-KR') : new Date(entry.date).toLocaleDateString('ko-KR')}
                  </p>
                  <p className="text-base font-semibold text-gray-800">
                    {entry.category}
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${entry.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {entry.type === 'income' ? '수입' : '지출'}
                    </span>
                  </p>
                  {entry.memo && <p className="text-sm text-gray-600 mt-1">{entry.memo}</p>}
                </div>
                <div className="text-right mt-2 sm:mt-0">
                  <p className={`text-lg font-bold ${entry.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                    {entry.type === 'expense' ? '-' : ''}{entry.amount.toLocaleString('ko-KR')}원
                  </p>
                  {entry.paymentMethod && <p className="text-xs text-gray-500">{entry.paymentMethod}</p>}
                  <p className="text-xs text-gray-400">기록자: {entry.recordedBy?.substring(0, 8)}...</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">선택된 조건에 해당하는 내역이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

const SettingsTab = ({ setLedgerId, setShowLedgerSetup }) => {
  const { ledgerId, showMessage } = useContext(AppContext);

  const handleResetLedger = () => {
    localStorage.removeItem('householdLedgerId');
    setLedgerId(''); // Clear ledgerId state
    setShowLedgerSetup(true); // Go back to setup screen
    showMessage("가계부 연결이 해제되었습니다. 새로운 가계부를 설정해주세요.");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">설정</h2>

      <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-center">
        <p className="text-gray-700 text-lg font-medium mb-2">현재 가계부 ID</p>
        <p className="font-mono text-xl text-indigo-800 break-all">{ledgerId}</p>
        <p className="text-sm text-gray-600 mt-2">이 ID를 배우자와 공유하여 같은 가계부를 사용하세요.</p>
      </div>

      <button
        onClick={handleResetLedger}
        className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-red-600 transition duration-200 shadow-md flex items-center justify-center"
      >
        <X className="w-5 h-5 mr-2" /> 가계부 연결 해제
      </button>
      <p className="text-sm text-gray-500 mt-4 text-center">
        연결을 해제하면 새로운 가계부를 만들거나 다른 가계부에 참여할 수 있습니다.
        <br />
        (기존 데이터는 삭제되지 않습니다.)
      </p>
    </div>
  );
};

export default App;
