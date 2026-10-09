import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { FleetProvider } from '../context/FleetContext';

export const App: React.FC = () => {
  return (
    <FleetProvider>
      <RouterProvider router={router} />
    </FleetProvider>
  );
};

export default App;
