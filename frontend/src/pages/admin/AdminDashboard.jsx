import React, { useState } from 'react';
import { 
  UsersIcon,
  CalendarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const AdminDashboard = ({ loading, summary, user }) => {
  const [activeTab, setActiveTab] = useState('events');

  if (loading || !summary) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { metrics = [], breakdowns = {}, recentItems = [] } = summary;

  // Process Metrics
  const getMetric = (labelSubstring) => metrics.find(m => m.label.toLowerCase().includes(labelSubstring.toLowerCase()))?.value || 0;
  
  const totalUsers = getMetric('Total users');
  const activeUsers = getMetric('Active users');
  const totalEvents = getMetric('Total events');
  const totalResources = getMetric('Total resources');
  const pendingApprovals = getMetric('Pending approvals');
  const approvedResources = getMetric('Approved resources');

  // Process Pending Approvals by type
  const pendingEvents = recentItems.filter(item => item.item_type === 'event');
  const pendingResources = recentItems.filter(item => item.item_type === 'resource');
  const pendingSocieties = recentItems.filter(item => item.item_type === 'society');

  const activeTabItems = 
    activeTab === 'events' ? pendingEvents : 
    activeTab === 'resources' ? pendingResources : 
    pendingSocieties;

  // Icons for tabs/rows
  const getTabIcon = (type) => {
    if (type === 'events' || type === 'event') return CalendarIcon;
    if (type === 'resources' || type === 'resource') return DocumentTextIcon;
    return UserGroupIcon;
  };

  const getTabColor = (type) => {
    if (type === 'events' || type === 'event') return { text: 'text-indigo-600', bg: 'bg-indigo-50' };
    if (type === 'resources' || type === 'resource') return { text: 'text-amber-600', bg: 'bg-amber-50' };
    return { text: 'text-rose-600', bg: 'bg-rose-50' };
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Analytics Helpers
  const usersByRole = breakdowns.usersByRole || [];
  const eventsByStatus = breakdowns.eventsByStatus || [];

  return (
    <section className="space-y-6 animate-fade-in">
      {/* QUICK ACTION BUTTONS */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600"></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/pending-approvals" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 inline-flex items-center">
            <CheckCircleIcon className="-ml-1 mr-1.5 h-4 w-4" />
            Review approvals
          </Link>
          <Link to="/admin/manage-societies" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 inline-flex items-center">
            <UserGroupIcon className="-ml-1 mr-1.5 h-4 w-4" />
            Manage societies
          </Link>
          <Link to="/admin/users" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center">
            <UsersIcon className="-ml-1 mr-1.5 h-4 w-4 text-slate-400" />
            Manage users
          </Link>
        </div>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        
        {/* Total Users */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-blue-50 to-transparent rounded-full group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Total Users</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shadow-inner">
              <UsersIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-sm relative z-10">
            <span className="text-slate-500 font-medium w-full flex justify-between">
              <span><span className="text-slate-800 font-bold">{activeUsers}</span> Active</span>
            </span>
          </div>
        </div>

        {/* Total Events */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-indigo-50 to-transparent rounded-full group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Total Events</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{totalEvents}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shadow-inner">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-sm relative z-10">
            <span className="text-slate-500 font-medium w-full flex justify-between">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-sm"></span> {eventsByStatus.find(e => e.label === 'open')?.value || 0} Open</span>
            </span>
          </div>
        </div>

        {/* Total Resources */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-amber-50 to-transparent rounded-full group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Resources</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{totalResources}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shadow-inner">
              <DocumentTextIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-sm relative z-10">
            <span className="text-slate-500 font-medium w-full flex justify-between items-center">
              <span className="text-emerald-600 font-bold">{approvedResources} Approved</span>
            </span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-rose-50 to-transparent rounded-full group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Pending</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{pendingApprovals}</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shadow-inner animate-pulse">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-sm relative z-10">
            <span className="text-slate-500 font-medium w-full flex justify-between items-center">
              <span className="text-rose-600 font-bold text-xs uppercase tracking-wider">Needs Review</span>
            </span>
          </div>
        </div>
      </div>

      {/* PENDING APPROVALS LIST */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center">
              {pendingApprovals > 0 && (
                <span className="relative flex h-2.5 w-2.5 mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
              Action center: Pending approvals
            </h2>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl self-start lg:self-auto overflow-x-auto w-full lg:w-auto">
            {['events', 'resources', 'societies'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 capitalize whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {tab} ({tab === 'events' ? pendingEvents.length : tab === 'resources' ? pendingResources.length : pendingSocieties.length})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Submission Details</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Submitted By</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {activeTabItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-500">
                    No pending {activeTab} to review. You're all caught up! 🎉
                  </td>
                </tr>
              ) : (
                activeTabItems.map((row) => {
                  const Icon = getTabIcon(row.item_type);
                  const colors = getTabColor(row.item_type);
                  const author = row.subtitle?.split(' · ')[1] || 'Unknown User';
                  const init = author.charAt(0).toUpperCase();

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center ${colors.bg}`}>
                            <Icon className={`h-5 w-5 ${colors.text}`} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{row.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5 capitalize">{row.item_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 mr-3 border border-slate-200">
                            {init}
                          </div>
                          <div className="text-sm font-medium text-slate-700">{author}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatDate(row.meta)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 inline-flex text-[10px] uppercase tracking-wider font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Link to="/admin/pending-approvals" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200" title="Review">
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30 flex justify-center">
          <Link to="/admin/pending-approvals" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Manage all pending requests →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        
        {/* ANALYTICS SNAPSHOT - Users By Role */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center">
              Active users by role
            </h2>
          </div>
          <div className="space-y-4">
            {usersByRole.map((stat, i) => {
              const colors = ['bg-indigo-500', 'bg-blue-400', 'bg-cyan-400', 'bg-emerald-400'];
              const color = colors[i % colors.length];
              const percent = activeUsers ? Math.round((stat.value / activeUsers) * 100) : 0;
              return (
                <div key={i} className="group">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors capitalize">{stat.label.replace('_', ' ')}</span>
                    <span className="text-slate-500 font-medium">{stat.value} <span className="text-xs text-slate-400">({percent}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`${color} h-2 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ANALYTICS SNAPSHOT - Events By Status */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center">
              Events by status
            </h2>
          </div>
          <div className="h-40 flex items-end justify-around space-x-2 sm:space-x-4">
            {eventsByStatus.map((item, i) => {
              const maxVal = Math.max(...eventsByStatus.map(e => e.value), 1);
              const heightPercent = Math.max((item.value / maxVal) * 100, 5); // min height 5%
              return (
                <div key={i} className="w-16 flex flex-col items-center group h-full justify-end">
                  <div className="text-xs font-semibold text-slate-600 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 px-2 py-0.5 rounded">{item.value}</div>
                  <div 
                    className="w-full bg-gradient-to-t from-emerald-100 to-emerald-400 rounded-t-lg group-hover:from-emerald-200 group-hover:to-emerald-500 transition-all shadow-sm" 
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                  <div className="mt-3 text-[10px] sm:text-xs font-bold text-slate-500 truncate w-full text-center uppercase tracking-wider">{item.label}</div>
                </div>
              );
            })}
            {eventsByStatus.length === 0 && (
               <div className="text-sm text-slate-500 w-full text-center pb-10">No events data available.</div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};

export default AdminDashboard;
