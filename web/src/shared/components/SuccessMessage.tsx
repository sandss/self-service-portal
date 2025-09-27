import React from 'react';

interface SuccessMessageProps {
  jobId: string;
  onClose?: () => void;
}

export function SuccessMessage({ jobId, onClose }: SuccessMessageProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-green-900">Task Submitted Successfully!</h3>
          <div className="mt-2 text-sm text-green-700">
            <div className="font-mono bg-white px-3 py-2 rounded border">
              Job ID: {jobId}
            </div>
            <p className="mt-2">Your task has been queued for execution. Track its progress on the Jobs Dashboard.</p>
          </div>
        </div>
        {onClose && (
          <div className="ml-3">
            <button
              onClick={onClose}
              className="text-green-500 hover:text-green-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
