import React from 'react';
import { useLocation } from 'react-router-dom';
import CtoTrainingHome from './CtoTrainingHome';
import CtoTrainingModuleDetail from './CtoTrainingModuleDetail';
import CtoTrainingLesson from './CtoTrainingLesson';
import CtoTrainingProgress from './CtoTrainingProgress';

const CtoTrainingRouter: React.FC = () => {
  const location = useLocation();
  
  // Extract the training sub-path from the current location
  // /cto/training -> home
  // /cto/training/progress -> progress
  // /cto/training/modules/123 -> module detail
  // /cto/training/lessons/456 -> lesson detail
  const path = location.pathname;
  
  // Handle progress page
  if (path.includes('/training/progress')) {
    return <CtoTrainingProgress />;
  }
  
  // Handle module detail page
  if (path.includes('/training/modules/')) {
    const moduleId = path.split('/training/modules/')[1]?.split('/')[0];
    if (moduleId) {
      return <CtoTrainingModuleDetail />;
    }
  }
  
  // Handle lesson detail page
  if (path.includes('/training/lessons/')) {
    const lessonId = path.split('/training/lessons/')[1]?.split('/')[0];
    if (lessonId) {
      return <CtoTrainingLesson />;
    }
  }
  
  // Default to home - handles /cto/training and any other training paths
  return <CtoTrainingHome />;
};

export default CtoTrainingRouter;

