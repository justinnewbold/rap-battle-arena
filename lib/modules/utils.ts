// Utility functions for Rap Battle Arena

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins + ':' + secs.toString().padStart(2, '0');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length &lt;= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function sleep(ms: number): Promise&lt;void&gt; {
  return new Promise(resolve =&gt; setTimeout(resolve, ms));
}
