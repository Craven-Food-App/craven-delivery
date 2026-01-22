import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AndroidTesterEnrollment: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [remainingSpots, setRemainingSpots] = useState(100);

  // Detect platform
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setIsIOS(true);
    }
  }, []);

  // Fetch remaining spots count
  useEffect(() => {
    const fetchRemainingSpots = async () => {
      try {
        const { count } = await supabase
          .from('android_tester_enrollments')
          .select('*', { count: 'exact', head: true });
        
        if (count !== null) {
          setRemainingSpots(Math.max(0, 100 - count));
        }
      } catch (error) {
        console.error('Error fetching spots:', error);
      }
    };
    fetchRemainingSpots();
  }, []);

  const openDrawer = () => {
    setDrawerOpen(true);
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => {
      setShowSuccess(false);
      setEmail('');
      setFullName('');
    }, 500);
  }, []);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        closeDrawer();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [drawerOpen, closeDrawer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !fullName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both your email and full name.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Use Edge Function for enrollment (public access)
      const { data, error } = await supabase.functions.invoke('tester-enroll', {
        body: {
          email: email.trim(),
          full_name: fullName.trim(),
        }
      });

      if (error) {
        throw error;
      } else if (data?.error === 'already_enrolled') {
        toast({
          title: 'Already Enrolled',
          description: 'This email is already enrolled in the tester program.',
          variant: 'default',
        });
        setShowSuccess(true);
      } else if (data?.success) {
        setShowSuccess(true);
        setRemainingSpots(prev => Math.max(0, prev - 1));
        setTimeout(() => {
          closeDrawer();
        }, 4000);
      }
    } catch (error: any) {
      console.error('Enrollment error:', error);
      toast({
        title: 'Enrollment Failed',
        description: error.message || 'Failed to enroll. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show iOS coming soon message
  if (isIOS) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#ff6b00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px'
          }}>
            🍎
          </div>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px' }}>
            iOS Testing Coming Soon
          </h2>
          <p style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px' }}>
            We're working on bringing the Crave'n iOS app tester program to you soon!
          </p>
          <button
            onClick={() => navigate('/restaurants')}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #ff6b00 0%, #ff8c1a 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #000000;
          color: #ffffff;
          overflow-x: hidden;
        }

        .hero-stage {
          position: relative;
          height: 100vh;
          width: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: url('/assets/android_enrollment_bg.png') center center / cover no-repeat;
          z-index: 0;
        }

        .light-ray {
          position: absolute;
          width: 2px;
          height: 100%;
          background: linear-gradient(to bottom, transparent 0%, rgba(255, 107, 0, 0.3) 50%, transparent 100%);
          transform-origin: top center;
          opacity: 0.4;
        }

        .light-ray:nth-child(1) { left: 20%; transform: rotate(-15deg); animation: flicker 4s ease-in-out infinite; }
        .light-ray:nth-child(2) { left: 35%; transform: rotate(-8deg); animation: flicker 5s ease-in-out infinite 1s; }
        .light-ray:nth-child(3) { left: 65%; transform: rotate(8deg); animation: flicker 6s ease-in-out infinite 2s; }
        .light-ray:nth-child(4) { left: 80%; transform: rotate(15deg); animation: flicker 4.5s ease-in-out infinite 0.5s; }

        @keyframes flicker {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        .phone-hero {
          position: absolute;
          right: 5%;
          top: 50%;
          transform: translateY(-50%) rotateY(-15deg) rotateX(5deg);
          width: 320px;
          height: 650px;
          perspective: 1000px;
          z-index: 2;
          animation: phoneFloat 6s ease-in-out infinite;
        }

        @keyframes phoneFloat {
          0%, 100% { transform: translateY(-50%) rotateY(-15deg) rotateX(5deg); }
          50% { transform: translateY(-48%) rotateY(-12deg) rotateX(3deg); }
        }

        .phone-frame {
          width: 100%;
          height: 100%;
          background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%);
          border-radius: 45px;
          padding: 12px;
          box-shadow: 
            -40px 40px 120px rgba(0, 0, 0, 0.9),
            inset 0 0 0 2px rgba(255, 255, 255, 0.05),
            20px -20px 80px rgba(255, 107, 0, 0.3);
          position: relative;
        }

        .phone-notch {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 28px;
          background: #000000;
          border-radius: 0 0 20px 20px;
          z-index: 10;
        }

        .phone-screen {
          width: 100%;
          height: 100%;
          background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
          border-radius: 38px;
          overflow: hidden;
          position: relative;
        }

        /* App UI on phone - Real Crave'n App */
        .app-interface {
          width: 100%;
          height: 100%;
          background: url('/assets/android_enrollment_phone_app.png') center center / cover no-repeat;
          position: relative;
        }

        .phone-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          right: -100px;
          top: 50%;
          transform: translateY(-50%);
          background: radial-gradient(circle, rgba(255, 107, 0, 0.4) 0%, transparent 60%);
          filter: blur(100px);
          z-index: 1;
          animation: glowPulse 4s ease-in-out infinite;
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: translateY(-50%) scale(1); }
          50% { opacity: 0.9; transform: translateY(-50%) scale(1.1); }
        }

        .content-stage {
          position: relative;
          z-index: 3;
          max-width: 600px;
          padding: 0 60px;
          animation: contentFadeIn 1s ease-out;
        }

        @keyframes contentFadeIn {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .access-badge {
          display: inline-block;
          padding: 8px 20px;
          background: rgba(255, 107, 0, 0.15);
          border: 1px solid rgba(255, 107, 0, 0.4);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2.5px;
          color: #ff6b00;
          margin-bottom: 40px;
        }

        .headline-primary {
          font-size: 82px;
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -3px;
          margin-bottom: 20px;
          background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .headline-secondary {
          font-size: 82px;
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -3px;
          background: linear-gradient(135deg, #ff6b00 0%, #ffa500 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 50px;
          filter: drop-shadow(0 0 40px rgba(255, 107, 0, 0.4));
        }

        .primary-cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 20px 48px;
          background: linear-gradient(135deg, #ff6b00 0%, #ff8c1a 100%);
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 20px 60px rgba(255, 107, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        .primary-cta::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.6s ease;
        }

        .primary-cta:hover {
          transform: translateY(-4px);
          box-shadow: 0 30px 80px rgba(255, 107, 0, 0.7);
        }

        .primary-cta:hover::before {
          left: 100%;
        }

        .capacity-minimal {
          position: absolute;
          bottom: 40px;
          left: 60px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 1px;
        }

        .capacity-number {
          color: #ff6b00;
          font-weight: 700;
        }

        .enrollment-drawer {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 0;
          background: linear-gradient(180deg, #0d0d0d 0%, #000000 100%);
          border-top: 2px solid rgba(255, 107, 0, 0.3);
          z-index: 1000;
          transition: height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        .enrollment-drawer.active {
          height: 100vh;
        }

        .drawer-content {
          max-width: 500px;
          margin: 0 auto;
          padding: 80px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          height: 100%;
        }

        .drawer-close {
          position: absolute;
          top: 40px;
          right: 40px;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .drawer-close:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: rotate(90deg);
        }

        .drawer-close::before,
        .drawer-close::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 18px;
          height: 2px;
          background: rgba(255, 255, 255, 0.8);
          transform: translate(-50%, -50%);
        }

        .drawer-close::before { transform: translate(-50%, -50%) rotate(45deg); }
        .drawer-close::after { transform: translate(-50%, -50%) rotate(-45deg); }

        .drawer-title {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 50px;
          color: #ffffff;
        }

        .form-field {
          margin-bottom: 20px;
        }

        .form-input {
          width: 100%;
          height: 64px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 0 20px;
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #ff6b00;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px rgba(255, 107, 0, 0.1);
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .form-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin: 30px 0;
        }

        .checkbox-input {
          width: 20px;
          height: 20px;
          margin-top: 2px;
          cursor: pointer;
          accent-color: #ff6b00;
        }

        .checkbox-label {
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.6);
        }

        .submit-btn {
          width: 100%;
          height: 64px;
          background: linear-gradient(135deg, #ff6b00 0%, #ff8c1a 100%);
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 20px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(255, 107, 0, 0.6);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-footer {
          text-align: center;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
          letter-spacing: 1.5px;
        }

        .success-view {
          display: none;
          text-align: center;
          padding: 80px 40px;
        }

        .success-view.active {
          display: block;
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .success-icon {
          width: 100px;
          height: 100px;
          margin: 0 auto 40px;
          border: 4px solid #4CAF50;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .success-icon::after {
          content: '';
          width: 30px;
          height: 60px;
          border: solid #4CAF50;
          border-width: 0 5px 5px 0;
          transform: rotate(45deg);
        }

        .success-title {
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .success-message {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.6);
        }

        @media (max-width: 1024px) {
          .phone-hero {
            right: -50px;
            transform: translateY(-50%) rotateY(-10deg) scale(0.8);
          }

          .headline-primary,
          .headline-secondary {
            font-size: 64px;
          }
        }

        @media (max-width: 768px) {
          .hero-stage {
            flex-direction: column;
            justify-content: flex-start;
            padding-top: 80px;
          }

          .phone-hero {
            position: relative;
            right: 0;
            top: 0;
            transform: none;
            width: 280px;
            height: 570px;
            margin-bottom: 60px;
          }

          .phone-glow {
            right: 50%;
            transform: translateX(50%);
          }

          .content-stage {
            padding: 0 30px;
            text-align: center;
          }

          .headline-primary,
          .headline-secondary {
            font-size: 48px;
          }

          .capacity-minimal {
            position: relative;
            left: 0;
            bottom: 0;
            margin-top: 40px;
            text-align: center;
          }

          .drawer-content {
            padding: 60px 30px;
          }
        }
      `}</style>

      {/* Hero Stage */}
      <div className="hero-stage">
        {/* Background */}
        <div className="hero-background">
          <div className="light-ray"></div>
          <div className="light-ray"></div>
          <div className="light-ray"></div>
          <div className="light-ray"></div>
        </div>

        {/* Phone Glow */}
        <div className="phone-glow"></div>

        {/* Phone Hero */}
        <div className="phone-hero">
          <div className="phone-frame">
            <div className="phone-notch"></div>
            <div className="phone-screen">
              <div className="app-interface"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content-stage">
          <div className="access-badge">Android Early Access</div>
          <h1 className="headline-primary">Earn up to</h1>
          <h1 className="headline-secondary">$75</h1>
          <button className="primary-cta" onClick={openDrawer}>
            Request Access
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Capacity indicator */}
        <div className="capacity-minimal">
          <span className="capacity-number">{remainingSpots}</span> of 100 spots remaining
        </div>
      </div>

      {/* Enrollment Drawer */}
      <div className={`enrollment-drawer ${drawerOpen ? 'active' : ''}`}>
        <div className="drawer-close" onClick={closeDrawer}></div>
        
        <div className="drawer-content">
          {/* Form View */}
          <div style={{ display: showSuccess ? 'none' : 'block' }}>
            <h2 className="drawer-title">You're almost in.</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <input
                  type="email"
                  className="form-input"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  id="agree"
                  required
                />
                <label className="checkbox-label" htmlFor="agree">
                  I confirm I have an Android device and agree to participate in testing
                </label>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Enrolling...' : 'Enroll Now'}
              </button>

              <p className="form-footer">Limited to 100 testers • Closes when full</p>
            </form>
          </div>

          {/* Success View */}
          <div className={`success-view ${showSuccess ? 'active' : ''}`}>
            <div className="success-icon"></div>
            <h2 className="success-title">You're in.</h2>
            <p className="success-message">Watch your inbox for next steps.</p>
          </div>
        </div>
      </div>

    </>
  );
};

export default AndroidTesterEnrollment;
