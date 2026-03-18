import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'glass'
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        "rounded-[28px] border transition-all duration-500",
        variant === 'glass' 
          ? "bg-white/[0.03] backdrop-blur-[32px] border-white/[0.08] hover:border-acqua-500/30 hover:shadow-[0_0_40px_rgba(20,184,166,0.1)] transition-all duration-500 shadow-2xl"
          : "bg-gray-900/60 border-gray-800/80 hover:border-acqua-500/20 shadow-xl",
        className
      )}
    >
      {children}
    </motion.div>
  )
}
