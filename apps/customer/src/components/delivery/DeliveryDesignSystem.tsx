import React from 'react';
import { cn } from '@/lib/utils';

// ===== UNIFIED DESIGN SYSTEM FOR DELIVERY FLOW =====

// Color Palette
export const colors = {
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
  },
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    600: '#d97706',
  }
};

// Typography Scale
export const typography = {
  h1: 'text-2xl font-bold text-gray-900',
  h2: 'text-xl font-semibold text-gray-900',
  h3: 'text-lg font-semibold text-gray-900',
  h4: 'text-base font-semibold text-gray-900',
  body: 'text-base text-gray-700',
  bodySmall: 'text-sm text-gray-600',
  caption: 'text-xs text-gray-500',
  label: 'text-sm font-medium text-gray-700',
};

// Spacing Scale
export const spacing = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
  '2xl': 'p-12',
};

// Border Radius
export const radius = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
};

// Shadows
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
};

// ===== CORE COMPONENTS =====

// Professional Card Component
export const DeliveryCard = ({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'md',
  animated = true,
  ...props 
}) => {
  const variants = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-lg border-0',
    outlined: 'bg-white border-2 border-gray-200',
    filled: 'bg-gray-50 border border-gray-200',
  };

  return (
    <div 
      className={cn(
        variants[variant],
        radius.md,
        spacing[padding],
        animated && 'animate-fade-in-up delivery-interactive',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Professional Button Component
export const DeliveryButton = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  fullWidth = false,
  loading = false,
  icon = null,
  animated = true,
  ...props 
}) => {
  const baseClasses = "flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500 shadow-lg shadow-orange-500/25',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    outline: 'bg-white text-gray-900 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-lg shadow-green-500/25',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-lg shadow-red-500/25',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    link: 'bg-transparent text-orange-600 hover:text-orange-700 underline-offset-4 hover:underline focus:ring-orange-500',
  };
  
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
    xl: 'h-16 px-10 text-xl',
  };
  
  return (
    <button 
      onClick={onClick} 
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        animated && 'animate-button-press delivery-interactive delivery-focus-ring',
        loading && 'delivery-button-loading',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </div>
      )}
    </button>
  );
};

// Professional Header Component
export const DeliveryHeader = ({ 
  title, 
  subtitle, 
  onBack, 
  rightAction = null,
  className = '',
  ...props 
}) => (
  <div className={cn("bg-white border-b border-gray-100 sticky top-0 z-50 safe-area-top", className)} {...props}>
    <div className="px-4 py-4 flex items-center justify-between">
      <button 
        onClick={onBack} 
        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <svg className="h-6 w-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="flex-1 text-center">
        <h1 className={typography.h2}>{title}</h1>
        {subtitle && <p className={cn(typography.caption, "mt-1")}>{subtitle}</p>}
      </div>
      <div className="w-10">
        {rightAction}
      </div>
    </div>
  </div>
);

// Progress Bar Component
export const DeliveryProgressBar = ({ 
  currentStep, 
  totalSteps, 
  className = '',
  showPercentage = true,
  animated = true,
  ...props 
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  
  return (
    <div className={cn("px-4 py-3 bg-white border-b border-gray-100", className)} {...props}>
      <div className="flex items-center justify-between mb-2">
        <span className={cn(typography.bodySmall, "font-semibold")}>
          Step {currentStep + 1} of {totalSteps}
        </span>
        {showPercentage && (
          <span className={typography.caption}>{Math.round(progress)}% Complete</span>
        )}
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden delivery-progress-bar">
        <div 
          className={cn(
            "h-full bg-orange-600 transition-all duration-500 ease-out rounded-full",
            animated && "animate-progress-fill"
          )}
          style={{ 
            width: `${progress}%`,
            '--progress-width': `${progress}%`
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

// Status Badge Component
export const DeliveryStatusBadge = ({ 
  status, 
  icon: Icon,
  className = '',
  ...props 
}) => {
  const variants = {
    active: 'bg-orange-50 text-orange-700 border-orange-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-gray-50 text-gray-700 border-gray-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  
  return (
    <div 
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium",
        variants[status] || variants.pending,
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 mr-1.5" />}
      <span>{status}</span>
    </div>
  );
};

// Information Card Component
export const DeliveryInfoCard = ({ 
  title, 
  subtitle, 
  icon: Icon,
  children,
  className = '',
  ...props 
}) => (
  <DeliveryCard className={cn("space-y-3", className)} {...props}>
    <div className="flex items-start space-x-3">
      {Icon && (
        <div className="flex-shrink-0 w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-orange-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className={typography.h4}>{title}</h3>
        {subtitle && <p className={cn(typography.bodySmall, "mt-1")}>{subtitle}</p>}
      </div>
    </div>
    {children && <div className="mt-3">{children}</div>}
  </DeliveryCard>
);

// Loading Skeleton Component
export const DeliverySkeleton = ({ 
  className = '',
  lines = 1,
  ...props 
}) => (
  <div className={cn("animate-pulse", className)} {...props}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i}
        className={cn(
          "bg-gray-200 rounded",
          i === lines - 1 ? "w-3/4" : "w-full",
          "h-4 mb-2"
        )}
      />
    ))}
  </div>
);

// Action Button Group Component
export const DeliveryActionGroup = ({ 
  primaryAction,
  secondaryAction = null,
  className = '',
  ...props 
}) => (
  <div className={cn("space-y-3", className)} {...props}>
    {primaryAction && (
      <DeliveryButton
        {...primaryAction}
        fullWidth
        size="lg"
      />
    )}
    {secondaryAction && (
      <DeliveryButton
        {...secondaryAction}
        fullWidth
        size="lg"
        variant="outline"
      />
    )}
  </div>
);

// Divider Component
export const DeliveryDivider = ({ 
  className = '',
  ...props 
}) => (
  <div 
    className={cn("border-t border-gray-200 my-4", className)} 
    {...props} 
  />
);

// Empty State Component
export const DeliveryEmptyState = ({ 
  icon: Icon,
  title,
  description,
  action = null,
  className = '',
  ...props 
}) => (
  <div className={cn("text-center py-12", className)} {...props}>
    {Icon && (
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
    )}
    <h3 className={cn(typography.h3, "mb-2")}>{title}</h3>
    {description && (
      <p className={cn(typography.bodySmall, "text-gray-500 mb-6 max-w-sm mx-auto")}>
        {description}
      </p>
    )}
    {action && <DeliveryButton {...action} />}
  </div>
);

// Error State Component
export const DeliveryErrorState = ({ 
  title = "Something went wrong",
  description,
  onRetry,
  className = '',
  ...props 
}) => (
  <div className={cn("text-center py-8", className)} {...props}>
    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className={cn(typography.h3, "mb-2 text-red-900")}>{title}</h3>
    {description && (
      <p className={cn(typography.bodySmall, "text-red-600 mb-6")}>
        {description}
      </p>
    )}
    {onRetry && (
      <DeliveryButton onClick={onRetry} variant="outline">
        Try Again
      </DeliveryButton>
    )}
  </div>
);

// Success State Component
export const DeliverySuccessState = ({ 
  title = "Success!",
  description,
  action,
  className = '',
  ...props 
}) => (
  <div className={cn("text-center py-8", className)} {...props}>
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h3 className={cn(typography.h3, "mb-2 text-green-900")}>{title}</h3>
    {description && (
      <p className={cn(typography.bodySmall, "text-green-600 mb-6")}>
        {description}
      </p>
    )}
    {action && <DeliveryButton {...action} />}
  </div>
);

// Map Container Component
export const DeliveryMapContainer = ({ 
  children,
  className = '',
  ...props 
}) => (
  <div 
    className={cn(
      "w-full h-48 bg-gray-100 rounded-t-xl overflow-hidden relative",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// Photo Preview Component
export const DeliveryPhotoPreview = ({ 
  src,
  alt,
  onRemove,
  className = '',
  ...props 
}) => (
  <div className={cn("relative group", className)} {...props}>
    <img 
      src={src} 
      alt={alt}
      className="w-full h-32 object-cover rounded-lg"
    />
    <button
      onClick={onRemove}
      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
);

export default {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  DeliveryCard,
  DeliveryButton,
  DeliveryHeader,
  DeliveryProgressBar,
  DeliveryStatusBadge,
  DeliveryInfoCard,
  DeliverySkeleton,
  DeliveryActionGroup,
  DeliveryDivider,
  DeliveryEmptyState,
  DeliveryErrorState,
  DeliverySuccessState,
  DeliveryMapContainer,
  DeliveryPhotoPreview,
};
