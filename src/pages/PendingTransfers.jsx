import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitPullRequest, CheckCircle2, XCircle, Clock, AlertCircle, Filter, X, ArrowUpDown, Download, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export default function PendingTransfers() {
  const [processingIds, setProcessingIds] = useState([]);
  const [sortField, setSortField] = useState("last_transfer_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Bulk selection state
  const [selectedTransfers, setSelectedTransfers] = useState([]);

  // Column filters
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterCurrentCamp, setFilterCurrentCamp] = useState([]);
  const [filterTransferDate, setFilterTransferDate] = useState([]);
  const [filterDaysSince, setFilterDaysSince] = useState([]);
  const [filterPersonnelType, setFilterPersonnelType] = useState([]);


  // Search states for filters
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchCurrentCamp, setSearchCurrentCamp] = useState("");
  const [searchTransferDate, setSearchTransferDate] = useState("");
  const [searchDaysSince, setSearchDaysSince] = useState("");
  const [searchPersonnelType, setSearchPersonnelType] = useState("");

  const queryClient = useQueryClient();

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-last_transfer_date'),
  });

  const { data: externalPersonnel = [] } = useQuery({
    queryKey: ['externalPersonnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list('-last_transfer_date'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: currentUser, isLoading: userLoading, error: userError, refetch: refetchUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        console.log("=== CURRENT USER DATA ===");
        console.log("Full user object:", user);
        console.log("Role:", user?.role);
        console.log("is_camp_manager:", user?.is_camp_manager);
        console.log("========================");
        return user;
      } catch (error) {
        console.error("=== USER FETCH ERROR ===");
        console.error("Error:", error);
        console.error("Status:", error.response?.status);
        console.error("========================");
        
        if (error.response?.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  const updateExternalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExternalPersonnel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['externalPersonnel'] });
    },
  });

  // Find transfers that need review for BOTH technicians and external personnel
  const suspiciousTechnicianTransfers = technicians.filter(tech => {
    if (tech.last_transfer_date && !tech.transfer_approved_by) {
      const transferDate = parseISO(tech.last_transfer_date);
      const daysSince = Math.floor((new Date() - transferDate) / (1000 * 60 * 60 * 24));
      return daysSince <= 30;
    }
    return false;
  });

  const suspiciousExternalTransfers = externalPersonnel.filter(ext => {
    if (ext.last_transfer_date && !ext.transfer_approved_by) {
      const transferDate = parseISO(ext.last_transfer_date);
      const daysSince = Math.floor((new Date() - transferDate) / (1000 * 60 * 60 * 24));
      return daysSince <= 30;
    }
    return false;
  });

  // Combine both types with a type indicator
  const allSuspiciousTransfers = [
    ...suspiciousTechnicianTransfers.map(t => ({ ...t, personnelType: 'technician' })),
    ...suspiciousExternalTransfers.map(e => ({ ...e, personnelType: 'external' }))
  ];

  console.log("=== PENDING TRANSFERS DEBUG ===");
  console.log("Total Technicians:", technicians.length);
  console.log("Technicians with last_transfer_date:", technicians.filter(t => t.last_transfer_date).length);
  console.log("Technicians without approval:", technicians.filter(t => t.last_transfer_date && !t.transfer_approved_by).length);
  console.log("Suspicious Technician Transfers:", suspiciousTechnicianTransfers.length);
  console.log("Total External Personnel:", externalPersonnel.length);
  console.log("External with last_transfer_date:", externalPersonnel.filter(e => e.last_transfer_date).length);
  console.log("External without approval:", externalPersonnel.filter(e => e.last_transfer_date && !e.transfer_approved_by).length);
  console.log("Suspicious External Transfers:", suspiciousExternalTransfers.length);
  console.log("All Suspicious Transfers:", allSuspiciousTransfers.length);
  console.log("================================");

  // Apply column filters
  let filteredTransfers = allSuspiciousTransfers.filter(person => {
    const currentCamp = camps.find(c => c.id === person.camp_id);
    const transferDateFormatted = person.last_transfer_date ? format(parseISO(person.last_transfer_date), 'MMM dd, yyyy') : '-';
    const daysSince = person.last_transfer_date
      ? Math.floor((new Date() - parseISO(person.last_transfer_date)) / (1000 * 60 * 60 * 24))
      : 0;

    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(person.employee_id || '-')) return false;
    if (filterFullName.length > 0 && !filterFullName.includes(person.full_name || '-')) return false;
    if (filterCurrentCamp.length > 0 && !filterCurrentCamp.includes(currentCamp?.name || '-')) return false;
    if (filterTransferDate.length > 0 && !filterTransferDate.includes(transferDateFormatted)) return false;
    if (filterDaysSince.length > 0 && !filterDaysSince.includes(String(daysSince))) return false;
    if (filterPersonnelType.length > 0 && !filterPersonnelType.includes(person.personnelType === 'technician' ? 'Technician' : 'External')) return false;


    return true;
  });

  // Sort
  const sortedTransfers = [...filteredTransfers].sort((a, b) => {
    let aVal, bVal;

    if (sortField === 'current_camp') {
      const campA = camps.find(c => c.id === a.camp_id);
      const campB = camps.find(c => c.id === b.camp_id);
      aVal = campA?.name || '';
      bVal = campB?.name || '';
    } else if (sortField === 'days_since') {
      aVal = a.last_transfer_date ? Math.floor((new Date() - parseISO(a.last_transfer_date)) / (1000 * 60 * 60 * 24)) : 0;
      bVal = b.last_transfer_date ? Math.floor((new Date() - parseISO(b.last_transfer_date)) / (1000 * 60 * 60 * 24)) : 0;
    } else if (sortField === 'personnelType') {
      aVal = a.personnelType;
      bVal = b.personnelType;
    } else {
      aVal = a[sortField] || '';
      bVal = b[sortField] || '';
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Get unique values for filters from ALL suspicious transfers
  const uniqueEmployeeIds = [...new Set(allSuspiciousTransfers.map(t => t.employee_id || '-'))].sort();
  const uniqueFullNames = [...new Set(allSuspiciousTransfers.map(t => t.full_name || '-'))].sort();
  const uniqueCurrentCamps = [...new Set(allSuspiciousTransfers.map(t => {
    const camp = camps.find(c => c.id === t.camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueTransferDates = [...new Set(allSuspiciousTransfers.map(t =>
    t.last_transfer_date ? format(parseISO(t.last_transfer_date), 'MMM dd, yyyy') : '-'
  ))].sort();
  const uniqueDaysSince = [...new Set(allSuspiciousTransfers.map(t =>
    t.last_transfer_date
      ? String(Math.floor((new Date() - parseISO(t.last_transfer_date)) / (1000 * 60 * 60 * 24)))
      : '0'
  ))].sort((a, b) => parseInt(a) - parseInt(b));
  const uniquePersonnelTypes = [...new Set(allSuspiciousTransfers.map(t => t.personnelType === 'technician' ? 'Technician' : 'External'))].sort();


  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Check permissions
  const isCampManager = React.useMemo(() => {
    if (!currentUser) return false;
    const isAdmin = currentUser?.role === 'admin';
    const isCampMgr = currentUser?.is_camp_manager === true || currentUser?.is_camp_manager === 'true';
    return isAdmin || isCampMgr;
  }, [currentUser]);

  // Check if user is not authenticated
  const isUnauthorized = userError?.response?.status === 401 || (!userLoading && !currentUser);

  const handleSelectAll = () => {
    if (selectedTransfers.length === sortedTransfers.length) {
      setSelectedTransfers([]);
    } else {
      setSelectedTransfers(sortedTransfers.map(t => t.id));
    }
  };

  const handleSelectTransfer = (transferId) => {
    if (selectedTransfers.includes(transferId)) {
      setSelectedTransfers(selectedTransfers.filter(id => id !== transferId));
    } else {
      setSelectedTransfers([...selectedTransfers, transferId]);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedTransfers.length === 0) {
      alert("Please select at least one transfer to approve");
      return;
    }

    if (userLoading) {
      alert("Loading user permissions... Please wait.");
      return;
    }

    if (!currentUser) {
      alert("User information not loaded. Please log in to approve transfers.");
      return;
    }

    if (!isCampManager) {
      alert(`You don't have permission to approve transfers.\n\nYour role: ${currentUser.role}\nCamp Manager flag: ${currentUser.is_camp_manager}\nType: ${typeof currentUser.is_camp_manager}\n\nPlease contact an administrator.`);
      return;
    }

    const confirmBulk = window.confirm(
      `Are you sure you want to approve ${selectedTransfers.length} transfer(s)?\n\nThis will mark them as approved by you.`
    );

    if (!confirmBulk) return;

    setProcessingIds([...selectedTransfers]);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const transferId of selectedTransfers) {
        const person = allSuspiciousTransfers.find(t => t.id === transferId);
        if (!person) {
          console.warn(`Could not find person with ID ${transferId} in allSuspiciousTransfers.`);
          errorCount++;
          errors.push(`Unknown person with ID ${transferId}`);
          continue;
        }

        try {
          if (person.personnelType === 'technician') {
            await updateTechnicianMutation.mutateAsync({
              id: transferId,
              data: {
                transfer_approved_by: currentUser.id
              }
            });
          } else {
            await updateExternalMutation.mutateAsync({
              id: transferId,
              data: {
                transfer_approved_by: currentUser.id
              }
            });
          }
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`${person.full_name} (${person.employee_id || 'N/A'}): ${err.message}`);
        }
      }

      if (successCount > 0) {
        alert(`Successfully approved ${successCount} transfer(s)${errorCount > 0 ? `. ${errorCount} failed.` : ''}`);
      }

      if (errorCount > 0 && errors.length > 0) {
        console.error("Bulk approval errors:", errors);
        alert(`Failed to approve some transfers:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`);
      }

      setSelectedTransfers([]);
    } catch (err) {
      console.error('An unexpected error occurred during bulk approval:', err);
      alert('An unexpected error occurred during bulk approval. Please check console for details.');
    } finally {
      setProcessingIds([]);
    }
  };

  const handleApprove = async (person) => {
    console.log("=== APPROVE CLICKED ===");
    console.log("User Loading:", userLoading);
    console.log("Current User:", currentUser);
    console.log("Is Camp Manager:", isCampManager);
    console.log("Personnel Type:", person.personnelType);
    console.log("======================");

    if (userLoading) {
      alert("Loading user permissions... Please wait.");
      return;
    }

    if (!currentUser) {
      alert("User information not loaded. Please log in to approve transfers.");
      return;
    }

    if (!isCampManager) {
      alert(`You don't have permission to approve transfers.\n\nYour role: ${currentUser.role}\nCamp Manager flag: ${currentUser.is_camp_manager}\nType: ${typeof currentUser.is_camp_manager}\n\nPlease contact an administrator.`);
      return;
    }

    setProcessingIds(prev => [...prev, person.id]);
    try {
      if (person.personnelType === 'technician') {
        await updateTechnicianMutation.mutateAsync({
          id: person.id,
          data: {
            transfer_approved_by: currentUser.id
          }
        });
      } else {
        await updateExternalMutation.mutateAsync({
          id: person.id,
          data: {
            transfer_approved_by: currentUser.id
          }
        });
      }
      alert("Transfer approved successfully");
    } catch (error) {
      alert(`Failed to approve: ${error.message}`);
    }
    setProcessingIds(prev => prev.filter(id => id !== person.id));
  };

  const handleRevert = async (person) => {
    if (userLoading) {
      alert("Loading user permissions... Please wait.");
      return;
    }

    if (!currentUser) {
      alert("User information not loaded. Please log in to revert transfers.");
      return;
    }

    if (!isCampManager) {
      alert(`You don't have permission to revert transfers.\n\nYour role: ${currentUser.role}\nCamp Manager flag: ${currentUser.is_camp_manager}\nType: ${typeof currentUser.is_camp_manager}\n\nPlease contact an administrator.`);
      return;
    }

    const confirmRevert = window.confirm(
      `Are you sure you want to review the transfer for ${person.full_name}?\n\n` +
      `Please manually update the ${person.personnelType === 'technician' ? "technician's" : "external personnel's"} camp in the ${person.personnelType === 'technician' ? 'Technicians' : 'External Personnel'} page if needed.`
    );

    if (!confirmRevert) return;

    alert(`Please manually update the ${person.personnelType === 'technician' ? "technician's" : "external personnel's"} camp in the ${person.personnelType === 'technician' ? 'Technicians' : 'External Personnel'} page`);
  };

  const clearAllFilters = () => {
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterCurrentCamp([]);
    setFilterTransferDate([]);
    setFilterDaysSince([]);
    setFilterPersonnelType([]);
  };

  const hasActiveFilters =
    filterEmployeeId.length > 0 ||
    filterFullName.length > 0 ||
    filterCurrentCamp.length > 0 ||
    filterTransferDate.length > 0 ||
    filterDaysSince.length > 0 ||
    filterPersonnelType.length > 0;

  // Column Filter Component
  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue }) => {
    const filteredValues = values.filter(v =>
      v.toLowerCase().includes(searchValue.toLowerCase())
    );

    const toggleValue = (value) => {
      setSelected(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
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
    const headers = ['Type', 'Employee ID', 'Full Name', 'Current Camp', 'Transfer Date', 'Days Since Transfer'];
    const rows = sortedTransfers.map(person => {
      const camp = camps.find(c => c.id === person.camp_id);
      const daysSince = person.last_transfer_date
        ? Math.floor((new Date() - parseISO(person.last_transfer_date)) / (1000 * 60 * 60 * 24))
        : 0;

      return [
        person.personnelType === 'technician' ? 'Technician' : 'External',
        person.employee_id || '-',
        person.full_name,
        camp?.name || '-',
        person.last_transfer_date ? format(parseISO(person.last_transfer_date), 'dd/MM/yyyy') : '-',
        daysSince
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pending_transfers_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
          }
          #printable-table table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          #printable-table th,
          #printable-table td {
            border: 1px solid #000;
            padding: 3px;
            text-align: left;
          }
          #printable-table th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
              <GitPullRequest className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transfers Without Approval</h1>
              <p className="text-gray-600">Review and approve transfers from last 30 days</p>
            </div>
          </div>
          <div className="flex gap-3">
            {selectedTransfers.length > 0 && (
              <Button 
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700"
                disabled={processingIds.length > 0}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Selected ({selectedTransfers.length})
              </Button>
            )}
            <Button variant="outline" onClick={exportToCSV} className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={printReport} className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Not Logged In Alert */}
        {isUnauthorized && (
          <Alert variant="destructive" className="no-print">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Authentication Required</strong>
                  <p className="mt-1">You need to log in to access this page and approve transfers.</p>
                </div>
                <Button
                  onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                  className="ml-4 bg-blue-600 hover:bg-blue-700"
                >
                  Log In
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Debug Info Card - Only show if user is loaded */}
        {currentUser && (
          <Card className="border-blue-500 bg-blue-50 no-print">
            <CardContent className="p-4">
              <div className="text-sm">
                <p className="font-bold text-blue-900 mb-2">Current User Debug Info:</p>
                <div className="space-y-1 text-blue-800">
                  <p>Email: <strong>{currentUser.email}</strong></p>
                  <p>Role: <strong>{currentUser.role}</strong> (type: {typeof currentUser.role})</p>
                  <p>is_camp_manager: <strong>{String(currentUser.is_camp_manager)}</strong> (type: {typeof currentUser.is_camp_manager})</p>
                  <p>Calculated Permission (isCampManager): <strong>{isCampManager ? 'YES ✅' : 'NO ❌'}</strong></p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Error Alert - Only for non-401 errors */}
        {userError && userError.response?.status !== 401 && (
          <Alert variant="destructive" className="no-print">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>Error loading user data:</strong> {userError.message}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchUser()}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Permission Warning - Only show if logged in but no permissions */}
        {currentUser && !isCampManager && (
          <Alert variant="destructive" className="no-print">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              You don't have camp manager permissions. Only camp managers can approve transfers.
              <div className="mt-2 text-xs">
                <p>Current role: <strong>{currentUser.role || 'unknown'}</strong></p>
                <p>Camp Manager flag: <strong>{String(currentUser.is_camp_manager)}</strong></p>
                <p className="mt-2 text-gray-600">Contact an administrator to grant camp manager permissions.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State for User */}
        {userLoading && (
          <Alert className="no-print">
            <AlertCircle className="w-4 w-4" />
            <AlertDescription>
              Loading user permissions...
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Card */}
        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-red-50 no-print">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-1">Transfers Needing Review</p>
                <p className="text-3xl font-bold text-orange-900">{sortedTransfers.length}</p>
                <p className="text-xs text-orange-600 mt-1">From last 30 days</p>
              </div>
              <Clock className="w-12 h-12 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
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

          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
            <CardTitle>Unapproved Transfers ({sortedTransfers.length})</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            {sortedTransfers.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
                <p className="text-gray-600">No transfers pending approval</p>
              </div>
            ) : (
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 no-print">
                      <Checkbox
                        checked={selectedTransfers.length === sortedTransfers.length && sortedTransfers.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all transfers"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Type</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('personnelType')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniquePersonnelTypes}
                            selected={filterPersonnelType}
                            setSelected={setFilterPersonnelType}
                            searchValue={searchPersonnelType}
                            setSearchValue={setSearchPersonnelType}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Employee ID</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('employee_id')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueEmployeeIds}
                            selected={filterEmployeeId}
                            setSelected={setFilterEmployeeId}
                            searchValue={searchEmployeeId}
                            setSearchValue={setSearchEmployeeId}
                          />
                        </div>
                      </div>
                    </th>
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
                        <span>Current Camp</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('current_camp')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueCurrentCamps}
                            selected={filterCurrentCamp}
                            setSelected={setFilterCurrentCamp}
                            searchValue={searchCurrentCamp}
                            setSearchValue={setSearchCurrentCamp}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Transfer Date</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('last_transfer_date')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueTransferDates}
                            selected={filterTransferDate}
                            setSelected={setFilterTransferDate}
                            searchValue={searchTransferDate}
                            setSearchValue={setSearchTransferDate}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Days Since</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('days_since')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueDaysSince}
                            selected={filterDaysSince}
                            setSelected={setFilterDaysSince}
                            searchValue={searchDaysSince}
                            setSearchValue={setSearchDaysSince}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 no-print">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransfers.map((person, index) => {
                    const currentCamp = camps.find(c => c.id === person.camp_id);
                    const daysSince = person.last_transfer_date
                      ? Math.floor((new Date() - parseISO(person.last_transfer_date)) / (1000 * 60 * 60 * 24))
                      : 0;
                    const isProcessing = processingIds.includes(person.id);
                    const isSelected = selectedTransfers.includes(person.id);

                    return (
                      <tr
                        key={`${person.personnelType}-${person.id}`}
                        className={`border-b border-gray-200 hover:bg-orange-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap no-print">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectTransfer(person.id)}
                            disabled={isProcessing}
                            aria-label={`Select ${person.full_name}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge variant={person.personnelType === 'technician' ? 'default' : 'secondary'}>
                            {person.personnelType === 'technician' ? 'Technician' : 'External'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 border-r border-gray-200 whitespace-nowrap">
                          {person.employee_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                          {person.full_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {currentCamp?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {person.last_transfer_date
                            ? format(parseISO(person.last_transfer_date), 'MMM dd, yyyy')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                            {daysSince} days ago
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap no-print">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(person)}
                              disabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevert(person)}
                              disabled={isProcessing}
                              className="border-red-600 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedTransfers.length}</span> transfer(s) without approval
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}