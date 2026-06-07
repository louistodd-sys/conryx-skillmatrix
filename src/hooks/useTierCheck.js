import { useState } from 'react';
import { apiClient } from '@/api/apiClient';

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
    try {
      const res = await apiClient.functions.invoke('checkTierLimit', { resource });
      setChecking(false);

      if (!res?.data?.allowed) {
        setUpgradePrompt(res?.data?.upgrade_prompt ?? null);
        return false;
      }
      return true;
    } catch {
      // If the tier-check function is unavailable, allow the action to proceed
      setChecking(false);
      return true;
    }
  };

  const clearPrompt = () => setUpgradePrompt(null);

  return { checking, upgradePrompt, checkLimit, clearPrompt };
}
