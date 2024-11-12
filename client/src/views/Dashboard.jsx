import React from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from '../components/SideBar/SideBar';
import NavBar from '../components/NavBar/NavBar';

const Dashboard = () => {
    return (
        <div className="flex min-h-screen bg-white">
            {/* Sidebar */}
            <SideBar />

            {/* Main Content Area */}
            <div className="flex-1 ml-72"> {/* Adjust the 'ml-72' to match the sidebar width */}
                <NavBar />
                <main className="p-4">
                    <Outlet /> {/* Renders the routed components */}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
