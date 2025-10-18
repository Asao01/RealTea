"use client";

export default function Badge({ type, text }) {
  const styles = {
    category: {
      bg: 'bg-[#D4AF37]/10',
      border: 'border-[#D4AF37]/30',
      text: 'text-[#D4AF37]',
      icon: null,
      label: text
    },
    news: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: '📰',
      label: 'News'
    },
    ai: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      icon: '✨',
      label: 'AI'
    },
    breaking: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      icon: '🔥',
      label: 'Breaking'
    }
  };

  const style = styles[type] || styles.category;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 ${style.bg} border ${style.border} rounded ${style.text} text-xs font-semibold uppercase tracking-wide`}>
      {style.icon && <span>{style.icon}</span>}
      <span>{style.label}</span>
    </span>
  );
}

