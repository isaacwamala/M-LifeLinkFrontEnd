import React, { useState, useRef, useEffect } from "react";
import { Menu, Home, BarChart3, Users, Settings, Bell, Antenna, User, ArchiveRestore, ChevronLeft, ChevronDown, ChevronRight, FileText, Folder, Shield, LogOut, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from '../assets/i.png';
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../redux/slice/authSlice";
import { API_BASE_URL } from "../general/constants";
import apiRequest from "../general/common";

export function Nav({ isCollapsed, toggleSidebar, toggleTheme, theme }) {
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [showUserModal, setShowUserModal] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const { role } = useSelector((state) => state.roles);
  const userModalRef = useRef(null);



  const menuItems = [
    { icon: Home, label: "Dashboard", active: true, link: "/dashboard" },
    // { icon: BarChart3, label: "Analytics", link: "/analytics" },
    // { icon: ArchiveRestore, label: "Suppliers", link: "/suppliers" },
    // { icon: Antenna, label: "Products Categories", link: "/categories" },

    {
      icon: Settings,
      label: "Configurations",
      hasDropdown: true,
      children: [
        { label: "Unit Of Measure", icon: Settings, link: "/unit_of_measure" },
        { label: "UOM converter", icon: Shield, link: "/convert_different_uoms_in_terms_of_product_base_unit" },
      ]
    },

    // Ware house and supplier management
    {
      icon: Settings,
      label: "Warehouse/Suppliers",
      hasDropdown: true,
      children: [
        { label: "Suppliers", icon: Settings, link: "/suppliers" },
        { label: "WareHouses", icon: Shield, link: "/warehouses" },
      ]
    },

    // Hospital items/equipements
    {
      icon: Settings,
      label: "Pharmacuetical items",
      hasDropdown: true,
      children: [
        { icon: Antenna, label: "item categories", link: "/categories" },
        { label: "medical items", icon: Settings, link: "/medical_supply_items" },
      ]
    },

    //Purchase orders
    {
      icon: Settings,
      label: "Purchase orders",
      hasDropdown: true,
      children: [
        { icon: Antenna, label: "create purchase order", link: "/create_purchase_order" },
        { label: "purchase orders", icon: Settings, link: "/purchase_orders" },
         { label: "Supplier order payments", icon: Settings, link: "/supplier/order_payments" },
      ]
    },

    // Register stock
    {
      icon: Settings,
      label: "Stock and Inventory",
      hasDropdown: true,
      children: [
        { icon: Antenna, label: "register stock", link: "/register_medical_stock" },
        { label: "Manage stock", icon: Settings, link: "/medical_stock" },
        { label: "stock adjustments", icon: Settings, link: "/stock_adjustments" },
        { label: "Adjustment logs", icon: Settings, link: "/stock_adjustments_logs" },
        { label: "Inventory", icon: Settings, link: "/inventory" }
      ]
    },

    {
      icon: Users,
      label: "Auth & OAuth",
      hasDropdown: true,
      children: [
        { label: "register user", icon: Shield, link: "/create_user_account" },
        { label: "All Users", icon: Users, link: "/users" },
        { label: "Assign roles", icon: Shield, link: "/assign_role_to_user" },
        { label: "Account types", icon: FileText, link: "/usergroups" },
      ]
    },





  ];

  const toggleDropdown = (index) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleUserModal = () => {
    setShowUserModal(prev => !prev);
  };

  // Close user modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userModalRef.current && !userModalRef.current.contains(event.target)) {
        setShowUserModal(false);
      }
    };

    if (showUserModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserModal]);




  return (
    <>
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 h-16 bg-white dark:bg-gray-900 shadow-md z-10 transition-colors duration-300">
        <div className="h-full flex items-center justify-between px-6">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>

          {/* Make the theme toggle button */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          {/* Notifications + Profile */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Bell className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
            </button>

            {/* User Profile with Modal */}
            <div className="relative" ref={userModalRef}>
              <div
                onClick={toggleUserModal}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors"
              >
                <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{user?.data?.user?.username}</p>
                  {/* <p className="text-gray-500 dark:text-gray-400 text-xs">Admin</p> */}
                </div>
              </div>

              {/* User Modal Dropdown */}
              {showUserModal && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <a
                    href="#"
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <UserCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    <span className="text-gray-700 dark:text-gray-200">User Profile</span>
                  </a>
                  <a
                    href="/account_settings"
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    <span className="text-gray-700 dark:text-gray-200">My Account</span>
                  </a>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <a
                    href="/"
                    className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-red-600 dark:text-red-400">Logout</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 bg-gray-900 dark:bg-gray-800 text-gray-100 dark:text-gray-100 transition-all duration-300 z-20 shadow-lg ${isCollapsed ? "w-20" : "w-72"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-4 border-b border-gray-800 dark:border-gray-700 flex flex-col items-center justify-between">
            <div className="flex items-center gap-2">
              {!isCollapsed && (
                <img
                  src={logo}
                  alt="Logo"
                  className="w-10 h-10 rounded-full"
                />
              )}
              <h1
                className={`text-white dark:text-gray-100 text-lg font-bold transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0" : "opacity-100"}`}
              >
                MEDICONNECT
              </h1>
            </div>
            <button
              onClick={toggleSidebar}
              className={`p-1 hover:bg-gray-800 dark:hover:bg-gray-700 rounded transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
            >
              <ChevronLeft className="w-5 h-5 text-gray-400 dark:text-gray-200" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isOpen = openDropdowns[index];

                return (
                  <li key={index} className="group relative">
                    {/* Main Menu Item */}
                    {item.hasDropdown ? (
                      <div
                        onClick={() => !isCollapsed && toggleDropdown(index)}
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${item.active
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 dark:text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className={`transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? "opacity-0 w-0" : "opacity-100"}`}>
                            {item.label}
                          </span>
                        </div>

                        {/* Dropdown Arrow */}
                        {!isCollapsed && (
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    ) : (
                      <Link
                        to={item.link}
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors ${item.active
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 dark:text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className={`transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? "opacity-0 w-0" : "opacity-100"}`}>
                            {item.label}
                          </span>
                        </div>
                      </Link>
                    )}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs rounded bg-gray-800 dark:bg-gray-700 text-white dark:text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                        {item.label}
                      </span>
                    )}

                    {/* Dropdown Items */}
                    {item.hasDropdown && !isCollapsed && isOpen && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {item.children.map((child, childIndex) => {
                          const ChildIcon = child.icon;
                          return (
                            <li key={childIndex}>
                              <Link
                                to={child.link}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white transition-colors"
                              >
                                <ChildIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 dark:border-gray-700">
            <div className={`text-gray-400 dark:text-gray-300 text-xs transition-all duration-300 ${isCollapsed ? "text-center" : ""}`}>
              {isCollapsed ? "©" : "© 2025 MyApp"}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}