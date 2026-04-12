import { getRAGColors, getRAGLabel } from '@/lib/ragUtils';

export default function RAGBadge({ status, label }) {
  const colors = getRAGColors(status);
  const text = label || getRAGLabel(status);

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-xs font-semibold uppercase tracking-wide
      ${colors.bg} ${colors.text}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
      {text}
    </span>
  );
}
