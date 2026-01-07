'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have access to this resource.',
  Verification: 'The verification link has expired or has already been used.',
  OAuthSignin: 'Error occurred during OAuth sign in.',
  OAuthCallback: 'Error occurred during OAuth callback.',
  OAuthCreateAccount: 'Could not create OAuth account.',
  EmailCreateAccount: 'Could not create email account.',
  Callback: 'Error occurred during callback.',
  OAuthAccountNotLinked: 'This email is already linked to another account.',
  EmailSignin: 'Error sending sign in email.',
  CredentialsSignin: 'Sign in failed. Check your credentials.',
  SessionRequired: 'Please sign in to access this page.',
  Default: 'An unexpected error occurred.',
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
      <p className="text-gray-400 mb-6">{errorMessage}</p>

      <Link
        href="/auth/signin"
        className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Try Again
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 animate-pulse">
        <div className="h-32 bg-gray-700 rounded mb-4"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
