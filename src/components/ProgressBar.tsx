interface ProgressBarProps {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ percentage, label = 'Totalizado', showPercentage = true }: ProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          {showPercentage && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {clampedPercentage.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden transition-colors">
        <div
          className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}
