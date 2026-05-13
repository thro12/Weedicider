import { motion } from 'framer-motion'
import {
  Home, ScanLine, LayoutDashboard, History,
  BarChart2, Lightbulb, Leaf, Settings
} from 'lucide-react'

interface SidebarProps {
  active: string
  onNav: (id: string) => void
}

const navItems = [
  { id: 'home',            icon: Home,             label: 'Home' },
  { id: 'detection',       icon: ScanLine,         label: 'Detection' },
  { id: 'dashboard',       icon: LayoutDashboard,  label: 'Dashboard' },
  { id: 'history',         icon: History,          label: 'History' },
  { id: 'analytics',       icon: BarChart2,        label: 'Analytics' },
  { id: 'recommendations', icon: Lightbulb,        label: 'Recommendations' },
  { id: 'crop',            icon: Leaf,             label: 'Crop Health' },
  { id: 'settings',        icon: Settings,         label: 'Settings' },
]

export function Sidebar({ active, onNav }: SidebarProps) {
  return (
    <div
      className="glass"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 72,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 16,
        zIndex: 50,
        borderRadius: '0 28px 28px 0',
        background: 'linear-gradient(180deg, rgba(4,12,6,0.96), rgba(4,10,8,0.95), rgba(8,14,10,0.92))',
        boxShadow: '2px 0 32px rgba(0,0,0,0.45), inset -1px 0 0 rgba(34,197,94,0.15)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 80,
        right: 0,
        width: 3,
        height: 'calc(100% - 160px)',
        background: 'linear-gradient(180deg, rgba(0,255,136,0.25), rgba(0,255,136,0.9), rgba(0,255,136,0.25))',
        boxShadow: '0 0 18px rgba(0,255,136,0.18)',
      }} />
      {/* Logo */}
      <div style={{ marginBottom: 28 }}>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(34,197,94,0.3)',
          }}
        >
          <Leaf size={20} color="#22c55e" />
        </motion.div>
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = active === item.id
          return (
            <motion.button
              key={item.id}
              onClick={() => onNav(item.id)}
              title={item.label}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              style={{
                position: 'relative',
                width: 52,
                height: 52,
                borderRadius: 16,
                border: '1px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(10,20,10,0.75))'
                  : 'rgba(7, 12, 8, 0.25)',
                boxShadow: isActive
                  ? '0 0 24px rgba(34,197,94,0.18), inset 0 0 10px rgba(34,197,94,0.06)'
                  : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="active-bar"
                  style={{
                    position: 'absolute',
                    left: -13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 28,
                    borderRadius: 2,
                    background: '#22c55e',
                    boxShadow: '0 0 8px rgba(34,197,94,0.8)',
                  }}
                />
              )}
              <item.icon
                size={20}
                color={isActive ? '#a7f3d0' : 'rgba(134,239,172,0.92)'}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
            </motion.button>
          )
        })}
      </div>

      {/* Profile avatar */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          background: 'rgba(10, 18, 12, 0.76)',
          border: '1px solid rgba(34,197,94,0.24)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 16px rgba(34,197,94,0.08)',
        }}
      >
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.95) 0%, rgba(16,185,78,0.35) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: '#04160d',
          boxShadow: '0 0 18px rgba(34,197,94,0.22)',
        }}>
          S
        </div>
        {/* Online dot */}
        <div style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#22c55e',
          border: '1.5px solid rgba(4,8,4,0.9)',
          boxShadow: '0 0 6px rgba(34,197,94,0.8)',
        }} />
      </motion.div>
    </div>
  )
}
