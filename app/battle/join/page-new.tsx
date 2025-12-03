import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Loading component for the join page
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-white text-xl">Loading battle...</p>
      </div>
    </div>
  );
}

// Dynamically import the client component with no SSR to avoid useSearchParams issues
const JoinContent = dynamic(() => import('./JoinContent'), { 
  ssr: false,
  loading: () => <LoadingSpinner />
});

export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <JoinContent />
    </Suspense>
  );
}

// Force dynamic rendering to avoid static generation issues with useSearchParams
export const dynamic = 'force-dynamic';