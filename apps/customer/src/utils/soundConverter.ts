// Utility to convert notification sounds to iOS-compatible formats
export const convertToIOSSound = async (audioFile: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // For now, we'll just return the original file
    // In a real implementation, you'd use Web Audio API to convert to CAF format
    resolve(audioFile);
  });
};

export const validateIOSSoundFile = (fileName: string): boolean => {
  const validExtensions = ['.caf', '.wav', '.aiff', '.mp3'];
  return validExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
};

export const getIOSSoundName = (originalName: string): string => {
  // Remove extension and add .caf for iOS
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  return `${nameWithoutExt}.caf`;
};