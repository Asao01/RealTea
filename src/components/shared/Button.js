"use client";

import { motion } from "framer-motion";
import { usePerformance } from "../../context/PerformanceContext";

/**
 * Reusable Button Component
 * Variants: primary, secondary, danger, ghost
 */
export default function Button({ 
  children, 
  variant = "primary", 
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  className = "",
  ...props 
}) {
  const { shouldAnimate } = usePerformance();

  const baseStyles = "font-medium rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-gold-gradient text-bg-dark hover:shadow-lg hover:shadow-gold-primary/50",
    secondary: "bg-white dark:bg-[#1a1a1a] border border-gold-primary/30 text-gold-primary hover:bg-gold-primary/10",
    danger: "bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20",
    ghost: "text-gold-primary hover:bg-gold-primary/10",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const buttonClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  const MotionButton = shouldAnimate ? motion.button : 'button';
  const animationProps = shouldAnimate ? {
    whileHover: !disabled && !loading ? { scale: 1.05 } : {},
    whileTap: !disabled && !loading ? { scale: 0.95 } : {},
    transition: { duration: 0.2 },
  } : {};

  return (
    <MotionButton
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      {...animationProps}
      {...props}
    >
      {loading && (
        <motion.div
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          animate={shouldAnimate ? { rotate: 360 } : {}}
          transition={shouldAnimate ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
        />
      )}
      {children}
    </MotionButton>
  );
}

