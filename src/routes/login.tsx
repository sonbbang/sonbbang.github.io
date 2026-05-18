import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { login, signup, oauthLogin } from '@netlify/identity'
import { useIdentity } from '../lib/identity-context'
import { useState, useEffect } from 'react'
import { Github, Mail, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { user, ready } = useIdentity()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (ready && user) {
      navigate({ to: '/' })
    }
  }, [ready, user, navigate])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate({ to: '/' })
    } catch (e: any) {
      setError(e.message || '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    setLoading(true)
    setError('')
    try {
      await signup(email, password, { full_name: name })
      setMessage(`${email}로 확인 이메일을 보냈습니다. 이메일을 확인해 주세요.`)
    } catch (e: any) {
      setError(e.message || '회원가입에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-red-50">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft size={16} /> 홈으로
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🍽️</div>
            <h1 className="text-2xl font-bold">맛집 룰렛</h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'login' ? '로그인하고 맛집을 저장하세요' : '가입하고 맛집을 즐겨보세요'}
            </p>
          </div>

          {message ? (
            <div className="bg-green-50 text-green-700 rounded-xl p-4 text-sm text-center">
              {message}
            </div>
          ) : (
            <>
              <button
                onClick={() => oauthLogin('github')}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-colors mb-3"
              >
                <Github size={20} /> GitHub으로 계속하기
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-gray-400">또는</span>
                </div>
              </div>

              <div className="space-y-3">
                {mode === 'signup' && (
                  <input
                    type="text"
                    placeholder="이름"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                  />
                )}
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                />
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
              )}

              <button
                onClick={mode === 'login' ? handleLogin : handleSignup}
                disabled={loading}
                className="w-full mt-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Mail size={18} />
                {loading ? '처리 중...' : mode === 'login' ? '이메일로 로그인' : '이메일로 가입'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-6">
                {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
                <button
                  onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
                  className="text-orange-500 font-semibold hover:underline"
                >
                  {mode === 'login' ? '가입하기' : '로그인'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
