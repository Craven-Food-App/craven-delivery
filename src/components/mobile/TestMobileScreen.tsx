import React from 'react';

export const TestMobileScreen: React.FC = () => {
  console.log('TestMobileScreen rendering!');
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#FF0000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      color: '#FFFFFF',
      fontSize: '32px',
      fontWeight: 'bold',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div>✅ TEST SCREEN</div>
      <div style={{ fontSize: '20px', marginTop: '20px' }}>
        If you see this RED screen, rendering works!
      </div>
    </div>
  );
};
