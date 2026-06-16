// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sprout, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Реєстрація
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccess('✅ Акаунт створено! Перевір email для підтвердження.');
      } else {
        // Вхід
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/'); // Після входу — на головну
      }
    } catch (err) {
      // Перекладаємо типові помилки
      const msg = err.message || 'Помилка';
      if (msg.includes('Invalid login credentials')) {
        setError('Невірний email або пароль');
      } else if (msg.includes('Email not confirmed')) {
        setError('Підтверди email — перевір пошту');
      } else if (msg.includes('Password should be at least')) {
        setError('Пароль має бути мінімум 6 символів');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-garden-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Логотип */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-garden-green rounded-3xl mb-4 shadow-lg">
            <Sprout className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-garden-green mb-2">
            GardenOS
          </h1>
          <p className="text-gray-600">
            Твій особистий агроном у кишені
          </p>
        </div>

        {/* Форма */}
        <div className="card">
          <h2 className="text-xl font-bold text-garden-green mb-6">
            {isSignUp ? 'Створити акаунт' : 'Увійти'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-garden-green mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tvii@email.com"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green focus:border-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-garden-green mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Мінімум 6 символів"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green focus:border-transparent"
                />
              </div>
            </div>

            {/* Помилка */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-garden-alert px-4 py-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Успіх */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-garden-leaf px-4 py-3 rounded-xl">
                <p className="text-sm">{success}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Зачекай...
                </>
              ) : (
                isSignUp ? 'Створити акаунт' : 'Увійти'
              )}
            </button>
          </form>

          {/* Перемикач реєстрація/вхід */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-garden-green hover:underline font-semibold"
            >
              {isSignUp
                ? 'Вже є акаунт? Увійти'
                : 'Немає акаунту? Зареєструватись'}
            </button>
          </div>
        </div>

        {/* Підказка */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Твої дані зберігаються безпечно в Supabase
        </p>
      </div>
    </div>
  );
}