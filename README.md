# JAIPUR BANGLORE LOGISTICS - Transporter Management System (TMS) Web App

A clean, modern, enterprise-ready web application for **JAIPUR BANGLORE LOGISTICS**. Built for freight management, trip booking, LR/Bilty generation, Proof of Delivery (POD) tracking, and mobile-ready transport operations.

---

## 🌟 Key Features

### 1. Dashboard
- **Real-time KPI Metrics**:
  - Total Trips (All time)
  - Active Trips (In Transit with pulsing live indicator)
  - Closed Trips (Completed & POD verified)
  - Party Due (Total receivables across all consignors)
  - Trans Due (Truck hire balance payable to suppliers)
  - Net Profit (Calculated from closed trips)
  - Month Revenue (Current calendar month)
- **Recent Trips List**: Real-time summary with quick action buttons for Edit, Lorry Receipt (LR) printing, and POD attachment.
- **Quick Action**: Prominent `+ New Trip` wizard button.

### 2. "+ New Trip" Booking Wizard & Trip Editor
- **Consignor Party**: Searchable select + inline `+ Add New Party` modal (Party name, phone, city, GSTIN).
- **Vehicle / Truck**: Searchable select + inline `+ Add Truck` modal (Truck No, Ownership: My / Market, Type, Capacity in Tonnes).
- **Supplier / Transporter**: Searchable select + inline `+ Add Supplier` modal (Supplier name, phone, city, GSTIN).
- **Assigned Driver**: Searchable driver list with live trip status.
- **Route & Dates**: Origin city, Destination city, Start date, Expected delivery date.
- **Billing Types**:
  - `Fixed`: Lump-sum party freight amount.
  - `Per Tonne`: Auto-calculates freight as `Rate / Tonne * Weight`.
  - `Per Kg`: Auto-calculates freight as `Rate / Kg * Weight`.
- **Advance & Balances**: Party Advance received, Balance Due auto-calculated.
- **Commissions**: From Party, From Truck Owner, Paid to Agent.
- **Supplier Billing**: Truck Hire Cost, Advance to Supplier, Transporter Balance Due auto-calculated.
- **Live Profit Engine**: Instant calculation of `Party Freight - Truck Hire + Commissions = Net Profit`.
- **LR Generation & Material Meta**: Auto-generated LR No (`LR-2026-XXXX`), Material type, Invoice No, Cargo Value, Weight, and Driver notes.
- **Trip Editing**: Any created or in-transit trip can be edited at any time.

### 3. Proof of Delivery (POD) & LR Generation
- **POD Attachment**:
  - Upload stamped delivery receipt / bilty photo (JPG, PNG, WebP) or camera snap.
  - 1-Click "Use Stamped Demo POD" option for testing.
  - Receiver name, received date, verification remarks.
  - Saves attachment and updates trip status to **POD Done**.
- **Printable Lorry Receipt (LR / Bilty)**:
  - Formatted Indian Consignment Note layout with Consignor, Consignee, Truck No, Driver details, Packages, Freight breakdown, Advance, and Signatures.
  - Print dialog support with clean CSS print media queries.

### 4. Parties Directory
- Search by name, contact person, phone, city, or GSTIN.
- Add party with credit days and full factory address.
- Comprehensive **Party Ledger** modal with trip-by-trip freight, advance, and dues.
- Export parties to Excel (`.xlsx` or `.csv`).

### 5. Supplier / Transporter Directory
- Table headings: **Supplier Name, Phone & UPI, City, Trips Count, Balance Due, Actions**.
- Add Transporter with Bank Name, Account No, IFSC code, and UPI ID.
- One-click **Settle Balance** modal to record payments to truck owners.
- Export suppliers to Excel.

### 6. Driver Khata & Advances
- Summary metric cards:
  - **Driver Gave** (Total advances & trip money given to drivers)
  - **Driver Got** (Settlements / refunds received from drivers)
  - **Total Driver Balance** (Net pending balance)
  - **On Trip** count
  - **Available** count
- Search by driver name, mobile, or DL number.
- Add driver modal with opening balance, bank details, and UPI.

### 7. Truck Fleet Management
- Filter tabs: **All Trucks**, **My Fleet (Own)**, **Market Hired**.
- Add truck modal with vehicle body type, capacity (Tonnes), and linked supplier.
- Real-time availability indicator (`On Trip` vs `Available`).

### 8. Operational Expenses
- Summary cards: Total, Diesel Fuel, Toll (Fastag), Driver Bhatta, Maintenance & Other.
- Record expense modal linked to specific trip or general fleet maintenance.
- Payment modes: Fuel card, Fastag auto debit, UPI, Cash, Bank transfer.

### 9. Payment Reconciliation
- **Party Receivable Tab**: List of all parties with pending freight dues, with "+ Receive Payment" modal.
- **Trans Payable Tab**: List of all suppliers with pending hire dues, with "Settle Hire Due" modal.
- **Pending Trips Tab**: Overview of all trips with unsettled balances.

### 10. Profit & Loss (P&L) Reports & Excel Export
- Date Range filter (`From Date` to `To Date`) with presets: **Today**, **This Month**, **Last Month**, **All Time**.
- Metrics: Total Trips, Freight Revenue, Truck Hire Cost, Net Commission, Expenses, **Net Profit**, and Operating Margin %.
- Trip-wise profitability statement.
- **Export P&L to Excel** using SheetJS.

### 11. Authentication & Access
- **Single Authorized Login**:
  - **Email**: `jaipurbanglorelogistic@gmail.com`
  - **Password**: `VIKRAM#@7051`
  - **Company**: `JAIPUR BANGLORE LOGISTICS`
- "Remember me" session persistence.
- Public sign-up & demo logins removed.
- Demo data purged for clean production deployment.
- Mobile-optimized responsive interface with touch-friendly layout & mobile quick-action button.

---

## 🆕 Latest Updates (v2.1)

1. **Truck Fleet & Supplier Filter**:
   - Fixed Add Truck supplier selection with real-time text filter and inline `+ Add Supplier` quick registration.
   - Dynamic auto-selection when adding market-hired vehicles.
2. **Driver Management & Khata**:
   - Added **Edit Driver** in Actions column to modify driver details (mobile, DL, UPI, bank, opening balances).
   - Added **Driver Advance & Settlement Modal** (`Give Advance`) to record cash, bhatta, diesel advances or refunds, with optional trip linkage.
   - Added **Driver Trips Modal** to track all trips assigned to each driver and active trip indicator.
3. **Trip Booking Wizard**:
   - Added inline `+ Add Driver` button and quick add modal to register new drivers without leaving the trip wizard.
4. **Supplier / Transporter Directory**:
   - Fixed settlement balance auto-refresh and FIFO allocation across open trips.
   - Updated table headers to display: **Total Balance (Hire)**, **Given (Paid)**, **Balance Due**.
   - Added **Supplier Ledger & Trips Modal** to inspect all trips, freight costs, advance paid, and dues for any transporter.
5. **Full System Interlinking**:
   - Synchronized statuses across Trips, Drivers, Trucks, and Suppliers (`Available` vs `On Trip`).

---

## 🚀 How to Run the App

### Option A: 1-Click Launch (Recommended)
Simply double click the included `run.bat` file, or open `index.html` directly in **Google Chrome**, **Microsoft Edge**, or any modern browser.

### Option B: Local HTTP Server (Optional)
Right click `server.ps1` and select **Run with PowerShell** (or run `powershell -ExecutionPolicy Bypass -File .\server.ps1`). It will start a local HTTP server on `http://localhost:3000/`.

