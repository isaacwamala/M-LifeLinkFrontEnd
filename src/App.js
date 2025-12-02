import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Layout } from "./components/general/Layout";
import Dashboard from "./components/dashboard/Dashboard.js";
import Login from "./components/auth/Login.js";
import UserGroups from './components/usergroups/index';
import CreateUserGroupModal from './components/usergroups/CreateUserGroupModel';

import CreateUserAccount from "./components/useraccounts/CreateUserAccount.js";
import UserAccountLists from "./components/useraccounts/UserAccountLists.js";
import AssignRoleToUser from "./components/useraccounts/AssignRoleToUser.js";
import AccountSettings from "./components/useraccounts/AccountSettings.js";
import SetNewPassword from "./components/auth/forGotPassWord/SetNewPassword.js";
import ForGotPassword from "./components/auth/forGotPassWord/ForGotPassWord.js";
import Suppliers from "./components/suppliers_and_stock/Suppliers.js";
import WareHouses from "./components/suppliers_and_stock/WareHouses.js";
import Categories from "./components/products/Categories.js";
import UnitOfMeasure from "./components/configurations/UnitOfMeasure.js";

import NotificationsPage from "./components/notifications/NotificationsPage.js";
import MedicalSuppliesItems from "./components/products/MedicalSuppliesItems.js";
import RegisterMedicalStock from "./components/products/RegisterMedicalStock.js";

import UomConversionForProductBaseUnit from "./components/configurations/UomConversionForProductBaseUnit.js";

import PurchaseOrders from "./components/purchase_orders/PurchaseOrders.js";
import CreatePurchaseOrder from "./components/purchase_orders/CreatePurchaseOrder.js";
import MedicalStock from "./components/products/MedicalStock.js";
import StockAdjustments from "./components/products/StockAdjustments.js";
import StockAdjustmentsLogs from "./components/products/StockAdjustmentLogs.js";
import MainInventoryTrack from "./components/products/MainInventoryTrack.js";

import SupplierPurchaseOrderPayments from "./components/suppliers_and_stock/SupplierPurchaseOrderPayments.js";

function App() {
  return (
    <Router>
      <Routes>
        {/* You can add more routes wrapped without Layout here */}
        <Route path="/" element={<Login />} />

        {/* forgotPassword routes */}
        <Route path="/forgotPassword" element={<ForGotPassword />} />
        <Route path="/setNewPassWord" element={<SetNewPassword />} />





        {/* Dashboard wrapped with Layout */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/usergroups" element={<UserGroups />} />
                <Route path="/create_account_type" element={<CreateUserGroupModal />} />

                <Route path="/create_user_account" element={<CreateUserAccount />} />
                <Route path="/users" element={<UserAccountLists />} />
                <Route path="/assign_role_to_user" element={<AssignRoleToUser />} />
                <Route path="/account_settings" element={<AccountSettings />} />

                {/* Suppliers and stock */}
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/warehouses" element={<WareHouses />} />
                

                {/* Configurations */}
                <Route path="/unit_of_measure" element={<UnitOfMeasure />} />
                <Route path="/convert_different_uoms_in_terms_of_product_base_unit" element={<UomConversionForProductBaseUnit />} />

                <Route path="/notifications" element={<NotificationsPage />} />

                {/* Medical supply item */}
                <Route path="/categories" element={<Categories />} />
                <Route path="/medical_supply_items" element={<MedicalSuppliesItems />} />

                {/* Product batches */}
                <Route path="/register_medical_stock" element={<RegisterMedicalStock />} />
                <Route path="/medical_stock" element={<MedicalStock/>}/>

                {/* Purchase orders */}
                <Route path="/purchase_orders" element={<PurchaseOrders />} />
                <Route path="/create_purchase_order" element={<CreatePurchaseOrder/>}/>
                <Route path="/supplier/order_payments" element={<SupplierPurchaseOrderPayments/>}/>

                {/* Stock Adjustments */}
                <Route path="/stock_adjustments" element={<StockAdjustments/>}/>
                 <Route path="/stock_adjustments_logs" element={<StockAdjustmentsLogs/>}/>

                 {/* Main inventory */}
                 <Route path="/inventory" element={<MainInventoryTrack/>}/>

              </Routes>

            </Layout>
          }
        />


      </Routes>
    </Router>
  );
}

export default App;
