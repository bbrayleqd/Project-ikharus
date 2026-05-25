import { ClerkProvider } from '@clerk/nextjs'
import ThemeProvider from './theme-provider'
import './globals.css'

export const metadata = {
  title: 'MediaFlow',
  description: 'Media project management for editors',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Prevent flash of wrong theme on load */}
          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              try {
                var saved = localStorage.getItem('theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (saved === 'dark' || (!saved && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            })();
          `}} />
        </head>
        <body>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}

