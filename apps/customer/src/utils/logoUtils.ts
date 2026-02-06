/**
 * Checks if a logo URL is a PNG file
 */
export const isPngLogo = (logoUrl: string | null | undefined): boolean => {
  if (!logoUrl) return false;
  const lowerUrl = logoUrl.toLowerCase();
  return lowerUrl.endsWith('.png') || 
         lowerUrl.includes('.png?') ||
         lowerUrl.includes('image/png');
};

/**
 * Gets the appropriate background color for a logo
 * PNG logos should have white backgrounds, others can be transparent or default
 */
export const getLogoBackgroundColor = (logoUrl: string | null | undefined, defaultColor: string = 'transparent'): string => {
  if (isPngLogo(logoUrl)) {
    return '#ffffff'; // White for PNG
  }
  return defaultColor;
};

