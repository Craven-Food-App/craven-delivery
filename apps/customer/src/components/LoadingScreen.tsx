import React, { useEffect } from 'react';
import { Box } from '@mantine/core';
import { useIsMobile } from '@/hooks/use-mobile';
import craveCLogo from '@/assets/crave-c-logo.png';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = () => {
  const isMobile = useIsMobile();
  
  // Inject CSS animations into the document head
  useEffect(() => {
    const styleId = 'loading-screen-animations';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fragmentDrift {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        20% {
          opacity: 1;
        }
        100% {
          transform: translateX(90px) translateY(-18px) rotate(14deg) scale(0.85);
          opacity: 0;
        }
      }

      @keyframes fragmentDrift2 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        25% {
          opacity: 1;
        }
        100% {
          transform: translateX(75px) translateY(14px) rotate(-11deg) scale(0.8);
          opacity: 0;
        }
      }

      @keyframes fragmentDrift3 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        15% {
          opacity: 1;
        }
        100% {
          transform: translateX(95px) translateY(7px) rotate(9deg) scale(0.88);
          opacity: 0;
        }
      }

      @keyframes fragmentDrift4 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        30% {
          opacity: 1;
        }
        100% {
          transform: translateX(80px) translateY(-12px) rotate(-16deg) scale(0.82);
          opacity: 0;
        }
      }

      @keyframes fragmentDrift5 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        18% {
          opacity: 1;
        }
        100% {
          transform: translateX(88px) translateY(5px) rotate(10deg) scale(0.86);
          opacity: 0;
        }
      }

      @keyframes fragmentDrift6 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        22% {
          opacity: 1;
        }
        100% {
          transform: translateX(82px) translateY(-14px) rotate(-13deg) scale(0.84);
          opacity: 0;
        }
      }

      @keyframes fragmentDrift7 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        16% {
          opacity: 1;
        }
        100% {
          transform: translateX(92px) translateY(9px) rotate(11deg) scale(0.87);
          opacity: 0;
        }
      }

      @keyframes fragmentDrift8 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        28% {
          opacity: 1;
        }
        100% {
          transform: translateX(78px) translateY(-9px) rotate(-15deg) scale(0.83);
          opacity: 0;
        }
      }

      @keyframes logoBreath {
        0%, 100% {
          transform: scale(1);
          filter: brightness(1.05) contrast(1.1);
        }
        50% {
          transform: scale(1.02);
          filter: brightness(1.08) contrast(1.12);
        }
      }

      @keyframes logoRotate {
        0%, 100% {
          transform: rotate(0deg);
        }
        25% {
          transform: rotate(-0.5deg);
        }
        75% {
          transform: rotate(0.5deg);
        }
      }

      @keyframes routeLine1 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg);
          opacity: 0;
          width: 0px;
        }
        10% {
          opacity: 0.6;
          width: 60px;
        }
        50% {
          opacity: 0.4;
          width: 80px;
        }
        100% {
          transform: translateX(90px) translateY(-18px) rotate(14deg);
          opacity: 0;
          width: 0px;
        }
      }

      @keyframes routeLine2 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg);
          opacity: 0;
          width: 0px;
        }
        12% {
          opacity: 0.5;
          width: 55px;
        }
        50% {
          opacity: 0.35;
          width: 75px;
        }
        100% {
          transform: translateX(75px) translateY(14px) rotate(-11deg);
          opacity: 0;
          width: 0px;
        }
      }

      @keyframes routeLine3 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg);
          opacity: 0;
          width: 0px;
        }
        8% {
          opacity: 0.65;
          width: 65px;
        }
        50% {
          opacity: 0.45;
          width: 85px;
        }
        100% {
          transform: translateX(95px) translateY(7px) rotate(9deg);
          opacity: 0;
          width: 0px;
        }
      }

      @keyframes routeLine4 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg);
          opacity: 0;
          width: 0px;
        }
        15% {
          opacity: 0.55;
          width: 58px;
        }
        50% {
          opacity: 0.38;
          width: 78px;
        }
        100% {
          transform: translateX(80px) translateY(-12px) rotate(-16deg);
          opacity: 0;
          width: 0px;
        }
      }

      @keyframes routeLine5 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg);
          opacity: 0;
          width: 0px;
        }
        9% {
          opacity: 0.6;
          width: 62px;
        }
        50% {
          opacity: 0.42;
          width: 82px;
        }
        100% {
          transform: translateX(88px) translateY(5px) rotate(10deg);
          opacity: 0;
          width: 0px;
        }
      }

      @keyframes routeLine6 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg);
          opacity: 0;
          width: 0px;
        }
        11% {
          opacity: 0.58;
          width: 57px;
        }
        50% {
          opacity: 0.4;
          width: 77px;
        }
        100% {
          transform: translateX(82px) translateY(-14px) rotate(-13deg);
          opacity: 0;
          width: 0px;
        }
      }

      @keyframes routeLine7 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg);
          opacity: 0;
          width: 0px;
        }
        7% {
          opacity: 0.63;
          width: 64px;
        }
        50% {
          opacity: 0.44;
          width: 84px;
        }
        100% {
          transform: translateX(92px) translateY(9px) rotate(11deg);
          opacity: 0;
          width: 0px;
        }
      }

      @keyframes routeLine8 {
        0% {
          transform: translateX(0) translateY(0) rotate(0deg);
          opacity: 0;
          width: 0px;
        }
        14% {
          opacity: 0.52;
          width: 56px;
        }
        50% {
          opacity: 0.36;
          width: 76px;
        }
        100% {
          transform: translateX(78px) translateY(-9px) rotate(-15deg);
          opacity: 0;
          width: 0px;
        }
      }

      @keyframes sloganFade {
        0%, 100% {
          opacity: 0;
          transform: translate(-50%, calc(-50% + 10px));
        }
        5%, 20% {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
        25% {
          opacity: 0;
          transform: translate(-50%, calc(-50% - 10px));
        }
      }

      .loading-slogan {
        position: absolute;
        top: calc(50% + 160px);
        left: 50%;
        transform: translate(-50%, -50%);
        color: #1c1917;
        font-size: 18px;
        font-weight: 600;
        letter-spacing: 1px;
        text-align: center;
        white-space: nowrap;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9), 0 2px 14px rgba(255, 107, 53, 0.18);
        pointer-events: none;
        opacity: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        width: 100%;
        max-width: 320px;
        padding: 0 24px;
        box-sizing: border-box;
      }

      .loading-slogan-1 {
        animation: sloganFade 20s ease-in-out infinite;
        animation-delay: 0s;
      }

      .loading-slogan-2 {
        animation: sloganFade 20s ease-in-out infinite;
        animation-delay: 4s;
      }

      .loading-slogan-3 {
        animation: sloganFade 20s ease-in-out infinite;
        animation-delay: 8s;
      }

      .loading-slogan-4 {
        animation: sloganFade 20s ease-in-out infinite;
        animation-delay: 12s;
      }

      .loading-slogan-5 {
        animation: sloganFade 20s ease-in-out infinite;
        animation-delay: 16s;
      }

      @keyframes gradientShift {
        0%, 100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }

      @keyframes rimLightPulse {
        0%, 100% {
          opacity: 0.25;
          transform: scale(1) rotate(0deg);
        }
        33% {
          opacity: 0.35;
          transform: scale(1.015) rotate(2deg);
        }
        66% {
          opacity: 0.4;
          transform: scale(1.02) rotate(-1deg);
        }
      }

      @keyframes innerGlow {
        0%, 100% {
          opacity: 0.15;
          transform: translate(0, 0);
        }
        25% {
          opacity: 0.22;
          transform: translate(-2px, -2px);
        }
        50% {
          opacity: 0.25;
          transform: translate(0, 0);
        }
        75% {
          opacity: 0.2;
          transform: translate(2px, 2px);
        }
      }

      @keyframes edgeHighlight {
        0%, 100% {
          opacity: 0.12;
          transform: translateX(0);
        }
        50% {
          opacity: 0.2;
          transform: translateX(3px);
        }
      }

      @keyframes depthShadowPulse {
        0%, 100% {
          opacity: 0.4;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(1.01);
        }
      }

      .loading-fragment {
        position: absolute;
        pointer-events: none;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) drop-shadow(0 0 8px rgba(255, 107, 53, 0.4));
      }

      .loading-fragment-1 {
        width: 7px;
        height: 16px;
        top: 41%;
        left: calc(50% + 88px);
        background: linear-gradient(135deg, #ff6b35 0%, #f97316 45%, #ea580c 90%, #c2410c 100%);
        clip-path: polygon(0 0, 100% 18%, 100% 82%, 0 100%);
        box-shadow: 
          inset 0 0 4px rgba(255, 255, 255, 0.2),
          inset -2px 0 6px rgba(194, 65, 12, 0.3),
          0 0 12px rgba(255, 107, 53, 0.5);
        animation: fragmentDrift 7.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        animation-delay: 0s;
      }

      .loading-fragment-2 {
        width: 6px;
        height: 14px;
        top: 50.5%;
        left: calc(50% + 88px);
        background: linear-gradient(135deg, #ff6b35 0%, #f97316 40%, #ea580c 85%, #c2410c 100%);
        clip-path: polygon(0 8%, 100% 0, 100% 92%, 0 100%);
        box-shadow: 
          inset 0 0 3px rgba(255, 255, 255, 0.18),
          inset -2px 0 5px rgba(194, 65, 12, 0.25),
          0 0 10px rgba(255, 107, 53, 0.45);
        animation: fragmentDrift2 7s cubic-bezier(0.23, 0.48, 0.44, 0.96) infinite;
        animation-delay: 0.9s;
      }

      .loading-fragment-3 {
        width: 9px;
        height: 12px;
        top: 47.5%;
        left: calc(50% + 88px);
        background: linear-gradient(135deg, #ff6b35 0%, #f97316 50%, #ea580c 100%);
        clip-path: polygon(0 0, 100% 12%, 100% 88%, 0 100%);
        box-shadow: 
          inset 0 0 5px rgba(255, 255, 255, 0.22),
          inset -2px 0 7px rgba(194, 65, 12, 0.35),
          0 0 14px rgba(255, 107, 53, 0.55);
        animation: fragmentDrift3 8s cubic-bezier(0.24, 0.47, 0.43, 0.95) infinite;
        animation-delay: 1.6s;
      }

      .loading-fragment-4 {
        width: 6px;
        height: 15px;
        top: 52.5%;
        left: calc(50% + 88px);
        background: linear-gradient(135deg, #ff6b35 0%, #f97316 38%, #ea580c 82%, #c2410c 100%);
        clip-path: polygon(0 4%, 100% 0, 100% 96%, 0 100%);
        box-shadow: 
          inset 0 0 3px rgba(255, 255, 255, 0.16),
          inset -2px 0 5px rgba(194, 65, 12, 0.28),
          0 0 11px rgba(255, 107, 53, 0.48);
        animation: fragmentDrift4 7.2s cubic-bezier(0.26, 0.45, 0.42, 0.97) infinite;
        animation-delay: 2.3s;
      }

      .loading-fragment-5 {
        width: 8px;
        height: 13px;
        top: 45.5%;
        left: calc(50% + 88px);
        background: linear-gradient(135deg, #ff6b35 0%, #f97316 42%, #ea580c 88%, #c2410c 100%);
        clip-path: polygon(0 0, 100% 22%, 100% 78%, 0 100%);
        box-shadow: 
          inset 0 0 4px rgba(255, 255, 255, 0.2),
          inset -2px 0 6px rgba(194, 65, 12, 0.32),
          0 0 13px rgba(255, 107, 53, 0.52);
        animation: fragmentDrift5 7.8s cubic-bezier(0.25, 0.46, 0.44, 0.94) infinite;
        animation-delay: 3.1s;
      }

      .loading-fragment-6 {
        width: 5px;
        height: 11px;
        top: 43%;
        left: calc(50% + 88px);
        background: linear-gradient(135deg, #ff6b35 0%, #f97316 35%, #ea580c 80%, #c2410c 100%);
        clip-path: polygon(0 2%, 100% 0, 100% 98%, 0 100%);
        box-shadow: 
          inset 0 0 3px rgba(255, 255, 255, 0.17),
          inset -2px 0 5px rgba(194, 65, 12, 0.27),
          0 0 9px rgba(255, 107, 53, 0.46);
        animation: fragmentDrift6 7.3s cubic-bezier(0.24, 0.47, 0.43, 0.95) infinite;
        animation-delay: 3.8s;
      }

      .loading-fragment-7 {
        width: 7px;
        height: 10px;
        top: 49%;
        left: calc(50% + 88px);
        background: linear-gradient(135deg, #ff6b35 0%, #f97316 48%, #ea580c 92%, #c2410c 100%);
        clip-path: polygon(0 0, 100% 14%, 100% 86%, 0 100%);
        box-shadow: 
          inset 0 0 4px rgba(255, 255, 255, 0.19),
          inset -2px 0 6px rgba(194, 65, 12, 0.3),
          0 0 12px rgba(255, 107, 53, 0.5);
        animation: fragmentDrift7 8.2s cubic-bezier(0.26, 0.45, 0.42, 0.97) infinite;
        animation-delay: 4.5s;
      }

      .loading-fragment-8 {
        width: 6px;
        height: 12px;
        top: 54%;
        left: calc(50% + 88px);
        background: linear-gradient(135deg, #ff6b35 0%, #f97316 40%, #ea580c 85%, #c2410c 100%);
        clip-path: polygon(0 6%, 100% 0, 100% 94%, 0 100%);
        box-shadow: 
          inset 0 0 3px rgba(255, 255, 255, 0.18),
          inset -2px 0 5px rgba(194, 65, 12, 0.29),
          0 0 10px rgba(255, 107, 53, 0.47);
        animation: fragmentDrift8 7.6s cubic-bezier(0.25, 0.46, 0.44, 0.94) infinite;
        animation-delay: 5.2s;
      }

      .loading-logo-container {
        position: relative;
        filter: drop-shadow(0 0 24px rgba(255, 107, 53, 0.22)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.1));
        animation: logoBreath 4s ease-in-out infinite, logoRotate 12s ease-in-out infinite;
      }

      .loading-rim-light {
        position: absolute;
        top: -15px;
        left: -15px;
        right: -15px;
        bottom: -15px;
        border-radius: 50%;
        background: radial-gradient(
          circle at center,
          transparent 0%,
          transparent 55%,
          rgba(255, 107, 53, 0.08) 65%,
          rgba(255, 107, 53, 0.15) 75%,
          rgba(255, 107, 53, 0.12) 85%,
          transparent 100%
        );
        animation: rimLightPulse 5s ease-in-out infinite;
        pointer-events: none;
        filter: blur(8px);
      }

      .loading-inner-glow {
        position: absolute;
        top: 5%;
        left: 5%;
        right: 5%;
        bottom: 5%;
        border-radius: 50%;
        background: radial-gradient(
          circle at 30% 30%,
          rgba(255, 107, 53, 0.2) 0%,
          rgba(249, 115, 22, 0.15) 30%,
          transparent 70%
        );
        animation: innerGlow 6s ease-in-out infinite;
        pointer-events: none;
        mix-blend-mode: screen;
      }

      .loading-edge-highlight {
        position: absolute;
        top: 20%;
        right: 3%;
        width: 25%;
        height: 60%;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.15) 20%,
          rgba(255, 255, 255, 0.25) 50%,
          rgba(255, 255, 255, 0.15) 80%,
          transparent 100%
        );
        border-radius: 50%;
        animation: edgeHighlight 4s ease-in-out infinite;
        pointer-events: none;
        filter: blur(4px);
        mix-blend-mode: overlay;
      }

      .loading-depth-shadow {
        position: absolute;
        top: 2%;
        left: 2%;
        right: 2%;
        bottom: 2%;
        border-radius: 50%;
        background: radial-gradient(
          circle at 40% 40%,
          transparent 0%,
          rgba(0, 0, 0, 0.12) 50%,
          rgba(0, 0, 0, 0.2) 100%
        );
        pointer-events: none;
        mix-blend-mode: multiply;
        opacity: 0.35;
        animation: depthShadowPulse 5s ease-in-out infinite;
      }

      .loading-route-line {
        position: absolute;
        height: 2px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 107, 53, 0.8) 20%,
          rgba(255, 107, 53, 1) 50%,
          rgba(255, 107, 53, 0.8) 80%,
          transparent 100%
        );
        box-shadow: 
          0 0 8px rgba(255, 107, 53, 0.6),
          0 0 16px rgba(255, 107, 53, 0.4),
          0 0 24px rgba(255, 107, 53, 0.2);
        pointer-events: none;
        border-radius: 2px;
      }

      .loading-route-line-1 {
        top: 41%;
        left: calc(50% + 88px);
        animation: routeLine1 7.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        animation-delay: 0s;
      }

      .loading-route-line-2 {
        top: 50.5%;
        left: calc(50% + 88px);
        animation: routeLine2 7s cubic-bezier(0.23, 0.48, 0.44, 0.96) infinite;
        animation-delay: 0.9s;
      }

      .loading-route-line-3 {
        top: 47.5%;
        left: calc(50% + 88px);
        animation: routeLine3 8s cubic-bezier(0.24, 0.47, 0.43, 0.95) infinite;
        animation-delay: 1.6s;
      }

      .loading-route-line-4 {
        top: 52.5%;
        left: calc(50% + 88px);
        animation: routeLine4 7.2s cubic-bezier(0.26, 0.45, 0.42, 0.97) infinite;
        animation-delay: 2.3s;
      }

      .loading-route-line-5 {
        top: 45.5%;
        left: calc(50% + 88px);
        animation: routeLine5 7.8s cubic-bezier(0.25, 0.46, 0.44, 0.94) infinite;
        animation-delay: 3.1s;
      }

      .loading-route-line-6 {
        top: 43%;
        left: calc(50% + 88px);
        animation: routeLine6 7.3s cubic-bezier(0.24, 0.47, 0.43, 0.95) infinite;
        animation-delay: 3.8s;
      }

      .loading-route-line-7 {
        top: 49%;
        left: calc(50% + 88px);
        animation: routeLine7 8.2s cubic-bezier(0.26, 0.45, 0.42, 0.97) infinite;
        animation-delay: 4.5s;
      }

      .loading-route-line-8 {
        top: 54%;
        left: calc(50% + 88px);
        animation: routeLine8 7.6s cubic-bezier(0.25, 0.46, 0.44, 0.94) infinite;
        animation-delay: 5.2s;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  
  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '430px',
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 55%, #f5f5f4 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Logo Container */}
      <Box
        className="loading-logo-container"
        style={{
          position: 'relative',
          width: isMobile ? '200px' : '240px',
          height: isMobile ? '200px' : '240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '--logo-mask': `url(${craveCLogo})`,
        } as React.CSSProperties & { '--logo-mask': string }}
      >
        {/* Rim Light Effect - Outer glow */}
        <Box className="loading-rim-light" />
        
        {/* Depth Shadow - Creates dimensional depth */}
        <Box className="loading-depth-shadow" />
        
        {/* Logo Base Image */}
        <Box
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <img
            src={craveCLogo}
            alt="Crave'n"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'brightness(1.05) contrast(1.1)',
            }}
          />
          
          {/* Gradient Overlay - Multi-layer for dimensional depth */}
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.5) 0%, rgba(249, 115, 22, 0.45) 25%, rgba(234, 88, 12, 0.4) 55%, rgba(194, 65, 12, 0.35) 85%, rgba(154, 52, 18, 0.3) 100%)',
              backgroundSize: '200% 200%',
              animation: 'gradientShift 9s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              mixBlendMode: 'color-dodge',
              pointerEvents: 'none',
              borderRadius: '50%',
              filter: 'blur(1px)',
            }}
          />
          {/* Secondary gradient layer for depth */}
          <Box
            style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              right: '10%',
              bottom: '10%',
              background: 'radial-gradient(ellipse at 35% 35%, rgba(255, 107, 53, 0.3) 0%, rgba(234, 88, 12, 0.2) 40%, transparent 70%)',
              pointerEvents: 'none',
              borderRadius: '50%',
              mixBlendMode: 'screen',
            }}
          />
          
          {/* Inner Glow - Subtle internal lighting */}
          <Box className="loading-inner-glow" />
          
          {/* Edge Highlight - Realistic rim light on leading edge */}
          <Box className="loading-edge-highlight" />
        </Box>

        {/* Orange route lines - Energy trails following fragments */}
        <Box className="loading-route-line loading-route-line-1" />
        <Box className="loading-route-line loading-route-line-2" />
        <Box className="loading-route-line loading-route-line-3" />
        <Box className="loading-route-line loading-route-line-4" />
        <Box className="loading-route-line loading-route-line-5" />
        <Box className="loading-route-line loading-route-line-6" />
        <Box className="loading-route-line loading-route-line-7" />
        <Box className="loading-route-line loading-route-line-8" />

        {/* Fragments breaking off from right edge - Hyper-realistic */}
        <Box className="loading-fragment loading-fragment-1" />
        <Box className="loading-fragment loading-fragment-2" />
        <Box className="loading-fragment loading-fragment-3" />
        <Box className="loading-fragment loading-fragment-4" />
        <Box className="loading-fragment loading-fragment-5" />
        <Box className="loading-fragment loading-fragment-6" />
        <Box className="loading-fragment loading-fragment-7" />
        <Box className="loading-fragment loading-fragment-8" />
      </Box>

      {/* Cycling Slogans */}
      <Box className="loading-slogan loading-slogan-1">
        Fast. Fresh. Delivered.
      </Box>
      <Box className="loading-slogan loading-slogan-2">
        Crave it. Get it.
      </Box>
      <Box className="loading-slogan loading-slogan-3">
        Food at your door
      </Box>
      <Box className="loading-slogan loading-slogan-4">
        Order. Track. Enjoy.
      </Box>
      <Box className="loading-slogan loading-slogan-5">
        Your cravings delivered
      </Box>
    </Box>
  );
};

export default LoadingScreen;
