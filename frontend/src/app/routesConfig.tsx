import { RouteObject } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { OverviewPage } from '../pages/OverviewPage';
import { MachinesPage } from '../pages/MachinesPage';
import { MachineDetailsPage } from '../pages/MachineDetailsPage';
import { AlertsPage } from '../pages/AlertsPage';
import { MaintenancePage } from '../pages/MaintenancePage';
import { ReportsPage } from '../pages/ReportsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AssistantPage } from '../pages/AssistantPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { Navigate } from 'react-router-dom';

export const routesConfig: RouteObject[] = [
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />,
      },
      {
        path: 'overview',
        element: <OverviewPage />,
      },
      {
        path: 'machines',
        element: <MachinesPage />,
      },
      {
        path: 'machines/:machineId',
        element: <MachineDetailsPage />,
      },
      {
        path: 'alerts',
        element: <AlertsPage />,
      },
      {
        path: 'maintenance',
        element: <MaintenancePage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'assistant',
        element: <AssistantPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];
