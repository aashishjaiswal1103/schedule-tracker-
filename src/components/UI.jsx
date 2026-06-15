import React from 'react';
import { Check } from 'lucide-react';

export function Card({ children, className = '', interactive = false, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`card ${interactive ? 'card-interactive cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children }) {
  return <span className="card-label">{children}</span>;
}

export function SectionLabel({ children }) {
  return <h2 className="section-label mb-4">{children}</h2>;
}

export function SectionHeading({ children }) {
  return <h3 className="section-heading">{children}</h3>;
}

export function StatNumber({ children, size = 'md' }) {
  return (
    <span className={`stat-number ${size === 'lg' ? 'stat-number-lg' : ''}`}>
      {children}
    </span>
  );
}

export function Chip({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'chip',
    success: 'chip badge-success',
    alert: 'chip badge-alert',
  };
  return <span className={`${variants[variant] || variants.default} ${className}`}>{children}</span>;
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 whitespace-nowrap active:scale-[0.98]';
  const sizes = {
    sm: 'text-xs px-3.5 py-2 rounded-chip',
    md: 'text-[13px] px-5 py-3 rounded-btn',
    lg: 'text-sm px-6 py-3.5 rounded-btn',
    icon: 'w-10 h-10 rounded-btn',
  };
  const variants = {
    primary: 'bg-accent text-surface hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm',
    secondary: 'bg-transparent border border-border text-text-primary hover:bg-surface-hover hover:border-border-hover',
    destructive: 'bg-transparent border border-border text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-900',
    ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({ children, onClick, active = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-btn flex items-center justify-center transition-all duration-150 active:scale-[0.95]
        ${active ? 'bg-accent text-surface shadow-sm' : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary'}
        ${className}`}
    >
      {children}
    </button>
  );
}

export function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group select-none">
      <div
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={`custom-checkbox ${checked ? 'checked' : ''}`}
      >
        {checked && <Check size={12} className="text-white dark:text-black" strokeWidth={3} />}
      </div>
      {label && (
        <span className={`text-[13px] font-medium transition-all duration-150 ${checked ? 'text-text-muted line-through' : 'text-text-primary'}`}>
          {label}
        </span>
      )}
    </label>
  );
}

export function ProgressBar({ value, max = 100, color, className = '' }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const barColor = color || 'bg-accent';
  return (
    <div className={`progress-track ${className}`}>
      <div className={`progress-fill ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`input-field ${className}`} {...props} />;
}

export function Select({ children, className = '', ...props }) {
  return (
    <div className="relative inline-block w-full">
      <select className={`select-field w-full pr-10 ${className}`} {...props}>
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-secondary">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
  );
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`input-field resize-none ${className}`}
      {...props}
    />
  );
}

export function Divider() {
  return <hr className="divider my-5" />;
}
