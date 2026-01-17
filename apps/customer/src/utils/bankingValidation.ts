/**
 * Validates a US bank routing number using the ABA routing number algorithm
 * @param routingNumber - 9-digit routing number as a string
 * @returns true if valid, false otherwise
 */
export const validateRoutingNumber = (routingNumber: string): boolean => {
  // Remove any non-digit characters
  const digits = routingNumber.replace(/\D/g, '');
  
  // Must be exactly 9 digits
  if (digits.length !== 9) {
    return false;
  }
  
  // ABA routing number checksum algorithm
  // Multiply each digit by 3, 7, 1, 3, 7, 1, 3, 7, 1 respectively
  const multipliers = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  
  const sum = digits
    .split('')
    .map(Number)
    .reduce((acc, digit, index) => acc + digit * multipliers[index], 0);
  
  // Valid if sum is divisible by 10
  return sum % 10 === 0;
};

/**
 * Formats a routing number with spaces for display
 */
export const formatRoutingNumber = (routingNumber: string): string => {
  const digits = routingNumber.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
};
