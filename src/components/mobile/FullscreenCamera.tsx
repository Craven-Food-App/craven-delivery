import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Stack,
  Text,
  Button,
  ActionIcon,
  Loader,
  Group,
} from '@mantine/core';
import { 
  IconCamera, 
  IconX, 
  IconRotateClockwise, 
  IconBulb, 
  IconBulbOff,
  IconCheck,
  IconArrowLeft
} from '@tabler/icons-react';

interface FullscreenCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
  title: string;
  description: string;
  type: 'pickup' | 'delivery';
  onVisibilityChange?: (isVisible: boolean) => void;
}

const FullscreenCamera: React.FC<FullscreenCameraProps> = ({
  isOpen,
  onClose,
  onCapture,
  title,
  description,
  type,
  onVisibilityChange
}) => {
  const [flashOn, setFlashOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      onVisibilityChange?.(true);
    } else {
      stopCamera();
      onVisibilityChange?.(false);
    }
  }, [isOpen, onVisibilityChange]);

  const startCamera = async () => {
    try {
      setCameraError(false);
      setIsFocused(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Simulate focus detection after camera is ready
        videoRef.current.addEventListener('loadedmetadata', () => {
          // Wait a moment for camera to stabilize, then show focused state
          setTimeout(() => {
            setIsFocused(true);
          }, 800);
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (cameraError) {
      setIsCapturing(true);
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = 400;
            canvas.height = 300;
            context.fillStyle = '#f3f4f6';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#6b7280';
            context.font = '16px Arial';
            context.textAlign = 'center';
            context.fillText('Demo Photo', canvas.width / 2, canvas.height / 2);
            context.fillText(`${type === 'pickup' ? 'Pickup' : 'Delivery'} Verification`, canvas.width / 2, canvas.height / 2 + 30);
          }
          const dataUrl = canvas.toDataURL('image/jpeg');
          setCapturedImage(dataUrl);
          setIsCapturing(false);
        }
      }, 500);
      return;
    }

    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      setIsCapturing(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    setIsCapturing(false);
    stopCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      setCapturedImage(null);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      capturePhoto();
    }
    setLastTap(now);
  };

  if (!isOpen) return null;

  return (
    <Box
      pos="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      style={{ zIndex: 50, backgroundColor: '#000000', display: 'flex', flexDirection: 'column' }}
    >
      <Box
        px="md"
        py="sm"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          backdropFilter: 'blur(12px)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
        }}
      >
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={onClose}
          style={{ 
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Text size="sm" fw={600} c="white" style={{ letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {title}
        </Text>
        <Box w={40} />
      </Box>
      
      <Box flex={1} pos="relative" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
        {capturedImage ? (
          <Box pos="relative" w="100%" h="100%">
            <Box
              component="img"
              src={capturedImage}
              alt="Captured"
              w="100%"
              h="100%"
              style={{ objectFit: 'contain' }}
            />
            <Box
              pos="absolute"
              top={0}
              w="100%"
              style={{ 
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
                paddingTop: '0',
              }}
              p="md"
            >
              <Text 
                style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255, 255, 255, 0.95)', 
                  fontWeight: 500,
                  fontSize: '13px',
                  letterSpacing: '0.01em',
                  lineHeight: 1.4,
                }}
              >
                {description}
              </Text>
            </Box>
          </Box>
        ) : (
          <>
            {cameraError ? (
              <Stack gap="lg" p="xl" align="center" style={{ maxWidth: '400px' }}>
                <Box
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <IconCamera size={32} color="white" opacity={0.6} />
                </Box>
                <Stack gap="xs" align="center">
                  <Text c="white" size="md" fw={600} style={{ textAlign: 'center', letterSpacing: '0.01em' }}>
                    Camera Unavailable
                  </Text>
                  <Text c="white" opacity={0.7} size="sm" style={{ textAlign: 'center', lineHeight: 1.5 }}>
                    {description}
                  </Text>
                </Stack>
                <Button
                  onClick={capturePhoto}
                  size="md"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: 'white',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    marginTop: '8px',
                  }}
                >
                  Use Demo Photo
                </Button>
              </Stack>
            ) : (
              <Box pos="relative" w="100%" h="100%">
                <Box
                  component="video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  w="100%"
                  h="100%"
                  style={{ objectFit: 'cover' }}
                  onClick={handleDoubleTap}
                />
                {/* Square locator overlay */}
                <Box
                  pos="absolute"
                  top="50%"
                  left="50%"
                  style={{
                    transform: 'translate(-50%, -50%)',
                    width: '280px',
                    height: '280px',
                    border: `3px solid ${isFocused ? '#22c55e' : 'rgba(255, 255, 255, 0.6)'}`,
                    borderRadius: '8px',
                    pointerEvents: 'none',
                    transition: 'border-color 0.3s ease',
                    boxShadow: isFocused 
                      ? '0 0 0 4px rgba(34, 197, 94, 0.2), 0 0 20px rgba(34, 197, 94, 0.3)' 
                      : '0 0 0 4px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {/* Corner indicators */}
                  <Box
                    pos="absolute"
                    top="-2px"
                    left="-2px"
                    w="20px"
                    h="20px"
                    style={{
                      borderTop: `3px solid ${isFocused ? '#22c55e' : 'rgba(255, 255, 255, 0.8)'}`,
                      borderLeft: `3px solid ${isFocused ? '#22c55e' : 'rgba(255, 255, 255, 0.8)'}`,
                      borderTopLeftRadius: '8px',
                    }}
                  />
                  <Box
                    pos="absolute"
                    top="-2px"
                    right="-2px"
                    w="20px"
                    h="20px"
                    style={{
                      borderTop: `3px solid ${isFocused ? '#22c55e' : 'rgba(255, 255, 255, 0.8)'}`,
                      borderRight: `3px solid ${isFocused ? '#22c55e' : 'rgba(255, 255, 255, 0.8)'}`,
                      borderTopRightRadius: '8px',
                    }}
                  />
                  <Box
                    pos="absolute"
                    bottom="-2px"
                    left="-2px"
                    w="20px"
                    h="20px"
                    style={{
                      borderBottom: `3px solid ${isFocused ? '#22c55e' : 'rgba(255, 255, 255, 0.8)'}`,
                      borderLeft: `3px solid ${isFocused ? '#22c55e' : 'rgba(255, 255, 255, 0.8)'}`,
                      borderBottomLeftRadius: '8px',
                    }}
                  />
                  <Box
                    pos="absolute"
                    bottom="-2px"
                    right="-2px"
                    w="20px"
                    h="20px"
                    style={{
                      borderBottom: `3px solid ${isFocused ? '#22c55e' : 'rgba(255, 255, 255, 0.8)'}`,
                      borderRight: `3px solid ${isFocused ? '#22c55e' : 'rgba(255, 255, 255, 0.8)'}`,
                      borderBottomRightRadius: '8px',
                    }}
                  />
                </Box>
              </Box>
            )}
            
            <Box
              pos="absolute"
              top={0}
              w="100%"
              style={{ 
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
                paddingTop: '0',
              }}
              p="md"
            >
              <Text 
                style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255, 255, 255, 0.95)', 
                  fontWeight: 500,
                  fontSize: '13px',
                  letterSpacing: '0.01em',
                  lineHeight: 1.4,
                }}
              >
                {description}
              </Text>
            </Box>
          </>
        )}
      </Box>

      <Box
        pos="absolute"
        bottom={0}
        w="100%"
        p="xl"
        style={{ 
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
          backdropFilter: 'blur(12px)',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          flexShrink: 0,
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {capturedImage ? (
          <Group gap="sm">
            <Button
              onClick={handleRetake}
              variant="outline"
              size="md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: 'white',
                fontWeight: 500,
              }}
              leftSection={<IconRotateClockwise size={18} />}
            >
              Retake
            </Button>
            <Button
              onClick={handleConfirm}
              size="md"
              style={{
                backgroundColor: '#22c55e',
                border: 'none',
                color: 'white',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
              leftSection={<IconCheck size={18} />}
            >
              Confirm
            </Button>
          </Group>
        ) : (
          <ActionIcon
            onClick={capturePhoto}
            loading={isCapturing}
            w={72}
            h={72}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'white',
              border: '3px solid rgba(255, 255, 255, 0.3)', 
              borderRadius: '50%', 
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 8px rgba(255, 255, 255, 0.1)',
            }}
            title="Capture Photo"
          >
            {isCapturing ? (
              <Loader size="md" color="dark" />
            ) : (
              <IconCamera size={28} color="#1a1a1a" />
            )}
          </ActionIcon>
        )}
      </Box>

      <Box component="canvas" ref={canvasRef} style={{ display: 'none' }} />
    </Box>
  );
};

export default FullscreenCamera;
