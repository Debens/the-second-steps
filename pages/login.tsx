import React, { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <h1 style={{ marginBottom: 24 }}>Login</h1>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email">Email:</label><br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="password">Password:</label><br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: 10, background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4 }}>Log In</button>
        {submitted && (
          <div style={{ marginTop: 16, color: 'green' }}>Form submitted! (No real authentication yet)</div>
        )}
      </form>
    </div>
  );
} 