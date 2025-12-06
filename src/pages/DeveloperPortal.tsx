import React from 'react';
import CodeEditorPortal from '@/components/cto/CodeEditorPortal';
import { useNavigate } from 'react-router-dom';

const DeveloperPortal: React.FC = () => {
  const navigate = useNavigate();

  return (
    <CodeEditorPortal 
      standalone={true}
      onBack={() => navigate('/hub/department/technology')}
    />
  );
};

export default DeveloperPortal;


