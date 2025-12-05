// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;


import React from "react";

export default function PoliceMonitoring() {
  return (
    <div className="w-full h-full flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-xl p-4 flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-4">Garuda Police Portal</h2>
        <nav className="flex flex-col gap-2">
          <button className="text-left px-3 py-2 rounded-lg bg-red-500 text-white font-medium">Real-time Monitoring</button>
          <button className="text-left px-3 py-2 rounded-lg hover:bg-gray-200">Auto FIR Generation</button>
          <button className="text-left px-3 py-2 rounded-lg hover:bg-gray-200">SOS Tracking</button>
          <button className="text-left px-3 py-2 rounded-lg hover:bg-gray-200">Analytics</button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Police Monitoring</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-gray-600">Active SOS Alerts</p>
            <p className="text-3xl font-bold">7</p>
            <p className="text-sm text-green-600">+3 in last hour</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-gray-600">Police Units Deployed</p>
            <p className="text-3xl font-bold">89</p>
            <p className="text-sm text-gray-500">Across 12 states</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-gray-600">High-Risk Zones</p>
            <p className="text-3xl font-bold">15</p>
            <p className="text-sm text-gray-500">Under surveillance</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-gray-600">Avg Response Time</p>
            <p className="text-3xl font-bold">3.4min</p>
            <p className="text-sm text-green-600">4s faster today</p>
          </div>
        </div>

        {/* Map + Active Emergency Section */}
        <div className="grid grid-cols-3 gap-4">
          {/* Map */}
          <div className="col-span-2 bg-white rounded-xl shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">Garuda Live Surveillance Map</h2>
              <button className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300">Refresh</button>
            </div>
            <div className="w-full h-[480px] bg-gray-300 rounded-lg flex items-center justify-center">
              {/* Your map component goes here */}
              <p className="text-gray-700">Map Placeholder</p>
            </div>
          </div>

          {/* Active Emergency Cases */}
          <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-4 overflow-y-auto max-h-[550px]">
            <h2 className="text-xl font-semibold mb-2">Active Emergency Cases</h2>

            {[ 
              { title: "Mobile App SOS", loc: "Hyderabad, TS", time: "just now", tag: "critical" },
              { title: "Emergency SOS", loc: "Maredpally, Hyd", time: "2 min ago", tag: "critical" },
              { title: "Medical Emergency", loc: "Tracking Route, UK", time: "4 min ago", tag: "high" },
              { title: "Restricted Area Entry", loc: "Border Zone, JK", time: "5 min ago", tag: "alert" }
            ].map((item, index) => (
              <div key={index} className="border rounded-lg p-3 flex flex-col gap-2 bg-gray-50">
                <div className="flex justify-between">
                  <p className="font-bold">{item.title}</p>
                  <span className="px-2 py-1 text-xs rounded bg-red-500 text-white">{item.tag}</span>
                </div>
                <p className="text-gray-600 text-sm">{item.loc}</p>
                <p className="text-gray-500 text-xs">{item.time}</p>
                <div className="flex gap-2 mt-2">
                  <button className="flex-1 bg-gray-200 hover:bg-gray-300 py-1 rounded">View Details</button>
                  <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-1 rounded">Dispatch Unit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
