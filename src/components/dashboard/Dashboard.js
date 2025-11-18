import React, { useState } from "react";
import {
  Activity,
  Users,
  Calendar,
  DollarSign,
  UserCheck,
  Bed,
  Clock,
  AlertCircle,
  TrendingUp,
  Stethoscope,
  Heart,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export default function Dashboard({ isCollapsed }) {
  const [timeRange, setTimeRange] = useState("week");

  const stats = [
    {
      icon: Users,
      label: "Total Patients Today",
      value: "124",
      change: "+8.3%",
      positive: true,
      color: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-blue-600 dark:text-blue-300",
    },
    {
      icon: Calendar,
      label: "Appointments",
      value: "87",
      change: "+12.5%",
      positive: true,
      color: "bg-green-100 dark:bg-green-900",
      iconColor: "text-green-600 dark:text-green-300",
    },
    {
      icon: UserCheck,
      label: "Available Doctors",
      value: "23/28",
      change: "5 on leave",
      positive: false,
      color: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-300",
    },
    {
      icon: DollarSign,
      label: "Today's Revenue",
      value: "$12,458",
      change: "+15.3%",
      positive: true,
      color: "bg-amber-100 dark:bg-amber-900",
      iconColor: "text-amber-600 dark:text-amber-300",
    },
    {
      icon: Bed,
      label: "Bed Occupancy",
      value: "142/180",
      change: "79% occupied",
      positive: true,
      color: "bg-rose-100 dark:bg-rose-900",
      iconColor: "text-rose-600 dark:text-rose-300",
    },
    {
      icon: AlertCircle,
      label: "Critical Cases",
      value: "8",
      change: "-2 from yesterday",
      positive: true,
      color: "bg-red-100 dark:bg-red-900",
      iconColor: "text-red-600 dark:text-red-300",
    },
    {
      icon: Activity,
      label: "Surgeries Today",
      value: "12",
      change: "3 ongoing",
      positive: true,
      color: "bg-cyan-100 dark:bg-cyan-900",
      iconColor: "text-cyan-600 dark:text-cyan-300",
    },
    {
      icon: Heart,
      label: "Emergency Cases",
      value: "15",
      change: "+3 last hour",
      positive: false,
      color: "bg-orange-100 dark:bg-orange-900",
      iconColor: "text-orange-600 dark:text-orange-300",
    },
  ];

  const patientTrendsData = [
    { date: "Mon", inPatients: 45, outPatients: 120, emergency: 12 },
    { date: "Tue", inPatients: 52, outPatients: 135, emergency: 18 },
    { date: "Wed", inPatients: 48, outPatients: 128, emergency: 15 },
    { date: "Thu", inPatients: 61, outPatients: 142, emergency: 20 },
    { date: "Fri", inPatients: 55, outPatients: 156, emergency: 17 },
    { date: "Sat", inPatients: 38, outPatients: 98, emergency: 22 },
    { date: "Sun", inPatients: 42, outPatients: 87, emergency: 14 },
  ];

  const departmentData = [
    { name: "Cardiology", value: 285, color: "#3b82f6" },
    { name: "Orthopedics", value: 198, color: "#10b981" },
    { name: "Neurology", value: 156, color: "#f59e0b" },
    { name: "Pediatrics", value: 245, color: "#ef4444" },
    { name: "General", value: 312, color: "#8b5cf6" },
    { name: "Emergency", value: 124, color: "#ec4899" },
  ];

  const revenueData = [
    { month: "Jan", revenue: 45000, expenses: 32000 },
    { month: "Feb", revenue: 52000, expenses: 35000 },
    { month: "Mar", revenue: 48000, expenses: 33000 },
    { month: "Apr", revenue: 61000, expenses: 38000 },
    { month: "May", revenue: 55000, expenses: 36000 },
    { month: "Jun", revenue: 68000, expenses: 40000 },
  ];

  const upcomingAppointments = [
    {
      patient: "Sarah Johnson",
      doctor: "Dr. Michael Chen",
      time: "09:30 AM",
      department: "Cardiology",
      type: "Follow-up",
      status: "confirmed",
    },
    {
      patient: "Robert Williams",
      doctor: "Dr. Emily Rodriguez",
      time: "10:00 AM",
      department: "Orthopedics",
      type: "Consultation",
      status: "confirmed",
    },
    {
      patient: "Maria Garcia",
      doctor: "Dr. James Park",
      time: "10:30 AM",
      department: "Pediatrics",
      type: "Check-up",
      status: "pending",
    },
    {
      patient: "David Brown",
      doctor: "Dr. Sarah Mitchell",
      time: "11:00 AM",
      department: "Neurology",
      type: "Emergency",
      status: "urgent",
    },
  ];

  const recentAdmissions = [
    {
      patient: "John Anderson",
      age: 45,
      condition: "Cardiac Arrest",
      department: "Cardiology",
      time: "1 hour ago",
      severity: "critical",
    },
    {
      patient: "Lisa Martinez",
      age: 32,
      condition: "Fracture",
      department: "Orthopedics",
      time: "2 hours ago",
      severity: "moderate",
    },
    {
      patient: "James Wilson",
      age: 58,
      condition: "Diabetes Complication",
      department: "General",
      time: "3 hours ago",
      severity: "stable",
    },
    {
      patient: "Emma Thompson",
      age: 7,
      condition: "High Fever",
      department: "Pediatrics",
      time: "4 hours ago",
      severity: "moderate",
    },
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "moderate":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
      case "stable":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
      case "urgent":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                <Stethoscope className="w-6 h-6" />
                Clinic Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Monday, November 10, 2025 - Real-time clinic overview
              </p>
            </div>
            <div className="flex gap-2">
              {["day", "week", "month"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                    timeRange === range
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      stat.positive
                        ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
                        : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-1 text-sm">
                  {stat.label}
                </p>
                <p className="text-gray-900 dark:text-gray-100 text-xl">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-6">
              <h3 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5" />
                Patient Admission Trends
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Weekly patient flow analysis
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={patientTrendsData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorEmerg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280" }} />
                <YAxis tick={{ fill: "#6b7280" }} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px" }} />
                <Legend />
                <Area type="monotone" dataKey="inPatients" stroke="#3b82f6" fill="url(#colorIn)" />
                <Area type="monotone" dataKey="outPatients" stroke="#10b981" fill="url(#colorOut)" />
                <Area type="monotone" dataKey="emergency" stroke="#ef4444" fill="url(#colorEmerg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-6">
              <h3 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1">
                <Activity className="w-5 h-5" />
                Department-wise Patient Distribution
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Current month breakdown
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="mb-6">
            <h3 className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5" />
              Revenue & Expenses Analysis
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Financial performance overview
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fill: "#6b7280" }} />
              <YAxis tick={{ fill: "#6b7280" }} />
              <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px" }} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Appointments
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
              {upcomingAppointments.map((appointment, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-gray-900 dark:text-gray-100 text-sm">
                          {appointment.patient}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {appointment.doctor} • {appointment.department}
                      </p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm">
                        {appointment.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{appointment.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Bed className="w-5 h-5" />
                Recent Patient Admissions
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
              {recentAdmissions.map((admission, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-gray-900 dark:text-gray-100 text-sm">
                          {admission.patient}
                        </p>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          ({admission.age} years)
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-1 text-sm">
                        {admission.condition}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400 text-sm">
                          {admission.department}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${getSeverityColor(
                            admission.severity
                          )}`}
                        >
                          {admission.severity}
                        </span>
                      </div>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {admission.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
