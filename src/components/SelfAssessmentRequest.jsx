import { useState } from 'react';
import { Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/api/apiClient';

/**
 * Lets an employee flag a skill for manager review.
 * Creates an audit log entry — no new table needed.
 */
export default function SelfAssessmentRequest({ skill, org, user }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    setLoading(true);
    try {
      await apiClient.entities.AuditLogEntry.create({
        organisation_id: org.id,
        actor_user_id: user.id,
        actor_display: user.full_name,
        action: 'self_assessment_request',
        target_type: 'skill',
        target_id: skill.id,
        target_display: skill.name,
        detail: JSON.stringify({ message: `${user.full_name} has requested a review of their "${skill.name}" skill level.` }),
      });
      setSent(true);
      toast.success('Review request sent to your manager');
    } catch {
      toast.error('Could not send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <span className="text-xs text-green-600 font-medium">Request sent ✓</span>
  );

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
      onClick={handleRequest}
      disabled={loading}
      title="Ask your manager to review this skill level"
    >
      <Flag className="w-3 h-3" /> Request review
    </Button>
  );
}
