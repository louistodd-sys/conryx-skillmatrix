import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function RAGBar({ green = 0, amber = 0, red = 0, grey = 0, showLabels = false }) {
  const total = green + amber + red + grey;
  if (total === 0) return <div className="h-2 rounded-full bg-muted w-full" />;

  const segments = [
    { value: green, color: 'bg-rag-green', label: `Current: ${green}` },
    { value: amber, color: 'bg-rag-amber', label: `Expiring: ${amber}` },
    { value: red,   color: 'bg-rag-red',   label: `Expired/Missing: ${red}` },
    { value: grey,  color: 'bg-rag-grey',  label: `Not Assessed: ${grey}` },
  ].filter(s => s.value > 0);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 w-full">
        <div className="flex h-2 rounded-full overflow-hidden w-full bg-muted gap-px">
          {segments.map((seg, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className={`${seg.color} transition-all hover:opacity-90`}
                  style={{ width: `${(seg.value / total) * 100}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">{seg.label} ({Math.round((seg.value / total) * 100)}%)</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {showLabels && (
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap tabular-nums">
            {Math.round((green / total) * 100)}%
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}