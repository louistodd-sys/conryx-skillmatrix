export default function MetricCard({ icon: Icon, label, value, subtext, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-card border-border',
    warning: 'bg-amber-50/60 border-amber-200',
    danger:  'bg-red-50/60 border-red-200',
    success: 'bg-emerald-50/60 border-emerald-200',
  };

  const iconVariants = {
    default: 'bg-primary/8 text-primary',
    warning: 'bg-amber-100 text-amber-600',
    danger:  'bg-red-100 text-red-600',
    success: 'bg-emerald-100 text-emerald-600',
  };

  // Determine variant from className if legacy usage (border-red-200 → danger, border-amber-200 → warning)
  let resolvedVariant = variant;
  if (className.includes('border-red'))   resolvedVariant = 'danger';
  if (className.includes('border-amber')) resolvedVariant = 'warning';

  return (
    <div className={`
      border rounded-xl p-5 shadow-card hover:shadow-card-md transition-all duration-200
      ${variants[resolvedVariant]}
      ${className.replace(/border-\w+-\d+|bg-\w+-\d+\/\d+/g, '')}
    `}>
      {/* Icon */}
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${iconVariants[resolvedVariant]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      )}
      {/* Value */}
      <p className="font-jakarta text-3xl font-800 text-foreground leading-none tracking-tight">
        {value}
      </p>
      {/* Label */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1.5">
        {label}
      </p>
      {subtext && (
        <p className="text-xs text-muted-foreground/80 mt-0.5">{subtext}</p>
      )}
    </div>
  );
}
