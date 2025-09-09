import { DashboardLayoutProps } from "./types";
import Sidebar from "../Sidebar/view";
import NavBar from "../NavBar/view";
import "./styles.css";

export default function DashboardLayout({
  children,
  title,
}: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="dashboard-layout__main-content">
        {/* Navigation Bar */}
        <NavBar title={title} />

        {/* Content Area - Only this section will scroll */}
        <main className="dashboard-layout__content-area">
          {children}
        </main>
      </div>
    </div>
  );
}