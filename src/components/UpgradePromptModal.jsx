import { TrendingUp, X, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function UpgradePromptModal({ prompt, onClose }) {
  const navigate = useNavigate();

  if (!prompt) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/settings?tab=billing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-primary/20 shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Upgrade Required</p>
              <p className="text-sm font-bold text-foreground">{prompt.target} Plan</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="px-5 pb-4">
          <p className="text-sm text-foreground leading-relaxed">{prompt.message}</p>
        </div>

        {/* Unlocks */}
        {prompt.unlocks?.length > 0 && (
          <div className="mx-5 mb-4 rounded-lg bg-primary/5 border border-primary/10 p-3">
            <p className="text-xs font-semibold text-primary mb-2">What you'll unlock:</p>
            <ul className="space-y-1">
              {prompt.unlocks.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                  <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Not now
          </Button>
          <Button size="sm" className="flex-1 gap-1" onClick={handleUpgrade}>
            <TrendingUp className="w-3.5 h-3.5" />
            Upgrade to {prompt.target}
          </Button>
        </div>
      </div>
    </div>
  );
}