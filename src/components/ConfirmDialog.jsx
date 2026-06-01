import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ConfirmDialog — reusable confirmation modal.
 * Props:
 *   title        string  — dialog heading
 *   description  string  — body text explaining consequences
 *   confirmLabel string  — confirm button text (default "Confirm")
 *   variant      'default' | 'destructive'  — confirm button style
 *   loading      boolean — shows spinner on confirm button
 *   onConfirm    () => void
 *   onCancel     () => void
 */
export default function ConfirmDialog({
  title = 'Are you sure?',
  description = '',
  confirmLabel = 'Confirm',
  variant = 'destructive',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-card-lg p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="text-base font-semibold font-jakarta text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
