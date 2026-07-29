import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

const AdminGrowthChart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGrowthData = async () => {
      try {
        // Note: Assumes proxy or baseUrl handles your backend location
        const response = await fetch(`${API_BASE_URL}/api/admin/growth`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch analytics data');
        
        const data = await response.json();
        const mergedMap = {};

        // 1. Map user signups
        data.users.forEach(item => {
          if (!mergedMap[item._id]) mergedMap[item._id] = { date: item._id, Users: 0, Novels: 0, Articles: 0 };
          mergedMap[item._id].Users = item.count;
        });

        // 2. Map novel creations
        data.novels.forEach(item => {
          if (!mergedMap[item._id]) mergedMap[item._id] = { date: item._id, Users: 0, Novels: 0, Articles: 0 };
          mergedMap[item._id].Novels = item.count;
        });

        // 3. Map article writes
        data.articles.forEach(item => {
          if (!mergedMap[item._id]) mergedMap[item._id] = { date: item._id, Users: 0, Novels: 0, Articles: 0 };
          mergedMap[item._id].Articles = item.count;
        });

        // Convert key-value hash map back into a sorted chronological array
        const formattedData = Object.values(mergedMap).sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );

        setChartData(formattedData);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGrowthData();
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500">Compiling growth metrics...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">Platform Growth Trends</h2>
        <p className="text-sm text-gray-500">Tracking user registration and platform creation events over time</p>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#888888"
              fontSize={12}
              tickFormatter={(str) => {
                const date = new Date(str);
                return isNaN(date) ? str : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis stroke="#888888" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            <Legend verticalAlign="top" height={36} />
            
            <Line type="monotone" dataKey="Users" stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Novels" stroke="#10b981" strokeWidth={2.5} />
            <Line type="monotone" dataKey="Articles" stroke="#f59e0b" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdminGrowthChart;