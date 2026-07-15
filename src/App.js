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
import SendNotifications from "./components/notifications/SendNotifications.js";
import MedicalSuppliesItems from "./components/products/MedicalSuppliesItems.js";
import RegisterMedicalStock from "./components/products/RegisterMedicalStock.js";

import UomConversionForProductBaseUnit from "./components/configurations/UomConversionForProductBaseUnit.js";

import PurchaseOrders from "./components/purchase_orders/PurchaseOrders.js";
import CreatePurchaseOrder from "./components/purchase_orders/CreatePurchaseOrder.js";
import { RFQManagement } from "./components/purchase_orders/RFQManagement.js";
import MedicalStock from "./components/products/MedicalStock.js";
import StockAdjustments from "./components/products/StockAdjustments.js";
import StockAdjustmentsLogs from "./components/products/StockAdjustmentLogs.js";
import MainInventoryTrack from "./components/products/MainInventoryTrack.js";

import SupplierPurchaseOrderPayments from "./components/suppliers_and_stock/SupplierPurchaseOrderPayments.js";
import StockReturns from "./components/suppliers_and_stock/StockReturns.js";
import SupplierPaymentsOnOrders from "./components/suppliers_and_stock/SupplierPaymentsOnOrders.js";

import { ViewSales } from "./components/pharmacy_sales/ViewSales.js";


import { Patients } from "./components/patients/Patients.js";
import { PatientVisit } from "./components/patients/PatientVisit.js";


import { LabSections } from "./components/lab/LabSections.js";
import { LabInstruments } from "./components/lab/LabInstruments.js";
import { SpecimenTypes } from "./components/lab/SpecimenTypes.js";

// Test types
import { TestTypes } from "./components/lab/TestTypes.js";
import ManageSpecimenAndTheirTestTypes from "./components/lab/ManageSpecimenAndTheirTestTypes.js";

// Lab requests
import { CreateLabTestRequest } from "./components/lab_tests/CreateLabTestRequest.js";
import { CreatePrescriptionRequest } from "./components/lab_tests/CreatePrescriptionRequest.js";
import { PatientLabTestRequests } from "./components/patients/PatientLabTestRequests.js";
import ManageTestTypeResultManager from "./components/lab/ManageTestTypeResultManager.js";

//reporting
import { PatientTestAndResultReports } from "./components/patients/PatientTestAndResultReports.js";
//Prescripions
import { PatientMedicalPrescriptions } from "./components/pharmacy_sales/PatientMedicalPrescriptions.js";

import MedicalRoom from "./components/configurations/MedicalRoom.js"
import DoctorAssignRooms from "./components/configurations/DoctorAssignRooms.js";
import WardManager from "./components/configurations/WardManager.js";
import InstrumentsManager from "./components/configurations/InstrumentsManager.js";
import { BillingRates } from "./components/configurations/BillingRates.js";
import { BusinessSettings } from "./components/configurations/BusinessSettings.js";
import { Invoices } from "./components/invoicing/Invoices.js";
import { PaymentReceipts } from "./components/invoicing/PaymentReceipts.js";
import DepartmentStaffing from "./components/configurations/DepartmentStaffing.js";
import WardAssignmentsBoard from "./components/configurations/WardAssignmentsBoard.js";
import VariantOptionsManager from "./components/configurations/VariantOptionsManager.js";

// Activity Logs
import GeneralActivityLogsViewer from "./components/activitylogs/GeneralActivityLogsViewer.js";

//appointments
import AdminDashboard from "./components/dashboard/AdminDashboard.js";
import DoctorDashboard from "./components/dashboard/DoctorDashboard.js";
import PharmacistDashboard from "./components/dashboard/PharmacistDashboard.js";
import LaboratoryDashboard from "./components/dashboard/LaboratoryDashboard.js";
import ReceptionistDashboard from "./components/dashboard/ReceptionistDashboard.js";
import AppointmentsManager from "./components/appointments/AppointmentsManager.js";
import AppointmentsCalendar from "./components/appointments/AppointmentsCalendar.js";
import AppointmentsToday from "./components/appointments/AppointmentsToday.js";
import AvailableSlots from "./components/appointments/AvailableSlots.js";

import RegisterPharmacySalesTwo from "./components/pharmacy_sales/RegisterPharmacySalesTwo.js"
import { CustomerManagement } from "./components/pharmacy_sales/CustomerManagement.js"
import { CreditInvoices } from "./components/pharmacy_sales/CreditInvoices.js"


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
                <Route path="/dashboard/administrator" element={<AdminDashboard />} />
                <Route path="/dashboard/doctor"         element={<DoctorDashboard />} />
                <Route path="/dashboard/pharmacist"     element={<PharmacistDashboard />} />
                <Route path="/dashboard/laboratory"     element={<LaboratoryDashboard />} />
                <Route path="/dashboard/receptionist"   element={<ReceptionistDashboard />} />

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
                <Route path="/send_notifications" element={<SendNotifications />} />

                {/* Medical supply item */}
                <Route path="/categories" element={<Categories />} />
                <Route path="/medical_supply_items" element={<MedicalSuppliesItems />} />

                {/* Product batches */}
                <Route path="/register_medical_stock" element={<RegisterMedicalStock />} />
                <Route path="/medical_stock" element={<MedicalStock />} />

                {/* Purchase orders */}
                <Route path="/purchase_orders" element={<PurchaseOrders />} />
                <Route path="/create_purchase_order" element={<CreatePurchaseOrder />} />
                <Route path="/rfqs" element={<RFQManagement />} />
                <Route path="/supplier/order_payments" element={<SupplierPurchaseOrderPayments />} />
                <Route path="/supplier/order_payments/analysis" element={<SupplierPaymentsOnOrders />} />

                {/* Stock Adjustments */}
                <Route path="/stock_adjustments" element={<StockAdjustments />} />
                <Route path="/stock_adjustments_logs" element={<StockAdjustmentsLogs />} />
                <Route path="/stock_returns" element={<StockReturns />} />

                {/* Main inventory */}
                <Route path="/inventory" element={<MainInventoryTrack />} />

                {/* Pharmacy sales */}
            
                <Route path="/pharmacy_pos_terminal" element={<RegisterPharmacySalesTwo />} />
                <Route path="/customer_management" element={<CustomerManagement />} />
                <Route path="/credit_invoices" element={<CreditInvoices />} />

                <Route path="/pharmacy_sales" element={<ViewSales />} />

                {/* Patients */}
                <Route path="/patients" element={<Patients />} />

                {/* Patient Visits */}
                <Route path="/patient_visits" element={<PatientVisit />} />

                {/* Lab Sections */}
                <Route path="/lab_sections" element={<LabSections />} />

                <Route path="/instruments" element={<LabInstruments />} />
                <Route path="/specimens" element={<SpecimenTypes />} />
                <Route path="/test_types" element={<TestTypes />} />

                {/* Manage specimens with their specific Test types */}
                <Route path="/manage_specimen/and_their_test_types" element={<ManageSpecimenAndTheirTestTypes />} />

                {/* Create Lab Test Requests */}
                <Route path="/visits/:visitId/lab-tests/create" element={<CreateLabTestRequest />} />
                <Route path="/visits/:visitId/prescription/create" element={<CreatePrescriptionRequest />} />
                <Route path="/patient_lab/test/requests" element={<PatientLabTestRequests />} />

                {/* Set up test types result parameters */}
                <Route path="/manage/test_types_result/parameter_measure/setup" element={<ManageTestTypeResultManager />} />

                {/* Patient Reporting */}
                <Route path="/patient_test_and_results" element={<PatientTestAndResultReports />} />

                <Route path="/medical/prescriptions" element={<PatientMedicalPrescriptions />} />

                <Route path="/medical_rooms" element={<MedicalRoom />} />
                <Route path="/doctor/rooms/assignments" element={<DoctorAssignRooms />} />
                <Route path="/ward_manager" element={<WardManager />} />
                <Route path="/lab_instruments" element={<InstrumentsManager />} />
                <Route path="/billing_rates" element={<BillingRates />} />
                <Route path="/business_settings" element={<BusinessSettings />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/payment_receipts" element={<PaymentReceipts />} />
                <Route path="/department_staffing" element={<DepartmentStaffing />} />
                <Route path="/ward_assignments_board" element={<WardAssignmentsBoard />} />
                <Route path="/variant_options_manager" element={<VariantOptionsManager />} />

                {/* Activity Logs */}
                <Route path="/activity_logs" element={<GeneralActivityLogsViewer />} />

                //Appointments
                <Route path="/appointments/management" element={<AppointmentsManager />} />
                <Route path="/appointments/calendar" element={<AppointmentsCalendar />} />
                <Route path="/appointments/today" element={<AppointmentsToday />} />
                <Route path="/appointments/available_slots" element={<AvailableSlots />} />


              </Routes>

            </Layout>
          }
        />


      </Routes>
    </Router>
  );
}

export default App;
