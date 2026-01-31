import { useState } from 'react';
import { Shield, Lock, AlertCircle } from 'lucide-react';

interface DemoAuthWrapperProps {
  children: React.ReactNode;
  appName: string;
  appDescription?: string;
}

export function DemoAuthWrapper({ children, appName, appDescription }: DemoAuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (username === 'Demo' && password === 'Demo1!') {
      setIsAuthenticated(true);
    } else {
      setError('Invalid credentials. Please use Demo / Demo1!');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--primary))]/10 mb-4">
              <Shield className="h-8 w-8 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{appName}</h1>
            {appDescription && (
              <p className="text-sm text-slate-600">{appDescription}</p>
            )}
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Demo Mode</span>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Demo"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 outline-none transition-all"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Demo1!"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 outline-none transition-all"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[hsl(var(--primary))] text-white py-3 rounded-xl font-semibold hover:bg-[hsl(14_95%_48%)] transition-all hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              Enter Demo
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-center text-slate-500 mb-2">
              Demo Credentials:
            </p>
            <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
              <p className="text-sm font-mono font-semibold text-slate-700">
                Username: <span className="text-[hsl(var(--primary))]">Demo</span>
              </p>
              <p className="text-sm font-mono font-semibold text-slate-700">
                Password: <span className="text-[hsl(var(--primary))]">Demo1!</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

