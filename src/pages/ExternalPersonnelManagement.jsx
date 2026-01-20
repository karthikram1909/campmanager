import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Users, Bed, Edit, Upload, Download, Printer, Filter, X, ArrowUpDown, RefreshCw, LogOut } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { formatDate } from "@/components/utils/dateFormatter";
import PhoneInput from "@/components/ui/phone-input";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function ExternalPersonnelManagement() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [personData, setPersonData] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [customRole, setCustomRole] = useState("");
  const [sortField, setSortField] = useState("full_name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Excel-style column filters
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterCompany, setFilterCompany] = useState([]);
  const [filterRole, setFilterRole] = useState([]);
  const [filterGender, setFilterGender] = useState([]);
  const [filterPhone, setFilterPhone] = useState([]);
  const [filterEmail, setFilterEmail] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterEthnicity, setFilterEthnicity] = useState([]);
  const [filterCamp, setFilterCamp] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);

  // Search states for column filters
  const [searchFullName, setSearchFullName] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [searchGender, setSearchGender] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchEthnicity, setSearchEthnicity] = useState("");
  const [searchCamp, setSearchCamp] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [checkoutPersonId, setCheckoutPersonId] = useState(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: externalPersonnel = [], isLoading, refetch: refetchExternal, isRefetching: isRefetchingExternal } = useQuery({
    queryKey: ['external-personnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list('-created_date'),
    staleTime: 0, // Always fetch latest
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => base44.entities.Floor.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: mealPreferences = [] } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ExternalPersonnel.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['external-personnel'] });
      await refetchExternal(); // Force immediate refetch
      setShowAddDialog(false);
      setPersonData({});
      setEditingPerson(null);
      setShowCustomRole(false);
      setCustomRole("");
      alert("External personnel added successfully!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExternalPersonnel.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['external-personnel'] });
      await refetchExternal(); // Force immediate refetch
      setShowAddDialog(false); // Using original state variable setShowAddDialog
      setPersonData({});
      setEditingPerson(null);
      setShowCustomRole(false);
      setCustomRole("");
      alert("External personnel updated successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExternalPersonnel.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['external-personnel'] });
      await refetchExternal(); // Force immediate refetch
      alert("External personnel deleted successfully!");
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.ExternalPersonnel.bulkCreate(data),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['external-personnel'] });
      await refetchExternal(); // Force immediate refetch
      setUploadResult({ success: true, count: result.length });
    },
    onError: (error) => {
      setUploadResult({ success: false, error: error.message });
    },
  });

  const updateBedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bed.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['beds'] });
    },
  });

  const handleCheckout = async () => {
    const person = externalPersonnel.find(p => p.id === checkoutPersonId);
    if (!person) return;

    try {
      // Update person status to departed and clear bed_id
      await updateMutation.mutateAsync({
        id: person.id,
        data: {
          status: 'departed',
          bed_id: null,
          camp_id: null
        }
      });

      // If person had a bed, free it up
      if (person.bed_id) {
        await updateBedMutation.mutateAsync({
          id: person.bed_id,
          data: {
            status: 'available',
            external_personnel_id: null
          }
        });
      }

      setShowCheckoutDialog(false);
      setCheckoutPersonId(null);
      alert('External personnel checked out successfully! Bed has been freed for next allocation.');
    } catch (error) {
      alert('Error during checkout: ' + error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const finalData = { ...personData };
    if (showCustomRole && customRole.trim()) {
      finalData.role = customRole.trim();
    }
    
    // Validate phone number has both country code and number
    if (finalData.contact_number) {
      const parts = finalData.contact_number.split(' ');
      if (parts.length < 2 || !parts[1]) {
        alert('Please enter a complete phone number with country code and digits');
        return;
      }
    }
    
    // Validate contract end date is mandatory
    if (!finalData.contract_end_date) {
      alert('❌ Contract End Date is mandatory');
      return;
    }
    
    if (editingPerson) {
      updateMutation.mutate({ id: editingPerson.id, data: finalData });
    } else {
      createMutation.mutate(finalData);
    }
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    
    const predefinedRoles = ['security_guard', 'driver', 'cleaner', 'cook', 'mess_staff', 'maintenance', 'other'];
    if (person.role && !predefinedRoles.includes(person.role)) {
      setShowCustomRole(true);
      setCustomRole(person.role);
      setPersonData({...person, role: 'custom'});
    } else {
      setShowCustomRole(false);
      setCustomRole("");
      setPersonData(person);
    }
    
    setShowAddDialog(true);
  };

  const handleRoleChange = (value) => {
    if (value === 'custom') {
      setShowCustomRole(true);
      setPersonData({...personData, role: 'custom'});
      setCustomRole("");
    } else {
      setShowCustomRole(false);
      setCustomRole("");
      setPersonData({...personData, role: value});
    }
  };

  const downloadTemplate = () => {
    try {
      const headers = [
        'full_name',
        'company_name',
        'role',
        'gender',
        'contact_number',
        'nationality',
        'ethnicity',
        'email',
        'camp_name',
        'status',
        'contract_start_date',
        'contract_end_date',
        'notes'
      ];
      const csv = headers.join(',') + '\n';
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'external_personnel_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download template error:", error);
      alert("Error generating template: " + error.message);
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      const record = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j];
      }
      records.push(record);
    }

    return records;
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await bulkFile.text();
      const records = parseCSV(text);

      if (records.length === 0) {
        throw new Error('No valid records found in CSV');
      }

      const requiredFields = ['full_name', 'company_name', 'role', 'gender', 'contact_number', 'nationality'];
      // Filter out records where *any* required field is missing
      const invalidRecords = records.filter(record => 
        requiredFields.some(field => !record[field] || record[field] === '')
      );

      if (invalidRecords.length > 0) {
        // Collect indices of invalid records for better feedback
        const invalidIndices = invalidRecords.map(rec => records.indexOf(rec) + 2); // +2 for 0-indexed and header row
        throw new Error(`Rows ${invalidIndices.join(', ')} are missing required fields: ${requiredFields.join(', ')}`);
      }
      
      const recordsWithCampIds = records.map(record => {
        const newRecord = { ...record };
        if (newRecord.camp_name) {
          const camp = camps.find(c => 
            c.name.toLowerCase() === newRecord.camp_name.toLowerCase()
          );
          if (camp) {
            newRecord.camp_id = camp.id;
          }
          delete newRecord.camp_name; // Remove camp_name as it's not a direct field
        }
        return newRecord;
      });

      bulkCreateMutation.mutate(recordsWithCampIds); // Use the new bulkCreateMutation
      
      setBulkFile(null);
      // Don't close dialog here, wait for mutation success/error callback
      // setShowBulkUploadDialog(false); 
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
      setUploadResult({ success: false, error: error.message });
    }

    setUploading(false);
  };

  // Get unique values for filters
  const uniqueFullNames = [...new Set(externalPersonnel.map(p => p.full_name || '-'))].sort();
  const uniqueCompanies = [...new Set(externalPersonnel.map(p => p.company_name || '-'))].sort();
  const uniqueRoles = [...new Set(externalPersonnel.map(p => p.role || '-'))].sort();
  const uniqueGenders = [...new Set(externalPersonnel.map(p => p.gender || '-'))].sort();
  const uniquePhones = [...new Set(externalPersonnel.map(p => p.contact_number || '-'))].sort();
  const uniqueEmails = [...new Set(externalPersonnel.map(p => p.email || '-'))].sort();
  const uniqueNationalities = [...new Set(externalPersonnel.map(p => p.nationality || '-'))].sort();
  const uniqueEthnicities = [...new Set(externalPersonnel.map(p => p.ethnicity || '-'))].sort();
  const uniqueCamps = [...new Set(externalPersonnel.map(p => {
    const camp = camps.find(c => c.id === p.camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueStatuses = [...new Set(externalPersonnel.map(p => p.status || '-'))].sort();

  // Check for expired contracts
  const expiredContracts = externalPersonnel.filter(person => {
    if (!person.contract_end_date) return false;
    const endDate = new Date(person.contract_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today && person.status === 'active';
  });

  // Apply search and filters
  let filteredPersonnel = externalPersonnel.filter(person => {
    const matchesSearch = !searchQuery ||
      person.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.role?.toLowerCase().includes(searchQuery.toLowerCase());

    const camp = camps.find(c => c.id === person.camp_id);

    if (filterFullName.length > 0 && !filterFullName.includes(person.full_name || '-')) return false;
    if (filterCompany.length > 0 && !filterCompany.includes(person.company_name || '-')) return false;
    if (filterRole.length > 0 && !filterRole.includes(person.role || '-')) return false;
    if (filterGender.length > 0 && !filterGender.includes(person.gender || '-')) return false;
    if (filterPhone.length > 0 && !filterPhone.includes(person.contact_number || '-')) return false;
    if (filterEmail.length > 0 && !filterEmail.includes(person.email || '-')) return false;
    if (filterNationality.length > 0 && !filterNationality.includes(person.nationality || '-')) return false;
    if (filterEthnicity.length > 0 && !filterEthnicity.includes(person.ethnicity || '-')) return false;
    if (filterCamp.length > 0 && !filterCamp.includes(camp?.name || '-')) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(person.status || '-')) return false;

    return matchesSearch;
  });

  // Apply sorting
  const sortedPersonnel = [...filteredPersonnel].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (sortField === 'camp_id') {
      const campA = camps.find(c => c.id === a.camp_id);
      const campB = camps.find(c => c.id === b.camp_id);
      aVal = campA?.name || '';
      bVal = campB?.name || '';
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterFullName([]);
    setFilterCompany([]);
    setFilterRole([]);
    setFilterGender([]);
    setFilterPhone([]);
    setFilterEmail([]);
    setFilterNationality([]);
    setFilterEthnicity([]);
    setFilterCamp([]);
    setFilterStatus([]);
  };

  const hasActiveFilters =
    filterFullName.length > 0 ||
    filterCompany.length > 0 ||
    filterRole.length > 0 ||
    filterGender.length > 0 ||
    filterPhone.length > 0 ||
    filterEmail.length > 0 ||
    filterNationality.length > 0 ||
    filterEthnicity.length > 0 ||
    filterCamp.length > 0 ||
    filterStatus.length > 0;

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
      if (selected.length === values.length && values.length > 0) {
        setSelected([]);
      } else {
        setSelected([...values]);
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 no-print">
            <Filter className={`w-3 h-3 ${selected.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b bg-gray-50">
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {values.length > 0 && (
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={toggleAll}>
                <Checkbox
                  checked={selected.length === values.length && values.length > 0}
                  onCheckedChange={toggleAll}
                />
                <label className="text-sm font-medium cursor-pointer">
                  (Select All)
                </label>
              </div>
            )}
            {filteredValues.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-4">
                No results found
              </div>
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
                className="w-full text-xs"
                onClick={() => setSelected([])}
              >
                Clear Filter ({selected.length})
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  const exportToCSV = () => {
    const headers = ['Full Name', 'Company', 'Role', 'Gender', 'Phone', 'Email', 'Nationality', 'Ethnicity', 'Emirates ID', 'Camp', 'Status', 'Contract Start', 'Contract End'];
    const rows = sortedPersonnel.map(person => {
      const camp = camps.find(c => c.id === person.camp_id);
      return [
        person.full_name,
        person.company_name,
        person.role,
        person.gender,
        person.contact_number || '-',
        person.email || '-',
        person.nationality || '-',
        person.ethnicity || '-',
        person.emirates_id || '-',
        camp?.name || '-',
        person.status,
        formatDate(person.contract_start_date),
        formatDate(person.contract_end_date)
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `external_personnel_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const activeCount = externalPersonnel.filter(p => p.status === 'active').length;
  const withBedCount = externalPersonnel.filter(p => p.bed_id).length;
  const needsBedCount = externalPersonnel.filter(p => p.status === 'active' && !p.bed_id).length;

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-table,
          #printable-table * {
            visibility: visible;
          }
          #printable-table {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10px;
          }
          #printable-table .card-title, #printable-table .card-title * {
            visibility: visible;
            display: block !important;
          }
          #printable-table table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          #printable-table th, #printable-table td {
            border: 1px solid #000;
            padding: 3px;
            text-align: left;
            white-space: nowrap;
          }
          #printable-table th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          #printable-table tr:hover {
            background-color: inherit !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid;
          }
          @page {
            size: landscape;
            margin: 0.5cm;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Expired Contracts Alert */}
        {expiredContracts.length > 0 && (
          <Alert className="border-red-500 bg-red-50 no-print">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>⚠️ {expiredContracts.length} Personnel with Expired Contracts</strong>
              <div className="mt-2 space-y-1">
                {expiredContracts.slice(0, 5).map(person => (
                  <div key={person.id} className="text-sm">
                    • {person.full_name} ({person.company_name}) - Expired: {formatDate(person.contract_end_date)}
                  </div>
                ))}
                {expiredContracts.length > 5 && (
                  <p className="text-sm font-medium mt-2">...and {expiredContracts.length - 5} more</p>
                )}
              </div>
              <p className="text-xs mt-2">Please renew contracts or update status to "Departed" or "Terminated".</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">External Personnel</h1>
            <p className="text-gray-600 mt-1">{filteredPersonnel.length} of {externalPersonnel.length} personnel</p>
            {needsBedCount > 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Badge className="bg-orange-100 text-orange-700">
                  {needsBedCount} personnel need bed assignment
                </Badge>
                <Button 
                  size="sm"
                  onClick={() => window.location.href = createPageUrl('SmartAllocation')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                >
                  Next Step: Assign Beds →
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => refetchExternal()}
              disabled={isRefetchingExternal}
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetchingExternal ? 'animate-spin' : ''}`} />
              {isRefetchingExternal ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={printReport} className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBulkUploadDialog(true)}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button 
              onClick={() => {
                setEditingPerson(null);
                setPersonData({});
                setShowCustomRole(false);
                setCustomRole("");
                setShowAddDialog(true);
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Personnel
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 no-print">
          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Personnel</p>
                  <p className="text-3xl font-bold text-blue-900">{externalPersonnel.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Active</p>
                  <p className="text-3xl font-bold text-green-900">{activeCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">With Bed Assigned</p>
                  <p className="text-3xl font-bold text-purple-900">{withBedCount}</p>
                </div>
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Bed className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-none shadow-md no-print">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, company, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Excel-style Table */}
        <Card className="border-none shadow-lg overflow-hidden" id="printable-table">
          {hasActiveFilters && (
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
            <CardTitle className="card-title">External Personnel ({sortedPersonnel.length})</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Full Name</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('full_name')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueFullNames}
                          selected={filterFullName}
                          setSelected={setFilterFullName}
                          searchValue={searchFullName}
                          setSearchValue={setSearchFullName}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Company</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('company_name')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueCompanies}
                          selected={filterCompany}
                          setSelected={setFilterCompany}
                          searchValue={searchCompany}
                          setSearchValue={setSearchCompany}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Role</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('role')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueRoles}
                          selected={filterRole}
                          setSelected={setFilterRole}
                          searchValue={searchRole}
                          setSearchValue={setSearchRole}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Gender</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('gender')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueGenders}
                          selected={filterGender}
                          setSelected={setFilterGender}
                          searchValue={searchGender}
                          setSearchValue={setSearchGender}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Phone</span>
                      <ColumnFilter
                        values={uniquePhones}
                        selected={filterPhone}
                        setSelected={setFilterPhone}
                        searchValue={searchPhone}
                        setSearchValue={setSearchPhone}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Email</span>
                      <ColumnFilter
                        values={uniqueEmails}
                        selected={filterEmail}
                        setSelected={setFilterEmail}
                        searchValue={searchEmail}
                        setSearchValue={setSearchEmail}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Nationality</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('nationality')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueNationalities}
                          selected={filterNationality}
                          setSelected={setFilterNationality}
                          searchValue={searchNationality}
                          setSearchValue={setSearchNationality}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Ethnicity</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('ethnicity')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueEthnicities}
                          selected={filterEthnicity}
                          setSelected={setFilterEthnicity}
                          searchValue={searchEthnicity}
                          setSearchValue={setSearchEthnicity}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <span>Emirates ID</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Camp</span>
                      <ColumnFilter
                        values={uniqueCamps}
                        selected={filterCamp}
                        setSelected={setFilterCamp}
                        searchValue={searchCamp}
                        setSearchValue={setSearchCamp}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Status</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('status')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueStatuses}
                          selected={filterStatus}
                          setSelected={setFilterStatus}
                          searchValue={searchStatus}
                          setSearchValue={setSearchStatus}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 no-print">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="12" className="px-4 py-12 text-center text-gray-500">
                      Loading external personnel...
                    </td>
                  </tr>
                ) : sortedPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-4 py-12 text-center text-gray-500">
                      No external personnel found
                    </td>
                  </tr>
                ) : (
                  sortedPersonnel.map((person, index) => {
                    const camp = camps.find(c => c.id === person.camp_id);

                    return (
                      <tr
                        key={person.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                          {person.full_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {person.company_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {person.role}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {person.gender}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {person.contact_number || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {person.email || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {person.nationality || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {person.ethnicity || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap font-mono">
                          {person.emirates_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {camp?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge variant={
                            person.status === 'active' ? 'default' :
                            person.status === 'on_leave' ? 'secondary' :
                            person.status === 'departed' ? 'outline' : 'destructive'
                          } className="text-xs">
                            {person.status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap no-print">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(person)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {person.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCheckoutPersonId(person.id);
                                  setShowCheckoutDialog(true);
                                }}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                title="Check-out (Depart)"
                              >
                                <LogOut className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 no-print">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedPersonnel.length}</span> of <span className="font-semibold">{externalPersonnel.length}</span> external personnel
            </p>
          </div>
        </Card>
      </div>

      {/* Dialogs remain the same */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPerson ? 'Edit External Personnel' : 'Add External Personnel'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name*</Label>
                <Input
                  required
                  value={personData.full_name || ''}
                  onChange={(e) => setPersonData({...personData, full_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Company Name*</Label>
                <Input
                  required
                  value={personData.company_name || ''}
                  onChange={(e) => setPersonData({...personData, company_name: e.target.value})}
                  placeholder="e.g., G4S Security"
                />
              </div>

              <div className="space-y-2">
                <Label>Role*</Label>
                <Select
                  value={personData.role || ''}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security_guard">Security Guard</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="cleaner">Cleaner</SelectItem>
                    <SelectItem value="cook">Cook</SelectItem>
                    <SelectItem value="mess_staff">Mess Staff</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="custom">➕ Add Custom Role...</SelectItem>
                  </SelectContent>
                </Select>
                
                {showCustomRole && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Label className="text-sm text-blue-900 mb-2 block">Custom Role Name*</Label>
                    <Input
                      required
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="e.g., Electrician, Plumber, etc."
                      className="bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Gender*</Label>
                <Select
                  value={personData.gender || ''}
                  onValueChange={(value) => setPersonData({...personData, gender: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contact Number*</Label>
                <PhoneInput
                  value={personData.contact_number || ''}
                  onChange={(value) => setPersonData({...personData, contact_number: value})}
                  placeholder="Enter 9 digits"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={personData.email || ''}
                  onChange={(e) => setPersonData({...personData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Nationality*</Label>
                <Select
                  value={personData.nationality || ''}
                  onValueChange={(value) => setPersonData({...personData, nationality: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indian">Indian</SelectItem>
                    <SelectItem value="Pakistani">Pakistani</SelectItem>
                    <SelectItem value="Bangladeshi">Bangladeshi</SelectItem>
                    <SelectItem value="Filipino">Filipino</SelectItem>
                    <SelectItem value="Nepali">Nepali</SelectItem>
                    <SelectItem value="Sri Lankan">Sri Lankan</SelectItem>
                    <SelectItem value="Emirati">Emirati</SelectItem>
                    <SelectItem value="Egyptian">Egyptian</SelectItem>
                    <SelectItem value="Jordanian">Jordanian</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ethnicity</Label>
                <Input
                  value={personData.ethnicity || ''}
                  onChange={(e) => setPersonData({...personData, ethnicity: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Emirates ID</Label>
                <Input
                  value={personData.emirates_id || ''}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length > 15) value = value.slice(0, 15);
                    
                    let formatted = '';
                    if (value.length > 0) formatted = value.slice(0, 3);
                    if (value.length > 3) formatted += '-' + value.slice(3, 7);
                    if (value.length > 7) formatted += '-' + value.slice(7, 14);
                    if (value.length > 14) formatted += '-' + value.slice(14, 15);
                    
                    setPersonData({...personData, emirates_id: formatted});
                  }}
                  placeholder="784-YYYY-NNNNNNN-C"
                  maxLength={18}
                />
                <p className="text-xs text-gray-500">Format: 784-YYYY-NNNNNNN-C</p>
              </div>

              <div className="space-y-2">
                <Label>Camp</Label>
                <Select
                  value={personData.camp_id || ''}
                  onValueChange={(value) => setPersonData({...personData, camp_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select camp" />
                  </SelectTrigger>
                  <SelectContent>
                    {camps.map((camp) => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={personData.status || 'active'}
                  onValueChange={(value) => setPersonData({...personData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_arrival">Pending Arrival</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="departed">Departed</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contract Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {personData.contract_start_date 
                        ? format(new Date(personData.contract_start_date), 'dd/MMM/yyyy')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={personData.contract_start_date ? new Date(personData.contract_start_date) : undefined}
                      onSelect={(date) => setPersonData({
                        ...personData, 
                        contract_start_date: date ? format(date, 'yyyy-MM-dd') : ''
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Contract End Date*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {personData.contract_end_date 
                        ? format(new Date(personData.contract_end_date), 'dd/MMM/yyyy')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={personData.contract_end_date ? new Date(personData.contract_end_date) : undefined}
                      onSelect={(date) => setPersonData({
                        ...personData, 
                        contract_end_date: date ? format(date, 'yyyy-MM-dd') : ''
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={personData.notes || ''}
                onChange={(e) => setPersonData({...personData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingPerson(null);
                  setPersonData({});
                  setShowCustomRole(false);
                  setCustomRole("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingPerson ? 'Update' : 'Add'} Personnel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload External Personnel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Upload a CSV file with external personnel data. Download the template below to see the required format.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>

            <div className="space-y-2">
              <Label htmlFor="bulk-file-upload">Upload CSV File</Label>
              <Input
                id="bulk-file-upload"
                type="file"
                accept=".csv"
                onChange={(e) => setBulkFile(e.target.files[0])}
                disabled={uploading}
              />
            </div>

            {uploadResult && (
              <Alert variant={uploadResult.success ? "default" : "destructive"}>
                <AlertDescription>
                  {uploadResult.success 
                    ? `Successfully uploaded ${uploadResult.count} external personnel!`
                    : `Error: ${uploadResult.error}`
                  }
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBulkUploadDialog(false);
                  setBulkFile(null);
                  setUploadResult(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={!bulkFile || uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check-out External Personnel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                This will mark the personnel as <strong>Departed</strong> and free up their assigned bed for the next allocation. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCheckoutDialog(false);
                  setCheckoutPersonId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckout}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Confirm Check-out
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}