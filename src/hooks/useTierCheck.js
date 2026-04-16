import { useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook to check tier limits before performing an action.
 * Returns { checking, upgradePrompt, checkLimit, clearPrompt }
 *
 * Usage:
 *   const { checkLimit, upgradePrompt, clearPrompt } = useTierCheck();
 *   const proceed = await checkLimit('employee');
 *   if (!proceed) return; // upgradePrompt will be set — show <UpgradePromptModal>
 */
export default function useTierCheck() {
  const [checking, setChecking] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState(null);

  const checkLimit = async (resource) => {
    setChecking(true);
    const res = await base44.functions.invoke('checkTierLimit', { resource });
    setChecking(false);

    if (!res.data.allowed) {
      setUpgradePrompt(res.data.upgrade_prompt);
      return false;
    }
    return true;
  };

  const clearPrompt = () => setUpgradePrompt(null);

  return { checking, upgradePrompt, checkLimit, clearPrompt };
}