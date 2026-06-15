import React from 'react';
import { Home, GraduationCap, Moon, BarChart2, Calendar, Settings, LogOut } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'timer', label: 'Timer', icon: GraduationCap },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'planner', label: 'Planner', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Navbar({ activeTab, onTabChange }) {
  return (
    <>
      {/* Desktop Left Sidebar Navigation */}
      <aside className="hidden md:flex flex-col h-[calc(100vh-2rem)] sticky top-4 left-4 w-20 bg-[#0A0A0A] text-white rounded-[24px] py-8 px-3 justify-between items-center shrink-0 shadow-lg">
        {/* Top: Logo */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-extrabold text-lg tracking-tight select-none">
            A.
          </div>
          <span className="text-[10px] font-bold tracking-wider text-neutral-400 mt-1 uppercase">V1.0</span>
        </div>

        {/* Middle: Navigation Tabs */}
        <nav className="flex flex-col gap-5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={tab.label}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative group
                  ${isActive 
                    ? 'bg-white text-black scale-105' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                
                {/* Tooltip on hover */}
                <div className="absolute left-16 bg-[#0A0A0A] text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-800 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 shadow-md">
                  {tab.label}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom: Exit/Logout Button */}
        <button
          onClick={() => {
            if (confirm("Reset current session data?")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          title="Clear & Reset App"
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-neutral-900 transition-all duration-200"
        >
          <LogOut size={20} strokeWidth={1.5} />
        </button>
      </aside>

      {/* Mobile Floating Bottom Bar */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-[#0A0A0A] text-white rounded-[20px] px-4 flex items-center justify-between z-50 shadow-xl border border-neutral-900">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200
                ${isActive ? 'text-white bg-neutral-900 scale-105' : 'text-neutral-400'}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[9px] font-semibold tracking-wide capitalize">{tab.id}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
