import React from "react";

interface CardProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children }) => (
  <div
    style={{
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      background: "#ffffff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      padding: 16,
    }}
  >
    {children}
  </div>
);

export const CardContent: React.FC<CardProps> = ({ children }) => (
  <div>{children}</div>
);

export default { Card, CardContent };

