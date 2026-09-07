/**
 * Transporter Management System (TMS) - Excel & CSV Export Service
 * Exports Trips, Parties, Suppliers, Drivers, and P&L Reports
 */

const TMSExport = {
    // Generic download trigger
    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Convert array of objects to CSV with Excel UTF-8 BOM
    toCSV(headers, rows) {
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const headerLine = headers.map(h => escapeCSV(h.label)).join(',');
        const dataLines = rows.map(row => {
            return headers.map(h => escapeCSV(row[h.key])).join(',');
        });

        return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
    },

    // Generic exporter using SheetJS (XLSX) if available, or CSV fallback
    exportData(fileName, sheetName, headers, rows) {
        if (window.XLSX) {
            try {
                const wsData = [
                    headers.map(h => h.label),
                    ...rows.map(row => headers.map(h => row[h.key] ?? ''))
                ];
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
                XLSX.writeFile(wb, `${fileName}.xlsx`);
                return true;
            } catch (err) {
                console.warn('SheetJS export failed, falling back to CSV:', err);
            }
        }

        // CSV Fallback
        const csv = this.toCSV(headers, rows);
        this.downloadFile(csv, `${fileName}.csv`, 'text/csv;charset=utf-8;');
        return true;
    },

    // Export Parties
    exportParties(parties) {
        const headers = [
            { key: 'name', label: 'Party Name' },
            { key: 'contactPerson', label: 'Contact Person' },
            { key: 'phone', label: 'Phone' },
            { key: 'city', label: 'City' },
            { key: 'address', label: 'Address' },
            { key: 'gst', label: 'GST Number' },
            { key: 'creditDays', label: 'Credit Days' },
            { key: 'createdAt', label: 'Registered Date' }
        ];
        this.exportData('Parties_Directory', 'Parties', headers, parties);
    },

    // Export Trips
    exportTrips(trips) {
        const headers = [
            { key: 'id', label: 'Trip ID' },
            { key: 'lrNo', label: 'LR No' },
            { key: 'startDate', label: 'Date' },
            { key: 'partyName', label: 'Party' },
            { key: 'origin', label: 'Origin' },
            { key: 'destination', label: 'Destination' },
            { key: 'truckNo', label: 'Truck No' },
            { key: 'truckOwnership', label: 'Fleet Type' },
            { key: 'supplierName', label: 'Supplier / Transporter' },
            { key: 'driverName', label: 'Driver' },
            { key: 'materialType', label: 'Material' },
            { key: 'weight', label: 'Weight (T)' },
            { key: 'partyFreight', label: 'Party Freight (₹)' },
            { key: 'partyAdvance', label: 'Party Advance (₹)' },
            { key: 'partyBalance', label: 'Party Due (₹)' },
            { key: 'truckHire', label: 'Truck Hire (₹)' },
            { key: 'supplierAdvance', label: 'Trans Advance (₹)' },
            { key: 'supplierBalance', label: 'Trans Due (₹)' },
            { key: 'netProfit', label: 'Net Profit (₹)' },
            { key: 'status', label: 'Status' }
        ];

        const rows = trips.map(t => ({
            id: t.id,
            lrNo: t.lrNo,
            startDate: t.startDate,
            partyName: t.partyName,
            origin: t.route.origin,
            destination: t.route.destination,
            truckNo: t.truckNo,
            truckOwnership: t.truckOwnership,
            supplierName: t.supplierName,
            driverName: t.driverName,
            materialType: t.material.materialType,
            weight: t.material.weight,
            partyFreight: t.billing.partyFreightAmount,
            partyAdvance: t.billing.partyAdvance,
            partyBalance: t.billing.partyBalance,
            truckHire: t.supplierBilling.truckHireCost,
            supplierAdvance: t.supplierBilling.advanceToSupplier,
            supplierBalance: t.supplierBilling.supplierBalance,
            netProfit: t.netProfit,
            status: t.status
        }));

        this.exportData('Trips_Report', 'Trips', headers, rows);
    },

    // Export Suppliers
    exportSuppliers(suppliers, trips) {
        const headers = [
            { key: 'name', label: 'Supplier / Transporter Name' },
            { key: 'contactPerson', label: 'Contact Person' },
            { key: 'phone', label: 'Phone' },
            { key: 'city', label: 'City' },
            { key: 'gst', label: 'GST No' },
            { key: 'bankDetails', label: 'Bank Details' },
            { key: 'upiId', label: 'UPI ID' },
            { key: 'tripCount', label: 'Total Trips' },
            { key: 'balanceDue', label: 'Balance Due (₹)' }
        ];

        const rows = suppliers.map(s => {
            const supplierTrips = trips.filter(t => t.supplierId === s.id);
            const balanceDue = supplierTrips.reduce((sum, t) => sum + (t.supplierBilling.supplierBalance || 0), 0);
            return {
                name: s.name,
                contactPerson: s.contactPerson,
                phone: s.phone,
                city: s.city,
                gst: s.gst,
                bankDetails: s.bankDetails,
                upiId: s.upiId,
                tripCount: supplierTrips.length,
                balanceDue: balanceDue
            };
        });

        this.exportData('Suppliers_Directory', 'Suppliers', headers, rows);
    },

    // Export P&L Report
    exportPnL(reportData, fromDate, toDate) {
        const headers = [
            { key: 'lrNo', label: 'LR No' },
            { key: 'date', label: 'Date' },
            { key: 'partyName', label: 'Party' },
            { key: 'route', label: 'Route' },
            { key: 'truckNo', label: 'Truck No' },
            { key: 'revenue', label: 'Freight Revenue (₹)' },
            { key: 'truckHire', label: 'Truck Hire Cost (₹)' },
            { key: 'commissions', label: 'Net Commission (₹)' },
            { key: 'netProfit', label: 'Net Profit (₹)' },
            { key: 'status', label: 'Trip Status' }
        ];

        const rows = reportData.trips.map(t => ({
            lrNo: t.lrNo,
            date: t.startDate,
            partyName: t.partyName,
            route: `${t.route.origin} -> ${t.route.destination}`,
            truckNo: t.truckNo,
            revenue: t.billing.partyFreightAmount,
            truckHire: t.supplierBilling.truckHireCost,
            commissions: (t.commission.fromParty + t.commission.fromTruckOwner - t.commission.paidToAgent),
            netProfit: t.netProfit,
            status: t.status
        }));

        // Add summary rows at end
        rows.push({
            lrNo: 'TOTAL SUMMARY',
            date: `${fromDate} to ${toDate}`,
            partyName: `Total Trips: ${reportData.totalTrips}`,
            route: '',
            truckNo: '',
            revenue: reportData.totalRevenue,
            truckHire: reportData.totalTruckHire,
            commissions: reportData.totalCommission,
            netProfit: reportData.netProfit,
            status: `Operating Margin: ${reportData.margin}%`
        });

        this.exportData(`PnL_Report_${fromDate}_to_${toDate}`, 'P&L Statement', headers, rows);
    }
};

window.tmsExport = TMSExport;
