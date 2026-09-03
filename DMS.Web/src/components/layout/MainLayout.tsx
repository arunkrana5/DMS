import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('dms_theme');
    return saved ? saved === 'dark' : true;
  });
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('dms_theme', darkMode ? 'dark' : 'light');
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Navbar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto w-full h-[calc(100vh-48px)]">
          <Outlet context={{ searchTerm }} />
        </main>
      </div>
    </div>
  );
};
