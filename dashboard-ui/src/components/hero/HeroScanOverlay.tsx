import { motion, useAnimationFrame } from 'framer-motion'
import { useRef, useState } from 'react'

export function HeroScanOverlay() {
  const [scanY, setScanY] = useState(0)
  const timeRef = useRef(0)

  useAnimationFrame((t) => {
    timeRef.current = t
    // Move from left to right every ~2s
    const cycle = (t % 2000) / 2000
    setScanY(cycle)
  })

  const boxes = [
    { x: 32,  y: 54,  w: 116, h: 156, label: 'WEED', conf: 88 },
    { x: 214, y: 62,  w: 86,  h: 118, label: 'CROP', conf: 96 },
  ]

  return (
    <div style={{
      position: 'absolute',
      left: '56%',
      top: '31%',
      width: 380,
      height: 240,
      pointerEvents: 'none',
      zIndex: 10,
      transform: 'translateX(-50%)',
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(34,197,94,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34,197,94,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
        borderRadius: 4,
      }} />

      {/* Detection boxes */}
      {boxes.map((box, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.2, duration: 0.4 }}
          style={{
            position: 'absolute',
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h,
            border: `1.5px solid ${box.label === 'WEED' ? 'rgba(239,68,68,0.8)' : 'rgba(34,197,94,0.8)'}`,
            borderRadius: 4,
            boxShadow: box.label === 'WEED'
              ? '0 0 10px rgba(239,68,68,0.3), inset 0 0 6px rgba(239,68,68,0.05)'
              : '0 0 10px rgba(34,197,94,0.3), inset 0 0 6px rgba(34,197,94,0.05)',
          }}
        >
          {/* Corner accents */}
          {[
            { top: -1, left: -1, borderTop: '2px solid', borderLeft: '2px solid' },
            { top: -1, right: -1, borderTop: '2px solid', borderRight: '2px solid' },
            { bottom: -1, left: -1, borderBottom: '2px solid', borderLeft: '2px solid' },
            { bottom: -1, right: -1, borderBottom: '2px solid', borderRight: '2px solid' },
          ].map((corner, ci) => (
            <div key={ci} style={{
              position: 'absolute',
              width: 10,
              height: 10,
              borderColor: box.label === 'WEED' ? '#ef4444' : '#22c55e',
              ...corner,
            }} />
          ))}

          {/* Label tag */}
          <div style={{
            position: 'absolute',
            top: -22,
            left: 0,
            background: box.label === 'WEED' ? 'rgba(239,68,68,0.85)' : 'rgba(34,197,94,0.85)',
            padding: '2px 7px',
            borderRadius: '4px 4px 0 0',
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}>
            {box.label} {box.conf}%
          </div>
          {box.label === 'CROP' && (
            <>
              <div style={{
                position: 'absolute',
                left: -36,
                top: '42%',
                width: 32,
                height: 1.5,
                background: 'rgba(34,197,94,0.85)',
                borderRadius: 2,
              }} />
              <div style={{
                position: 'absolute',
                left: -10,
                top: '41%',
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '8px solid rgba(34,197,94,0.95)',
              }} />
            </>
          )}
        </motion.div>
      ))}

      {/* Scan line */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${scanY * 100}%`,
        width: 2,
        background: 'linear-gradient(to bottom, transparent, rgba(34,197,94,0.8), rgba(34,197,94,1), rgba(34,197,94,0.8), transparent)',
        boxShadow: '0 0 8px rgba(34,197,94,0.6)',
        borderRadius: 1,
      }} />

      {/* AI HUD label */}
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: -28,
          left: 0,
          fontSize: 10,
          color: 'rgba(34,197,94,0.9)',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textShadow: '0 0 10px rgba(34,197,94,0.5)',
        }}
      >
        AI SCAN ACTIVE • 2 DETECTIONS
      </motion.div>
    </div>
  )
}
