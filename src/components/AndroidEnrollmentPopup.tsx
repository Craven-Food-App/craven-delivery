import { useEffect, useState } from 'react';
import { Box } from '@mantine/core';

interface AndroidEnrollmentPopupProps {
  opened: boolean;
  onClose: () => void;
  onEnroll: () => void;
  neverShowAgain: boolean;
  onNeverShowAgainChange: (checked: boolean) => void;
}

export const AndroidEnrollmentPopup: React.FC<AndroidEnrollmentPopupProps> = ({
  opened,
  onClose,
  onEnroll,
  neverShowAgain,
  onNeverShowAgainChange,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && opened) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [opened]);

  if (!opened) return null;

  return (
    <Box
      className="popup-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'transparent',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        
        .popup-container {
          background: #0a0a0a;
          border-radius: 16px;
          max-width: 1000px;
          width: 75%;
          height: 500px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8),
                      0 0 100px rgba(255, 107, 0, 0.15);
          border: 1px solid rgba(255, 107, 0, 0.2);
          animation: popupSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: grid;
          grid-template-columns: 40% 60%;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @keyframes popupSlideIn {
          from {
            transform: scale(0.92) translateY(30px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.15);
          transform: rotate(90deg);
        }

        .close-btn::before,
        .close-btn::after {
          content: '';
          position: absolute;
          width: 18px;
          height: 2px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 2px;
        }

        .close-btn::before {
          transform: rotate(45deg);
        }

        .close-btn::after {
          transform: rotate(-45deg);
        }

        .popup-left {
          background: linear-gradient(135deg, #1a0f0a 0%, #2d1810 50%, #1a0f0a 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px 30px;
        }

        .popup-left::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(255, 107, 0, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(255, 140, 26, 0.06) 0%, transparent 50%);
          pointer-events: none;
        }

        .ambient-glow {
          position: absolute;
          width: 350px;
          height: 350px;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.3;
          pointer-events: none;
        }

        .glow-1 {
          background: radial-gradient(circle, #ff6b00 0%, transparent 70%);
          top: -80px;
          left: -80px;
          animation: float1 8s ease-in-out infinite;
        }

        .glow-2 {
          background: radial-gradient(circle, #ff8c1a 0%, transparent 70%);
          bottom: -80px;
          right: -80px;
          animation: float2 10s ease-in-out infinite;
        }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, -25px) scale(1.1); }
        }

        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 25px) scale(1.1); }
        }

        .hero-content {
          position: relative;
          z-index: 2;
          text-align: center;
          width: 100%;
        }

        .hero-badge {
          display: inline-block;
          padding: 10px 24px;
          background: linear-gradient(135deg, rgba(255, 107, 0, 0.15) 0%, rgba(255, 140, 26, 0.15) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 107, 0, 0.3);
          border-radius: 50px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #ff6b00;
          margin-bottom: 25px;
        }

        .hero-title {
          font-size: 15px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2.5px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 12px;
        }

        .hero-amount {
          font-size: 100px;
          font-weight: 900;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 0.9;
          margin-bottom: 12px;
          text-shadow: 0 0 80px rgba(255, 215, 0, 0.4);
          filter: drop-shadow(0 10px 30px rgba(255, 215, 0, 0.3));
        }

        .hero-subtitle {
          font-size: 17px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 30px;
        }

        .value-cards {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
        }

        .value-card {
          background: linear-gradient(135deg, rgba(255, 107, 0, 0.1) 0%, rgba(255, 140, 26, 0.08) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 10px;
          padding: 14px 18px;
          min-width: 85px;
          text-align: center;
        }

        .value-card-amount {
          font-size: 24px;
          font-weight: 900;
          color: #ff6b00;
          margin-bottom: 4px;
          line-height: 1;
        }

        .value-card-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.5);
        }

        .popup-right {
          padding: 40px 45px;
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }

        .content-top {
          flex: 1;
        }

        .popup-right::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: linear-gradient(180deg, transparent 0%, #ff6b00 50%, transparent 100%);
          opacity: 0.3;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 14px;
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #4CAF50;
          margin-bottom: 20px;
          width: fit-content;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background: #4CAF50;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { 
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
          }
          50% { 
            opacity: 0.7;
            box-shadow: 0 0 0 4px rgba(76, 175, 80, 0);
          }
        }

        .brand-logo {
          font-size: 44px;
          font-weight: 900;
          background: linear-gradient(135deg, #ff6b00 0%, #ffa500 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 14px;
          line-height: 1;
        }

        .content-title {
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 10px;
          line-height: 1.3;
        }

        .content-description {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.65);
          margin-bottom: 20px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border-left: 2px solid #ff6b00;
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-left-width: 3px;
          transform: translateX(2px);
        }

        .feature-marker {
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #ff6b00 0%, #ff8c1a 100%);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 10px;
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 700;
          color: #fff;
        }

        .feature-content {
          flex: 1;
        }

        .feature-title {
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 2px;
          line-height: 1.2;
        }

        .feature-description {
          font-size: 11px;
          line-height: 1.3;
          color: rgba(255, 255, 255, 0.55);
        }

        .cta-section {
          margin-top: auto;
        }

        .cta-button {
          width: 100%;
          padding: 16px 32px;
          background: linear-gradient(135deg, #ff6b00 0%, #ff8c1a 100%);
          border: none;
          border-radius: 10px;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(255, 107, 0, 0.4);
          position: relative;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .cta-button:hover::before {
          left: 100%;
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(255, 107, 0, 0.6);
        }

        .cta-button span {
          position: relative;
          z-index: 1;
        }

        .footer-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .footer-item {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .footer-separator {
          width: 1px;
          height: 10px;
          background: rgba(255, 255, 255, 0.15);
        }

        @media (max-width: 1200px) {
          .popup-container {
            width: 85%;
          }
        }

        @media (max-width: 900px) {
          .popup-container {
            grid-template-columns: 1fr;
            width: 90%;
            height: auto;
            max-height: 90vh;
            overflow-y: auto;
          }

          .popup-left {
            padding: 35px 25px;
            min-height: 350px;
          }

          .hero-amount {
            font-size: 80px;
          }

          .popup-right {
            padding: 35px 30px;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="popup-container">
        <button className="close-btn" onClick={handleClose}></button>
        
        {/* Left Side - Hero Graphics */}
        <div className="popup-left">
          <div className="ambient-glow glow-1"></div>
          <div className="ambient-glow glow-2"></div>
          
          <div className="hero-content">
            <div className="hero-badge">Android Early Access</div>
            <div className="hero-title">Earn Up To</div>
            <div className="hero-amount">$75</div>
            <div className="hero-subtitle">for participating</div>
            
            <div className="value-cards">
              <div className="value-card">
                <div className="value-card-amount">$25</div>
                <div className="value-card-label">Sign Up</div>
              </div>
              <div className="value-card">
                <div className="value-card-amount">$50</div>
                <div className="value-card-label">Testing</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="popup-right">
          <div className="content-top">
            <div className="status-badge">
              <span className="status-dot"></span>
              Limited Enrollment Open
            </div>

            <h1 className="brand-logo">CRAVE'N</h1>
            <h2 className="content-title">Join Our Exclusive Android Beta Program</h2>
            <p className="content-description">
              Be among the first 100 testers to experience the future of on-demand local commerce, food, grocery, retail, convenience, and courier (CX). Get exclusive early access and earn up to $75 in rewards.
            </p>

            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-marker">1</div>
                <div className="feature-content">
                  <div className="feature-title">Pioneer Access</div>
                  <div className="feature-description">Revolutionary features first</div>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-marker">2</div>
                <div className="feature-content">
                  <div className="feature-title">Real Rewards</div>
                  <div className="feature-description">Up to $75 in rewards</div>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-marker">3</div>
                <div className="feature-content">
                  <div className="feature-title">Direct Impact</div>
                  <div className="feature-description">Shape the final product</div>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-marker">4</div>
                <div className="feature-content">
                  <div className="feature-title">VIP Status</div>
                  <div className="feature-description">Lifetime early adopter perks</div>
                </div>
              </div>
            </div>
          </div>

          <div className="cta-section">
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '12px',
              cursor: 'pointer',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              <input
                type="checkbox"
                checked={neverShowAgain}
                onChange={(e) => onNeverShowAgainChange(e.target.checked)}
                style={{
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                  accentColor: '#ff6b00'
                }}
              />
              <span>Not interested, never show again</span>
            </label>

            <button className="cta-button" onClick={onEnroll}>
              <span>Secure Your Spot Now</span>
            </button>

            <div className="footer-info">
              <div className="footer-item">Limited to 100 testers</div>
              <div className="footer-separator"></div>
              <div className="footer-item">Android only</div>
              <div className="footer-separator"></div>
              <div className="footer-item">Closes soon</div>
            </div>
          </div>
        </div>
      </div>
    </Box>
  );
};

