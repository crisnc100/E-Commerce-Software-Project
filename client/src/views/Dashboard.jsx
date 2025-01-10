import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from '../components/SideBar/SideBar';
import NavBar from '../components/NavBar/NavBar';
import apiService from '../services/apiService';



const Dashboard = ({ user }) => {
    const [sidebarToggle, setSidebarToggle] = useState(false);  // State to control the visibility of the sidebar



    return (
        <div className="flex min-h-screen bg-white">
            {/* Sidebar as part of flex layout */}
            <SideBar sidebarToggle={sidebarToggle} />

            {/* Main Content Area */}
            <div className="flex-1">
                <NavBar
                    sidebarToggle={sidebarToggle}
                    setSidebarToggle={setSidebarToggle}
                    role={user.role}
                />
                <main className="p-4">
                    <Outlet context={{ user }} />
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
