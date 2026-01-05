'use client';

import React, { ReactNode } from 'react';
import { useAppContext } from '../contexts/AppContext';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that handles dynamic padding based on header visibility
 */
export default function PageWrapper({ children, className = '' }: PageWrapperProps) {
  const { headerVisible } = useAppContext();

  const paddingClass = headerVisible ? 'pt-24' : 'pt-4';

  return (
    <div className={`${paddingClass} transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}
