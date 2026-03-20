import React from 'react';

export const TrendIndicator = ({ 
  current, 
  previous, 
  className = "" 
}: { 
  current?: string | number; 
  previous?: string | number; 
  className?: string 
}) => {
  if (current === undefined || previous === undefined || current === previous) return null;
  
  const parseVal = (v: string | number) => {
    if (typeof v === 'number') return v;
    return parseFloat(v.toString().replace(',', '.'));
  };

  const currVal = parseVal(current);
  const prevVal = parseVal(previous);

  if (isNaN(currVal) || isNaN(prevVal) || currVal === prevVal) return null;

  const isUp = currVal > prevVal;
  const colorClass = isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  
  return (
    <span className={`inline-flex items-center ${colorClass} animate-pulse ml-1 ${className}`} title={`Mudança: ${previous} -> ${current}`}>
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
        {isUp ? (
          <path d="M12 4l-8 8h6v8h4v-8h6z" />
        ) : (
          <path d="M12 20l8-8h-6V4h-4v8H4z" />
        )}
      </svg>
    </span>
  );
};
