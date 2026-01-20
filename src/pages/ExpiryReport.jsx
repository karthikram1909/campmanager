import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertCircle, FileWarning, Calendar, Download, Printer, Activity, ChevronDown, ChevronRight, Filter, X } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";


export default function ExpiryReport() {
  const [filterDays, setFilterDays] = useState("60");
  const [filterDocType, setFilterDocType] = useState("all");
  const [showRenewalGuide, setShowRenewalGuide] = useState(true);

  // Column filters - now using arrays for multi-select
  const [filterUrgency, setFilterUrgency] = useState([]);
  const [filterEmployee, setFilterEmployee] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterTrade, setFilterTrade] = useState([]);
  const [filterPhone, setFilterPhone] = useState([]);
  const [filterDocNumber, setFilterDocNumber] = useState([]);
  const [filterDocumentType, setFilterDocumentType] = useState([]);

  // Search states for column filters
  const [searchUrgency, setSearchUrgency] = useState("");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchTrade, setSearchTrade] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchDocNumber, setSearchDocNumber] = useState("");
  const [searchDocType, setSearchDocType] = useState("");

  const { data: techDocs = [] } = useQuery({
    queryKey: ['technician-documents'],
    queryFn: () => base44.entities.TechnicianDocument.list('-expiry_date'),
  });

  const { data: campDocs = [] } = useQuery({
    queryKey: ['camp-documents'],
    queryFn: () => base44.entities.CampDocument.list('-expiry_date'),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  // Define getUrgencyLevel BEFORE it's used
  const getUrgencyLevel = (daysLeft) => {
    if (daysLeft <= 7) return { level: 'critical', color: 'bg-red-50', textColor: 'text-red-700', badge: 'destructive' };
    if (daysLeft <= 30) return { level: 'high', color: 'bg-orange-50', textColor: 'text-orange-700', badge: 'destructive' };
    if (daysLeft <= 60) return { level: 'medium', color: 'bg-yellow-50', textColor: 'text-yellow-700', badge: 'outline' };
    return { level: 'low', color: 'bg-blue-50', textColor: 'text-blue-700', badge: 'secondary' };
  };

  // Filter documents based on expiry days and quick filter doc type
  const daysThreshold = parseInt(filterDays);
  let expiringDocs = [...techDocs, ...campDocs].filter(doc => {
    if (!doc.expiry_date) return false;
    const daysUntilExpiry = differenceInDays(parseISO(doc.expiry_date), new Date());
    return daysUntilExpiry >= 0 && daysUntilExpiry <= daysThreshold;
  }).filter(doc => {
    if (filterDocType === 'all') return true;
    return doc.document_type === filterDocType;
  });

  // Apply column filters
  expiringDocs = expiringDocs.filter(doc => {
    const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
    const camp = doc.camp_id ? camps.find(c => c.id === doc.camp_id) : null;
    const daysLeft = differenceInDays(parseISO(doc.expiry_date), new Date());
    const urgency = getUrgencyLevel(daysLeft);

    // Urgency filter
    if (filterUrgency.length > 0 && !filterUrgency.includes(urgency.level)) return false;

    // Document Type filter
    const docType = doc.document_type?.replace(/_/g, ' ').toUpperCase() || doc.document_name;
    if (filterDocumentType.length > 0 && !filterDocumentType.includes(docType)) return false;

    // Employee/Camp name filter
    const entityName = tech ? tech.full_name : camp ? camp.name : 'Unknown';
    if (filterEmployee.length > 0 && !filterEmployee.includes(entityName)) return false;

    // Employee ID/Camp Code filter
    const entityId = tech ? tech.employee_id : camp ? camp.code : '-';
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(entityId)) return false;

    // Nationality filter
    const nationality = tech?.nationality || '-';
    if (filterNationality.length > 0 && !filterNationality.includes(nationality)) return false;

    // Trade filter
    const trade = tech?.trade || '-';
    if (filterTrade.length > 0 && !filterTrade.includes(trade)) return false;

    // Phone filter
    const phone = tech?.phone || '-';
    if (filterPhone.length > 0 && !filterPhone.includes(phone)) return false;

    // Document number filter
    const docNum = doc.document_number || '-';
    if (filterDocNumber.length > 0 && !filterDocNumber.includes(docNum)) return false;

    return true;
  });

  // Get unique values for each column (based on daysThreshold, not other quick filters)
  const allDocs = [...techDocs, ...campDocs].filter(doc => {
    if (!doc.expiry_date) return false;
    const daysUntilExpiry = differenceInDays(parseISO(doc.expiry_date), new Date());
    return daysUntilExpiry >= 0 && daysUntilExpiry <= daysThreshold;
  });

  const uniqueUrgencies = [...new Set(allDocs.map(doc => {
    const days = differenceInDays(parseISO(doc.expiry_date), new Date());
    return getUrgencyLevel(days).level;
  }))].sort();

  const uniqueDocTypes = [...new Set(allDocs.map(doc =>
    doc.document_type?.replace(/_/g, ' ').toUpperCase() || doc.document_name
  ))].filter(Boolean).sort();

  const uniqueEmployees = [...new Set(allDocs.map(doc => {
    const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
    const camp = doc.camp_id ? camps.find(c => c.id === doc.camp_id) : null;
    return tech ? tech.full_name : camp ? camp.name : 'Unknown';
  }))].sort();

  const uniqueEmployeeIds = [...new Set(allDocs.map(doc => {
    const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
    const camp = doc.camp_id ? camps.find(c => c.id === doc.camp_id) : null;
    return tech ? tech.employee_id : camp ? camp.code : '-';
  }))].sort();

  const uniqueNationalities = [...new Set(allDocs.map(doc => {
    const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
    return tech?.nationality || '-';
  }))].sort();

  const uniqueTrades = [...new Set(allDocs.map(doc => {
    const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
    return tech?.trade || '-';
  }))].sort();

  const uniquePhones = [...new Set(allDocs.map(doc => {
    const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
    return tech?.phone || '-';
  }))].sort();

  const uniqueDocNumbers = [...new Set(allDocs.map(doc => doc.document_number || '-'))].sort();

  const getRenewalSteps = (docType) => {
    const steps = {
      'visa': [
        '1. Schedule medical examination at approved center',
        '2. Obtain medical fitness certificate',
        '3. Submit application to immigration',
        '4. Collect Emirates ID (if applicable)',
        '5. Receive visa stamping',
        'Timeline: 7-14 working days'
      ],
      'passport': [
        '1. Contact respective embassy/consulate',
        '2. Submit required documents',
        '3. Pay passport fees',
        '4. Collect new passport',
        'Timeline: 2-4 weeks (varies by nationality)'
      ],
      'emirates_id': [
        '1. Visit typing center for application',
        '2. Submit biometrics at registration center',
        '3. Pay fees',
        '4. Collect new Emirates ID',
        'Timeline: 3-7 working days'
      ],
      'labor_card': [
        '1. Submit renewal application to MOHRE',
        '2. Update medical insurance',
        '3. Pay renewal fees',
        '4. Collect new labor card',
        'Timeline: 5-10 working days'
      ],
      'health_certificate': [
        '1. Visit approved medical center',
        '2. Complete health screening',
        '3. Obtain certificate',
        'Timeline: 1-2 working days'
      ]
    };
    return steps[docType] || ['Contact relevant authority for renewal process'];
  };

  const clearAllFilters = () => {
    // Clear quick filters
    setFilterDays("60");
    setFilterDocType("all");

    // Clear column filters
    setFilterUrgency([]);
    setFilterDocumentType([]);
    setFilterEmployee([]);
    setFilterEmployeeId([]);
    setFilterNationality([]);
    setFilterTrade([]);
    setFilterPhone([]);
    setFilterDocNumber([]);
  };

  // Determine if any column filters are active
  const hasActiveColumnFilters =
    filterUrgency.length > 0 ||
    filterEmployee.length > 0 ||
    filterEmployeeId.length > 0 ||
    filterNationality.length > 0 ||
    filterTrade.length > 0 ||
    filterPhone.length > 0 ||
    filterDocNumber.length > 0 ||
    filterDocumentType.length > 0;

  // Column Filter Component
  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue }) => {
    const filteredValues = values.filter(v =>
      v.toLowerCase().includes(searchValue.toLowerCase())
    );

    const toggleValue = (value) => {
      if (selected.includes(value)) {
        setSelected(selected.filter(v => v !== value));
      } else {
        setSelected([...selected, value]);
      }
    };

    const toggleAll = () => {
      if (selected.length === values.length) {
        setSelected([]);
      } else {
        setSelected([...values]);
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Filter className={`w-3 h-3 ${selected.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={toggleAll}>
              <Checkbox
                checked={selected.length === values.length && values.length > 0} // Ensure "Select All" is checked only if all values are truly selected
                onCheckedChange={toggleAll}
              />
              <label className="text-sm font-medium cursor-pointer">
                (Select All)
              </label>
            </div>
            {filteredValues.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-2">No results</div>
            ) : (
                filteredValues.map((value) => (
                    <div
                        key={value}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => toggleValue(value)}
                    >
                        <Checkbox
                            checked={selected.includes(value)}
                            onCheckedChange={() => toggleValue(value)}
                        />
                        <label className="text-sm cursor-pointer flex-1">
                            {value}
                        </label>
                    </div>
                ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelected([])}
              >
                Clear Filter
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  const exportToCSV = () => {
    const headers = ['Document Type', 'Employee/Camp', 'ID/Code', 'Nationality', 'Trade', 'Phone', 'Document Number', 'Expiry Date', 'Days Left', 'Urgency', 'Notes'];
    const rows = expiringDocs.map(doc => {
      const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
      const camp = doc.camp_id ? camps.find(c => c.id === doc.camp_id) : null;
      const daysLeft = differenceInDays(parseISO(doc.expiry_date), new Date());
      const urgency = getUrgencyLevel(daysLeft);

      return [
        doc.document_type?.replace(/_/g, ' ').toUpperCase() || doc.document_name,
        tech ? tech.full_name : camp ? camp.name : 'Unknown',
        tech ? tech.employee_id : camp ? camp.code : '-',
        tech?.nationality || '-',
        tech?.trade || '-',
        tech?.phone || '-',
        doc.document_number || '-',
        format(parseISO(doc.expiry_date), 'dd/MM/yyyy'),
        daysLeft,
        urgency.level.toUpperCase(),
        doc.notes || '-'
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expiry_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <style>{`
        @media print {
          /* Hide everything except the table */
          body * {
            visibility: hidden;
          }
          
          /* Show only the table and its contents */
          #printable-table,
          #printable-table * {
            visibility: visible;
          }
          
          #printable-table {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Print styling */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 4px;
            text-align: left;
          }
          
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          
          /* Remove hover effects in print */
          tr:hover {
            background-color: inherit !important;
          }
          
          /* Hide filter buttons in print */
          .no-print {
            display: none !important;
          }
          
          /* Page breaks */
          tr {
            page-break-inside: avoid;
          }
          
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Expiry Follow-up Report</h1>
            <p className="text-gray-600 mt-1">Track renewal processes for HR & Admin departments</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportToCSV} className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={printReport} className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expiring</p>
                  <p className="text-2xl font-bold text-gray-900">{expiringDocs.length}</p>
                </div>
                <FileWarning className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Critical (≤7 days)</p>
                  <p className="text-2xl font-bold text-red-900">
                    {expiringDocs.filter(d => differenceInDays(parseISO(d.expiry_date), new Date()) <= 7).length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">High (≤30 days)</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {expiringDocs.filter(d => {
                      const days = differenceInDays(parseISO(d.expiry_date), new Date());
                      return days > 7 && days <= 30;
                    }).length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Medium (≤60 days)</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {expiringDocs.filter(d => {
                      const days = differenceInDays(parseISO(d.expiry_date), new Date());
                      return days > 30 && days <= 60;
                    }).length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Filters */}
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Quick Filters
                </h3>
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Time Range</label>
                  <Select value={filterDays} onValueChange={setFilterDays}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Next 7 days</SelectItem>
                      <SelectItem value="30">Next 30 days</SelectItem>
                      <SelectItem value="60">Next 60 days</SelectItem>
                      <SelectItem value="90">Next 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Document Type</label>
                  <Select value={filterDocType} onValueChange={setFilterDocType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="visa">Visas Only</SelectItem>
                      <SelectItem value="passport">Passports Only</SelectItem>
                      <SelectItem value="emirates_id">Emirates IDs Only</SelectItem>
                      <SelectItem value="labor_card">Labor Cards Only</SelectItem>
                      <SelectItem value="health_certificate">Health Certificates Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Renewal Process Guide - Collapsible */}
        <Card className="border-none shadow-md">
          <Collapsible open={showRenewalGuide} onOpenChange={setShowRenewalGuide}>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {showRenewalGuide ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    Renewal Process Guidelines
                  </CardTitle>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Visa Renewal */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <p className="font-semibold text-blue-900 mb-2">VISA Renewal:</p>
                      <ul className="space-y-1 text-sm text-blue-800">
                        {getRenewalSteps('visa').map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-sm font-semibold text-orange-700">
                        ⚠️ Medical examination must be completed first
                      </p>
                    </AlertDescription>
                  </Alert>

                  {/* Passport Renewal */}
                  <Alert className="bg-purple-50 border-purple-200">
                    <AlertCircle className="h-4 w-4 text-purple-600" />
                    <AlertDescription>
                      <p className="font-semibold text-purple-900 mb-2">PASSPORT Renewal:</p>
                      <ul className="space-y-1 text-sm text-purple-800">
                        {getRenewalSteps('passport').map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {/* Emirates ID */}
                  <Alert className="bg-green-50 border-green-200">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <p className="font-semibold text-green-900 mb-2">EMIRATES ID Renewal:</p>
                      <ul className="space-y-1 text-sm text-green-800">
                        {getRenewalSteps('emirates_id').map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {/* Labor Card */}
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <p className="font-semibold text-amber-900 mb-2">LABOR CARD Renewal:</p>
                      <ul className="space-y-1 text-sm text-amber-800">
                        {getRenewalSteps('labor_card').map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Documents Table */}
        <Card className="border-none shadow-lg overflow-hidden" id="printable-table">
          {hasActiveColumnFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 no-print">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Column filters active
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
          
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-blue-600" />
              Expiring Documents ({expiringDocs.length})
            </CardTitle>
          </CardHeader>
          
          <div className="overflow-x-auto">
            {expiringDocs.length === 0 ? (
              <div className="p-12 text-center">
                <FileWarning className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No documents expiring in the selected time range or matching filters.</p>
              </div>
            ) : (
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        Urgency
                        <span className="no-print">
                          <ColumnFilter
                            values={uniqueUrgencies}
                            selected={filterUrgency}
                            setSelected={setFilterUrgency}
                            searchValue={searchUrgency}
                            setSearchValue={setSearchUrgency}
                          />
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        Document Type
                        <span className="no-print">
                          <ColumnFilter
                            values={uniqueDocTypes}
                            selected={filterDocumentType}
                            setSelected={setFilterDocumentType}
                            searchValue={searchDocType}
                            setSearchValue={setSearchDocType}
                          />
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        Employee/Camp
                        <span className="no-print">
                          <ColumnFilter
                            values={uniqueEmployees}
                            selected={filterEmployee}
                            setSelected={setFilterEmployee}
                            searchValue={searchEmployee}
                            setSearchValue={setSearchEmployee}
                          />
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        ID/Code
                        <span className="no-print">
                          <ColumnFilter
                            values={uniqueEmployeeIds}
                            selected={filterEmployeeId}
                            setSelected={setFilterEmployeeId}
                            searchValue={searchEmployeeId}
                            setSearchValue={setSearchEmployeeId}
                          />
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        Nationality
                        <span className="no-print">
                          <ColumnFilter
                            values={uniqueNationalities}
                            selected={filterNationality}
                            setSelected={setFilterNationality}
                            searchValue={searchNationality}
                            setSearchValue={setSearchNationality}
                          />
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        Trade
                        <span className="no-print">
                          <ColumnFilter
                            values={uniqueTrades}
                            selected={filterTrade}
                            setSelected={setFilterTrade}
                            searchValue={searchTrade}
                            setSearchValue={setSearchTrade}
                          />
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        Phone
                        <span className="no-print">
                          <ColumnFilter
                            values={uniquePhones}
                            selected={filterPhone}
                            setSelected={setFilterPhone}
                            searchValue={searchPhone}
                            setSearchValue={setSearchPhone}
                          />
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        Document #
                        <span className="no-print">
                          <ColumnFilter
                            values={uniqueDocNumbers}
                            selected={filterDocNumber}
                            setSelected={setFilterDocNumber}
                            searchValue={searchDocNumber}
                            setSearchValue={setSearchDocNumber}
                          />
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Expiry Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Days Left
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expiringDocs
                    .sort((a, b) => {
                      const daysA = differenceInDays(parseISO(a.expiry_date), new Date());
                      const daysB = differenceInDays(parseISO(b.expiry_date), new Date());
                      return daysA - daysB;
                    })
                    .map((doc, index) => {
                      const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
                      const camp = doc.camp_id ? camps.find(c => c.id === doc.camp_id) : null;
                      const daysLeft = differenceInDays(parseISO(doc.expiry_date), new Date());
                      const urgency = getUrgencyLevel(daysLeft);

                      return (
                        <tr
                          key={doc.id}
                          className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${urgency.color}`}
                        >
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            <Badge variant={urgency.badge} className="text-xs">
                              {urgency.level.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 whitespace-nowrap">
                            {doc.document_type?.replace(/_/g, ' ').toUpperCase() || doc.document_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap">
                            {tech ? tech.full_name : camp ? camp.name : 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600 font-medium border-r border-gray-200 whitespace-nowrap">
                            {tech ? tech.employee_id : camp ? camp.code : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {tech?.nationality || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {tech?.trade || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {tech?.phone || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {doc.document_number || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap">
                            {format(parseISO(doc.expiry_date), 'dd/MM/yyyy')}
                          </td>
                          <td className={`px-4 py-3 text-sm font-semibold border-r border-gray-200 whitespace-nowrap ${urgency.textColor}`}>
                            {daysLeft} days
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                            {doc.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>

          {expiringDocs.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 no-print">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{expiringDocs.length}</span> expiring documents
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}