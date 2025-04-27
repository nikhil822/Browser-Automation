import React from 'react';
import { UserIcon as BrowserIcon } from 'lucide-react';

import { Sun as SunIcon, Moon as MoonIcon } from 'lucide-react';

const Header: React.FC = () => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrowserIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
          <h1 className="font-semibold text-xl text-slate-800 dark:text-slate-100">AutoBrowser</h1>
        </div>
        <button
          className="ml-auto flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? (
            <MoonIcon className="h-5 w-5 text-yellow-300" />
          ) : (
            <SunIcon className="h-5 w-5 text-slate-700" />
          )}
        </button>
        
        {/* <div className="flex items-center gap-4">
          <button className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Documentation
          </button>
          <button className="text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors">
            Sign In
          </button>
        </div> */}
      </div>
    </header>
  );
};

export default Header;