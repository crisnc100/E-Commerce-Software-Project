import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from '../components/SideBar/SideBar';
import NavBar from '../components/NavBar/NavBar';
import apiService from '../services/apiService';



const Dashboard = ({user}) => {

    

    return (
        <div className="flex min-h-screen bg-white">
            {/* Sidebar */}
            <SideBar />

            {/* Main Content Area */}
            <div className="flex-1 ml-72"> {/* Adjust the 'ml-72' to match the sidebar width */}
                <NavBar role={user.role} />
                <main className="p-4">
                <Outlet context={{ user }} /> 
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
