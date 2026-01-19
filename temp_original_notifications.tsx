import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Text, Title, Button, ScrollArea, Badge, Group, ActionIcon, Divider, Paper } from '@mantine/core';
import { IconChevronLeft, IconGift, IconTruck, IconX, IconBell, IconCheck } from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const GhostTownAnimation = () => {
  return (
    <Box
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: 1.0,
        pointerEvents: 'none',
        zIndex: 0,
        marginBottom: '32px'
      }}
    >
      {/* State-of-the-Art Ghost Town Animation - Premium Enterprise Grade */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 600 450"
        style={{ 
          overflow: 'visible',
          maxWidth: '800px',
          maxHeight: '800px',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))'
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Hyper-Realistic Sky Gradient - Photorealistic */}
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8F4F8" stopOpacity="1" />
            <stop offset="25%" stopColor="#D0E8F0" stopOpacity="1" />
            <stop offset="50%" stopColor="#B8DCE8" stopOpacity="1" />
            <stop offset="75%" stopColor="#A8D0E0" stopOpacity="1" />
            <stop offset="100%" stopColor="#C8E4F0" stopOpacity="1" />
          </linearGradient>
          
          {/* Top Fade-Out Effect - Soft Atmospheric Haze */}
          <linearGradient id="topFade" x1="0%" y1="0%" x2="0%" y2="30%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          
          {/* Atmospheric Haze Gradient - Realistic */}
          <radialGradient id="atmosphericHaze" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          
          {/* Soft Edge Blur for Buildings */}
          <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.95" />
            </feComponentTransfer>
          </filter>
          
          {/* Realistic Shadow with Soft Edges */}
          <filter id="realisticShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
            <feOffset dx="3" dy="6" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Hyper-Realistic Ground Gradient - Photorealistic Desert Sand */}
          <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8DCC8" stopOpacity="1" />
            <stop offset="15%" stopColor="#DDD0B8" stopOpacity="1" />
            <stop offset="30%" stopColor="#D2C4A8" stopOpacity="1" />
            <stop offset="50%" stopColor="#C8B898" stopOpacity="1" />
            <stop offset="70%" stopColor="#BEAC88" stopOpacity="1" />
            <stop offset="85%" stopColor="#B5A078" stopOpacity="1" />
            <stop offset="100%" stopColor="#AC9468" stopOpacity="1" />
          </linearGradient>
          
          {/* Soft Building Shadow - Hyper-Realistic */}
          <linearGradient id="buildingShadow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.5" />
            <stop offset="30%" stopColor="#000000" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
          
          {/* Soft Edge Gradient for Buildings */}
          <linearGradient id="buildingEdge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6B7280" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#6B7280" stopOpacity="1" />
            <stop offset="100%" stopColor="#6B7280" stopOpacity="0.3" />
          </linearGradient>
          
          {/* Hyper-Realistic Sun Glow - Soft Photorealistic */}
          <radialGradient id="sunGlow">
            <stop offset="0%" stopColor="#FFF8E1" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#FFECB3" stopOpacity="0.7" />
            <stop offset="40%" stopColor="#FFE082" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#FFD54F" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#FFC107" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFA726" stopOpacity="0" />
          </radialGradient>
          
          {/* Hyper-Realistic Sun Core - Soft Blend */}
          <radialGradient id="sunCore">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="30%" stopColor="#FFF9C4" stopOpacity="1" />
            <stop offset="60%" stopColor="#FFE082" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFD54F" stopOpacity="1" />
          </radialGradient>
          
          {/* Sun Halo - Atmospheric */}
          <radialGradient id="sunHalo">
            <stop offset="0%" stopColor="#FFE082" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFD54F" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFC107" stopOpacity="0" />
          </radialGradient>
          
          {/* Hyper-Realistic Tumbleweed Texture - Soft Organic */}
          <pattern id="tumbleweedPattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="2.5" fill="#8B7355" opacity="0.6">
              <animate attributeName="opacity" values="0.6;0.5;0.6" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="6" cy="6" r="1.8" fill="#9B8565" opacity="0.4">
              <animate attributeName="opacity" values="0.4;0.35;0.4" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="18" cy="18" r="1.8" fill="#9B8565" opacity="0.4">
              <animate attributeName="opacity" values="0.4;0.35;0.4" dur="4.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="6" cy="18" r="1.2" fill="#A59575" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.25;0.3" dur="5s" repeatCount="indefinite" />
            </circle>
            <circle cx="18" cy="6" r="1.2" fill="#A59575" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.25;0.3" dur="5.5s" repeatCount="indefinite" />
            </circle>
          </pattern>
          
          {/* Hyper-Realistic Dust Particle Filter - Soft Blur */}
          <filter id="dustBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" />
          </filter>
          
          {/* Hyper-Realistic Building Texture - Soft Subtle */}
          <pattern id="brickPattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#9E9E9E" opacity="0.9" />
            <line x1="0" y1="6" x2="12" y2="6" stroke="#8A8A8A" strokeWidth="0.5" opacity="0.4" />
            <line x1="6" y1="0" x2="6" y2="12" stroke="#8A8A8A" strokeWidth="0.5" opacity="0.4" />
          </pattern>
          
          {/* Hyper-Realistic Wood Texture - Soft Grain */}
          <pattern id="woodPattern" x="0" y="0" width="8" height="50" patternUnits="userSpaceOnUse">
            <rect width="8" height="50" fill="#8B7355" opacity="0.85" />
            <line x1="0" y1="0" x2="8" y2="0" stroke="#7A6345" strokeWidth="0.3" opacity="0.4" />
            {[8, 16, 24, 32, 40, 48].map((y, i) => (
              <line
                key={i}
                x1="0"
                y1={y}
                x2="8"
                y2={y}
                stroke="#7A6345"
                strokeWidth="0.2"
                opacity={0.3 - i * 0.03}
              />
            ))}
          </pattern>
          
          {/* Soft Window Glow - Hyper-Realistic */}
          <filter id="windowGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feComponentTransfer in="coloredBlur">
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Soft Edge Filter for All Elements */}
          <filter id="softEdge" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
        </defs>
        
        {/* Hyper-Realistic Sky Background */}
        <rect width="600" height="280" fill="url(#skyGradient)" />
        
        {/* Top Fade-Out Effect - Soft Atmospheric */}
        <rect width="600" height="280" fill="url(#topFade)" />
        
        {/* Atmospheric Haze Layer - Realistic */}
        <rect width="600" height="280" fill="url(#atmosphericHaze)" />
        
        {/* Hyper-Realistic Cloud System - Soft Organic Shapes */}
        <g opacity="0.7" filter="url(#softEdge)">
          {/* Cloud Layer 1 - Slow Drift - Soft Blend */}
          <g>
            <ellipse cx="120" cy="60" rx="45" ry="28" fill="#E3F2FD" opacity="0.8">
              <animate attributeName="cx" values="120;128;120" dur="20s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.85;0.8" dur="8s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="140" cy="55" rx="35" ry="22" fill="#BBDEFB" opacity="0.75">
              <animate attributeName="cx" values="140;148;140" dur="20s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="100" cy="65" rx="30" ry="20" fill="#E3F2FD" opacity="0.8">
              <animate attributeName="cx" values="100;108;100" dur="20s" repeatCount="indefinite" />
            </ellipse>
          </g>
          
          {/* Cloud Layer 2 - Medium Drift - Soft Blend */}
          <g>
            <ellipse cx="450" cy="80" rx="55" ry="35" fill="#E3F2FD" opacity="0.75">
              <animate attributeName="cx" values="450;460;450" dur="25s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.75;0.8;0.75" dur="10s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="480" cy="75" rx="40" ry="28" fill="#BBDEFB" opacity="0.7">
              <animate attributeName="cx" values="480;490;480" dur="25s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="420" cy="85" rx="35" ry="25" fill="#E3F2FD" opacity="0.75">
              <animate attributeName="cx" values="420;430;420" dur="25s" repeatCount="indefinite" />
            </ellipse>
          </g>
          
          {/* Cloud Layer 3 - Distant - Soft Blend */}
          <g opacity="0.5">
            <ellipse cx="250" cy="40" rx="30" ry="18" fill="#E3F2FD" opacity="0.7">
              <animate attributeName="cx" values="250;255;250" dur="30s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="270" cy="38" rx="25" ry="15" fill="#BBDEFB" opacity="0.65">
              <animate attributeName="cx" values="270;275;270" dur="30s" repeatCount="indefinite" />
            </ellipse>
          </g>
        </g>
        
        {/* Hyper-Realistic Sun - Photorealistic with Soft Edges */}
        <g opacity="1.0" filter="url(#softEdge)">
          {/* Outer Halo - Very Soft */}
          <circle cx="500" cy="70" r="60" fill="url(#sunHalo)" opacity="0.8">
            <animate attributeName="r" values="60;62;60" dur="6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.85;0.8" dur="7s" repeatCount="indefinite" />
          </circle>
          
          {/* Outer Glow Ring - Soft Blend */}
          <circle cx="500" cy="70" r="50" fill="url(#sunGlow)" opacity="0.7">
            <animate attributeName="r" values="50;51.5;50" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0.75;0.7" dur="5s" repeatCount="indefinite" />
          </circle>
          
          {/* Middle Glow Ring - Soft */}
          <circle cx="500" cy="70" r="40" fill="url(#sunGlow)" opacity="0.8">
            <animate attributeName="r" values="40;40.8;40" dur="3s" repeatCount="indefinite" />
          </circle>
          
          {/* Sun Core - Hyper-Realistic */}
          <circle cx="500" cy="70" r="30" fill="url(#sunCore)" opacity="0.95">
            <animate attributeName="r" values="30;30.5;30" dur="2.5s" repeatCount="indefinite" />
          </circle>
          
          {/* Sun Highlight - Soft Glow */}
          <ellipse cx="495" cy="65" rx="10" ry="14" fill="#FFFFFF" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.8;0.7" dur="3s" repeatCount="indefinite" />
            <animate attributeName="rx" values="10;11;10" dur="3s" repeatCount="indefinite" />
          </ellipse>
        </g>
        
        {/* Premium Ground with Realistic Texture */}
        <rect y="280" width="600" height="170" fill="url(#groundGradient)" />
        
        {/* Hyper-Realistic Ground Detail Lines - Soft Perspective */}
        <g opacity="0.3" filter="url(#softEdge)">
          <line x1="0" y1="300" x2="600" y2="295" stroke="#9B8565" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          <line x1="0" y1="320" x2="600" y2="315" stroke="#9B8565" strokeWidth="0.8" opacity="0.35" strokeLinecap="round" />
          <line x1="0" y1="340" x2="600" y2="335" stroke="#9B8565" strokeWidth="0.6" opacity="0.3" strokeLinecap="round" />
          <line x1="0" y1="360" x2="600" y2="355" stroke="#9B8565" strokeWidth="0.5" opacity="0.25" strokeLinecap="round" />
          <line x1="0" y1="380" x2="600" y2="375" stroke="#9B8565" strokeWidth="0.4" opacity="0.2" strokeLinecap="round" />
        </g>
        
        {/* Ground Texture Particles - Fixed Positions for Consistency */}
        <g opacity="0.3">
          {[
            { cx: 25, cy: 310, r: 0.8, op1: 0.35, op2: 0.15, dur: 4.2 },
            { cx: 45, cy: 325, r: 0.6, op1: 0.3, op2: 0.12, dur: 5.1 },
            { cx: 65, cy: 315, r: 0.9, op1: 0.4, op2: 0.18, dur: 3.8 },
            { cx: 85, cy: 340, r: 0.7, op1: 0.32, op2: 0.14, dur: 4.5 },
            { cx: 105, cy: 320, r: 0.85, op1: 0.38, op2: 0.16, dur: 4.8 },
            { cx: 125, cy: 335, r: 0.65, op1: 0.28, op2: 0.13, dur: 5.3 },
            { cx: 145, cy: 318, r: 0.75, op1: 0.35, op2: 0.15, dur: 4.1 },
            { cx: 165, cy: 345, r: 0.8, op1: 0.4, op2: 0.17, dur: 3.9 },
            { cx: 185, cy: 312, r: 0.7, op1: 0.3, op2: 0.14, dur: 5.0 },
            { cx: 205, cy: 330, r: 0.9, op1: 0.42, op2: 0.19, dur: 4.3 },
            { cx: 225, cy: 322, r: 0.6, op1: 0.25, op2: 0.11, dur: 5.5 },
            { cx: 245, cy: 338, r: 0.85, op1: 0.38, op2: 0.16, dur: 4.6 },
            { cx: 265, cy: 315, r: 0.75, op1: 0.33, op2: 0.15, dur: 4.4 },
            { cx: 285, cy: 342, r: 0.8, op1: 0.36, op2: 0.17, dur: 4.7 },
            { cx: 305, cy: 318, r: 0.7, op1: 0.31, op2: 0.13, dur: 5.2 },
            { cx: 325, cy: 332, r: 0.9, op1: 0.41, op2: 0.18, dur: 4.0 },
            { cx: 345, cy: 320, r: 0.65, op1: 0.29, op2: 0.12, dur: 5.4 },
            { cx: 365, cy: 336, r: 0.85, op1: 0.37, op2: 0.16, dur: 4.9 },
            { cx: 385, cy: 314, r: 0.75, op1: 0.34, op2: 0.14, dur: 4.5 },
            { cx: 405, cy: 328, r: 0.8, op1: 0.39, op2: 0.17, dur: 4.2 }
          ].map((particle, i) => (
            <circle
              key={i}
              cx={particle.cx}
              cy={particle.cy}
              r={particle.r}
              fill="#A8966E"
            >
              <animate
                attributeName="opacity"
                values={`${particle.op1};${particle.op2};${particle.op1}`}
                dur={`${particle.dur}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
        
        {/* Building 1 - Left - Hyper-Realistic Saloon - Soft Edges */}
        <g opacity="1.0" filter="url(#softEdge)">
          {/* Main Structure - Soft Gradient */}
          <rect x="60" y="180" width="80" height="120" fill="url(#buildingEdge)" opacity="0.95" />
          <rect x="60" y="180" width="80" height="120" fill="url(#brickPattern)" opacity="0.25" />
          
          {/* Wooden Accents - Soft */}
          <rect x="60" y="180" width="80" height="8" fill="url(#woodPattern)" opacity="0.5" />
          <rect x="60" y="250" width="80" height="6" fill="url(#woodPattern)" opacity="0.5" />
          
          {/* Hyper-Realistic Shadow - Soft Blur */}
          <ellipse cx="100" cy="300" rx="40" ry="12" fill="url(#buildingShadow)" opacity="0.6" filter="url(#realisticShadow)" />
          
          {/* Windows - Hyper-Realistic with Soft Glow */}
          <g filter="url(#windowGlow)">
            <rect x="72" y="200" width="14" height="18" fill="#1F2937" opacity="0.75" />
            <rect x="92" y="200" width="14" height="18" fill="#1F2937" opacity="0.75" />
            <rect x="112" y="200" width="14" height="18" fill="#1F2937" opacity="0.75" />
            <rect x="72" y="225" width="14" height="18" fill="#1F2937" opacity="0.75" />
            <rect x="92" y="225" width="14" height="18" fill="#1F2937" opacity="0.75" />
            <rect x="112" y="225" width="14" height="18" fill="#1F2937" opacity="0.75" />
            {/* Window Crosses - Soft */}
            <line x1="79" y1="200" x2="79" y2="218" stroke="#374151" strokeWidth="0.8" opacity="0.4" />
            <line x1="72" y1="209" x2="86" y2="209" stroke="#374151" strokeWidth="0.8" opacity="0.4" />
            <line x1="99" y1="200" x2="99" y2="218" stroke="#374151" strokeWidth="0.8" opacity="0.4" />
            <line x1="92" y1="209" x2="106" y2="209" stroke="#374151" strokeWidth="0.8" opacity="0.4" />
            <line x1="119" y1="200" x2="119" y2="218" stroke="#374151" strokeWidth="0.8" opacity="0.4" />
            <line x1="112" y1="209" x2="126" y2="209" stroke="#374151" strokeWidth="0.8" opacity="0.4" />
          </g>
          
          {/* Hyper-Realistic Door - Soft Details */}
          <rect x="88" y="260" width="24" height="40" fill="#374151" opacity="0.85" />
          <rect x="90" y="262" width="20" height="36" fill="#1F2937" opacity="0.6" />
          <circle cx="108" cy="280" r="1.5" fill="#6B7280" opacity="0.7" />
          <rect x="98" y="275" width="4" height="8" fill="#4B5563" opacity="0.5" />
          
          {/* Hyper-Realistic Roof - Soft Tiles */}
          <polygon points="50,180 100,150 150,180" fill="#4B5563" opacity="0.85" />
          {/* Roof Tiles - Soft Lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1={55 + i * 12}
              y1={180 - (i % 2) * 2}
              x2={55 + i * 12}
              y2={165 - (i % 2) * 2}
              stroke="#374151"
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}
          
          {/* Saloon Sign - Soft */}
          <rect x="75" y="155" width="50" height="12" fill="#D1D5DB" opacity="0.8" />
          <rect x="77" y="157" width="46" height="8" fill="#9CA3AF" opacity="0.6" />
          <text x="100" y="165" fontSize="5" fill="#374151" textAnchor="middle" fontWeight="600" opacity="0.85">SALOON</text>
        </g>
        
        {/* Building 2 - Center Left - Hyper-Realistic Multi-Story Hotel - Soft */}
        <g opacity="1.0" filter="url(#softEdge)">
          {/* Main Structure - Soft Gradient */}
          <rect x="180" y="140" width="70" height="160" fill="url(#buildingEdge)" opacity="0.95" />
          <rect x="180" y="140" width="70" height="160" fill="url(#brickPattern)" opacity="0.2" />
          
          {/* Hyper-Realistic Shadow - Soft Blur */}
          <ellipse cx="215" cy="300" rx="35" ry="12" fill="url(#buildingShadow)" opacity="0.6" filter="url(#realisticShadow)" />
          
          {/* Hyper-Realistic Windows - Soft Glow with Animation */}
          {[0, 1, 2, 3, 4].map((floor) => (
            <g key={floor}>
              {[0, 1, 2].map((window) => (
                <g key={window} filter="url(#windowGlow)">
                  <rect
                    x={190 + window * 20}
                    y={155 + floor * 25}
                    width="12"
                    height="16"
                    fill="#1F2937"
                    opacity="0.7"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.7;0.5;0.7"
                      dur={`${4 + floor * 0.5 + window * 0.3}s`}
                      repeatCount="indefinite"
                    />
                  </rect>
                  <line
                    x1={196 + window * 20}
                    y1={155 + floor * 25}
                    x2={196 + window * 20}
                    y2={171 + floor * 25}
                    stroke="#374151"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <line
                    x1={190 + window * 20}
                    y1={163 + floor * 25}
                    x2={202 + window * 20}
                    y2={163 + floor * 25}
                    stroke="#374151"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                </g>
              ))}
            </g>
          ))}
          
          {/* Soft Cornice */}
          <rect x="178" y="140" width="74" height="8" fill="#4B5563" opacity="0.8" />
          <rect x="178" y="148" width="74" height="3" fill="#374151" opacity="0.5" />
          
          {/* Building Base - Soft */}
          <rect x="180" y="290" width="70" height="10" fill="#4B5563" opacity="0.7" />
        </g>
        
        {/* Building 3 - Center Right - Hyper-Realistic Bank - Soft Columns */}
        <g opacity="1.0" filter="url(#softEdge)">
          {/* Main Structure - Soft Gradient */}
          <rect x="290" y="150" width="90" height="150" fill="url(#buildingEdge)" opacity="0.95" />
          <rect x="290" y="150" width="90" height="150" fill="url(#brickPattern)" opacity="0.25" />
          
          {/* Hyper-Realistic Columns - Soft Edges */}
          <rect x="292" y="150" width="8" height="150" fill="#4B5563" opacity="0.85" />
          <rect x="360" y="150" width="8" height="150" fill="#4B5563" opacity="0.85" />
          {/* Column Details - Soft */}
          <ellipse cx="296" cy="150" rx="4" ry="3" fill="#374151" opacity="0.6" />
          <ellipse cx="364" cy="150" rx="4" ry="3" fill="#374151" opacity="0.6" />
          <ellipse cx="296" cy="300" rx="4" ry="3" fill="#374151" opacity="0.6" />
          <ellipse cx="364" cy="300" rx="4" ry="3" fill="#374151" opacity="0.6" />
          
          {/* Hyper-Realistic Shadow - Soft Blur */}
          <ellipse cx="335" cy="300" rx="45" ry="15" fill="url(#buildingShadow)" opacity="0.6" filter="url(#realisticShadow)" />
          
          {/* Hyper-Realistic Windows - Soft Glow */}
          <g filter="url(#windowGlow)">
            <rect x="310" y="170" width="20" height="25" fill="#1F2937" opacity="0.7" />
            <rect x="310" y="205" width="20" height="25" fill="#1F2937" opacity="0.7" />
            <rect x="310" y="240" width="20" height="35" fill="#374151" opacity="0.8" />
            {/* Window Details - Soft Lines */}
            <line x1="320" y1="170" x2="320" y2="195" stroke="#4B5563" strokeWidth="1" opacity="0.4" />
            <line x1="310" y1="182.5" x2="330" y2="182.5" stroke="#4B5563" strokeWidth="1" opacity="0.4" />
            <line x1="320" y1="205" x2="320" y2="230" stroke="#4B5563" strokeWidth="1" opacity="0.4" />
            <line x1="310" y1="217.5" x2="330" y2="217.5" stroke="#4B5563" strokeWidth="1" opacity="0.4" />
          </g>
          
          {/* Hyper-Realistic Bank Sign - Soft */}
          <rect x="305" y="155" width="30" height="12" fill="#FCD34D" opacity="0.9" />
          <rect x="307" y="157" width="26" height="8" fill="#FBBF24" opacity="0.75" />
          <text x="320" y="164" fontSize="5" fill="#92400E" textAnchor="middle" fontWeight="600" opacity="0.9">BANK</text>
          
          {/* Hyper-Realistic Entrance - Soft */}
          <rect x="315" y="270" width="20" height="30" fill="#374151" opacity="0.85" />
          <rect x="317" y="272" width="16" height="26" fill="#1F2937" opacity="0.65" />
          <circle cx="332" cy="285" r="1.5" fill="#6B7280" opacity="0.75" />
        </g>
        
        {/* Building 4 - Right - Hyper-Realistic General Store - Soft */}
        <g opacity="1.0" filter="url(#softEdge)">
          {/* Main Structure - Soft Gradient */}
          <rect x="420" y="210" width="60" height="90" fill="url(#buildingEdge)" opacity="0.95" />
          <rect x="420" y="210" width="60" height="90" fill="url(#brickPattern)" opacity="0.25" />
          
          {/* Hyper-Realistic Shadow - Soft Blur */}
          <ellipse cx="450" cy="300" rx="30" ry="10" fill="url(#buildingShadow)" opacity="0.6" filter="url(#realisticShadow)" />
          
          {/* Hyper-Realistic Windows - Soft Glow */}
          <g filter="url(#windowGlow)">
            <rect x="430" y="225" width="12" height="16" fill="#1F2937" opacity="0.7" />
            <rect x="448" y="225" width="12" height="16" fill="#1F2937" opacity="0.7" />
            <rect x="430" y="248" width="12" height="16" fill="#1F2937" opacity="0.7" />
            <rect x="448" y="248" width="12" height="16" fill="#1F2937" opacity="0.7" />
            {/* Window Crosses - Soft */}
            <line x1="436" y1="225" x2="436" y2="241" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
            <line x1="430" y1="233" x2="442" y2="233" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
            <line x1="454" y1="225" x2="454" y2="241" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
            <line x1="448" y1="233" x2="460" y2="233" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
          </g>
          
          {/* Hyper-Realistic Door - Soft */}
          <rect x="438" y="270" width="16" height="30" fill="#374151" opacity="0.85" />
          <rect x="440" y="272" width="12" height="26" fill="#1F2937" opacity="0.6" />
          <circle cx="453" cy="285" r="1" fill="#6B7280" opacity="0.7" />
          
          {/* Store Sign - Soft */}
          <rect x="425" y="205" width="50" height="8" fill="#D1D5DB" opacity="0.8" />
          <text x="450" y="211" fontSize="4" fill="#374151" textAnchor="middle" fontWeight="600" opacity="0.85">STORE</text>
        </g>
        
        {/* Hyper-Realistic Tumbleweed 1 - Soft Organic Physics */}
        <g opacity="1.0" filter="url(#softEdge)">
          <g transform="translate(420, 380)">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="420,380; 520,375; 420,380"
              dur="14s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
            />
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0;360"
              dur="3.5s"
              repeatCount="indefinite"
              additive="sum"
            />
            {/* Tumbleweed Core - Soft Blend */}
            <circle cx="0" cy="0" r="18" fill="#6B7280" opacity="0.9" />
            <circle cx="0" cy="0" r="18" fill="url(#tumbleweedPattern)" opacity="0.65" />
            {/* Soft Organic Spikes - Hyper-Realistic */}
            <g stroke="#4B5563" strokeWidth="1.5" fill="none" opacity="0.7" strokeLinecap="round">
              <line x1="0" y1="-18" x2="0" y2="-26" />
              <line x1="12.7" y1="-12.7" x2="18" y2="-18" />
              <line x1="18" y1="0" x2="26" y2="0" />
              <line x1="12.7" y1="12.7" x2="18" y2="18" />
              <line x1="0" y1="18" x2="0" y2="26" />
              <line x1="-12.7" y1="12.7" x2="-18" y2="18" />
              <line x1="-18" y1="0" x2="-26" y2="0" />
              <line x1="-12.7" y1="-12.7" x2="-18" y2="-18" />
              {/* Additional Soft Detail Spikes */}
              <line x1="6.4" y1="-15.6" x2="9" y2="-22" />
              <line x1="15.6" y1="-6.4" x2="22" y2="-9" />
              <line x1="15.6" y1="6.4" x2="22" y2="9" />
              <line x1="6.4" y1="15.6" x2="9" y2="22" />
              <line x1="-6.4" y1="15.6" x2="-9" y2="22" />
              <line x1="-15.6" y1="6.4" x2="-22" y2="9" />
              <line x1="-15.6" y1="-6.4" x2="-22" y2="-9" />
              <line x1="-6.4" y1="-15.6" x2="-9" y2="-22" />
            </g>
          </g>
        </g>
        
        {/* Hyper-Realistic Tumbleweed 2 - Soft Organic */}
        <g opacity="1.0" filter="url(#softEdge)">
          <g transform="translate(100, 400)">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="100,400; 180,398; 100,400"
              dur="18s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
            />
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0;-360"
              dur="5.5s"
              repeatCount="indefinite"
              additive="sum"
            />
            <circle cx="0" cy="0" r="14" fill="#6B7280" opacity="0.85" />
            <circle cx="0" cy="0" r="14" fill="url(#tumbleweedPattern)" opacity="0.6" />
            <g stroke="#4B5563" strokeWidth="1.2" fill="none" opacity="0.65" strokeLinecap="round">
              <line x1="0" y1="-14" x2="0" y2="-20" />
              <line x1="9.9" y1="-9.9" x2="14" y2="-14" />
              <line x1="14" y1="0" x2="20" y2="0" />
              <line x1="9.9" y1="9.9" x2="14" y2="14" />
              <line x1="0" y1="14" x2="0" y2="20" />
              <line x1="-9.9" y1="9.9" x2="-14" y2="14" />
              <line x1="-14" y1="0" x2="-20" y2="0" />
              <line x1="-9.9" y1="-9.9" x2="-14" y2="-14" />
            </g>
          </g>
        </g>
        
        {/* Hyper-Realistic Tumbleweed 3 - Distant Soft */}
        <g opacity="0.9" filter="url(#softEdge)">
          <g transform="translate(550, 410)">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="550,410; 580,409; 550,410"
              dur="22s"
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0;360"
              dur="7s"
              repeatCount="indefinite"
              additive="sum"
            />
            <circle cx="0" cy="0" r="10" fill="#6B7280" opacity="0.8" />
            <g stroke="#4B5563" strokeWidth="0.8" fill="none" opacity="0.6" strokeLinecap="round">
              <line x1="0" y1="-10" x2="0" y2="-14" />
              <line x1="7" y1="-7" x2="10" y2="-10" />
              <line x1="10" y1="0" x2="14" y2="0" />
              <line x1="7" y1="7" x2="10" y2="10" />
              <line x1="0" y1="10" x2="0" y2="14" />
              <line x1="-7" y1="7" x2="-10" y2="10" />
              <line x1="-10" y1="0" x2="-14" y2="0" />
              <line x1="-7" y1="-7" x2="-10" y2="-10" />
            </g>
          </g>
        </g>
        
        {/* Advanced Dust Particle System - Premium Physics */}
        <g opacity="0.5" filter="url(#dustBlur)">
          {[
            { cx: 450, cy: 390, r: 3.5, dur: 9 },
            { cx: 480, cy: 395, r: 3, dur: 11 },
            { cx: 150, cy: 400, r: 2.5, dur: 13 },
            { cx: 300, cy: 385, r: 3, dur: 10 },
            { cx: 520, cy: 405, r: 2.8, dur: 12 },
            { cx: 200, cy: 395, r: 2.2, dur: 14 },
            { cx: 350, cy: 390, r: 3.2, dur: 9.5 },
            { cx: 250, cy: 400, r: 2.7, dur: 11.5 }
          ].map((particle, i) => (
            <circle
              key={i}
              cx={particle.cx}
              cy={particle.cy}
              r={particle.r}
              fill="#6B7280"
            >
              <animate
                attributeName="cx"
                values={`${particle.cx};${particle.cx + 30};${particle.cx}`}
                dur={`${particle.dur}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values={`${particle.cy};${particle.cy - 8};${particle.cy}`}
                dur={`${particle.dur}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.5;0.2;0.5"
                dur={`${particle.dur}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values={`${particle.r};${particle.r * 1.3};${particle.r}`}
                dur={`${particle.dur * 0.7}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
        
        {/* Hyper-Realistic Wind Lines - Soft Atmospheric Effect */}
        <g opacity="0.25" stroke="#9CA3AF" strokeWidth="1" fill="none" filter="url(#softEdge)" strokeLinecap="round">
          <path d="M 150 250 Q 200 240, 250 250" strokeDasharray="5,5" opacity="0.3">
            <animate
              attributeName="d"
              values="M 150 250 Q 200 240, 250 250; M 155 250 Q 205 240, 255 250; M 150 250 Q 200 240, 250 250"
              dur="8s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.3;0.2;0.3" dur="8s" repeatCount="indefinite" />
          </path>
          <path d="M 200 270 Q 280 265, 360 270" strokeDasharray="5,5" opacity="0.25">
            <animate
              attributeName="d"
              values="M 200 270 Q 280 265, 360 270; M 205 270 Q 285 265, 365 270; M 200 270 Q 280 265, 360 270"
              dur="10s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.25;0.15;0.25" dur="10s" repeatCount="indefinite" />
          </path>
          <path d="M 100 290 Q 150 285, 200 290" strokeDasharray="4,4" opacity="0.2">
            <animate
              attributeName="d"
              values="M 100 290 Q 150 285, 200 290; M 105 290 Q 155 285, 205 290; M 100 290 Q 150 285, 200 290"
              dur="12s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.2;0.1;0.2" dur="12s" repeatCount="indefinite" />
          </path>
        </g>
      </svg>
    </Box>
  );
};

interface Notification {
  id: string;
  notification_type: 'promo' | 'feeder_update' | 'order_update';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  order_id?: string;
  action_url?: string;
  metadata?: any;
}

const Notifications = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userName, setUserName] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.first_name || 
                      user.user_metadata?.full_name?.split(' ')[0] ||
                      user.email?.split('@')[0].split('.')[0] ||
                      '';
          setUserName(name);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUserName();
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      await fetchNotifications();
      
      // Set up real-time subscription for new notifications
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('customer_notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch from order_notifications table
      const { data: orderNotifs, error: orderError } = await supabase
        .from('order_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (orderError) throw orderError;

      // Also check notification_logs for promo offers
      const { data: logNotifs, error: logError } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('notification_type', 'promotion')
        .order('created_at', { ascending: false })
        .limit(20);

      // Combine and format notifications
      const formattedNotifications: Notification[] = [
        ...(orderNotifs || []).map(n => ({
          id: n.id,
          notification_type: n.notification_type as 'promo' | 'feeder_update' | 'order_update',
          title: n.title,
          message: n.message,
          is_read: n.is_read || false,
          created_at: n.created_at,
          order_id: n.order_id,
          action_url: null,
          metadata: null
        })),
        ...(logNotifs || []).map(n => ({
          id: n.id,
          notification_type: 'promo' as const,
          title: n.title,
          message: n.body,
          is_read: n.status === 'clicked',
          created_at: n.created_at || new Date().toISOString(),
          order_id: null,
          action_url: (n.data as any)?.url || null,
          metadata: n.data
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('order_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Try to delete from order_notifications first
      const { error: orderError, data: orderData } = await supabase
        .from('order_notifications')
        .delete()
        .eq('id', notificationId)
        .select();

      // If delete from order_notifications failed or returned no rows, try notification_logs
      if (orderError || !orderData || orderData.length === 0) {
        const { error: logError } = await supabase
          .from('notification_logs')
          .delete()
          .eq('id', notificationId);

        if (logError) {
          console.error('Error deleting notification from notification_logs:', logError);
          // Still remove from UI even if DB delete fails
        }
      }

      // Remove from UI immediately (optimistic update)
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Still remove from UI even if there's an error
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('order_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    } else if (notification.order_id) {
      navigate(`/track-order/${notification.order_id}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'promo':
        return <IconGift size={18} style={{ color: '#6B7280' }} />;
      case 'feeder_update':
      case 'order_update':
        return <IconTruck size={18} style={{ color: '#6B7280' }} />;
      default:
        return <IconBell size={18} style={{ color: '#6B7280' }} />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'promo':
        return { label: 'PROMOTION', color: 'gray' };
      case 'feeder_update':
        return { label: 'FEEDER UPDATE', color: 'blue' };
      case 'order_update':
        return { label: 'ORDER UPDATE', color: 'blue' };
      default:
        return { label: 'NOTIFICATION', color: 'gray' };
    }
  };

  return (
    <Box
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '600px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Paper
        shadow="xs"
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="md" align="center">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => navigate(-1)}
              style={{
                color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <div>
              <Title
                order={2}
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                  lineHeight: '1.2'
                }}
              >
                Notifications
              </Title>
              {userName && (
                <Text
                  size="sm"
                  style={{
                    color: '#6B7280',
                    marginTop: '2px',
                    fontSize: '13px'
                  }}
                >
                  {userName}
                </Text>
              )}
            </div>
          </Group>
          {unreadCount > 0 && (
            <Button
              variant="subtle"
              size="xs"
              onClick={markAllAsRead}
              rightSection={<IconCheck size={14} />}
              style={{
                color: '#374151',
                fontSize: '12px',
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: '6px'
              }}
            >
              Mark all read ({unreadCount})
            </Button>
          )}
        </Group>
      </Paper>

      {/* Main Content */}
      {loading ? (
        <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text size="sm" c="dimmed">Loading notifications...</Text>
        </Box>
      ) : notifications.length === 0 ? (
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center'
          }}
        >
          {/* Ghost Town Animation - Full Quality, No Overlay */}
          <Box
            style={{
              width: '100%',
              maxWidth: '600px',
              marginBottom: '40px',
              position: 'relative'
            }}
          >
            <GhostTownAnimation />
          </Box>

          {/* Message - Below Animation */}
          <Box
            style={{
              maxWidth: '480px',
              marginTop: '0'
            }}
          >
            <Title
              order={3}
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                letterSpacing: '-0.02em'
              }}
            >
              No notifications
            </Title>
            <Text
              style={{
                fontSize: '16px',
                color: '#6B7280',
                fontWeight: 400,
                lineHeight: '1.6',
                letterSpacing: '-0.01em'
              }}
            >
              It's a ghost town here. Looks like you're all caught up
            </Text>
          </Box>
        </Box>
      ) : (
        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Notifications List */}
          <ScrollArea style={{ flex: 1 }}>
            <Box style={{ padding: '8px' }}>
              {notifications.map((notification, index) => {
                const badge = getNotificationBadge(notification.notification_type);
                return (
                  <Paper
                    key={notification.id}
                    shadow="xs"
                    radius="md"
                    style={{
                      marginBottom: '8px',
                      padding: '16px',
                      backgroundColor: notification.is_read ? 'white' : '#F9FAFB',
                      border: notification.is_read 
                        ? '1px solid #E5E7EB' 
                        : '1px solid #D1D5DB',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onClick={() => handleNotificationClick(notification)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = notification.is_read ? '#F9FAFB' : '#F3F4F6';
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notification.is_read ? 'white' : '#F9FAFB';
                      e.currentTarget.style.borderColor = notification.is_read ? '#E5E7EB' : '#D1D5DB';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <Box
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '3px',
                          backgroundColor: '#3B82F6',
                          borderRadius: '0 2px 2px 0'
                        }}
                      />
                    )}

                    <Group align="flex-start" gap="md" wrap="nowrap">
                      {/* Icon */}
                      <Box
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: notification.is_read ? '#F3F4F6' : '#EFF6FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {getNotificationIcon(notification.notification_type)}
                      </Box>

                      {/* Content */}
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group justify="space-between" align="flex-start" mb={4}>
                          <Text
                            style={{
                              fontWeight: notification.is_read ? 500 : 600,
                              fontSize: '15px',
                              color: '#111827',
                              lineHeight: '1.4',
                              flex: 1
                            }}
                          >
                            {notification.title}
                          </Text>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            style={{
                              color: '#9CA3AF',
                              flexShrink: 0
                            }}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </Group>

                        <Text
                          size="sm"
                          style={{
                            color: '#6B7280',
                            lineHeight: '1.5',
                            marginBottom: '12px',
                            fontSize: '14px'
                          }}
                        >
                          {notification.message}
                        </Text>

                        <Group justify="space-between" align="center" gap="xs">
                          <Badge
                            size="sm"
                            variant="light"
                            color={badge.color}
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}
                          >
                            {badge.label}
                          </Badge>
                          <Text
                            size="xs"
                            style={{
                              color: '#9CA3AF',
                              fontSize: '12px',
                              fontWeight: 400
                            }}
                          >
                            {dayjs(notification.created_at).fromNow()}
                          </Text>
                        </Group>
                      </Box>
                    </Group>
                  </Paper>
                );
              })}
            </Box>
          </ScrollArea>
        </Box>
      )}
    </Box>
  );
};

export default Notifications;
