/**
 * Transporter Management System (TMS) - Data Store & LocalStorage Layer
 * Manages Parties, Trucks, Suppliers, Drivers, Trips, Expenses, Payments & Auth
 */

const TMS_KEYS = {
    AUTH: 'tms_auth_user',
    USERS: 'tms_users',
    PARTIES: 'tms_parties',
    TRUCKS: 'tms_trucks',
    SUPPLIERS: 'tms_suppliers',
    DRIVERS: 'tms_drivers',
    TRIPS: 'tms_trips',
    EXPENSES: 'tms_expenses',
    PAYMENTS: 'tms_payments'
};

const SEED_DATA = {
    users: [
        {
            id: 'u-1',
            name: 'Vikram',
            email: 'jaipurbanglorelogistic@gmail.com',
            password: 'VIKRAM#@7051',
            company: 'JAIPUR BANGLORE LOGISTICS',
            phone: '',
            city: 'Jaipur / Bangalore',
            gstin: ''
        }
    ],
    parties: [],
    suppliers: [],
    trucks: [],
    drivers: [],
    trips: [],
    expenses: [],
    payments: []
};

class TMSStore {
    constructor() {
        this.supabase = null;
        this.cloudSyncing = false;
        this.init();
        setTimeout(() => this.initSupabase(), 50);
    }

    init() {
        const currentVersion = localStorage.getItem('tms_data_version');
        if (currentVersion !== 'jbl-2.0') {
            // Purge previous demo data and reset to clean state
            localStorage.removeItem(TMS_KEYS.PARTIES);
            localStorage.removeItem(TMS_KEYS.TRUCKS);
            localStorage.removeItem(TMS_KEYS.SUPPLIERS);
            localStorage.removeItem(TMS_KEYS.DRIVERS);
            localStorage.removeItem(TMS_KEYS.TRIPS);
            localStorage.removeItem(TMS_KEYS.EXPENSES);
            localStorage.removeItem(TMS_KEYS.PAYMENTS);
            localStorage.removeItem(TMS_KEYS.USERS);

            const currentAuth = this.getAuthUser();
            if (currentAuth && currentAuth.email !== 'jaipurbanglorelogistic@gmail.com') {
                localStorage.removeItem(TMS_KEYS.AUTH);
            }

            localStorage.setItem('tms_data_version', 'jbl-2.0');
            this.resetToSeedData();
        } else if (!localStorage.getItem(TMS_KEYS.PARTIES)) {
            this.resetToSeedData();
        }
    }

    async initSupabase() {
        if (!window.supabase || !window.TMS_CONFIG || !window.TMS_CONFIG.supabaseUrl || !window.TMS_CONFIG.supabaseKey) {
            console.log('TMS running in local storage mode.');
            return;
        }

        try {
            this.supabase = window.supabase.createClient(window.TMS_CONFIG.supabaseUrl, window.TMS_CONFIG.supabaseKey);
            console.log('✅ Connected to Supabase Cloud Database:', window.TMS_CONFIG.supabaseUrl);
            
            const badge = document.getElementById('cloudStatusBadge');
            if (badge) badge.classList.remove('hidden');

            await this.syncFromSupabase();
            this.setupRealtimeListeners();
        } catch (err) {
            console.warn('⚠️ Supabase connection error:', err);
        }
    }

    async syncFromSupabase() {
        if (!this.supabase || this.cloudSyncing) return;
        this.cloudSyncing = true;
        try {
            const tables = [
                { key: TMS_KEYS.PARTIES, table: 'parties', seed: SEED_DATA.parties },
                { key: TMS_KEYS.TRUCKS, table: 'trucks', seed: SEED_DATA.trucks },
                { key: TMS_KEYS.SUPPLIERS, table: 'suppliers', seed: SEED_DATA.suppliers },
                { key: TMS_KEYS.DRIVERS, table: 'drivers', seed: SEED_DATA.drivers },
                { key: TMS_KEYS.TRIPS, table: 'trips', seed: SEED_DATA.trips },
                { key: TMS_KEYS.EXPENSES, table: 'expenses', seed: SEED_DATA.expenses },
                { key: TMS_KEYS.PAYMENTS, table: 'payments', seed: SEED_DATA.payments }
            ];

            let remoteRowsCount = 0;

            for (const item of tables) {
                const { data, error } = await this.supabase.from(item.table).select('*');
                if (!error && data && data.length > 0) {
                    remoteRowsCount += data.length;
                    const items = data.map(row => row.data);
                    this._set(item.key, items);
                }
            }

            // If Supabase has zero rows across all tables, seed initial data to cloud
            if (remoteRowsCount === 0) {
                console.log('Seeding initial data into Supabase Cloud...');
                for (const item of tables) {
                    const localData = this._get(item.key);
                    if (localData && localData.length > 0) {
                        const rows = localData.map(d => ({ id: d.id, data: d }));
                        await this.supabase.from(item.table).upsert(rows);
                    }
                }
            }

            // Refresh UI if app is loaded
            window.dispatchEvent(new CustomEvent('tms:cloud-synced'));
            if (typeof switchTab === 'function' && typeof currentTab !== 'undefined') {
                switchTab(currentTab);
            }
        } catch (e) {
            console.error('Error during Supabase sync:', e);
        } finally {
            this.cloudSyncing = false;
        }
    }

    setupRealtimeListeners() {
        if (!this.supabase) return;
        try {
            const tableMap = {
                parties: TMS_KEYS.PARTIES,
                trucks: TMS_KEYS.TRUCKS,
                suppliers: TMS_KEYS.SUPPLIERS,
                drivers: TMS_KEYS.DRIVERS,
                trips: TMS_KEYS.TRIPS,
                expenses: TMS_KEYS.EXPENSES,
                payments: TMS_KEYS.PAYMENTS
            };

            this.supabase.channel('tms_realtime_channel')
                .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
                    const key = tableMap[payload.table];
                    if (!key) return;

                    const { data } = await this.supabase.from(payload.table).select('*');
                    if (data) {
                        this._set(key, data.map(r => r.data));
                        if (typeof switchTab === 'function' && typeof currentTab !== 'undefined') {
                            switchTab(currentTab);
                        }
                    }
                })
                .subscribe();
        } catch (err) {
            console.warn('Realtime subscription error:', err);
        }
    }

    async syncToCloud(table, id, data, action = 'upsert') {
        if (!this.supabase) return;
        try {
            if (action === 'delete') {
                await this.supabase.from(table).delete().eq('id', id);
            } else {
                await this.supabase.from(table).upsert({ id: id, data: data });
            }
        } catch (e) {
            console.error(`Error syncing to cloud table ${table}:`, e);
        }
    }

    resetToSeedData() {
        localStorage.setItem(TMS_KEYS.USERS, JSON.stringify(SEED_DATA.users));
        localStorage.setItem(TMS_KEYS.PARTIES, JSON.stringify(SEED_DATA.parties));
        localStorage.setItem(TMS_KEYS.SUPPLIERS, JSON.stringify(SEED_DATA.suppliers));
        localStorage.setItem(TMS_KEYS.TRUCKS, JSON.stringify(SEED_DATA.trucks));
        localStorage.setItem(TMS_KEYS.DRIVERS, JSON.stringify(SEED_DATA.drivers));
        localStorage.setItem(TMS_KEYS.TRIPS, JSON.stringify(SEED_DATA.trips));
        localStorage.setItem(TMS_KEYS.EXPENSES, JSON.stringify(SEED_DATA.expenses));
        localStorage.setItem(TMS_KEYS.PAYMENTS, JSON.stringify(SEED_DATA.payments));

        if (this.supabase) {
            const tables = [
                { table: 'parties', data: SEED_DATA.parties },
                { table: 'trucks', data: SEED_DATA.trucks },
                { table: 'suppliers', data: SEED_DATA.suppliers },
                { table: 'drivers', data: SEED_DATA.drivers },
                { table: 'trips', data: SEED_DATA.trips },
                { table: 'expenses', data: SEED_DATA.expenses },
                { table: 'payments', data: SEED_DATA.payments }
            ];
            tables.forEach(async (t) => {
                try {
                    const rows = t.data.map(d => ({ id: d.id, data: d }));
                    await this.supabase.from(t.table).upsert(rows);
                } catch (e) {}
            });
        }
    }

    _get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error reading ${key} from storage:`, e);
            return [];
        }
    }

    _set(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
            return true;
        } catch (e) {
            console.error(`Error writing ${key} to storage:`, e);
            return false;
        }
    }

    // --- AUTH ---
    getAuthUser() {
        const user = localStorage.getItem(TMS_KEYS.AUTH);
        return user ? JSON.parse(user) : null;
    }

    login(email, password, rememberMe = false) {
        const validEmail = 'jaipurbanglorelogistic@gmail.com';
        const validPass = 'VIKRAM#@7051';

        const cleanEmail = (email || '').toLowerCase().trim();
        const cleanPass = (password || '').trim();

        if (cleanEmail === validEmail && cleanPass === validPass) {
            const user = {
                id: 'u-1',
                name: 'Vikram',
                email: 'jaipurbanglorelogistic@gmail.com',
                company: 'JAIPUR BANGLORE LOGISTICS',
                phone: '',
                city: 'Jaipur / Bangalore',
                gstin: ''
            };
            localStorage.setItem(TMS_KEYS.AUTH, JSON.stringify(user));
            if (rememberMe) {
                localStorage.setItem('tms_remember_email', cleanEmail);
                localStorage.setItem('tms_remember_me', 'true');
            } else {
                localStorage.removeItem('tms_remember_email');
                localStorage.removeItem('tms_remember_me');
            }
            return { success: true, user };
        }
        return { success: false, message: 'Invalid email or password. Access restricted to authorized accounts.' };
    }

    signup() {
        return { success: false, message: 'Public sign-up is disabled.' };
    }

    logout() {
        localStorage.removeItem(TMS_KEYS.AUTH);
    }

    // --- PARTIES ---
    getParties() {
        return this._get(TMS_KEYS.PARTIES);
    }

    addParty(party) {
        const parties = this.getParties();
        const newParty = {
            id: 'p-' + Date.now(),
            name: party.name.trim(),
            contactPerson: party.contactPerson || '',
            phone: party.phone || '',
            city: party.city || '',
            address: party.address || '',
            gst: (party.gst || '').toUpperCase(),
            creditDays: parseInt(party.creditDays) || 30,
            createdAt: new Date().toISOString().split('T')[0]
        };
        parties.unshift(newParty);
        this._set(TMS_KEYS.PARTIES, parties);
        this.syncToCloud('parties', newParty.id, newParty, 'upsert');
        return newParty;
    }

    updateParty(id, updatedFields) {
        const parties = this.getParties();
        const idx = parties.findIndex(p => p.id === id);
        if (idx !== -1) {
            parties[idx] = { ...parties[idx], ...updatedFields };
            this._set(TMS_KEYS.PARTIES, parties);
            this.syncToCloud('parties', parties[idx].id, parties[idx], 'upsert');
            return parties[idx];
        }
        return null;
    }

    deleteParty(id) {
        const parties = this.getParties().filter(p => p.id !== id);
        this._set(TMS_KEYS.PARTIES, parties);
        this.syncToCloud('parties', id, null, 'delete');
        return true;
    }

    // --- SUPPLIERS / TRANSPORTERS ---
    getSuppliers() {
        return this._get(TMS_KEYS.SUPPLIERS);
    }

    addSupplier(sup) {
        const suppliers = this.getSuppliers();
        const newSup = {
            id: 's-' + Date.now(),
            name: sup.name.trim(),
            contactPerson: sup.contactPerson || '',
            phone: sup.phone || '',
            city: sup.city || '',
            gst: (sup.gst || '').toUpperCase(),
            bankDetails: sup.bankDetails || '',
            upiId: sup.upiId || '',
            createdAt: new Date().toISOString().split('T')[0]
        };
        suppliers.unshift(newSup);
        this._set(TMS_KEYS.SUPPLIERS, suppliers);
        this.syncToCloud('suppliers', newSup.id, newSup, 'upsert');
        return newSup;
    }

    updateSupplier(id, updatedFields) {
        const suppliers = this.getSuppliers();
        const idx = suppliers.findIndex(s => s.id === id);
        if (idx !== -1) {
            suppliers[idx] = { ...suppliers[idx], ...updatedFields };
            this._set(TMS_KEYS.SUPPLIERS, suppliers);
            this.syncToCloud('suppliers', suppliers[idx].id, suppliers[idx], 'upsert');
            return suppliers[idx];
        }
        return null;
    }

    deleteSupplier(id) {
        const suppliers = this.getSuppliers().filter(s => s.id !== id);
        this._set(TMS_KEYS.SUPPLIERS, suppliers);
        this.syncToCloud('suppliers', id, null, 'delete');
        return true;
    }

    // --- TRUCKS ---
    getTrucks() {
        return this._get(TMS_KEYS.TRUCKS);
    }

    addTruck(truck) {
        const trucks = this.getTrucks();
        const newTruck = {
            id: 't-' + Date.now(),
            truckNo: (truck.truckNo || '').toUpperCase().trim(),
            truckType: truck.truckType || 'Multi-Axle Container',
            vehicleType: truck.vehicleType || truck.truckType || 'Open Truck',
            capacity: parseFloat(truck.capacity) || 20,
            ownership: truck.ownership || 'Market',
            supplierId: truck.ownership === 'My' ? '' : (truck.supplierId || ''),
            supplierName: truck.ownership === 'My' ? 'Self Owned Fleet' : (truck.supplierName || 'Market Transporter'),
            status: truck.status || 'Available'
        };
        trucks.unshift(newTruck);
        this._set(TMS_KEYS.TRUCKS, trucks);
        this.syncToCloud('trucks', newTruck.id, newTruck, 'upsert');
        return newTruck;
    }

    updateTruck(id, updatedFields) {
        const trucks = this.getTrucks();
        const idx = trucks.findIndex(t => t.id === id);
        if (idx !== -1) {
            trucks[idx] = { ...trucks[idx], ...updatedFields };
            this._set(TMS_KEYS.TRUCKS, trucks);
            this.syncToCloud('trucks', trucks[idx].id, trucks[idx], 'upsert');
            return trucks[idx];
        }
        return null;
    }

    deleteTruck(id) {
        const trucks = this.getTrucks().filter(t => t.id !== id);
        this._set(TMS_KEYS.TRUCKS, trucks);
        this.syncToCloud('trucks', id, null, 'delete');
        return true;
    }

    // --- DRIVERS ---
    getDrivers() {
        return this._get(TMS_KEYS.DRIVERS);
    }

    addDriver(drv) {
        const drivers = this.getDrivers();
        const gave = parseFloat(drv.driverGave) || 0;
        const got = parseFloat(drv.driverGot) || 0;
        const newDriver = {
            id: 'd-' + Date.now(),
            name: drv.name.trim(),
            mobile: drv.mobile || '',
            licenseNo: (drv.licenseNo || '').toUpperCase(),
            bankDetails: drv.bankDetails || '',
            upiId: drv.upiId || '',
            openingBalance: parseFloat(drv.openingBalance) || 0,
            driverGave: gave,
            driverGot: got,
            status: drv.status || 'Available'
        };
        drivers.unshift(newDriver);
        this._set(TMS_KEYS.DRIVERS, drivers);
        this.syncToCloud('drivers', newDriver.id, newDriver, 'upsert');
        return newDriver;
    }

    updateDriver(id, updatedFields) {
        const drivers = this.getDrivers();
        const idx = drivers.findIndex(d => d.id === id);
        if (idx !== -1) {
            drivers[idx] = { ...drivers[idx], ...updatedFields };
            this._set(TMS_KEYS.DRIVERS, drivers);
            this.syncToCloud('drivers', drivers[idx].id, drivers[idx], 'upsert');
            return drivers[idx];
        }
        return null;
    }

    deleteDriver(id) {
        const drivers = this.getDrivers().filter(d => d.id !== id);
        this._set(TMS_KEYS.DRIVERS, drivers);
        this.syncToCloud('drivers', id, null, 'delete');
        return true;
    }

    recordDriverAdvance(driverId, advData) {
        const drivers = this.getDrivers();
        const idx = drivers.findIndex(d => d.id === driverId);
        if (idx === -1) return null;

        const amount = parseFloat(advData.amount) || 0;
        if (advData.type === 'gave') {
            drivers[idx].driverGave = (parseFloat(drivers[idx].driverGave) || 0) + amount;
        } else if (advData.type === 'got') {
            drivers[idx].driverGot = (parseFloat(drivers[idx].driverGot) || 0) + amount;
        }

        this._set(TMS_KEYS.DRIVERS, drivers);
        this.syncToCloud('drivers', drivers[idx].id, drivers[idx], 'upsert');

        // If linked to trip and type is 'gave', optionally record operational expense
        if (advData.tripId && advData.type === 'gave') {
            const trips = this.getTrips();
            const trip = trips.find(t => t.id === advData.tripId);
            this.addExpense({
                tripId: advData.tripId,
                tripLrNo: trip ? trip.lrNo : '',
                category: 'Driver',
                amount: amount,
                date: advData.date || new Date().toISOString().split('T')[0],
                paymentMode: advData.mode || 'Cash',
                notes: advData.notes ? `Driver Bhatta / Adv (${drivers[idx].name}): ${advData.notes}` : `Driver Advance to ${drivers[idx].name}`
            });
        }

        return drivers[idx];
    }

    // --- TRIPS ---
    getTrips() {
        return this._get(TMS_KEYS.TRIPS);
    }

    getNextLrNo() {
        const trips = this.getTrips();
        const year = new Date().getFullYear();
        const maxNum = trips.reduce((max, t) => {
            const match = (t.lrNo || '').match(/LR-\d{4}-(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                return num > max ? num : max;
            }
            return max;
        }, 1000);
        return `LR-${year}-${maxNum + 1}`;
    }

    addTrip(tripData) {
        const trips = this.getTrips();
        const nextId = 'TRP-' + (trips.length > 0 ? (1000 + trips.length + 1) : 1001);
        const lrNo = tripData.lrNo || this.getNextLrNo();

        const partyFreight = parseFloat(tripData.partyFreightAmount) || 0;
        const partyAdvance = parseFloat(tripData.partyAdvance) || 0;
        const partyBalance = Math.max(0, partyFreight - partyAdvance);

        const truckHireCost = parseFloat(tripData.truckHireCost) || 0;
        const advanceToSupplier = parseFloat(tripData.advanceToSupplier) || 0;
        const supplierBalance = Math.max(0, truckHireCost - advanceToSupplier);

        const commFromParty = parseFloat(tripData.commissionFromParty) || 0;
        const commFromTruck = parseFloat(tripData.commissionFromTruck) || 0;
        const commPaidAgent = parseFloat(tripData.commissionPaidAgent) || 0;

        const netProfit = (partyFreight - truckHireCost) + (commFromParty + commFromTruck - commPaidAgent);

        const newTrip = {
            id: nextId,
            lrNo: lrNo,
            partyId: tripData.partyId,
            partyName: tripData.partyName,
            truckId: tripData.truckId,
            truckNo: tripData.truckNo,
            truckOwnership: tripData.truckOwnership || 'Market',
            supplierId: tripData.supplierId || '',
            supplierName: tripData.supplierName || 'Self Owned',
            driverId: tripData.driverId || '',
            driverName: tripData.driverName || 'Unassigned',
            route: {
                origin: tripData.origin || 'Mumbai',
                destination: tripData.destination || 'Delhi'
            },
            billing: {
                partyBillingType: tripData.partyBillingType || 'fixed',
                ratePerUnit: parseFloat(tripData.ratePerUnit) || 0,
                weight: parseFloat(tripData.weight) || 0,
                partyFreightAmount: partyFreight,
                partyAdvance: partyAdvance,
                partyBalance: partyBalance
            },
            commission: {
                fromParty: commFromParty,
                fromTruckOwner: commFromTruck,
                paidToAgent: commPaidAgent
            },
            supplierBilling: {
                truckHireCost: truckHireCost,
                advanceToSupplier: advanceToSupplier,
                supplierBalance: supplierBalance
            },
            netProfit: netProfit,
            startDate: tripData.startDate || new Date().toISOString().split('T')[0],
            expectedDeliveryDate: tripData.expectedDeliveryDate || '',
            material: {
                materialType: tripData.materialType || 'General Freight',
                invoiceNo: tripData.invoiceNo || '',
                invoiceValue: parseFloat(tripData.invoiceValue) || 0,
                weight: parseFloat(tripData.weight) || 0
            },
            notes: tripData.notes || '',
            status: tripData.status || 'Created',
            pod: null,
            createdAt: new Date().toISOString()
        };

        trips.unshift(newTrip);
        this._set(TMS_KEYS.TRIPS, trips);
        this.syncToCloud('trips', newTrip.id, newTrip, 'upsert');

        if (newTrip.status === 'In Transit') {
            if (newTrip.driverId) this.updateDriver(newTrip.driverId, { status: 'On Trip' });
            if (newTrip.truckId) this.updateTruck(newTrip.truckId, { status: 'On Trip' });
        }

        return newTrip;
    }

    updateTrip(id, tripData) {
        const trips = this.getTrips();
        const idx = trips.findIndex(t => t.id === id);
        if (idx === -1) return null;

        const current = trips[idx];
        const partyFreight = tripData.partyFreightAmount !== undefined ? parseFloat(tripData.partyFreightAmount) : current.billing.partyFreightAmount;
        const partyAdvance = tripData.partyAdvance !== undefined ? parseFloat(tripData.partyAdvance) : current.billing.partyAdvance;
        const partyBalance = Math.max(0, partyFreight - partyAdvance);

        const truckHireCost = tripData.truckHireCost !== undefined ? parseFloat(tripData.truckHireCost) : current.supplierBilling.truckHireCost;
        const advanceToSupplier = tripData.advanceToSupplier !== undefined ? parseFloat(tripData.advanceToSupplier) : current.supplierBilling.advanceToSupplier;
        const supplierBalance = Math.max(0, truckHireCost - advanceToSupplier);

        const commFromParty = tripData.commissionFromParty !== undefined ? parseFloat(tripData.commissionFromParty) : current.commission.fromParty;
        const commFromTruck = tripData.commissionFromTruck !== undefined ? parseFloat(tripData.commissionFromTruck) : current.commission.fromTruckOwner;
        const commPaidAgent = tripData.commissionPaidAgent !== undefined ? parseFloat(tripData.commissionPaidAgent) : current.commission.paidToAgent;

        const netProfit = (partyFreight - truckHireCost) + (commFromParty + commFromTruck - commPaidAgent);

        const updated = {
            ...current,
            partyId: tripData.partyId || current.partyId,
            partyName: tripData.partyName || current.partyName,
            truckId: tripData.truckId || current.truckId,
            truckNo: tripData.truckNo || current.truckNo,
            truckOwnership: tripData.truckOwnership || current.truckOwnership,
            supplierId: tripData.supplierId !== undefined ? tripData.supplierId : current.supplierId,
            supplierName: tripData.supplierName || current.supplierName,
            driverId: tripData.driverId !== undefined ? tripData.driverId : current.driverId,
            driverName: tripData.driverName || current.driverName,
            route: {
                origin: tripData.origin || current.route.origin,
                destination: tripData.destination || current.route.destination
            },
            billing: {
                partyBillingType: tripData.partyBillingType || current.billing.partyBillingType,
                ratePerUnit: tripData.ratePerUnit !== undefined ? parseFloat(tripData.ratePerUnit) : current.billing.ratePerUnit,
                weight: tripData.weight !== undefined ? parseFloat(tripData.weight) : current.billing.weight,
                partyFreightAmount: partyFreight,
                partyAdvance: partyAdvance,
                partyBalance: partyBalance
            },
            commission: {
                fromParty: commFromParty,
                fromTruckOwner: commFromTruck,
                paidToAgent: commPaidAgent
            },
            supplierBilling: {
                truckHireCost: truckHireCost,
                advanceToSupplier: advanceToSupplier,
                supplierBalance: supplierBalance
            },
            netProfit: netProfit,
            startDate: tripData.startDate || current.startDate,
            expectedDeliveryDate: tripData.expectedDeliveryDate || current.expectedDeliveryDate,
            material: {
                materialType: tripData.materialType || current.material.materialType,
                invoiceNo: tripData.invoiceNo || current.material.invoiceNo,
                invoiceValue: tripData.invoiceValue !== undefined ? parseFloat(tripData.invoiceValue) : current.material.invoiceValue,
                weight: tripData.weight !== undefined ? parseFloat(tripData.weight) : current.material.weight
            },
            notes: tripData.notes !== undefined ? tripData.notes : current.notes,
            status: tripData.status || current.status
        };

        trips[idx] = updated;
        this._set(TMS_KEYS.TRIPS, trips);
        this.syncToCloud('trips', updated.id, updated, 'upsert');
        return updated;
    }

    updateTripStatus(id, newStatus, podData = null) {
        const trips = this.getTrips();
        const trip = trips.find(t => t.id === id);
        if (!trip) return null;

        trip.status = newStatus;
        if (podData) {
            trip.pod = {
                uploaded: true,
                receivedDate: podData.receivedDate || new Date().toISOString().split('T')[0],
                receiverName: podData.receiverName || 'Receiver Agent',
                documentUrl: podData.documentUrl || '',
                notes: podData.notes || 'Proof of delivery verified.'
            };
        }

        if (newStatus === 'Closed' || newStatus === 'Cancelled') {
            if (trip.driverId) this.updateDriver(trip.driverId, { status: 'Available' });
            if (trip.truckId) this.updateTruck(trip.truckId, { status: 'Available' });
        } else if (newStatus === 'In Transit') {
            if (trip.driverId) this.updateDriver(trip.driverId, { status: 'On Trip' });
            if (trip.truckId) this.updateTruck(trip.truckId, { status: 'On Trip' });
        }

        this._set(TMS_KEYS.TRIPS, trips);
        this.syncToCloud('trips', trip.id, trip, 'upsert');
        return trip;
    }

    deleteTrip(id) {
        const trips = this.getTrips().filter(t => t.id !== id);
        this._set(TMS_KEYS.TRIPS, trips);
        this.syncToCloud('trips', id, null, 'delete');
        return true;
    }

    // --- EXPENSES ---
    getExpenses() {
        return this._get(TMS_KEYS.EXPENSES);
    }

    addExpense(exp) {
        const expenses = this.getExpenses();
        const newExp = {
            id: 'exp-' + Date.now(),
            tripId: exp.tripId || '',
            tripLrNo: exp.tripLrNo || 'General Fleet',
            category: exp.category || 'Other',
            amount: parseFloat(exp.amount) || 0,
            date: exp.date || new Date().toISOString().split('T')[0],
            paymentMode: exp.paymentMode || 'Cash',
            notes: exp.notes || ''
        };
        expenses.unshift(newExp);
        this._set(TMS_KEYS.EXPENSES, expenses);
        this.syncToCloud('expenses', newExp.id, newExp, 'upsert');
        return newExp;
    }

    deleteExpense(id) {
        const expenses = this.getExpenses().filter(e => e.id !== id);
        this._set(TMS_KEYS.EXPENSES, expenses);
        this.syncToCloud('expenses', id, null, 'delete');
        return true;
    }

    // --- PAYMENTS ---
    getPayments() {
        return this._get(TMS_KEYS.PAYMENTS);
    }

    addPayment(pay) {
        const payments = this.getPayments();
        const amount = parseFloat(pay.amount) || 0;
        const newPay = {
            id: 'pay-' + Date.now(),
            type: pay.type,
            partyId: pay.partyId || '',
            partyName: pay.partyName || '',
            supplierId: pay.supplierId || '',
            supplierName: pay.supplierName || '',
            tripId: pay.tripId || '',
            tripLrNo: pay.tripLrNo || '',
            amount: amount,
            date: pay.date || new Date().toISOString().split('T')[0],
            paymentMode: pay.paymentMode || 'NEFT / RTGS',
            referenceNo: pay.referenceNo || 'TXN-' + Math.floor(100000 + Math.random() * 900000),
            notes: pay.notes || ''
        };
        payments.unshift(newPay);
        this._set(TMS_KEYS.PAYMENTS, payments);
        this.syncToCloud('payments', newPay.id, newPay, 'upsert');

        if (pay.tripId) {
            const trips = this.getTrips();
            const trip = trips.find(t => t.id === pay.tripId);
            if (trip) {
                if (pay.type === 'party_receivable') {
                    const currentAdv = trip.billing.partyAdvance || 0;
                    const newAdv = currentAdv + amount;
                    this.updateTrip(trip.id, {
                        partyAdvance: newAdv,
                        partyFreightAmount: trip.billing.partyFreightAmount
                    });
                } else if (pay.type === 'trans_payable') {
                    const currentAdv = trip.supplierBilling.advanceToSupplier || 0;
                    const newAdv = currentAdv + amount;
                    this.updateTrip(trip.id, {
                        advanceToSupplier: newAdv,
                        truckHireCost: trip.supplierBilling.truckHireCost
                    });
                }
            }
        } else if (amount > 0) {
            // General settlement without specific trip: allocate to open trips (FIFO)
            const trips = this.getTrips();
            let rem = amount;
            if (pay.type === 'trans_payable' && pay.supplierId) {
                const openTrips = trips.filter(t => t.supplierId === pay.supplierId && (t.supplierBilling.supplierBalance || 0) > 0);
                for (const ot of openTrips) {
                    if (rem <= 0) break;
                    const due = ot.supplierBilling.supplierBalance || 0;
                    const toApply = Math.min(rem, due);
                    const currentAdv = ot.supplierBilling.advanceToSupplier || 0;
                    this.updateTrip(ot.id, {
                        advanceToSupplier: currentAdv + toApply,
                        truckHireCost: ot.supplierBilling.truckHireCost
                    });
                    rem -= toApply;
                }
            } else if (pay.type === 'party_receivable' && pay.partyId) {
                const openTrips = trips.filter(t => t.partyId === pay.partyId && (t.billing.partyBalance || 0) > 0);
                for (const ot of openTrips) {
                    if (rem <= 0) break;
                    const due = ot.billing.partyBalance || 0;
                    const toApply = Math.min(rem, due);
                    const currentAdv = ot.billing.partyAdvance || 0;
                    this.updateTrip(ot.id, {
                        partyAdvance: currentAdv + toApply,
                        partyFreightAmount: ot.billing.partyFreightAmount
                    });
                    rem -= toApply;
                }
            }
        }

        return newPay;
    }

    // --- AGGREGATE STATS ---
    getDashboardMetrics() {
        const trips = this.getTrips();

        const totalTrips = trips.length;
        const activeTrips = trips.filter(t => t.status === 'In Transit').length;
        const closedTrips = trips.filter(t => t.status === 'Closed').length;

        const partyDue = trips.reduce((sum, t) => sum + (t.status !== 'Cancelled' ? (t.billing.partyBalance || 0) : 0), 0);
        const transDue = trips.reduce((sum, t) => sum + (t.status !== 'Cancelled' ? (t.supplierBilling.supplierBalance || 0) : 0), 0);

        const closedProfit = trips
            .filter(t => t.status === 'Closed')
            .reduce((sum, t) => sum + (t.netProfit || 0), 0);

        const currentYearMonth = new Date().toISOString().slice(0, 7);
        const monthRevenue = trips
            .filter(t => t.status !== 'Cancelled' && (t.startDate || '').startsWith(currentYearMonth))
            .reduce((sum, t) => sum + (t.billing.partyFreightAmount || 0), 0);

        return {
            totalTrips,
            activeTrips,
            closedTrips,
            partyDue,
            transDue,
            closedProfit,
            monthRevenue
        };
    }

    getDriverStats() {
        const drivers = this.getDrivers();
        const driverGave = drivers.reduce((sum, d) => sum + (d.driverGave || 0), 0);
        const driverGot = drivers.reduce((sum, d) => sum + (d.driverGot || 0), 0);
        const totalBalance = driverGave - driverGot;
        const onTrip = drivers.filter(d => d.status === 'On Trip').length;
        const available = drivers.filter(d => d.status === 'Available').length;

        return { driverGave, driverGot, totalBalance, onTrip, available };
    }

    getExpenseStats() {
        const expenses = this.getExpenses();
        const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const diesel = expenses.filter(e => e.category === 'Diesel').reduce((sum, e) => sum + e.amount, 0);
        const toll = expenses.filter(e => e.category === 'Toll').reduce((sum, e) => sum + e.amount, 0);
        const driver = expenses.filter(e => e.category === 'Driver').reduce((sum, e) => sum + e.amount, 0);
        const other = expenses.filter(e => !['Diesel', 'Toll', 'Driver'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);

        return { total, diesel, toll, driver, other };
    }
}

window.tmsStore = new TMSStore();
