/**
 * Felles UI-komponenter som bruker design-systemet
 * Importer det du trenger: import { Card, StatCard, Badge } from '@/components/ui/components'
 */

import React from 'react'

/* ── Card ─────────────────────────────────────────── */
export function Card({
  children,
  className = '',
  glow = false,
  style,
}: {
  children: React.ReactNode
  className?: string
  glow?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div className={`glass-card ${glow ? 'glow-card-wrap' : ''} ${className}`} style={style}>
      {children}
    </div>
  )
}

/* ── StatCard ─────────────────────────────────────── */
export function StatCard({
  label,
  value,
  sub,
  icon,
  color = 'var(--cyan)',
}: {
  label: string
  value: string | number
  sub?: string
  icon?: string
  color?: string
}) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
          {label}
        </span>
        {icon && (
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${color}15`, border: `1px solid ${color}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem',
          }}>
            {icon}
          </span>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800,
        letterSpacing: '-0.03em', color, lineHeight: 1, marginBottom: sub ? '0.3rem' : 0,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* ── Badge ────────────────────────────────────────── */
export function Badge({
  children,
  variant = 'cyan',
  pulse = false,
}: {
  children: React.ReactNode
  variant?: 'cyan' | 'purple' | 'green' | 'orange'
  pulse?: boolean
}) {
  const dotColors: Record<string, string> = {
    cyan:   'var(--cyan)',
    purple: 'var(--purple)',
    green:  'var(--green)',
    orange: 'var(--orange)',
  }
  return (
    <span className={`badge badge-${variant}`}>
      {pulse && (
        <span
          className="neon-dot anim-pulse"
          style={{
            background: dotColors[variant],
            boxShadow: `0 0 8px ${dotColors[variant]}`,
          }}
        />
      )}
      {children}
    </span>
  )
}

/* ── Button ───────────────────────────────────────── */
export function Button({
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  fullWidth = false,
  style,
}: {
  children: React.ReactNode
  variant?: 'primary' | 'ghost' | 'subtle'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
  style?: React.CSSProperties
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}`}
      disabled={disabled || loading}
      onClick={onClick}
      style={{ width: fullWidth ? '100%' : undefined, opacity: disabled ? 0.5 : 1, ...style }}
    >
      {loading ? <span className="spinner" /> : children}
    </button>
  )
}

/* ── Input ────────────────────────────────────────── */
export function Input({
  label,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  icon?: string
}) {
  return (
    <div>
      {label && (
        <label style={{
          display: 'block', fontSize: '0.72rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.4)', marginBottom: '0.45rem',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(0,245,255,0.4)', pointerEvents: 'none',
          }}>
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`input ${props.className ?? ''}`}
          style={{ paddingLeft: icon ? '2.6rem' : undefined, ...props.style }}
        />
      </div>
    </div>
  )
}

/* ── Divider ──────────────────────────────────────── */
export function Divider() {
  return <hr className="neon-divider" />
}

/* ── PageHeader ───────────────────────────────────── */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  )
}
