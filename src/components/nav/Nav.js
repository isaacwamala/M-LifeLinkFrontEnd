import React, { useState, useRef, useEffect } from "react";
import {
  Menu, Home, Users, Settings,
  User, ChevronLeft, ChevronDown, Wrench,
  FileText, LogOut, UserCircle, Store, CalendarMinus2, Hospital, FlaskConical, Pill, Send, BedDouble, DollarSign,
  DoorOpen, UserCheck, UserPlus, ShieldCheck, Layers,
  Truck, Warehouse, Package, Ruler, ClipboardList, ShoppingCart, Banknote, CreditCard,
  SlidersHorizontal, PackagePlus, Boxes, RefreshCw, ScrollText,Bed,
  UserRound, CalendarCheck, CalendarDays, CalendarClock, CalendarRange,
  Microscope, TestTube2, TestTube, ArrowLeftRight, Tag, Monitor, TrendingUp, Receipt, History,
  BarChart3, Stethoscope, LayoutDashboard
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from '../assets/i.png';
import { useSelector, useDispatch } from "react-redux";
import { API_BASE_URL } from "../general/constants";
import { getAvailableDashboards } from "../general/dashboardRoles";
import apiRequest from "../general/common";
import { NotificationBell } from "../notifications/NotificationBell";
import { toast, ToastContainer } from "react-toastify";
import { logoutUser } from "../redux/slice/authSlice"; //import logout user action from redux slice

export function Nav({ isCollapsed, toggleSidebar, toggleTheme, theme }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const { role } = useSelector((state) => state.roles);
  const userModalRef = useRef(null);

  // use the logout user action to logout the user using redux
  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()); // Dispatch loginUser action with form data
      localStorage.removeItem("user");
      localStorage.removeItem("encryptedData");
      localStorage.removeItem("persist:root");
      toast.success("Logout Successful");
      const navigateAfterDelay = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000)); //delay 1 second
        navigate("/");
      };
      navigateAfterDelay();
    } catch (error) {
      toast.error("error occured");
    }
  };




  const roleIds = user?.data?.user?.role_id;
  const availableDashboards = getAvailableDashboards(roleIds);

  const dashboardMenuItem =
    availableDashboards.length === 0
      ? null
      : availableDashboards.length === 1
      ? { icon: Home, label: availableDashboards[0].label, active: true, link: availableDashboards[0].path }
      : {
          icon: Home,
          label: "Dashboard",
          active: true,
          hasDropdown: true,
          children: availableDashboards.map((d) => ({ icon: Home, label: d.label, link: d.path })),
        };

  const menuItems = [
    ...(dashboardMenuItem ? [dashboardMenuItem] : []),

    {
      icon: Wrench,
      label: "Medical configurations",
      hasDropdown: true,
      children: [
        { label: "Wards", icon: BedDouble, link: "/ward_manager" },
        { label: "Medical rooms", icon: DoorOpen, link: "/medical_rooms" },
        { label: "Assign doctors to rooms", icon: UserCheck, link: "/doctor/rooms/assignments" },
        { label: "Lab Instruments", icon: Microscope, link: "/lab_instruments" },
        { label: "Department staffing", icon: Users, link: "/department_staffing" },
        { label: "Business Settings", icon: Settings, link: "/business_settings" },
      ]
    },


    {
      icon: Users,
      label: "User management",
      hasDropdown: true,
      children: [
        { label: "register user", icon: UserPlus, link: "/create_user_account" },
        { label: "All Users", icon: Users, link: "/users" },
        { label: "Assign roles", icon: ShieldCheck, link: "/assign_role_to_user" },
        { label: "Account types", icon: Layers, link: "/usergroups" },
      ]
    },


    // Warehouse and supplier management
    {
      icon: Truck,
      label: "Supply and purchase",
      hasDropdown: true,
      children: [
        { label: "Suppliers", icon: Truck, link: "/suppliers" },
        { label: "WareHouses", icon: Warehouse, link: "/warehouses" },
        { label: "Product items", icon: Package, link: "/medical_supply_items" },
        { label: "UOM converter", icon: Ruler, link: "/convert_different_uoms_in_terms_of_product_base_unit" },
        { label: "Quotations", icon: ClipboardList, link: "/rfqs" },
        { icon: ShoppingCart, label: "create purchase order", link: "/create_purchase_order" },
        { label: "purchase orders", icon: ShoppingCart, link: "/purchase_orders" },
        { label: "Supplier payments", icon: Banknote, link: "/supplier/order_payments" },
        { label: "Supplier order payments", icon: CreditCard, link: "/supplier/order_payments/analysis" },
      ]
    },

    {
      icon: Boxes,
      label: "Stock management",
      hasDropdown: true,
      children: [
        { label: "Variant Options Manager", icon: SlidersHorizontal, link: "/variant_options_manager" },
        { label: "Product items", icon: Package, link: "/medical_supply_items" },
        { label: "UOM conversion", icon: Ruler, link: "/convert_different_uoms_in_terms_of_product_base_unit" },
        { icon: PackagePlus, label: "register stock", link: "/register_medical_stock" },
        { label: "Manage stock", icon: Boxes, link: "/medical_stock" },
        { label: "stock adjustments", icon: RefreshCw, link: "/stock_adjustments" },
        { label: "Adjustment logs", icon: ScrollText, link: "/stock_adjustments_logs" },
        // { label: "Stock returns", icon: RefreshCw, link: "/stock_returns" },
      ]
    },

    // Inventory
    { icon: Boxes, label: "Inventory", link: "/inventory" },

    { icon: Send, label: "Send Notifications", link: "/send_notifications" },

    // Patients
    {
      icon: UserRound,
      label: "Patients",
      hasDropdown: true,
      children: [
        { icon: UserRound, label: "Manage patients", link: "/patients" },
      ]
    },

    // Appointments
    {
      icon: CalendarMinus2,
      label: "Appointments",
      hasDropdown: true,
      children: [
        { icon: CalendarCheck, label: "Manage appointments", link: "/appointments/management" },
        { icon: CalendarDays, label: "Appointments Calender", link: "/appointments/calendar" },
        { icon: CalendarClock, label: "Appointments Today", link: "/appointments/today" },
        { icon: CalendarRange, label: "Available slots", link: "/appointments/available_slots" },
      ]
    },

    // Patient Visits
    {
      icon: Hospital,
      label: "Visits",
      hasDropdown: true,
      children: [
        { label: "Patient visits", icon: ClipboardList, link: "/patient_visits" },
      ]
    },

    // Lab configs
    {
      icon: FlaskConical,
      label: "Laboratory",
      hasDropdown: true,
      children: [
        { icon: FlaskConical, label: "Manage lab sections", link: "/lab_sections" },
        { label: "Lab instruments", icon: Microscope, link: "/instruments" },
        { label: "Specimens", icon: TestTube2, link: "/specimens" },
        { label: "Lab Test types", icon: TestTube, link: "/test_types" },
        { label: "Specimens to test types", icon: ArrowLeftRight, link: "/manage_specimen/and_their_test_types" },
        { label: "Result parameters", icon: SlidersHorizontal, link: "/manage/test_types_result/parameter_measure/setup" },
        { label: "Patient Lab Tests ", icon: ClipboardList, link: "/patient_lab/test/requests" },
        { icon: FileText, label: "Tests and Results", link: "/patient_test_and_results" },
      ]
    },


    {
      icon: Pill,
      label: "Pharmacy",
      hasDropdown: true,
      children: [
        { label: "Unit Of Measure", icon: Ruler, link: "/unit_of_measure" },
        { label: "UOM converter", icon: ArrowLeftRight, link: "/convert_different_uoms_in_terms_of_product_base_unit" },
        { icon: Tag, label: "item categories", link: "/categories" },
        { label: "medical items", icon: Package, link: "/medical_supply_items" },
        { label: "prescriptions & dispensing", icon: Pill, link: "/medical/prescriptions" },
        { icon: Monitor, label: "POS Terminal", link: "/pharmacy_pos_terminal" },
        { label: "Sales", icon: TrendingUp, link: "/pharmacy_sales" },
        { label: "Customer Management", icon: UserRound, link: "/customer_management" },
        { label: "Credit Invoices", icon: FileText, link: "/credit_invoices" },
      ]
    },


     {
      icon: Bed,
      label: "Ward Management",
      hasDropdown: true,
      children: [
        { label: "Ward Requests", icon: ClipboardList, link: "/ward_assignments_board" },
      ]
    },


    // Billing
    {
      icon: DollarSign,
      label: "Medical Billing",
      hasDropdown: true,
      children: [
        { label: "Billing Rates", icon: Tag, link: "/billing_rates" },
        { label: "Invoices & payments", icon: FileText, link: "/invoices" },
        { label: "Payment Receipts", icon: Receipt, link: "/payment_receipts" },
      ]
    },

    // Reports
    {
      icon: BarChart3,
      label: "Reports",
      hasDropdown: true,
      children: [
        { icon: BarChart3,     label: "Dept. Performance",   link: "/reports" },
        { icon: ClipboardList, label: "Medical History",     link: "/patient_medical_history" },
      ],
    },

    { icon: History, label: "Activity Logs", link: "/activity_logs" },

  ];

  const toggleDropdown = (index) => {
    setOpenDropdown(prev => prev === index ? null : index);
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
            <NotificationBell />

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
                  <button
                    type="button"
                    onClick={() => { setShowUserModal(false); setShowLogoutConfirm(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-red-600 dark:text-red-400">Logout</span>
                  </button>
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
                LIFE-LINK
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
                const isOpen = openDropdown === index;

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

              {/* Logout */}
              <li className="group relative">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-red-400 hover:bg-red-900/20 hover:text-red-300 text-left"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span className={`transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? "opacity-0 w-0" : "opacity-100"}`}>
                    Logout
                  </span>
                </button>

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs rounded bg-gray-800 dark:bg-gray-700 text-white dark:text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    Logout
                  </span>
                )}
              </li>

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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-fade-in">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Log out?</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You'll need to sign in again to access your account.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
          .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
      `}</style>
    </>
  );
}

