/**
 * Transporter Management System (TMS) - Core Application Controller
 * Handles Navigation, Views, Wizards, Modals, Forms, and State Sync
 */

// Global State
let currentTab = 'dashboard';
let currentTripFilter = 'all';
let currentTruckFilter = 'all';
let currentPaymentTab = 'party';
let editingTripId = null;

// Toast Helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white';
    
    toast.className = `flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all duration-300 transform translate-y-4 opacity-0 ${bgClass}`;
    toast.innerHTML = `
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${type === 'success' 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>'
            }
        </svg>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Currency Formatter
function formatINR(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN');
}

// Modal Helpers
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    if (modalId === 'addTruckModal') {
        const searchInp = document.getElementById('truckSupplierSearchInput');
        if (searchInp) searchInp.value = '';
        populateTruckSupplierDropdown();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    setupDatePickers();
});

// Authentication Controller
function checkAuth() {
    const authUser = window.tmsStore.getAuthUser();
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');

    if (!authUser) {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');

        // Check if user has a remembered email
        const rememberedEmail = localStorage.getItem('tms_remember_email');
        const rememberCheckbox = document.getElementById('rememberMe');
        const emailInput = document.getElementById('loginEmail');
        if (rememberedEmail && emailInput) {
            emailInput.value = rememberedEmail;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    } else {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        // Update user profile badges
        document.getElementById('headerUserName').textContent = authUser.name || 'Vikram';
        document.getElementById('headerCompanyName').textContent = authUser.company || 'JAIPUR BANGLORE LOGISTICS';
        document.getElementById('profileInitials').textContent = 'JB';

        // Load active view
        switchTab(currentTab);
    }
}

function setupEventListeners() {
    // Auth Form
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = btn.dataset.tab;
            if (tabName) switchTab(tabName);
        });
    });

    // Quick New Trip Button
    document.querySelectorAll('.btn-new-trip').forEach(btn => {
        btn.addEventListener('click', () => openNewTripModal());
    });

    // Forms
    document.getElementById('tripForm')?.addEventListener('submit', handleSaveTrip);
    document.getElementById('quickAddPartyForm')?.addEventListener('submit', handleSaveQuickParty);
    document.getElementById('quickAddTruckForm')?.addEventListener('submit', handleSaveQuickTruck);
    document.getElementById('quickAddSupplierForm')?.addEventListener('submit', handleSaveQuickSupplier);
    document.getElementById('quickAddDriverForm')?.addEventListener('submit', handleSaveQuickDriver);
    document.getElementById('partyForm')?.addEventListener('submit', handleSaveParty);
    document.getElementById('supplierForm')?.addEventListener('submit', handleSaveSupplier);
    document.getElementById('driverForm')?.addEventListener('submit', handleSaveDriver);
    document.getElementById('driverAdvanceForm')?.addEventListener('submit', handleSaveDriverAdvance);
    document.getElementById('truckForm')?.addEventListener('submit', handleSaveTruck);
    document.getElementById('expenseForm')?.addEventListener('submit', handleSaveExpense);
    document.getElementById('partyPaymentForm')?.addEventListener('submit', handleSavePartyPayment);
    document.getElementById('supplierPaymentForm')?.addEventListener('submit', handleSaveSupplierPayment);
    document.getElementById('podUploadForm')?.addEventListener('submit', handleSavePod);

    // Live Trip Freight & Profit Calculation Listeners
    setupTripCalculationListeners();

    // Search filters
    setupSearchListeners();
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    const res = window.tmsStore.login(email, password, rememberMe);
    if (res.success) {
        showToast(`Welcome, ${res.user.name}!`);
        checkAuth();
    } else {
        showToast(res.message, 'error');
    }
}

function handleLogout() {
    window.tmsStore.logout();
    showToast('Logged out successfully.');
    checkAuth();
}

// Tab Switching
function switchTab(tab) {
    currentTab = tab;

    // Update active state on tab buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('bg-blue-600', 'text-white');
            btn.classList.remove('text-slate-600', 'hover:bg-slate-100');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('text-slate-600', 'hover:bg-slate-100');
        }
    });

    // Hide all view containers
    document.querySelectorAll('.view-container').forEach(view => {
        view.classList.add('hidden');
    });

    // Show selected view
    const targetView = document.getElementById(`${tab}View`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    // Render corresponding data
    switch (tab) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'trips':
            renderTrips();
            break;
        case 'parties':
            renderParties();
            break;
        case 'suppliers':
            renderSuppliers();
            break;
        case 'drivers':
            renderDrivers();
            break;
        case 'trucks':
            renderTrucks();
            break;
        case 'expenses':
            renderExpenses();
            break;
        case 'payments':
            renderPayments();
            break;
        case 'reports':
            renderReports();
            break;
    }
}

// -------------------------------------------------------------
// 1. DASHBOARD VIEW
// -------------------------------------------------------------
function renderDashboard() {
    const metrics = window.tmsStore.getDashboardMetrics();

    document.getElementById('dashTotalTrips').textContent = metrics.totalTrips;
    document.getElementById('dashActiveTrips').textContent = metrics.activeTrips;
    document.getElementById('dashClosedTrips').textContent = metrics.closedTrips;
    document.getElementById('dashPartyDue').textContent = formatINR(metrics.partyDue);
    document.getElementById('dashTransDue').textContent = formatINR(metrics.transDue);
    document.getElementById('dashNetProfit').textContent = formatINR(metrics.closedProfit);
    document.getElementById('dashMonthRevenue').textContent = formatINR(metrics.monthRevenue);

    // Recent Trips Table
    const trips = window.tmsStore.getTrips().slice(0, 6);
    const tbody = document.getElementById('recentTripsTableBody');
    if (!tbody) return;

    if (trips.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">No trips recorded yet. Click "New Trip" to start.</td></tr>`;
        return;
    }

    tbody.innerHTML = trips.map(t => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="font-semibold text-blue-600">
                <span class="cursor-pointer hover:underline" onclick="viewTripDetails('${t.id}')">${t.lrNo}</span>
                <span class="block text-xs font-normal text-slate-400">${t.id}</span>
            </td>
            <td>
                <div class="font-medium text-slate-800">${t.route.origin} &rarr; ${t.route.destination}</div>
                <div class="text-xs text-slate-500">${t.startDate}</div>
            </td>
            <td>
                <div class="font-medium text-slate-800">${t.partyName}</div>
                <div class="text-xs text-slate-400">${t.material.materialType}</div>
            </td>
            <td>
                <span class="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 font-semibold">${t.truckNo}</span>
                <span class="block text-xs text-slate-500 mt-0.5">${t.supplierName}</span>
            </td>
            <td>
                <div class="font-semibold text-slate-900">${formatINR(t.billing.partyFreightAmount)}</div>
                <div class="text-xs ${t.billing.partyBalance > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}">
                    Due: ${formatINR(t.billing.partyBalance)}
                </div>
            </td>
            <td>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(t.status)}">
                    ${t.status === 'In Transit' ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>' : ''}
                    ${t.status}
                </span>
            </td>
            <td class="text-right whitespace-nowrap">
                <button onclick="editTrip('${t.id}')" class="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50" title="Edit Trip">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button onclick="openPrintLrModal('${t.id}')" class="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Print Lorry Receipt (LR)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                </button>
                <button onclick="openPodModal('${t.id}')" class="p-1.5 text-slate-500 hover:text-purple-600 rounded hover:bg-purple-50" title="Attach/View POD">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Created': return 'badge-status-created';
        case 'In Transit': return 'badge-status-in-transit';
        case 'Delivered': return 'badge-status-delivered';
        case 'POD Done': return 'badge-status-pod-done';
        case 'Closed': return 'badge-status-closed';
        case 'Cancelled': return 'badge-status-cancelled';
        default: return 'bg-slate-100 text-slate-700';
    }
}

// -------------------------------------------------------------
// 2. NEW TRIP & EDIT TRIP WORKFLOW
// -------------------------------------------------------------
function openNewTripModal(tripId = null) {
    editingTripId = tripId;
    const modalTitle = document.getElementById('tripModalTitle');
    const form = document.getElementById('tripForm');
    form.reset();

    // Populate Select Dropdowns
    populatePartyDropdown();
    populateTruckDropdown();
    populateSupplierDropdown();
    populateDriverDropdown();

    if (tripId) {
        modalTitle.textContent = 'Edit Trip - ' + tripId;
        const trip = window.tmsStore.getTrips().find(t => t.id === tripId);
        if (trip) {
            document.getElementById('tripPartySelect').value = trip.partyId;
            document.getElementById('tripTruckSelect').value = trip.truckId;
            document.getElementById('tripSupplierSelect').value = trip.supplierId;
            document.getElementById('tripDriverSelect').value = trip.driverId;
            document.getElementById('tripOrigin').value = trip.route.origin;
            document.getElementById('tripDestination').value = trip.route.destination;
            document.getElementById('tripBillingType').value = trip.billing.partyBillingType;
            document.getElementById('tripRatePerUnit').value = trip.billing.ratePerUnit || '';
            document.getElementById('tripWeight').value = trip.material.weight || '';
            document.getElementById('tripPartyFreight').value = trip.billing.partyFreightAmount;
            document.getElementById('tripPartyAdvance').value = trip.billing.partyAdvance;
            document.getElementById('tripCommFromParty').value = trip.commission.fromParty;
            document.getElementById('tripCommFromTruck').value = trip.commission.fromTruckOwner;
            document.getElementById('tripCommPaidAgent').value = trip.commission.paidToAgent;
            document.getElementById('tripTruckHireCost').value = trip.supplierBilling.truckHireCost;
            document.getElementById('tripSupplierAdvance').value = trip.supplierBilling.advanceToSupplier;
            document.getElementById('tripStartDate').value = trip.startDate;
            document.getElementById('tripDeliveryDate').value = trip.expectedDeliveryDate;
            document.getElementById('tripLrNo').value = trip.lrNo;
            document.getElementById('tripMaterialType').value = trip.material.materialType;
            document.getElementById('tripInvoiceNo').value = trip.material.invoiceNo;
            document.getElementById('tripInvoiceValue').value = trip.material.invoiceValue;
            document.getElementById('tripNotes').value = trip.notes;
            document.getElementById('tripStatusSelect').value = trip.status;
        }
    } else {
        modalTitle.textContent = 'Create New Trip';
        document.getElementById('tripLrNo').value = window.tmsStore.getNextLrNo();
        document.getElementById('tripStartDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('tripStatusSelect').value = 'Created';
    }

    handleBillingTypeChange();
    calculateLiveTripProfits();
    openModal('newTripModal');
}

function populatePartyDropdown(selectedId = null) {
    const select = document.getElementById('tripPartySelect');
    const parties = window.tmsStore.getParties();
    select.innerHTML = '<option value="">-- Select Consignor Party --</option>' + 
        parties.map(p => `<option value="${p.id}" ${selectedId === p.id ? 'selected' : ''}>${p.name} (${p.city})</option>`).join('');
}

function populateTruckDropdown(selectedId = null) {
    const select = document.getElementById('tripTruckSelect');
    const trucks = window.tmsStore.getTrucks();
    select.innerHTML = '<option value="">-- Select Truck / Vehicle --</option>' + 
        trucks.map(t => `<option value="${t.id}" data-ownership="${t.ownership}" data-supplier="${t.supplierId}" ${selectedId === t.id ? 'selected' : ''}>${t.truckNo} [${t.ownership === 'My' ? 'OWN FLEET' : 'MARKET'}] - ${t.truckType}</option>`).join('');
}

function populateSupplierDropdown(selectedId = null) {
    const select = document.getElementById('tripSupplierSelect');
    const suppliers = window.tmsStore.getSuppliers();
    select.innerHTML = '<option value="">Self Owned / Direct Fleet</option>' + 
        suppliers.map(s => `<option value="${s.id}" ${selectedId === s.id ? 'selected' : ''}>${s.name} (${s.city})</option>`).join('');
}

function populateDriverDropdown(selectedId = null) {
    const select = document.getElementById('tripDriverSelect');
    const drivers = window.tmsStore.getDrivers();
    select.innerHTML = '<option value="">-- Select Driver --</option>' + 
        drivers.map(d => `<option value="${d.id}" ${selectedId === d.id ? 'selected' : ''}>${d.name} (${d.mobile}) - ${d.status}</option>`).join('');
}

function populateTruckSupplierDropdown(selectedId = null, filterQuery = '') {
    const select = document.getElementById('truckSupplierSelect');
    if (!select) return;
    let suppliers = window.tmsStore.getSuppliers();
    if (filterQuery) {
        const q = filterQuery.toLowerCase().trim();
        suppliers = suppliers.filter(s => 
            s.name.toLowerCase().includes(q) || 
            (s.city && s.city.toLowerCase().includes(q)) ||
            (s.phone && s.phone.toLowerCase().includes(q))
        );
    }
    select.innerHTML = '<option value="">-- Select Supplier / Transporter --</option>' + 
        suppliers.map(s => `<option value="${s.id}" ${selectedId === s.id ? 'selected' : ''}>${s.name} (${s.city || 'Transporter'})</option>`).join('');
}

function filterTruckSupplierOptions(query) {
    const currentVal = document.getElementById('truckSupplierSelect')?.value;
    populateTruckSupplierDropdown(currentVal, query);
}

function setupTripCalculationListeners() {
    const billingType = document.getElementById('tripBillingType');
    const rate = document.getElementById('tripRatePerUnit');
    const weight = document.getElementById('tripWeight');
    const partyFreight = document.getElementById('tripPartyFreight');
    const partyAdv = document.getElementById('tripPartyAdvance');
    const hireCost = document.getElementById('tripTruckHireCost');
    const suppAdv = document.getElementById('tripSupplierAdvance');
    const commParty = document.getElementById('tripCommFromParty');
    const commTruck = document.getElementById('tripCommFromTruck');
    const commAgent = document.getElementById('tripCommPaidAgent');
    const truckSelect = document.getElementById('tripTruckSelect');

    // Auto-link truck ownership to supplier
    truckSelect?.addEventListener('change', () => {
        const selectedOpt = truckSelect.options[truckSelect.selectedIndex];
        const ownership = selectedOpt?.dataset?.ownership;
        const supplierId = selectedOpt?.dataset?.supplier;
        if (ownership === 'My') {
            document.getElementById('tripSupplierSelect').value = '';
        } else if (supplierId) {
            document.getElementById('tripSupplierSelect').value = supplierId;
        }
    });

    billingType?.addEventListener('change', () => {
        handleBillingTypeChange();
        calculateLiveTripProfits();
    });

    [rate, weight].forEach(el => el?.addEventListener('input', () => {
        const type = billingType.value;
        const r = parseFloat(rate.value) || 0;
        const w = parseFloat(weight.value) || 0;
        if (type === 'per_tonne' || type === 'per_kg') {
            partyFreight.value = Math.round(r * w);
        }
        calculateLiveTripProfits();
    }));

    [partyFreight, partyAdv, hireCost, suppAdv, commParty, commTruck, commAgent].forEach(el => {
        el?.addEventListener('input', calculateLiveTripProfits);
    });
}

function handleBillingTypeChange() {
    const type = document.getElementById('tripBillingType').value;
    const rateContainer = document.getElementById('tripRateContainer');
    const partyFreight = document.getElementById('tripPartyFreight');

    if (type === 'fixed') {
        rateContainer.classList.add('hidden');
        partyFreight.removeAttribute('readonly');
    } else {
        rateContainer.classList.remove('hidden');
        const unitLabel = document.getElementById('rateUnitLabel');
        if (unitLabel) unitLabel.textContent = type === 'per_tonne' ? 'Rate / Tonne (₹)' : 'Rate / Kg (₹)';
    }
}

function calculateLiveTripProfits() {
    const partyFreight = parseFloat(document.getElementById('tripPartyFreight')?.value) || 0;
    const partyAdv = parseFloat(document.getElementById('tripPartyAdvance')?.value) || 0;
    const hireCost = parseFloat(document.getElementById('tripTruckHireCost')?.value) || 0;
    const suppAdv = parseFloat(document.getElementById('tripSupplierAdvance')?.value) || 0;

    const commParty = parseFloat(document.getElementById('tripCommFromParty')?.value) || 0;
    const commTruck = parseFloat(document.getElementById('tripCommFromTruck')?.value) || 0;
    const commAgent = parseFloat(document.getElementById('tripCommPaidAgent')?.value) || 0;

    // Party Balance
    const partyBal = Math.max(0, partyFreight - partyAdv);
    // Transporter Balance
    const suppBal = Math.max(0, hireCost - suppAdv);
    // Net Profit = (Party Freight - Truck Hire) + (Comm Party + Comm Truck - Comm Agent)
    const netProfit = (partyFreight - hireCost) + (commParty + commTruck - commAgent);

    // Update live badge values
    document.getElementById('calcPartyFreightDisplay').textContent = formatINR(partyFreight);
    document.getElementById('calcTruckHireDisplay').textContent = formatINR(hireCost);
    document.getElementById('calcNetProfitDisplay').textContent = formatINR(netProfit);
    document.getElementById('calcPartyBalanceDisplay').textContent = formatINR(partyBal);
    document.getElementById('calcSuppBalanceDisplay').textContent = formatINR(suppBal);

    const profitBadge = document.getElementById('calcNetProfitDisplay');
    if (netProfit >= 0) {
        profitBadge.className = 'font-bold text-lg text-emerald-600';
    } else {
        profitBadge.className = 'font-bold text-lg text-rose-600';
    }
}

function handleSaveTrip(e) {
    e.preventDefault();

    const partySelect = document.getElementById('tripPartySelect');
    const truckSelect = document.getElementById('tripTruckSelect');
    const supplierSelect = document.getElementById('tripSupplierSelect');
    const driverSelect = document.getElementById('tripDriverSelect');

    const partyId = partySelect.value;
    const partyName = partySelect.options[partySelect.selectedIndex]?.text?.split('(')[0]?.trim();
    const truckId = truckSelect.value;
    const truckNo = truckSelect.options[truckSelect.selectedIndex]?.text?.split('[')[0]?.trim();
    const truckOwnership = truckSelect.options[truckSelect.selectedIndex]?.dataset?.ownership || 'Market';
    const supplierId = supplierSelect.value;
    const supplierName = supplierId ? supplierSelect.options[supplierSelect.selectedIndex]?.text?.split('(')[0]?.trim() : 'Self Owned';
    const driverId = driverSelect.value;
    const driverName = driverId ? driverSelect.options[driverSelect.selectedIndex]?.text?.split('(')[0]?.trim() : 'Unassigned';

    if (!partyId) {
        showToast('Please select a party', 'error');
        return;
    }
    if (!truckId) {
        showToast('Please select a truck', 'error');
        return;
    }

    const tripData = {
        partyId,
        partyName,
        truckId,
        truckNo,
        truckOwnership,
        supplierId,
        supplierName,
        driverId,
        driverName,
        origin: document.getElementById('tripOrigin').value,
        destination: document.getElementById('tripDestination').value,
        partyBillingType: document.getElementById('tripBillingType').value,
        ratePerUnit: document.getElementById('tripRatePerUnit').value,
        weight: document.getElementById('tripWeight').value,
        partyFreightAmount: document.getElementById('tripPartyFreight').value,
        partyAdvance: document.getElementById('tripPartyAdvance').value,
        commissionFromParty: document.getElementById('tripCommFromParty').value,
        commissionFromTruck: document.getElementById('tripCommFromTruck').value,
        commissionPaidAgent: document.getElementById('tripCommPaidAgent').value,
        truckHireCost: document.getElementById('tripTruckHireCost').value,
        advanceToSupplier: document.getElementById('tripSupplierAdvance').value,
        startDate: document.getElementById('tripStartDate').value,
        expectedDeliveryDate: document.getElementById('tripDeliveryDate').value,
        lrNo: document.getElementById('tripLrNo').value,
        materialType: document.getElementById('tripMaterialType').value,
        invoiceNo: document.getElementById('tripInvoiceNo').value,
        invoiceValue: document.getElementById('tripInvoiceValue').value,
        notes: document.getElementById('tripNotes').value,
        status: document.getElementById('tripStatusSelect').value
    };

    if (editingTripId) {
        window.tmsStore.updateTrip(editingTripId, tripData);
        showToast(`Trip ${tripData.lrNo} updated successfully!`);
    } else {
        const newTrip = window.tmsStore.addTrip(tripData);
        showToast(`Trip ${newTrip.lrNo} created successfully!`);
    }

    closeModal('newTripModal');
    switchTab(currentTab);
}

// -------------------------------------------------------------
// Quick Add Inline Modals from New Trip Form
// -------------------------------------------------------------
function openQuickAddParty() {
    document.getElementById('quickAddPartyForm').reset();
    openModal('quickAddPartyModal');
}

function handleSaveQuickParty(e) {
    e.preventDefault();
    const name = document.getElementById('quickPartyName').value;
    const phone = document.getElementById('quickPartyPhone').value;
    const city = document.getElementById('quickPartyCity').value;
    const gst = document.getElementById('quickPartyGst').value;

    const newParty = window.tmsStore.addParty({ name, phone, city, gst });
    populatePartyDropdown(newParty.id);
    closeModal('quickAddPartyModal');
    showToast(`Party "${newParty.name}" added and selected!`);
}

function openQuickAddTruck() {
    document.getElementById('quickAddTruckForm').reset();
    openModal('quickAddTruckModal');
}

function handleSaveQuickTruck(e) {
    e.preventDefault();
    const truckNo = document.getElementById('quickTruckNo').value;
    const ownership = document.getElementById('quickTruckOwnership').value;
    const truckType = document.getElementById('quickTruckType').value;
    const capacity = document.getElementById('quickTruckCapacity').value;

    const newTruck = window.tmsStore.addTruck({ truckNo, ownership, truckType, capacity });
    populateTruckDropdown(newTruck.id);
    closeModal('quickAddTruckModal');
    showToast(`Truck "${newTruck.truckNo}" added and selected!`);
}

let quickSupplierContext = 'trip';

function openQuickAddSupplier(context = 'trip') {
    quickSupplierContext = context;
    document.getElementById('quickAddSupplierForm').reset();
    openModal('quickAddSupplierModal');
}

function handleSaveQuickSupplier(e) {
    e.preventDefault();
    const name = document.getElementById('quickSupplierName').value;
    const phone = document.getElementById('quickSupplierPhone').value;
    const city = document.getElementById('quickSupplierCity').value;
    const gst = document.getElementById('quickSupplierGst').value;

    const newSupplier = window.tmsStore.addSupplier({ name, phone, city, gst });
    if (quickSupplierContext === 'truck') {
        populateTruckSupplierDropdown(newSupplier.id);
        const truckSup = document.getElementById('truckSupplierSelect');
        if (truckSup) truckSup.value = newSupplier.id;
    } else {
        populateSupplierDropdown(newSupplier.id);
        const tripSup = document.getElementById('tripSupplierSelect');
        if (tripSup) tripSup.value = newSupplier.id;
    }
    closeModal('quickAddSupplierModal');
    showToast(`Supplier "${newSupplier.name}" registered and selected!`);
}

function openQuickAddDriver() {
    document.getElementById('quickAddDriverForm').reset();
    openModal('quickAddDriverModal');
}

function handleSaveQuickDriver(e) {
    e.preventDefault();
    const name = document.getElementById('quickDriverName').value;
    const mobile = document.getElementById('quickDriverMobile').value;
    const licenseNo = document.getElementById('quickDriverLicense').value;
    const upiId = document.getElementById('quickDriverUpi').value;

    const newDriver = window.tmsStore.addDriver({ name, mobile, licenseNo, upiId });
    populateDriverDropdown(newDriver.id);
    const tripDrv = document.getElementById('tripDriverSelect');
    if (tripDrv) tripDrv.value = newDriver.id;
    closeModal('quickAddDriverModal');
    showToast(`Driver "${newDriver.name}" registered and selected!`);
    renderDrivers();
}

// -------------------------------------------------------------
// 3. TRIPS MODULE & POD WORKFLOW
// -------------------------------------------------------------
function renderTrips() {
    let trips = window.tmsStore.getTrips();
    const searchQuery = document.getElementById('tripSearchInput')?.value?.toLowerCase()?.trim() || '';

    // Filter by status tab
    if (currentTripFilter !== 'all') {
        trips = trips.filter(t => t.status.toLowerCase().replace(/\s+/g, '-') === currentTripFilter);
    }

    // Filter by search text
    if (searchQuery) {
        trips = trips.filter(t => 
            t.lrNo.toLowerCase().includes(searchQuery) ||
            t.id.toLowerCase().includes(searchQuery) ||
            t.partyName.toLowerCase().includes(searchQuery) ||
            t.truckNo.toLowerCase().includes(searchQuery) ||
            t.route.origin.toLowerCase().includes(searchQuery) ||
            t.route.destination.toLowerCase().includes(searchQuery) ||
            t.startDate.includes(searchQuery)
        );
    }

    const tbody = document.getElementById('tripsTableBody');
    if (!tbody) return;

    if (trips.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-slate-400 font-medium">No trips match your current filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = trips.map(t => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td>
                <span class="font-bold text-blue-600 cursor-pointer hover:underline" onclick="viewTripDetails('${t.id}')">${t.lrNo}</span>
                <span class="block text-xs font-mono text-slate-400">${t.id}</span>
                <span class="block text-xs text-slate-400">${t.startDate}</span>
            </td>
            <td>
                <div class="font-semibold text-slate-800">${t.route.origin} &rarr; ${t.route.destination}</div>
                <div class="text-xs text-slate-500">${t.material.materialType} (${t.material.weight} T)</div>
            </td>
            <td>
                <div class="font-semibold text-slate-800">${t.partyName}</div>
                <div class="text-xs text-slate-400">Inv: ${t.material.invoiceNo || 'N/A'}</div>
            </td>
            <td>
                <span class="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-800 font-bold">${t.truckNo}</span>
                <div class="text-xs text-slate-500 mt-1">${t.supplierName}</div>
                <div class="text-xs text-slate-400">Driver: ${t.driverName}</div>
            </td>
            <td>
                <div class="font-semibold text-slate-900">${formatINR(t.billing.partyFreightAmount)}</div>
                <div class="text-xs text-emerald-600">Adv: ${formatINR(t.billing.partyAdvance)}</div>
                <div class="text-xs font-bold ${t.billing.partyBalance > 0 ? 'text-amber-600' : 'text-slate-400'}">
                    Due: ${formatINR(t.billing.partyBalance)}
                </div>
            </td>
            <td>
                <div class="font-semibold text-slate-800">${formatINR(t.supplierBilling.truckHireCost)}</div>
                <div class="text-xs text-slate-500">Adv: ${formatINR(t.supplierBilling.advanceToSupplier)}</div>
                <div class="text-xs font-semibold ${t.supplierBilling.supplierBalance > 0 ? 'text-rose-600' : 'text-slate-400'}">
                    To Pay: ${formatINR(t.supplierBilling.supplierBalance)}
                </div>
            </td>
            <td>
                <span class="font-bold ${t.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                    ${formatINR(t.netProfit)}
                </span>
            </td>
            <td>
                <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(t.status)}">
                        ${t.status === 'In Transit' ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>' : ''}
                        ${t.status}
                    </span>
                    ${t.pod?.uploaded ? '<span class="text-purple-600" title="POD Verified"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg></span>' : ''}
                </div>
            </td>
            <td class="text-right whitespace-nowrap">
                <button onclick="editTrip('${t.id}')" class="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50" title="Edit Trip">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button onclick="openChangeStatusModal('${t.id}')" class="p-1.5 text-slate-500 hover:text-amber-600 rounded hover:bg-amber-50" title="Update Trip Status">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
                <button onclick="openPodModal('${t.id}')" class="p-1.5 text-slate-500 hover:text-purple-600 rounded hover:bg-purple-50" title="Attach / View POD">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </button>
                <button onclick="openPrintLrModal('${t.id}')" class="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Print Lorry Receipt (LR)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                </button>
                <button onclick="deleteTripConfirm('${t.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50" title="Delete Trip">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterTripsByStatus(status, btnElement) {
    currentTripFilter = status;
    document.querySelectorAll('.trip-filter-btn').forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white');
        b.classList.add('bg-slate-100', 'text-slate-600');
    });
    btnElement.classList.add('bg-blue-600', 'text-white');
    btnElement.classList.remove('bg-slate-100', 'text-slate-600');
    renderTrips();
}

function editTrip(tripId) {
    openNewTripModal(tripId);
}

function deleteTripConfirm(tripId) {
    if (confirm(`Are you sure you want to delete trip ${tripId}? This action cannot be undone.`)) {
        window.tmsStore.deleteTrip(tripId);
        showToast(`Trip ${tripId} deleted.`);
        switchTab(currentTab);
    }
}

// -------------------------------------------------------------
// POD (Proof Of Delivery) Handler
// -------------------------------------------------------------
let currentPodTripId = null;

function openPodModal(tripId) {
    currentPodTripId = tripId;
    const trip = window.tmsStore.getTrips().find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('podModalLrNo').textContent = `${trip.lrNo} (${trip.route.origin} -> ${trip.route.destination})`;
    const form = document.getElementById('podUploadForm');
    form.reset();

    const previewContainer = document.getElementById('podPreviewContainer');
    const previewImg = document.getElementById('podPreviewImg');

    if (trip.pod && trip.pod.uploaded) {
        document.getElementById('podReceiverName').value = trip.pod.receiverName || '';
        document.getElementById('podReceivedDate').value = trip.pod.receivedDate || '';
        document.getElementById('podNotes').value = trip.pod.notes || '';
        if (trip.pod.documentUrl) {
            previewImg.src = trip.pod.documentUrl;
            previewContainer.classList.remove('hidden');
        } else {
            previewContainer.classList.add('hidden');
        }
    } else {
        document.getElementById('podReceivedDate').value = new Date().toISOString().split('T')[0];
        previewContainer.classList.add('hidden');
    }

    openModal('podModal');
}

// File input handler for POD preview
document.getElementById('podFileInput')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const previewContainer = document.getElementById('podPreviewContainer');
            const previewImg = document.getElementById('podPreviewImg');
            previewImg.src = evt.target.result;
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

function attachSamplePod() {
    const previewContainer = document.getElementById('podPreviewContainer');
    const previewImg = document.getElementById('podPreviewImg');
    const trip = window.tmsStore.getTrips().find(t => t.id === currentPodTripId);

    const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0 0 500 300"><rect width="100%" height="100%" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="4"/><rect x="20" y="20" width="460" height="260" fill="none" stroke="%2394a3b8" stroke-dasharray="6,4"/><text x="50%" y="25%" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a" text-anchor="middle">PROOF OF DELIVERY - VERIFIED RECEIPT</text><text x="50%" y="40%" font-family="sans-serif" font-size="14" fill="%232563eb" text-anchor="middle">Trip: ${trip?.lrNo || 'LR-DOC'} | Party: ${trip?.partyName || 'Client'}</text><text x="50%" y="55%" font-family="sans-serif" font-size="12" fill="%23475569" text-anchor="middle">Materials received in intact sound condition without shortage or leakage</text><circle cx="410" cy="220" r="40" fill="none" stroke="%2316a34a" stroke-width="3"/><text x="410" y="215" font-family="sans-serif" font-size="10" font-weight="bold" fill="%2316a34a" text-anchor="middle">VERIFIED</text><text x="410" y="230" font-family="sans-serif" font-size="9" fill="%2316a34a" text-anchor="middle">STAMPED</text><line x1="50" y1="240" x2="200" y2="240" stroke="%230f172a" stroke-width="2"/><text x="125" y="255" font-family="sans-serif" font-size="11" fill="%2364748b" text-anchor="middle">Receiver Signature</text></svg>`;
    
    previewImg.src = svg;
    previewContainer.classList.remove('hidden');
    document.getElementById('podReceiverName').value = 'Warehouse Incharge (Stamped)';
    document.getElementById('podNotes').value = 'Verified physical consignment count and stamp received.';
    showToast('Official stamped POD template attached!');
}

function handleSavePod(e) {
    e.preventDefault();
    if (!currentPodTripId) return;

    const receiverName = document.getElementById('podReceiverName').value;
    const receivedDate = document.getElementById('podReceivedDate').value;
    const notes = document.getElementById('podNotes').value;
    const previewImg = document.getElementById('podPreviewImg');
    const docUrl = previewImg?.src || '';

    const podData = {
        receiverName,
        receivedDate,
        notes,
        documentUrl: docUrl
    };

    window.tmsStore.updateTripStatus(currentPodTripId, 'POD Done', podData);
    showToast('Proof of Delivery (POD) saved successfully!');
    closeModal('podModal');
    switchTab(currentTab);
}

// -------------------------------------------------------------
// Change Status Modal
// -------------------------------------------------------------
let currentStatusTripId = null;

function openChangeStatusModal(tripId) {
    currentStatusTripId = tripId;
    const trip = window.tmsStore.getTrips().find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('statusModalLrNo').textContent = `${trip.lrNo} - ${trip.partyName}`;
    document.getElementById('updateTripStatusSelect').value = trip.status;
    openModal('changeStatusModal');
}

function handleConfirmTripStatus() {
    if (!currentStatusTripId) return;
    const newStatus = document.getElementById('updateTripStatusSelect').value;
    window.tmsStore.updateTripStatus(currentStatusTripId, newStatus);
    showToast(`Trip status updated to "${newStatus}"!`);
    closeModal('changeStatusModal');
    switchTab(currentTab);
}

// -------------------------------------------------------------
// Printable Lorry Receipt (LR / Bilty) Generator
// -------------------------------------------------------------
function openPrintLrModal(tripId) {
    const trip = window.tmsStore.getTrips().find(t => t.id === tripId);
    if (!trip) return;

    const user = window.tmsStore.getAuthUser() || {};
    const party = window.tmsStore.getParties().find(p => p.id === trip.partyId);

    const container = document.getElementById('lrDocumentContainer');
    container.innerHTML = `
        <div class="lr-document">
            <!-- Header -->
            <div class="border-b-2 border-slate-900 pb-4 mb-4 text-center">
                <span class="text-xs font-bold tracking-wider text-slate-500 uppercase">CONSIGNMENT NOTE / LORRY RECEIPT (LR)</span>
                <h1 class="text-2xl font-black text-slate-900 mt-1 uppercase">${user.company || 'JAIPUR BANGLORE LOGISTICS'}</h1>
                <p class="text-xs text-slate-600 font-medium">Head Office: ${user.city || 'Mumbai'}, Maharashtra | Phone: ${user.phone || '+91 98200 12345'}</p>
                <div class="flex justify-between items-center text-xs font-bold text-slate-800 mt-2 pt-2 border-t border-slate-200">
                    <span>GSTIN: <span class="font-mono">${user.gstin || '27AAACG0123M1Z5'}</span></span>
                    <span class="text-base text-blue-800 font-black">LR NO: <span class="font-mono">${trip.lrNo}</span></span>
                    <span>DATE: <span class="font-mono">${trip.startDate}</span></span>
                </div>
            </div>

            <!-- Route & Vehicle Meta -->
            <div class="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div class="border border-slate-700 p-3 rounded">
                    <span class="font-bold text-slate-500 uppercase block mb-1">CONSIGNOR (PARTY):</span>
                    <div class="text-sm font-bold text-slate-900">${trip.partyName}</div>
                    <div class="text-slate-600">${party?.address || trip.route.origin}</div>
                    <div class="text-slate-700 mt-1">GSTIN: <span class="font-mono font-bold">${party?.gst || 'N/A'}</span></div>
                    <div class="text-slate-700">Phone: ${party?.phone || 'N/A'}</div>
                </div>
                <div class="border border-slate-700 p-3 rounded">
                    <span class="font-bold text-slate-500 uppercase block mb-1">TRANSIT DETAILS:</span>
                    <div><strong>FROM:</strong> ${trip.route.origin}</div>
                    <div><strong>TO:</strong> ${trip.route.destination}</div>
                    <div class="mt-1"><strong>TRUCK NO:</strong> <span class="font-mono font-bold text-sm bg-slate-100 px-1.5 py-0.5 rounded">${trip.truckNo}</span></div>
                    <div><strong>DRIVER:</strong> ${trip.driverName}</div>
                </div>
            </div>

            <!-- Material Details Table -->
            <table class="mb-4">
                <thead>
                    <tr>
                        <th class="text-left">No. of Pkgs</th>
                        <th class="text-left">Description of Goods</th>
                        <th class="text-right">Actual Weight</th>
                        <th class="text-right">Invoice No.</th>
                        <th class="text-right">Declared Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Full Truck Load</td>
                        <td class="font-medium">${trip.material.materialType}</td>
                        <td class="text-right font-mono">${trip.material.weight} Tonnes</td>
                        <td class="text-right font-mono">${trip.material.invoiceNo || 'N/A'}</td>
                        <td class="text-right font-mono">${formatINR(trip.material.invoiceValue)}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Financials Table -->
            <div class="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div class="border border-slate-700 p-3">
                    <span class="font-bold text-slate-800 block mb-1">TERMS & REMARKS:</span>
                    <p class="text-slate-600 text-xs">${trip.notes || 'Goods booked at Owner’s risk. Certified that goods are properly packed and handed over.'}</p>
                </div>
                <div>
                    <table>
                        <tr>
                            <td class="font-bold">Party Freight Charges</td>
                            <td class="text-right font-mono font-bold">${formatINR(trip.billing.partyFreightAmount)}</td>
                        </tr>
                        <tr>
                            <td>Advance Received</td>
                            <td class="text-right font-mono text-emerald-700">${formatINR(trip.billing.partyAdvance)}</td>
                        </tr>
                        <tr class="bg-slate-100">
                            <td class="font-black text-slate-900">BALANCE TO PAY</td>
                            <td class="text-right font-mono font-black text-slate-900">${formatINR(trip.billing.partyBalance)}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Signature Section -->
            <div class="grid grid-cols-3 gap-4 pt-8 text-center text-xs">
                <div>
                    <div class="border-t border-slate-800 pt-1 font-bold">Consignor Signature</div>
                </div>
                <div>
                    <div class="border-t border-slate-800 pt-1 font-bold">Driver Signature</div>
                </div>
                <div>
                    <div class="border-t border-slate-800 pt-1 font-bold">For ${user.company || 'JAIPUR BANGLORE LOGISTICS'}</div>
                </div>
            </div>
        </div>
    `;

    openModal('printLrModal');
}

function triggerPrintLr() {
    window.print();
}

// -------------------------------------------------------------
// 4. PARTIES MODULE
// -------------------------------------------------------------
function renderParties() {
    const parties = window.tmsStore.getParties();
    const trips = window.tmsStore.getTrips();
    const searchQuery = document.getElementById('partySearchInput')?.value?.toLowerCase()?.trim() || '';

    const filtered = parties.filter(p => 
        p.name.toLowerCase().includes(searchQuery) ||
        p.phone.toLowerCase().includes(searchQuery) ||
        p.city.toLowerCase().includes(searchQuery) ||
        p.gst.toLowerCase().includes(searchQuery)
    );

    const tbody = document.getElementById('partiesTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">No parties found. Click "+ Add Party" to register one.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const partyTrips = trips.filter(t => t.partyId === p.id);
        const totalBilled = partyTrips.reduce((sum, t) => sum + (t.billing.partyFreightAmount || 0), 0);
        const totalDue = partyTrips.reduce((sum, t) => sum + (t.billing.partyBalance || 0), 0);

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td>
                    <div class="font-bold text-slate-900">${p.name}</div>
                    <div class="text-xs text-slate-500">${p.address || p.city}</div>
                </td>
                <td>
                    <div class="font-medium text-slate-800">${p.contactPerson || '-'}</div>
                    <div class="text-xs text-slate-500">${p.phone}</div>
                </td>
                <td>
                    <span class="inline-block bg-slate-100 px-2.5 py-0.5 rounded text-xs font-semibold text-slate-700">${p.city}</span>
                </td>
                <td>
                    <span class="font-mono text-xs text-slate-700">${p.gst || 'UNREGISTERED'}</span>
                    <span class="block text-xs text-slate-400">Credit: ${p.creditDays} Days</span>
                </td>
                <td class="text-center">
                    <span class="font-bold text-slate-800">${partyTrips.length}</span>
                </td>
                <td>
                    <div class="font-bold ${totalDue > 0 ? 'text-amber-600' : 'text-emerald-600'}">
                        ${formatINR(totalDue)}
                    </div>
                    <div class="text-xs text-slate-400">Billed: ${formatINR(totalBilled)}</div>
                </td>
                <td class="text-right whitespace-nowrap">
                    <button onclick="openPartyLedger('${p.id}')" class="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded">
                        Ledger
                    </button>
                    <button onclick="deletePartyConfirm('${p.id}')" class="p-1 text-slate-400 hover:text-rose-600 ml-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function handleSaveParty(e) {
    e.preventDefault();
    const name = document.getElementById('partyName').value;
    const contactPerson = document.getElementById('partyContactPerson').value;
    const phone = document.getElementById('partyPhone').value;
    const city = document.getElementById('partyCity').value;
    const address = document.getElementById('partyAddress').value;
    const gst = document.getElementById('partyGst').value;
    const creditDays = document.getElementById('partyCreditDays').value;

    window.tmsStore.addParty({ name, contactPerson, phone, city, address, gst, creditDays });
    showToast(`Party "${name}" registered successfully!`);
    closeModal('addPartyModal');
    renderParties();
}

function deletePartyConfirm(partyId) {
    if (confirm('Are you sure you want to delete this party?')) {
        window.tmsStore.deleteParty(partyId);
        showToast('Party deleted.');
        renderParties();
    }
}

function openPartyLedger(partyId) {
    const party = window.tmsStore.getParties().find(p => p.id === partyId);
    const trips = window.tmsStore.getTrips().filter(t => t.partyId === partyId);
    if (!party) return;

    document.getElementById('partyLedgerTitle').textContent = `Party Ledger: ${party.name}`;
    const tbody = document.getElementById('partyLedgerTableBody');

    const totalFreight = trips.reduce((sum, t) => sum + (t.billing.partyFreightAmount || 0), 0);
    const totalAdv = trips.reduce((sum, t) => sum + (t.billing.partyAdvance || 0), 0);
    const totalDue = trips.reduce((sum, t) => sum + (t.billing.partyBalance || 0), 0);

    document.getElementById('ledgerPartyTotalBilled').textContent = formatINR(totalFreight);
    document.getElementById('ledgerPartyTotalAdv').textContent = formatINR(totalAdv);
    document.getElementById('ledgerPartyTotalDue').textContent = formatINR(totalDue);

    tbody.innerHTML = trips.map(t => `
        <tr>
            <td class="font-bold text-blue-600">${t.lrNo}</td>
            <td>${t.startDate}</td>
            <td>${t.route.origin} &rarr; ${t.route.destination}</td>
            <td class="font-mono">${t.truckNo}</td>
            <td class="text-right font-semibold">${formatINR(t.billing.partyFreightAmount)}</td>
            <td class="text-right text-emerald-600">${formatINR(t.billing.partyAdvance)}</td>
            <td class="text-right font-bold ${t.billing.partyBalance > 0 ? 'text-amber-600' : 'text-slate-400'}">${formatINR(t.billing.partyBalance)}</td>
            <td><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(t.status)}">${t.status}</span></td>
        </tr>
    `).join('');

    openModal('partyLedgerModal');
}

// -------------------------------------------------------------
// 5. SUPPLIERS / TRANSPORTERS MODULE
// -------------------------------------------------------------
function renderSuppliers() {
    const suppliers = window.tmsStore.getSuppliers();
    const trips = window.tmsStore.getTrips();
    const searchQuery = document.getElementById('supplierSearchInput')?.value?.toLowerCase()?.trim() || '';

    const filtered = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchQuery) ||
        s.phone.toLowerCase().includes(searchQuery) ||
        s.city.toLowerCase().includes(searchQuery) ||
        s.gst.toLowerCase().includes(searchQuery)
    );

    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">No suppliers/transporters found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const supTrips = trips.filter(t => t.supplierId === s.id);
        const totalHire = supTrips.reduce((sum, t) => sum + (t.supplierBilling.truckHireCost || 0), 0);
        const given = supTrips.reduce((sum, t) => sum + (t.supplierBilling.advanceToSupplier || 0), 0);
        const balanceDue = supTrips.reduce((sum, t) => sum + (t.supplierBilling.supplierBalance || 0), 0);

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td>
                    <div class="font-bold text-slate-900">${s.name}</div>
                    <div class="text-xs text-slate-500">${s.contactPerson || 'Transporter Contact'}</div>
                    <div class="text-xs font-mono text-slate-400">GST: ${s.gst || 'N/A'}</div>
                </td>
                <td>
                    <div class="font-medium text-slate-800">${s.phone}</div>
                    <div class="text-xs text-slate-500 font-mono">${s.upiId ? `UPI: ${s.upiId}` : ''}</div>
                </td>
                <td>
                    <span class="inline-block bg-slate-100 px-2.5 py-0.5 rounded text-xs font-semibold text-slate-700">${s.city}</span>
                </td>
                <td class="text-center">
                    <button onclick="openSupplierLedger('${s.id}')" class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition" title="View Linked Trips">
                        <span>${supTrips.length} Trips</span>
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </td>
                <td class="text-right">
                    <span class="font-bold text-slate-900">${formatINR(totalHire)}</span>
                </td>
                <td class="text-right">
                    <span class="font-semibold text-emerald-600">${formatINR(given)}</span>
                </td>
                <td class="text-right">
                    <div class="font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-slate-400'}">
                        ${formatINR(balanceDue)}
                    </div>
                </td>
                <td class="text-right whitespace-nowrap">
                    <button onclick="openSettleSupplierModal('${s.id}')" class="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-sm mr-1">
                        Settle Balance
                    </button>
                    <button onclick="openSupplierLedger('${s.id}')" class="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded mr-1" title="View Trips & Ledger">
                        Trips
                    </button>
                    <button onclick="deleteSupplierConfirm('${s.id}')" class="p-1 text-slate-400 hover:text-rose-600 ml-1" title="Delete Supplier">
                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function handleSaveSupplier(e) {
    e.preventDefault();
    const name = document.getElementById('supplierName').value;
    const contactPerson = document.getElementById('supplierContactPerson').value;
    const phone = document.getElementById('supplierPhone').value;
    const city = document.getElementById('supplierCity').value;
    const gst = document.getElementById('supplierGst').value;
    const bankDetails = document.getElementById('supplierBankDetails').value;
    const upiId = document.getElementById('supplierUpiId').value;

    window.tmsStore.addSupplier({ name, contactPerson, phone, city, gst, bankDetails, upiId });
    showToast(`Supplier / Transporter "${name}" registered!`);
    closeModal('addSupplierModal');
    renderSuppliers();
    populateTruckSupplierDropdown();
    populateSupplierDropdown();
}

function deleteSupplierConfirm(id) {
    if (confirm('Delete this supplier?')) {
        window.tmsStore.deleteSupplier(id);
        showToast('Supplier deleted.');
        renderSuppliers();
        populateTruckSupplierDropdown();
        populateSupplierDropdown();
    }
}

function openSupplierLedger(supplierId) {
    const supplier = window.tmsStore.getSuppliers().find(s => s.id === supplierId);
    if (!supplier) return;

    const trips = window.tmsStore.getTrips().filter(t => t.supplierId === supplierId);

    const totalHire = trips.reduce((sum, t) => sum + (t.supplierBilling.truckHireCost || 0), 0);
    const totalGiven = trips.reduce((sum, t) => sum + (t.supplierBilling.advanceToSupplier || 0), 0);
    const totalDue = trips.reduce((sum, t) => sum + (t.supplierBilling.supplierBalance || 0), 0);

    document.getElementById('supplierLedgerTitle').textContent = `Supplier Ledger: ${supplier.name}`;
    document.getElementById('ledgerSupplierTotalHire').textContent = formatINR(totalHire);
    document.getElementById('ledgerSupplierTotalGiven').textContent = formatINR(totalGiven);
    document.getElementById('ledgerSupplierTotalDue').textContent = formatINR(totalDue);
    document.getElementById('ledgerSupplierTripsCount').textContent = trips.length;

    const settleBtn = document.getElementById('supplierLedgerSettleBtn');
    if (settleBtn) {
        settleBtn.onclick = () => {
            closeModal('supplierLedgerModal');
            openSettleSupplierModal(supplier.id);
        };
    }

    const tbody = document.getElementById('supplierLedgerTableBody');
    if (tbody) {
        if (trips.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-slate-400">No trips linked to this supplier yet.</td></tr>`;
        } else {
            tbody.innerHTML = trips.map(t => `
                <tr class="hover:bg-slate-50">
                    <td class="font-bold text-blue-600 cursor-pointer hover:underline" onclick="closeModal('supplierLedgerModal'); viewTripDetails('${t.id}')">${t.lrNo}</td>
                    <td>${t.startDate}</td>
                    <td>${t.route.origin} &rarr; ${t.route.destination}</td>
                    <td class="font-mono font-bold">${t.truckNo}</td>
                    <td class="text-right font-semibold">${formatINR(t.supplierBilling.truckHireCost)}</td>
                    <td class="text-right text-emerald-600 font-semibold">${formatINR(t.supplierBilling.advanceToSupplier)}</td>
                    <td class="text-right font-bold ${t.supplierBilling.supplierBalance > 0 ? 'text-rose-600' : 'text-slate-400'}">${formatINR(t.supplierBilling.supplierBalance)}</td>
                    <td><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(t.status)}">${t.status}</span></td>
                    <td class="text-right">
                        ${t.supplierBilling.supplierBalance > 0 ? `
                            <button onclick="closeModal('supplierLedgerModal'); openSettleSupplierModal('${supplier.id}');" class="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded">
                                Settle
                            </button>
                        ` : '<span class="text-xs text-emerald-600 font-bold">Cleared</span>'}
                    </td>
                </tr>
            `).join('');
        }
    }

    openModal('supplierLedgerModal');
}

// -------------------------------------------------------------
// 6. DRIVER MODULE
// -------------------------------------------------------------
function renderDrivers() {
    const stats = window.tmsStore.getDriverStats();
    document.getElementById('driverGaveDisplay').textContent = formatINR(stats.driverGave);
    document.getElementById('driverGotDisplay').textContent = formatINR(stats.driverGot);
    document.getElementById('driverTotalBalDisplay').textContent = formatINR(stats.totalBalance);
    document.getElementById('driverOnTripDisplay').textContent = stats.onTrip;
    document.getElementById('driverAvailableDisplay').textContent = stats.available;

    const drivers = window.tmsStore.getDrivers();
    const trips = window.tmsStore.getTrips();
    const searchQuery = document.getElementById('driverSearchInput')?.value?.toLowerCase()?.trim() || '';

    const filtered = drivers.filter(d => 
        d.name.toLowerCase().includes(searchQuery) ||
        d.mobile.toLowerCase().includes(searchQuery) ||
        (d.licenseNo && d.licenseNo.toLowerCase().includes(searchQuery))
    );

    const tbody = document.getElementById('driversTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">No drivers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(d => {
        const netBal = (d.driverGave || 0) - (d.driverGot || 0);
        const activeTrip = trips.find(t => t.driverId === d.id && t.status === 'In Transit');
        const driverTripCount = trips.filter(t => t.driverId === d.id).length;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td>
                    <div class="font-bold text-slate-900">${d.name}</div>
                    <div class="text-xs font-mono text-slate-500">DL: ${d.licenseNo || 'N/A'}</div>
                </td>
                <td>
                    <div class="font-medium text-slate-800">${d.mobile}</div>
                    <div class="text-xs text-slate-500 font-mono">${d.upiId ? `UPI: ${d.upiId}` : ''}</div>
                </td>
                <td>
                    ${activeTrip ? `
                        <button onclick="viewTripDetails('${activeTrip.id}')" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition" title="Click to view active trip">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>On Trip (${activeTrip.lrNo})</span>
                        </button>
                    ` : `
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Available
                        </span>
                    `}
                </td>
                <td class="text-right font-semibold text-rose-600">${formatINR(d.driverGave)}</td>
                <td class="text-right font-semibold text-emerald-600">${formatINR(d.driverGot)}</td>
                <td class="text-right font-bold text-slate-900">${formatINR(netBal)}</td>
                <td><div class="text-xs text-slate-500 truncate max-w-xs">${d.bankDetails || 'N/A'}</div></td>
                <td class="text-right whitespace-nowrap">
                    <button onclick="openDriverAdvanceModal('${d.id}')" class="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded mr-1" title="Give Advance / Cash">
                        Advance
                    </button>
                    <button onclick="openDriverTripsModal('${d.id}')" class="px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded mr-1" title="View Assigned Trips (${driverTripCount})">
                        Trips (${driverTripCount})
                    </button>
                    <button onclick="openEditDriverModal('${d.id}')" class="p-1 text-slate-500 hover:text-blue-600 mr-1" title="Edit Driver Details">
                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="deleteDriverConfirm('${d.id}')" class="p-1 text-slate-400 hover:text-rose-600" title="Delete Driver">
                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openNewDriverModal() {
    document.getElementById('driverForm').reset();
    const editId = document.getElementById('driverEditId');
    if (editId) editId.value = '';
    const title = document.getElementById('driverModalTitle');
    if (title) title.textContent = 'Add Driver Khata';
    const submitBtn = document.getElementById('driverSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Save Driver';
    openModal('addDriverModal');
}

function openEditDriverModal(driverId) {
    const driver = window.tmsStore.getDrivers().find(d => d.id === driverId);
    if (!driver) return;

    document.getElementById('driverEditId').value = driver.id;
    const title = document.getElementById('driverModalTitle');
    if (title) title.textContent = `Edit Driver: ${driver.name}`;
    const submitBtn = document.getElementById('driverSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Update Driver';

    document.getElementById('driverName').value = driver.name || '';
    document.getElementById('driverMobile').value = driver.mobile || '';
    document.getElementById('driverLicenseNo').value = driver.licenseNo || '';
    document.getElementById('driverUpiId').value = driver.upiId || '';
    document.getElementById('driverBankDetails').value = driver.bankDetails || '';
    document.getElementById('driverOpeningBalance').value = driver.openingBalance || 0;
    document.getElementById('driverGaveInput').value = driver.driverGave || 0;
    document.getElementById('driverGotInput').value = driver.driverGot || 0;

    openModal('addDriverModal');
}

function handleSaveDriver(e) {
    e.preventDefault();
    const editId = document.getElementById('driverEditId')?.value;
    const name = document.getElementById('driverName').value;
    const mobile = document.getElementById('driverMobile').value;
    const licenseNo = document.getElementById('driverLicenseNo').value;
    const bankDetails = document.getElementById('driverBankDetails').value;
    const upiId = document.getElementById('driverUpiId').value;
    const openingBalance = document.getElementById('driverOpeningBalance').value;
    const driverGave = document.getElementById('driverGaveInput').value;
    const driverGot = document.getElementById('driverGotInput').value;

    if (editId) {
        window.tmsStore.updateDriver(editId, {
            name: name.trim(),
            mobile,
            licenseNo: (licenseNo || '').toUpperCase(),
            bankDetails,
            upiId,
            openingBalance: parseFloat(openingBalance) || 0,
            driverGave: parseFloat(driverGave) || 0,
            driverGot: parseFloat(driverGot) || 0
        });
        showToast(`Driver "${name}" updated successfully!`);
    } else {
        window.tmsStore.addDriver({ name, mobile, licenseNo, bankDetails, upiId, openingBalance, driverGave, driverGot });
        showToast(`Driver "${name}" registered!`);
    }

    closeModal('addDriverModal');
    renderDrivers();
    populateDriverDropdown();
}

function deleteDriverConfirm(id) {
    if (confirm('Delete driver?')) {
        window.tmsStore.deleteDriver(id);
        showToast('Driver deleted.');
        renderDrivers();
        populateDriverDropdown();
    }
}

function openDriverAdvanceModal(driverId) {
    const driver = window.tmsStore.getDrivers().find(d => d.id === driverId);
    if (!driver) return;

    document.getElementById('driverAdvDriverId').value = driver.id;
    document.getElementById('driverAdvDriverNameDisplay').textContent = `${driver.name} (${driver.mobile || 'No Mobile'})`;
    const netBal = (driver.driverGave || 0) - (driver.driverGot || 0);
    document.getElementById('driverAdvBalDisplay').textContent = formatINR(netBal);
    document.getElementById('driverAdvDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('driverAdvAmount').value = '';
    document.getElementById('driverAdvNotes').value = '';

    // Show trips: this driver's trips, in-transit trips, or open trips with pending Trans Due
    const trips = window.tmsStore.getTrips().filter(t => 
        t.status !== 'Cancelled' && 
        (t.driverId === driverId || t.status === 'In Transit' || (t.supplierBilling && t.supplierBilling.supplierBalance > 0))
    );
    const select = document.getElementById('driverAdvTripSelect');
    if (select) {
        select.innerHTML = '<option value="">-- General Khata Advance (No Trip) --</option>' + 
            trips.map(t => {
                const due = t.supplierBilling ? t.supplierBilling.supplierBalance : 0;
                const isAssigned = t.driverId === driverId ? ' [Assigned]' : '';
                return `<option value="${t.id}">${t.lrNo} - ${t.truckNo} (${t.route.origin} &rarr; ${t.route.destination}) | Trans Due: ${formatINR(due)}${isAssigned}</option>`;
            }).join('');
    }

    openModal('driverAdvanceModal');
}

function handleSaveDriverAdvance(e) {
    e.preventDefault();
    const driverId = document.getElementById('driverAdvDriverId').value;
    const driver = window.tmsStore.getDrivers().find(d => d.id === driverId);
    const type = document.getElementById('driverAdvType').value;
    const amount = parseFloat(document.getElementById('driverAdvAmount').value) || 0;
    const date = document.getElementById('driverAdvDate').value;
    const tripId = document.getElementById('driverAdvTripSelect').value;
    const mode = document.getElementById('driverAdvMode').value;
    const notes = document.getElementById('driverAdvNotes').value;

    if (!driverId || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    window.tmsStore.recordDriverAdvance(driverId, { type, amount, date, tripId, mode, notes });
    showToast(tripId ? `Driver advance of ${formatINR(amount)} linked to trip & deducted from Trans Due!` : `Driver transaction of ${formatINR(amount)} recorded for ${driver?.name || 'Driver'}!`);
    closeModal('driverAdvanceModal');
    renderDrivers();
    renderTrips();
    renderPayments();
    renderSuppliers();
    renderExpenses();
    renderDashboard();
}

function openDriverTripsModal(driverId) {
    const driver = window.tmsStore.getDrivers().find(d => d.id === driverId);
    if (!driver) return;

    const trips = window.tmsStore.getTrips().filter(t => t.driverId === driverId);
    const activeTrips = trips.filter(t => t.status === 'In Transit');
    const closedTrips = trips.filter(t => t.status === 'Closed');

    document.getElementById('driverTripsTitle').textContent = `Driver Trips History: ${driver.name}`;
    document.getElementById('driverTripsCount').textContent = trips.length;
    document.getElementById('driverTripsActiveCount').textContent = activeTrips.length;
    document.getElementById('driverTripsClosedCount').textContent = closedTrips.length;

    const tbody = document.getElementById('driverTripsTableBody');
    if (tbody) {
        if (trips.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">No trips assigned to this driver yet.</td></tr>`;
        } else {
            tbody.innerHTML = trips.map(t => `
                <tr class="hover:bg-slate-50">
                    <td class="font-bold text-blue-600 cursor-pointer hover:underline" onclick="closeModal('driverTripsModal'); viewTripDetails('${t.id}')">${t.lrNo}</td>
                    <td>${t.startDate}</td>
                    <td>${t.route.origin} &rarr; ${t.route.destination}</td>
                    <td class="font-mono font-bold">${t.truckNo}</td>
                    <td>${t.partyName}</td>
                    <td><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(t.status)}">${t.status}</span></td>
                    <td class="text-right">
                        <button onclick="closeModal('driverTripsModal'); openDriverAdvanceModal('${driver.id}')" class="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded mr-1">
                            Pay Advance
                        </button>
                        <button onclick="closeModal('driverTripsModal'); viewTripDetails('${t.id}')" class="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-700">
                            View Details
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    openModal('driverTripsModal');
}

// -------------------------------------------------------------
// 7. TRUCK FLEET MODULE
// -------------------------------------------------------------
function renderTrucks() {
    let trucks = window.tmsStore.getTrucks();
    const searchQuery = document.getElementById('truckSearchInput')?.value?.toLowerCase()?.trim() || '';

    if (currentTruckFilter !== 'all') {
        trucks = trucks.filter(t => t.ownership.toLowerCase() === currentTruckFilter.toLowerCase());
    }

    if (searchQuery) {
        trucks = trucks.filter(t => 
            t.truckNo.toLowerCase().includes(searchQuery) ||
            t.truckType.toLowerCase().includes(searchQuery) ||
            t.supplierName.toLowerCase().includes(searchQuery)
        );
    }

    const tbody = document.getElementById('trucksTableBody');
    if (!tbody) return;

    if (trucks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">No trucks found.</td></tr>`;
        return;
    }

    tbody.innerHTML = trucks.map(t => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td>
                <span class="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">${t.truckNo}</span>
            </td>
            <td>
                <div class="font-medium text-slate-800">${t.truckType}</div>
                <div class="text-xs text-slate-500">${t.vehicleType || ''}</div>
            </td>
            <td class="font-mono font-semibold">${t.capacity} Tonnes</td>
            <td>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.ownership === 'My' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                    ${t.ownership === 'My' ? 'My Fleet' : 'Market Hired'}
                </span>
            </td>
            <td>
                <div class="font-medium text-slate-800">${t.supplierName}</div>
            </td>
            <td>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.status === 'On Trip' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                    ${t.status}
                </span>
            </td>
            <td class="text-right whitespace-nowrap">
                <button onclick="deleteTruckConfirm('${t.id}')" class="p-1 text-slate-400 hover:text-rose-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterTrucksByOwnership(ownership, btnElement) {
    currentTruckFilter = ownership;
    document.querySelectorAll('.truck-filter-btn').forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white');
        b.classList.add('bg-slate-100', 'text-slate-600');
    });
    btnElement.classList.add('bg-blue-600', 'text-white');
    btnElement.classList.remove('bg-slate-100', 'text-slate-600');
    renderTrucks();
}

function handleSaveTruck(e) {
    e.preventDefault();
    const truckNo = document.getElementById('truckNo').value;
    const ownership = document.getElementById('truckOwnership').value;
    const truckType = document.getElementById('truckType').value;
    const capacity = document.getElementById('truckCapacity').value;
    const supplierSelect = document.getElementById('truckSupplierSelect');
    const supplierId = supplierSelect.value;
    const supplierName = supplierId ? supplierSelect.options[supplierSelect.selectedIndex].text : 'Self Owned';

    window.tmsStore.addTruck({ truckNo, ownership, truckType, capacity, supplierId, supplierName });
    showToast(`Truck "${truckNo}" added!`);
    closeModal('addTruckModal');
    renderTrucks();
}

function deleteTruckConfirm(id) {
    if (confirm('Delete truck?')) {
        window.tmsStore.deleteTruck(id);
        showToast('Truck deleted.');
        renderTrucks();
    }
}

// -------------------------------------------------------------
// 8. EXPENSES MODULE
// -------------------------------------------------------------
function renderExpenses() {
    const stats = window.tmsStore.getExpenseStats();
    document.getElementById('expTotalDisplay').textContent = formatINR(stats.total);
    document.getElementById('expDieselDisplay').textContent = formatINR(stats.diesel);
    document.getElementById('expTollDisplay').textContent = formatINR(stats.toll);
    document.getElementById('expDriverDisplay').textContent = formatINR(stats.driver);
    document.getElementById('expOtherDisplay').textContent = formatINR(stats.other);

    const expenses = window.tmsStore.getExpenses();
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;

    if (expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">No expenses recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = expenses.map(e => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="font-medium text-slate-700">${e.date}</td>
            <td>
                <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getExpenseCategoryBadge(e.category)}">
                    ${e.category}
                </span>
            </td>
            <td class="font-bold text-slate-900">${formatINR(e.amount)}</td>
            <td>
                <span class="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-blue-700 font-semibold">${e.tripLrNo}</span>
            </td>
            <td><span class="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">${e.paymentMode}</span></td>
            <td class="text-xs text-slate-600">${e.notes || '-'}</td>
            <td class="text-right">
                <button onclick="deleteExpenseConfirm('${e.id}')" class="p-1 text-slate-400 hover:text-rose-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function getExpenseCategoryBadge(category) {
    switch (category) {
        case 'Diesel': return 'bg-amber-100 text-amber-800';
        case 'Toll': return 'bg-blue-100 text-blue-800';
        case 'Driver': return 'bg-purple-100 text-purple-800';
        case 'Maintenance': return 'bg-rose-100 text-rose-800';
        default: return 'bg-slate-100 text-slate-800';
    }
}

function openAddExpenseModal() {
    const select = document.getElementById('expenseTripSelect');
    const trips = window.tmsStore.getTrips();
    select.innerHTML = '<option value="">General Fleet / Unlinked</option>' + 
        trips.map(t => `<option value="${t.id}" data-lr="${t.lrNo}">${t.lrNo} - ${t.partyName} (${t.route.origin} &rarr; ${t.route.destination})</option>`).join('');
    
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    openModal('addExpenseModal');
}

function handleSaveExpense(e) {
    e.preventDefault();
    const tripSelect = document.getElementById('expenseTripSelect');
    const tripId = tripSelect.value;
    const tripLrNo = tripId ? tripSelect.options[tripSelect.selectedIndex].dataset.lr : 'General Fleet';
    const category = document.getElementById('expenseCategory').value;
    const amount = document.getElementById('expenseAmount').value;
    const date = document.getElementById('expenseDate').value;
    const paymentMode = document.getElementById('expensePaymentMode').value;
    const notes = document.getElementById('expenseNotes').value;

    window.tmsStore.addExpense({ tripId, tripLrNo, category, amount, date, paymentMode, notes });
    showToast(`Expense of ${formatINR(amount)} logged!`);
    closeModal('addExpenseModal');
    renderExpenses();
}

function deleteExpenseConfirm(id) {
    if (confirm('Delete expense?')) {
        window.tmsStore.deleteExpense(id);
        showToast('Expense removed.');
        renderExpenses();
    }
}

// -------------------------------------------------------------
// 9. PAYMENTS & SETTLEMENTS MODULE
// -------------------------------------------------------------
function renderPayments() {
    // Switch between Party Receivable, Trans Payable, and Pending Trips tabs
    document.querySelectorAll('.payment-tab-btn').forEach(btn => {
        if (btn.dataset.payTab === currentPaymentTab) {
            btn.classList.add('border-blue-600', 'text-blue-600', 'font-bold');
            btn.classList.remove('border-transparent', 'text-slate-500');
        } else {
            btn.classList.remove('border-blue-600', 'text-blue-600', 'font-bold');
            btn.classList.add('border-transparent', 'text-slate-500');
        }
    });

    document.getElementById('partyReceivableSection').classList.toggle('hidden', currentPaymentTab !== 'party');
    document.getElementById('transPayableSection').classList.toggle('hidden', currentPaymentTab !== 'trans');
    document.getElementById('pendingTripsSection').classList.toggle('hidden', currentPaymentTab !== 'trips');

    const trips = window.tmsStore.getTrips();

    if (currentPaymentTab === 'party') {
        const tbody = document.getElementById('partyReceivableTableBody');
        const parties = window.tmsStore.getParties();
        
        tbody.innerHTML = parties.map(p => {
            const pTrips = trips.filter(t => t.partyId === p.id);
            const billed = pTrips.reduce((s, t) => s + (t.billing.partyFreightAmount || 0), 0);
            const received = pTrips.reduce((s, t) => s + (t.billing.partyAdvance || 0), 0);
            const balance = pTrips.reduce((s, t) => s + (t.billing.partyBalance || 0), 0);

            if (billed === 0 && balance === 0) return '';

            return `
                <tr class="hover:bg-slate-50">
                    <td class="font-bold text-slate-900">${p.name}</td>
                    <td>${p.city}</td>
                    <td class="text-right font-semibold">${formatINR(billed)}</td>
                    <td class="text-right font-semibold text-emerald-600">${formatINR(received)}</td>
                    <td class="text-right font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-400'}">${formatINR(balance)}</td>
                    <td class="text-right">
                        ${balance > 0 ? `
                            <button onclick="openRecordPartyPaymentModal('${p.id}')" class="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm">
                                + Receive Payment
                            </button>
                        ` : '<span class="text-xs text-emerald-600 font-bold">Cleared</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    } else if (currentPaymentTab === 'trans') {
        const tbody = document.getElementById('transPayableTableBody');
        const suppliers = window.tmsStore.getSuppliers();

        tbody.innerHTML = suppliers.map(s => {
            const sTrips = trips.filter(t => t.supplierId === s.id);
            const totalHire = sTrips.reduce((sum, t) => sum + (t.supplierBilling.truckHireCost || 0), 0);
            const paid = sTrips.reduce((sum, t) => sum + (t.supplierBilling.advanceToSupplier || 0), 0);
            const balance = sTrips.reduce((sum, t) => sum + (t.supplierBilling.supplierBalance || 0), 0);

            if (totalHire === 0 && balance === 0) return '';

            return `
                <tr class="hover:bg-slate-50">
                    <td class="font-bold text-slate-900">${s.name}</td>
                    <td>${s.city}</td>
                    <td class="text-right font-semibold">${formatINR(totalHire)}</td>
                    <td class="text-right font-semibold text-emerald-600">${formatINR(paid)}</td>
                    <td class="text-right font-bold ${balance > 0 ? 'text-rose-600' : 'text-slate-400'}">${formatINR(balance)}</td>
                    <td class="text-right">
                        ${balance > 0 ? `
                            <button onclick="openSettleSupplierModal('${s.id}')" class="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-sm">
                                Settle Hire Due
                            </button>
                        ` : '<span class="text-xs text-emerald-600 font-bold">Settled</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    } else if (currentPaymentTab === 'trips') {
        const tbody = document.getElementById('pendingTripsTableBody');
        const pending = trips.filter(t => t.billing.partyBalance > 0 || t.supplierBilling.supplierBalance > 0);

        tbody.innerHTML = pending.map(t => `
            <tr class="hover:bg-slate-50">
                <td class="font-bold text-blue-600">${t.lrNo}</td>
                <td>${t.partyName}</td>
                <td>${t.supplierName}</td>
                <td class="text-right font-bold text-amber-600">${formatINR(t.billing.partyBalance)}</td>
                <td class="text-right font-bold text-rose-600">${formatINR(t.supplierBilling.supplierBalance)}</td>
                <td><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(t.status)}">${t.status}</span></td>
                <td class="text-right">
                    <button onclick="editTrip('${t.id}')" class="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-700">
                        View Trip
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

function switchPaymentTab(tab) {
    currentPaymentTab = tab;
    renderPayments();
}

function openRecordPartyPaymentModal(partyId) {
    const party = window.tmsStore.getParties().find(p => p.id === partyId);
    if (!party) return;

    const trips = window.tmsStore.getTrips().filter(t => t.partyId === partyId && t.billing.partyBalance > 0);
    const tripSelect = document.getElementById('partyPayTripSelect');
    
    tripSelect.innerHTML = '<option value="">-- General Account Credit --</option>' + 
        trips.map(t => `<option value="${t.id}" data-due="${t.billing.partyBalance}">${t.lrNo} - Due: ${formatINR(t.billing.partyBalance)}</option>`).join('');

    document.getElementById('partyPayPartyId').value = party.id;
    document.getElementById('partyPayPartyNameDisplay').textContent = party.name;
    document.getElementById('partyPayDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('partyPayAmount').value = '';

    openModal('recordPartyPaymentModal');
}

function handleSavePartyPayment(e) {
    e.preventDefault();
    const partyId = document.getElementById('partyPayPartyId').value;
    const party = window.tmsStore.getParties().find(p => p.id === partyId);
    const tripSelect = document.getElementById('partyPayTripSelect');
    const tripId = tripSelect.value;
    const tripLrNo = tripId ? tripSelect.options[tripSelect.selectedIndex].text.split('-')[0].trim() : '';
    const amount = document.getElementById('partyPayAmount').value;
    const date = document.getElementById('partyPayDate').value;
    const paymentMode = document.getElementById('partyPayMode').value;
    const referenceNo = document.getElementById('partyPayRef').value;
    const notes = document.getElementById('partyPayNotes').value;

    window.tmsStore.addPayment({
        type: 'party_receivable',
        partyId,
        partyName: party?.name,
        tripId,
        tripLrNo,
        amount,
        date,
        paymentMode,
        referenceNo,
        notes
    });

    showToast(`Payment of ${formatINR(amount)} received from ${party?.name}!`);
    closeModal('recordPartyPaymentModal');
    renderParties();
    renderPayments();
    renderDashboard();
    renderTrips();
}

function openSettleSupplierModal(supplierId) {
    const supplier = window.tmsStore.getSuppliers().find(s => s.id === supplierId);
    if (!supplier) return;

    const trips = window.tmsStore.getTrips().filter(t => t.supplierId === supplierId && t.supplierBilling.supplierBalance > 0);
    const tripSelect = document.getElementById('supplierPayTripSelect');

    tripSelect.innerHTML = '<option value="">-- General Ledger Settlement --</option>' + 
        trips.map(t => `<option value="${t.id}">${t.lrNo} - Due: ${formatINR(t.supplierBilling.supplierBalance)}</option>`).join('');

    document.getElementById('supplierPaySupplierId').value = supplier.id;
    document.getElementById('supplierPaySupplierNameDisplay').textContent = supplier.name;
    document.getElementById('supplierPayBankDisplay').textContent = supplier.bankDetails || supplier.upiId || 'No bank on file';
    document.getElementById('supplierPayDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('supplierPayAmount').value = '';

    openModal('settleSupplierPaymentModal');
}

function handleSaveSupplierPayment(e) {
    e.preventDefault();
    const supplierId = document.getElementById('supplierPaySupplierId').value;
    const supplier = window.tmsStore.getSuppliers().find(s => s.id === supplierId);
    const tripSelect = document.getElementById('supplierPayTripSelect');
    const tripId = tripSelect.value;
    const tripLrNo = tripId ? tripSelect.options[tripSelect.selectedIndex].text.split('-')[0].trim() : '';
    const amount = document.getElementById('supplierPayAmount').value;
    const date = document.getElementById('supplierPayDate').value;
    const paymentMode = document.getElementById('supplierPayMode').value;
    const referenceNo = document.getElementById('supplierPayRef').value;
    const notes = document.getElementById('supplierPayNotes').value;

    window.tmsStore.addPayment({
        type: 'trans_payable',
        supplierId,
        supplierName: supplier?.name,
        tripId,
        tripLrNo,
        amount,
        date,
        paymentMode,
        referenceNo,
        notes
    });

    showToast(`Settlement of ${formatINR(amount)} paid to ${supplier?.name}!`);
    closeModal('settleSupplierPaymentModal');
    renderSuppliers();
    renderPayments();
    renderDashboard();
    renderTrips();
}

// -------------------------------------------------------------
// 10. REPORT MODULE (P&L & Analytics)
// -------------------------------------------------------------
function setupDatePickers() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const fromInput = document.getElementById('reportFromDate');
    const toInput = document.getElementById('reportToDate');
    if (fromInput && toInput) {
        fromInput.value = firstDayMonth;
        toInput.value = today;
    }
}

function setReportPreset(preset) {
    const today = new Date();
    const toInput = document.getElementById('reportToDate');
    const fromInput = document.getElementById('reportFromDate');

    toInput.value = today.toISOString().split('T')[0];

    if (preset === 'today') {
        fromInput.value = today.toISOString().split('T')[0];
    } else if (preset === 'this_month') {
        fromInput.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    } else if (preset === 'last_month') {
        fromInput.value = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
        toInput.value = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
    } else if (preset === 'all') {
        fromInput.value = '2026-01-01';
    }

    renderReports();
}

function getReportData() {
    const fromDate = document.getElementById('reportFromDate')?.value || '2026-01-01';
    const toDate = document.getElementById('reportToDate')?.value || '2099-12-31';

    const allTrips = window.tmsStore.getTrips();
    const allExpenses = window.tmsStore.getExpenses();

    const trips = allTrips.filter(t => t.startDate >= fromDate && t.startDate <= toDate && t.status !== 'Cancelled');
    const expenses = allExpenses.filter(e => e.date >= fromDate && e.date <= toDate);

    const totalRevenue = trips.reduce((sum, t) => sum + (t.billing.partyFreightAmount || 0), 0);
    const totalTruckHire = trips.reduce((sum, t) => sum + (t.supplierBilling.truckHireCost || 0), 0);
    const totalCommission = trips.reduce((sum, t) => sum + (t.commission.fromParty + t.commission.fromTruckOwner - t.commission.paidToAgent), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const netProfit = (totalRevenue - totalTruckHire) + totalCommission - totalExpenses;
    const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    return {
        fromDate,
        toDate,
        totalTrips: trips.length,
        totalRevenue,
        totalTruckHire,
        totalCommission,
        totalExpenses,
        netProfit,
        margin,
        trips,
        expenses
    };
}

function renderReports() {
    const data = getReportData();

    document.getElementById('reportTotalTrips').textContent = data.totalTrips;
    document.getElementById('reportTotalRevenue').textContent = formatINR(data.totalRevenue);
    document.getElementById('reportTruckHire').textContent = formatINR(data.totalTruckHire);
    document.getElementById('reportCommission').textContent = formatINR(data.totalCommission);
    document.getElementById('reportExpenses').textContent = formatINR(data.totalExpenses);
    document.getElementById('reportNetProfit').textContent = formatINR(data.netProfit);
    document.getElementById('reportMargin').textContent = `${data.margin}%`;

    const profitBadge = document.getElementById('reportNetProfit');
    profitBadge.className = `text-2xl font-black ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;

    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;

    if (data.trips.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">No trips in this date range.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.trips.map(t => {
        const netComm = t.commission.fromParty + t.commission.fromTruckOwner - t.commission.paidToAgent;
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-blue-600">${t.lrNo}</td>
                <td>${t.startDate}</td>
                <td class="font-medium text-slate-800">${t.partyName}</td>
                <td>${t.route.origin} &rarr; ${t.route.destination}</td>
                <td class="text-right font-semibold">${formatINR(t.billing.partyFreightAmount)}</td>
                <td class="text-right font-semibold text-slate-700">${formatINR(t.supplierBilling.truckHireCost)}</td>
                <td class="text-right font-medium text-purple-700">${formatINR(netComm)}</td>
                <td class="text-right font-bold ${t.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                    ${formatINR(t.netProfit)}
                </td>
            </tr>
        `;
    }).join('');
}

// -------------------------------------------------------------
// Excel / CSV Export Triggers
// -------------------------------------------------------------
function triggerExportParties() {
    window.tmsExport.exportParties(window.tmsStore.getParties());
    showToast('Exporting Parties to Excel...');
}

function triggerExportTrips() {
    window.tmsExport.exportTrips(window.tmsStore.getTrips());
    showToast('Exporting Trips to Excel...');
}

function triggerExportSuppliers() {
    window.tmsExport.exportSuppliers(window.tmsStore.getSuppliers(), window.tmsStore.getTrips());
    showToast('Exporting Suppliers to Excel...');
}

function triggerExportPnL() {
    const data = getReportData();
    window.tmsExport.exportPnL(data, data.fromDate, data.toDate);
    showToast('Exporting P&L Report to Excel...');
}

// -------------------------------------------------------------
// Search Listeners
// -------------------------------------------------------------
function setupSearchListeners() {
    document.getElementById('tripSearchInput')?.addEventListener('input', renderTrips);
    document.getElementById('partySearchInput')?.addEventListener('input', renderParties);
    document.getElementById('supplierSearchInput')?.addEventListener('input', renderSuppliers);
    document.getElementById('driverSearchInput')?.addEventListener('input', renderDrivers);
    document.getElementById('truckSearchInput')?.addEventListener('input', renderTrucks);
}

// View Trip Details Modal
function viewTripDetails(tripId) {
    const trip = window.tmsStore.getTrips().find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('tripDetailTitle').textContent = `Trip Details - ${trip.lrNo}`;
    document.getElementById('tripDetailContent').innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-4">
            <div class="bg-slate-50 p-3 rounded">
                <span class="text-slate-500 block">Party / Consignor</span>
                <span class="text-sm font-bold text-slate-900">${trip.partyName}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded">
                <span class="text-slate-500 block">Route</span>
                <span class="text-sm font-bold text-slate-900">${trip.route.origin} &rarr; ${trip.route.destination}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded">
                <span class="text-slate-500 block">Vehicle No</span>
                <span class="text-sm font-mono font-bold text-blue-700">${trip.truckNo} (${trip.truckOwnership})</span>
            </div>
            <div class="bg-slate-50 p-3 rounded">
                <span class="text-slate-500 block">Supplier / Transporter</span>
                <span class="text-sm font-bold text-slate-900">${trip.supplierName}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded">
                <span class="text-slate-500 block">Driver</span>
                <span class="text-sm font-bold text-slate-900">${trip.driverName}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded">
                <span class="text-slate-500 block">Status</span>
                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadgeClass(trip.status)} mt-1">${trip.status}</span>
            </div>
        </div>

        <div class="border-t border-slate-200 pt-4 mb-4">
            <h4 class="font-bold text-slate-800 text-sm mb-2">Financial Breakdown</h4>
            <div class="grid grid-cols-2 gap-4 text-xs">
                <div class="border border-slate-200 p-3 rounded">
                    <span class="font-bold text-blue-700 block mb-1">PARTY BILLING</span>
                    <div class="flex justify-between py-1"><span>Party Freight:</span> <span class="font-mono font-bold">${formatINR(trip.billing.partyFreightAmount)}</span></div>
                    <div class="flex justify-between py-1 text-emerald-600"><span>Party Advance:</span> <span class="font-mono font-bold">${formatINR(trip.billing.partyAdvance)}</span></div>
                    <div class="flex justify-between py-1 border-t border-slate-100 font-bold text-amber-600"><span>Balance Due:</span> <span class="font-mono">${formatINR(trip.billing.partyBalance)}</span></div>
                </div>
                <div class="border border-slate-200 p-3 rounded">
                    <span class="font-bold text-purple-700 block mb-1">SUPPLIER BILLING</span>
                    <div class="flex justify-between py-1"><span>Truck Hire:</span> <span class="font-mono font-bold">${formatINR(trip.supplierBilling.truckHireCost)}</span></div>
                    <div class="flex justify-between py-1 text-emerald-600"><span>Trans Advance:</span> <span class="font-mono font-bold">${formatINR(trip.supplierBilling.advanceToSupplier)}</span></div>
                    <div class="flex justify-between py-1 border-t border-slate-100 font-bold text-rose-600"><span>Payable Due:</span> <span class="font-mono">${formatINR(trip.supplierBilling.supplierBalance)}</span></div>
                </div>
            </div>
            <div class="mt-3 bg-emerald-50 p-3 rounded flex justify-between items-center text-sm font-bold text-emerald-900">
                <span>Net Trip Profit:</span>
                <span class="text-base font-black">${formatINR(trip.netProfit)}</span>
            </div>
        </div>

        ${trip.pod?.uploaded ? `
            <div class="border-t border-slate-200 pt-4">
                <h4 class="font-bold text-slate-800 text-sm mb-2">Attached Proof of Delivery (POD)</h4>
                <div class="border border-slate-200 p-3 rounded bg-slate-50 text-xs">
                    <div><strong>Received Date:</strong> ${trip.pod.receivedDate}</div>
                    <div><strong>Received By:</strong> ${trip.pod.receiverName}</div>
                    ${trip.pod.documentUrl ? `<div class="mt-2"><img src="${trip.pod.documentUrl}" class="max-h-48 border rounded shadow-sm"></div>` : ''}
                </div>
            </div>
        ` : ''}
    `;

    openModal('tripDetailModal');
}
