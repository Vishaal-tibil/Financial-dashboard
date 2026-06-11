import { Icon } from './Icon';

export function EmptyState({
  icon = 'info',
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 text-gray-500">
      <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-3">
        <Icon name={icon} size={24} />
      </div>
      <p className="font-semibold text-gray-700">{title}</p>
      {hint && <p className="text-sm mt-1 max-w-md">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className="w-10 h-10 rounded-xl bg-bad/10 text-bad flex items-center justify-center mb-2">
        <Icon name="alert" size={20} />
      </div>
      <p className="text-sm text-gray-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-xs font-medium text-brand hover:underline flex items-center gap-1">
          <Icon name="refresh" size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function SectionTitle({
  icon,
  title,
  suffix,
  color = 'text-brand',
}: {
  icon: string;
  title: string;
  suffix?: string;
  color?: string;
}) {
  return (
    <div className={`section-title ${color}`}>
      <Icon name={icon} size={15} />
      <span>{title}</span>
      {suffix && <span className="text-gray-400 normal-case font-normal">{suffix}</span>}
    </div>
  );
}
