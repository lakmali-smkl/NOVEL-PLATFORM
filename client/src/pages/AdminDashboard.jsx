import React from 'react';
import AdminStatsCards from '../components/AdminStatsCards'; 
import AdminGrowthChart from '../components/AdminGrowthChart'; // 🌟 Import component

const AdminDashboard = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
      
      {/* Total Aggregates Cards Counter Component Row */}
      <AdminStatsCards />

      {/* Realtime Time-Series Activity Line Visualizer Rendering Engine */}
      <AdminGrowthChart />

      {/* Directory management view nodes go down here... */}
    </div>
  );
};

export default AdminDashboard;