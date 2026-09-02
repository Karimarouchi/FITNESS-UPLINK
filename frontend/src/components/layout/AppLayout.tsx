import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

export function AppLayout() {
  return (
    <div className="fu-app" id="app">
      <div className="app-shell">
        <AppSidebar />
        <div className="main">
          <AppTopbar />
          <div className="main-content">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
