'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useTheme } from './theme-provider'

function SunIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Home() {
  const { darkMode, toggleDarkMode } = useTheme()
  const [token, setToken] = useState('')
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard')
    }
  }, [isLoaded, isSignedIn])

  const handleTokenSubmit = () => {
    if (token.trim()) {
      router.push(`/client/${token.trim()}`)
    }
  }

  return (
    <div className="app-shell" style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: 'var(--color-bg-page)',
      color: 'var(--color-text-primary)',
      transition: 'all 0.3s ease',
      fontFamily: 'var(--font-sans)',
      flexDirection: 'row',
    }}>

      <button
        onClick={toggleDarkMode}
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          background: 'none',
          border: 'none',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Left Side - Branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Background image — swap between light/dark variants */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${darkMode ? '/bg-dark.jpg' : '/bg-light.jpg'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.65,
          filter: 'blur(4px)',
          // Scale slightly so blurred edges don't show white fringe
          transform: 'scale(1.05)',
          transition: 'background-image 0.3s ease, opacity 0.3s ease',
        }} />

        {/* Content sits above the bg */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'var(--font-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: '1rem',
          }}>
            Review. Annotate. Flow.
          </h1>
          <p style={{
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-base)',
            textAlign: 'center',
            maxWidth: '300px',
          }}>
            The centralized bridge for editors and clients to perfect every frame.
          </p>
        </div>
      </div>

      {/* Right Side - Login Panel */}
      <div style={{
        width: '460px',
        backgroundColor: 'var(--color-bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem',
        transition: 'all 0.3s ease',
        borderLeft: '1px solid var(--color-border-default)',
      }}>

        {/* Title */}
        <h2 style={{
          fontSize: '1.8rem',
          fontWeight: 'var(--font-bold)',
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem',
        }}>
          Welcome to <span style={{ color: 'var(--color-primary)' }}>Media</span>Flow
        </h2>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
          marginBottom: '2rem',
          fontStyle: 'italic',
        }}>
          The centralized bridge for editors and clients to perfect every frame.
        </p>

        {/* Login Button */}
        <button
          onClick={() => router.push('/sign-in')}
          className="btn btn--primary"
          style={{
            width: '100%',
            padding: '0.85rem',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-base)',
            marginBottom: '1rem',
          }}
        >
          Login
        </button>

        {/* Sign Up Button */}
        <button
          onClick={() => router.push('/sign-up')}
          className="btn btn--secondary"
          style={{
            width: '100%',
            padding: '0.85rem',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-base)',
            marginBottom: '2rem',
          }}
        >
          Sign Up
        </button>

        {/* Divider */}
        <hr style={{ borderColor: 'var(--color-border-default)', marginBottom: '2rem' }} />

        {/* Project Token Section */}
        <p style={{
          color: 'var(--color-text-primary)',
          fontWeight: 'var(--font-semibold)',
          marginBottom: '0.75rem',
          textAlign: 'center',
        }}>
          Received a Project Token?
        </p>

        <input
          type="text"
          placeholder="Enter Project Token"
          className="form-input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{
            width: '100%',
            padding: '0.85rem',
            marginBottom: '1rem',
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={handleTokenSubmit}
          className="btn"
          style={{
            width: '100%',
            padding: '0.85rem',
            backgroundColor: 'var(--color-bg-surface-alt)',
            color: 'var(--color-primary)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-base)',
          }}
        >
          Continue
        </button>

      </div>
    </div>
  )
}