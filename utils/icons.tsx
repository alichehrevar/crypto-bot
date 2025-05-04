import React from 'react';

export const PauseIcon = ({ className = 'size-4' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15.75 5.25v13.5m-7.5-13.5v13.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const XIcon = ({ className = 'size-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
       xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronUpIcon = ({ className = 'size-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"
       className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
  </svg>
);

export const ChevronDownIcon = ({ className = 'size-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"
       className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>

);
