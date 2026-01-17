import React, { startTransition } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';

/**
 * Custom Router wrapper that ensures all navigation uses startTransition
 * to prevent React Suspense errors with lazy-loaded components
 */

// Override Link component to use startTransition
export const TransitionLink: React.FC<{
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ to, children, className, onClick }) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onClick) onClick(e);
    startTransition(() => {
      navigate(to);
    });
  };
  
  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};

// Hook that wraps navigate with startTransition
export const useTransitionNavigate = () => {
  const navigate = useNavigate();
  
  return React.useCallback((to: string | number, options?: any) => {
    startTransition(() => {
      if (typeof to === 'number') {
        navigate(to);
      } else {
        navigate(to, options);
      }
    });
  }, [navigate]);
};

export default BrowserRouter;

