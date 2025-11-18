import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../general/constants";
import apiRequest from "../general/common";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const token = localStorage.getItem("access_token");

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      await apiRequest(
        "get",
        `${API_BASE_URL}notify/getNotifications`,
        null,
        {},
        (data) => {
          setNotifications(data);
          setRefresh((prev) => !prev);
        }
      );
    } catch (error) {
      console.error("Failed fetching notifications", error);
    }
  };

  // Send read request to backend
  const handleReadNotification = async (id) => {
    try {
      const config = {
        method: "put",
        url: `${API_BASE_URL}notify/readNotification`,
        data: JSON.stringify({ id }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      await axios.request(config);
      await fetchNotifications();
    } catch (error) {
      console.error("Failed marking notification read", error);
    }
  };

  // Mark all as read (loop through each)
  const markAllAsRead = async () => {
    for (let n of notifications) {
      await handleReadNotification(n.id);
    }
  };

  // Load on mount + refresh
  useEffect(() => {
    fetchNotifications();
  }, [token, refresh]);

  const unreadCount = notifications.filter((n) => n.is_read === 0).length;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-900 transition-colors">

      <div className="p-4 border-2 border-gray-400 border-dashed rounded-lg dark:border-gray-500 mt-14">

        <div className="w-full max-w-7xl mx-auto">

          {/* HEADER */}
          <div className="mb-6">
            <div className="flex items-start sm:items-center gap-3 mb-4 flex-col sm:flex-row">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>

              <div className="w-full">
                <h1 className="text-gray-900 dark:text-gray-100 text-xl font-semibold">
                  System Notifications
                </h1>

                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                    : "All caught up!"}
                </p>
              </div>
            </div>

            {/* MARK ALL AS READ BUTTON */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 
                bg-gradient-to-r from-blue-700 to-purple-900 text-white rounded-lg hover:bg-blue-700 transition-colors 
                w-full sm:w-auto"
              >
                <CheckCheck className="w-4 h-4" />
                Mark All as Read
              </button>
            )}
          </div>

          {/* NOTIFICATIONS LIST */}
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg shadow-sm border-l-4 transition-all 
              bg-white dark:bg-gray-800
              ${n.is_read
                    ? "border-gray-400 opacity-75"
                    : "border-blue-600 shadow-md"
                  }`}
              >
                <div className="p-4 sm:p-5">

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">

                    {/* MAIN INFO */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`mb-1 font-medium break-words ${n.is_read
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-900 dark:text-white"
                          }`}
                      >
                        {n.subject}

                        {!n.is_read && (
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-2"></span>
                        )}
                      </h3>

                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(n.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* MARK AS READ BUTTON */}
                    {!n.is_read && (
                      <button
                        onClick={() => handleReadNotification(n.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm 
                        bg-blue-50 dark:bg-blue-900/40 
                        text-blue-700 dark:text-blue-300 
                        rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 
                        transition-colors w-full sm:w-auto justify-center"
                      >
                        <Check className="w-4 h-4" />
                        Mark as Read
                      </button>
                    )}
                  </div>

                  {/* BODY HTML */}
                  {n.body && (
                    <div
                      className={`text-sm leading-relaxed break-words ${n.is_read
                        ? "text-gray-600 dark:text-gray-400"
                        : "text-gray-700 dark:text-gray-300"
                        }`}
                      dangerouslySetInnerHTML={{ __html: n.body }}
                    />
                  )}

                  {/* ITEMS TABLE */}
                  {n.items && n.items.length > 0 && (
                    <table className="table-auto w-full mt-3 border dark:border-gray-700 text-sm">
                      <thead className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <tr>
                          <th className="p-2 border dark:border-gray-600">Product</th>
                          <th className="p-2 border dark:border-gray-600">Qty</th>
                          <th className="p-2 border dark:border-gray-600">Unit Price</th>
                          <th className="p-2 border dark:border-gray-600">Total</th>
                          <th className="p-2 border dark:border-gray-600">Pay Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {n.items.map((item, idx) => (
                          <tr key={idx} className="text-gray-700 dark:text-gray-300">
                            <td className="border p-2 dark:border-gray-600">{item.product}</td>
                            <td className="border p-2 dark:border-gray-600">{item.quantity}</td>
                            <td className="border p-2 dark:border-gray-600">{item.unit_price}</td>
                            <td className="border p-2 dark:border-gray-600">{item.total}</td>
                            <td className="border p-2 dark:border-gray-600">{item.paystatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* EMPTY STATE */}
          {notifications.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No notifications</p>
            </div>
          )}
        </div>
      </div>



    </div>
  );
}
