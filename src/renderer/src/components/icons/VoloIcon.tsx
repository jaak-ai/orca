import React from 'react'

// Why: the Volo mark is referenced from Tasks settings, the task page and the
// integration card. One source keeps the path data from drifting and lets
// callers size/color it through `currentColor`.
export function VoloIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 0 24 6v12l-12 6L0 18V6l12-6Zm0 2.618L2.4 7.418v9.164L12 21.382l9.6-4.8V7.418L12 2.618Z" />
      <path d="M7.2 8.4h2.64L12 13.68l2.16-5.28h2.64L13.2 16.8h-2.4L7.2 8.4Z" />
    </svg>
  )
}
