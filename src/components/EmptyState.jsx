import { Button } from '@/components/ui/button';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center mb-5 shadow-sm">
          <Icon className="w-8 h-8 text-primary/70" />
        </div>
      )}
      <h3 className="font-jakarta text-xl font-700 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">{description}</p>
      <div className="flex items-center gap-3 mt-6">
        {actionLabel && (
          <Button onClick={onAction}>{actionLabel}</Button>
        )}
        {secondaryLabel && (
          <Button variant="outline" onClick={onSecondary}>{secondaryLabel}</Button>
        )}
      </div>
    </div>
  );
}