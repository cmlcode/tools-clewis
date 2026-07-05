import { createBrowserRouter } from "react-router-dom";

import { paths } from "./paths";

import { LauncherPage } from "@/features/launcher/LauncherPage";
import { BarPage } from "@/features/bar/BarPage";

export const router = createBrowserRouter([
  {
    path: paths.launcher,
    element: <LauncherPage />,
  },
  {
    path: paths.bar,
    element: <BarPage />,
  },
]);
