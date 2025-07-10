import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login({ user, setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    let result;
    if (isSignUp) {
      result = await supabase.auth.signUp({ email, password });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    setLoading(false);
    if (result.error) setError(result.error.message);
    else if (isSignUp) alert('Check your email to confirm your account!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (user) {
    return (
      <div className="mb-4">
        <span>Signed in as {user.email}</span>
        <button className="ml-4 px-3 py-1 bg-red-500 text-white rounded" onClick={handleLogout}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleAuth} className="mb-4 flex flex-col gap-2 max-w-xs">
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="border px-2 py-1 rounded"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="border px-2 py-1 rounded"
        required
      />
      <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded" disabled={loading}>
        {loading ? (isSignUp ? 'Signing up...' : 'Logging in...') : (isSignUp ? 'Sign Up' : 'Log In')}
      </button>
      <button
        type="button"
        className="text-blue-500 underline text-sm self-start"
        onClick={() => setIsSignUp(!isSignUp)}
      >
        {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
      </button>
      {error && <span className="text-red-500">{error}</span>}
    </form>
  );
}
