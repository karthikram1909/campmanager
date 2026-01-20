import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, Filter, X, ArrowUpDown, Upload, FileText, Eye, Trash2 } from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function CampInductionTracker() {
  const [selectedCamp, setSelectedCamp] = useState("all");
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [inductionDate, setInductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [inductionTime, setInductionTime] = useState(new Date().toTimeString().slice(0, 5));
  const [processing, setProcessing] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkInductionDate, setBulkInductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkInductionTime, setBulkInductionTime] = useState(new Date().toTimeString().slice(0, 5));
  const [bulkAttachments, setBulkAttachments] = useState([]);

  // Sorting
  const [sortField, setSortField] = useState("hoursSinceArrival");
  const [sortDirection, setSortDirection] = useState("desc");

  // Excel-style filters
  const [filterName, setFilterName] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterCamp, setFilterCamp] = useState([]);
  const [filterArrivalDate, setFilterArrivalDate] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterTrade, setFilterTrade] = useState([]);
  const [filterTimeStatus, setFilterTimeStatus] = useState([]);

  // Search states for filters
  const [searchName, setSearchName] = useState("");
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchCamp, setSearchCamp] = useState("");
  const [searchArrivalDate, setSearchArrivalDate] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchTrade, setSearchTrade] = useState("");
  const [searchTimeStatus, setSearchTimeStatus] = useState("");

  const queryClient = useQueryClient();

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: externalPersonnel = [] } = useQuery({
    queryKey: ['external-personnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  // Find Sajja camp (induction camp)
  const sajjaCamp = camps.find(c => c.code?.toLowerCase() === 'sajja' || c.name?.toLowerCase().includes('sajja'));

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  const updateExternalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExternalPersonnel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-personnel'] });
    },
  });

  // File upload handler
  const handleFileUpload = async (isForBulk = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      setUploading(true);
      try {
        const uploadedFiles = [];
        for (const file of files) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          uploadedFiles.push({
            name: file.name,
            url: file_url,
            type: file.type
          });
        }
        if (isForBulk) {
          setBulkAttachments(prev => [...prev, ...uploadedFiles]);
        } else {
          setAttachments(prev => [...prev, ...uploadedFiles]);
        }
      } catch (error) {
        alert("Upload failed: " + error.message);
      }
      setUploading(false);
    };
    input.click();
  };

  const removeAttachment = (index, isForBulk = false) => {
    if (isForBulk) {
      setBulkAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Get personnel who need camp induction
  const getPendingInduction = () => {
    const allPersonnel = [
      ...technicians.map(t => ({ ...t, type: 'technician' })),
      ...externalPersonnel.map(e => ({ ...e, type: 'external' }))
    ];

    return allPersonnel.filter(person => {
      if (person.status !== 'active' || !person.actual_arrival_date) return false;
      if (person.camp_induction_required === false) return false;
      if (person.camp_induction_completed === true) return false;
      
      // Exclude personnel at Sajja Camp who completed Sajja pre-induction (that IS their camp induction)
      if (sajjaCamp && person.camp_id === sajjaCamp.id && person.type === 'technician' && person.induction_completion_date) {
        return false;
      }
      
      if (selectedCamp !== 'all' && person.camp_id !== selectedCamp) return false;
      return true;
    }).map(person => {
      const arrivalDateTime = parseISO(`${person.actual_arrival_date}T${person.actual_arrival_time || '00:00'}`);
      const hoursSinceArrival = differenceInHours(new Date(), arrivalDateTime);
      const isOverdue = hoursSinceArrival > 24;

      return {
        ...person,
        hoursSinceArrival,
        isOverdue,
        uniqueId: `${person.type}-${person.id}`
      };
    });
  };

  const allPendingInduction = getPendingInduction();

  // Apply column filters
  let filteredInduction = allPendingInduction.filter(person => {
    const camp = camps.find(c => c.id === person.camp_id);
    const arrivalDateStr = person.actual_arrival_date ? format(parseISO(person.actual_arrival_date), 'MMM dd, yyyy') : '-';
    const timeStatus = person.isOverdue ? 'Overdue' : 'Within Time';
    const personnelType = person.type === 'technician' ? 'Technician' : 'External Personnel';
    const employeeOrCompany = person.employee_id || person.company_name || '-';
    const tradeOrRole = person.trade || person.role || '-';

    if (filterName.length > 0 && !filterName.includes(person.full_name)) return false;
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(employeeOrCompany)) return false;
    if (filterType.length > 0 && !filterType.includes(personnelType)) return false;
    if (filterCamp.length > 0 && !filterCamp.includes(camp?.name || '-')) return false;
    if (filterArrivalDate.length > 0 && !filterArrivalDate.includes(arrivalDateStr)) return false;
    if (filterNationality.length > 0 && !filterNationality.includes(person.nationality || '-')) return false;
    if (filterTrade.length > 0 && !filterTrade.includes(tradeOrRole)) return false;
    if (filterTimeStatus.length > 0 && !filterTimeStatus.includes(timeStatus)) return false;

    return true;
  });

  // Sort
  const sortedInduction = [...filteredInduction].sort((a, b) => {
    let aVal, bVal;

    if (sortField === 'full_name') {
      aVal = a.full_name || '';
      bVal = b.full_name || '';
    } else if (sortField === 'employee_id') {
      aVal = a.employee_id || a.company_name || '';
      bVal = b.employee_id || b.company_name || '';
    } else if (sortField === 'camp_name') {
      const campA = camps.find(c => c.id === a.camp_id);
      const campB = camps.find(c => c.id === b.camp_id);
      aVal = campA?.name || '';
      bVal = campB?.name || '';
    } else if (sortField === 'actual_arrival_date') {
      aVal = a.actual_arrival_date || '';
      bVal = b.actual_arrival_date || '';
    } else if (sortField === 'nationality') {
      aVal = a.nationality || '';
      bVal = b.nationality || '';
    } else if (sortField === 'trade') {
      aVal = a.trade || a.role || '';
      bVal = b.trade || b.role || '';
    } else if (sortField === 'hoursSinceArrival') {
      aVal = a.hoursSinceArrival;
      bVal = b.hoursSinceArrival;
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

  const overdueCount = sortedInduction.filter(p => p.isOverdue).length;

  const handleMarkComplete = async () => {
    if (!selectedPersonnel) return;

    const confirmComplete = window.confirm(
      `Mark camp induction as complete for ${selectedPersonnel.full_name}?\n\nInduction Date: ${format(parseISO(inductionDate), 'MMM dd, yyyy')}\nInduction Time: ${inductionTime}`
    );

    if (!confirmComplete) return;

    setProcessing(true);

    try {
      const updateData = {
        camp_induction_completed: true,
        camp_induction_date: inductionDate,
        camp_induction_time: inductionTime,
        camp_induction_attachments: attachments.length > 0 ? JSON.stringify(attachments) : null
      };

      if (selectedPersonnel.type === 'technician') {
        await updateTechnicianMutation.mutateAsync({
          id: selectedPersonnel.id,
          data: updateData
        });
      } else {
        await updateExternalMutation.mutateAsync({
          id: selectedPersonnel.id,
          data: updateData
        });
      }

      alert(`Camp induction marked as complete for ${selectedPersonnel.full_name}`);
      setSelectedPersonnel(null);
      setInductionDate(new Date().toISOString().split('T')[0]);
      setInductionTime(new Date().toTimeString().slice(0, 5));
      setAttachments([]);

    } catch (error) {
      alert(`Failed to update: ${error.message}`);
    }

    setProcessing(false);
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === sortedInduction.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedInduction.map(p => p.uniqueId));
    }
  };

  const handleSelectPerson = (uniqueId) => {
    if (selectedIds.includes(uniqueId)) {
      setSelectedIds(selectedIds.filter(id => id !== uniqueId));
    } else {
      setSelectedIds([...selectedIds, uniqueId]);
    }
  };

  const handleBulkComplete = async () => {
    if (!bulkInductionDate) {
      alert("Please enter the induction date");
      return;
    }

    setProcessing(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const uniqueId of selectedIds) {
        const person = sortedInduction.find(p => p.uniqueId === uniqueId);
        if (!person) continue;

        try {
          const updateData = {
            camp_induction_completed: true,
            camp_induction_date: bulkInductionDate,
            camp_induction_time: bulkInductionTime,
            camp_induction_attachments: bulkAttachments.length > 0 ? JSON.stringify(bulkAttachments) : null
          };

          if (person.type === 'technician') {
            await updateTechnicianMutation.mutateAsync({
              id: person.id,
              data: updateData
            });
          } else {
            await updateExternalMutation.mutateAsync({
              id: person.id,
              data: updateData
            });
          }
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to update ${person.full_name}:`, error);
        }
      }

      alert(`✅ Batch Induction Complete!\n\n✓ ${successCount} personnel inducted successfully${errorCount > 0 ? `\n✗ ${errorCount} failed` : ''}`);
      
      setSelectedIds([]);
      setShowBulkDialog(false);
      setBulkInductionDate(new Date().toISOString().split('T')[0]);
      setBulkInductionTime(new Date().toTimeString().slice(0, 5));
      setBulkAttachments([]);

    } catch (error) {
      alert(`Failed to complete batch induction: ${error.message}`);
    }

    setProcessing(false);
  };

  // Get unique values for filters
  const uniqueNames = [...new Set(allPendingInduction.map(p => p.full_name))].sort();
  const uniqueEmployeeIds = [...new Set(allPendingInduction.map(p => p.employee_id || p.company_name || '-'))].sort();
  const uniqueTypes = ['Technician', 'External Personnel'];
  const uniqueCamps = [...new Set(allPendingInduction.map(p => {
    const camp = camps.find(c => c.id === p.camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueArrivalDates = [...new Set(allPendingInduction.map(p => 
    p.actual_arrival_date ? format(parseISO(p.actual_arrival_date), 'MMM dd, yyyy') : '-'
  ))].sort();
  const uniqueNationalities = [...new Set(allPendingInduction.map(p => p.nationality || '-'))].sort();
  const uniqueTrades = [...new Set(allPendingInduction.map(p => p.trade || p.role || '-'))].sort();
  const uniqueTimeStatuses = ['Overdue', 'Within Time'];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearAllFilters = () => {
    setFilterName([]);
    setFilterEmployeeId([]);
    setFilterType([]);
    setFilterCamp([]);
    setFilterArrivalDate([]);
    setFilterNationality([]);
    setFilterTrade([]);
    setFilterTimeStatus([]);
  };

  const hasActiveFilters = 
    filterName.length > 0 ||
    filterEmployeeId.length > 0 ||
    filterType.length > 0 ||
    filterCamp.length > 0 ||
    filterArrivalDate.length > 0 ||
    filterNationality.length > 0 ||
    filterTrade.length > 0 ||
    filterTimeStatus.length > 0;

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
          <Button variant="ghost" size="sm" className="h-8 px-2">
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

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Camp Induction Tracker</h1>
              <p className="text-gray-600">Track and complete 24-hour camp induction compliance</p>
            </div>
          </div>
        </div>

        {/* Workflow Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Step 4 of 4: Camp Induction (Final Transfer Step - 24 hours max)</strong><br/>
            Complete camp-specific safety briefings, rules, emergency procedures → Upload attendance/test reports → Mark complete → Transfer complete!<br/>
            <span className="text-xs italic">Note: Also serves as Step 6 of 6 for Onboarding workflow</span>
          </AlertDescription>
        </Alert>

        {/* Batch Selection Actions */}
        {selectedIds.length > 0 && (
          <Card className="border-l-4 border-l-green-600 shadow-lg bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">
                      {selectedIds.length} personnel selected for batch induction
                    </p>
                    <p className="text-sm text-green-700">
                      Complete induction for multiple personnel at once
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedIds([])}
                    size="sm"
                  >
                    Clear Selection
                  </Button>
                  <Button
                    onClick={() => setShowBulkDialog(true)}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Batch Induction
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium mb-1">Pending Induction</p>
                  <p className="text-3xl font-bold text-blue-900">{sortedInduction.length}</p>
                </div>
                <Clock className="w-12 h-12 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium mb-1">Overdue (&gt;24hrs)</p>
                  <p className="text-3xl font-bold text-red-900">{overdueCount}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium mb-1">Within Time</p>
                  <p className="text-3xl font-bold text-green-900">{sortedInduction.length - overdueCount}</p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Camp Filter */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium whitespace-nowrap">Filter by Camp:</Label>
              <Select value={selectedCamp} onValueChange={setSelectedCamp}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps</SelectItem>
                  {camps.map(camp => (
                    <SelectItem key={camp.id} value={camp.id}>
                      {camp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-none shadow-lg overflow-hidden">
          {hasActiveFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
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

          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b py-3 px-4">
            <CardTitle className="text-base">Pending Camp Inductions ({sortedInduction.length})</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            {sortedInduction.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">All Clear!</h3>
                <p className="text-gray-600">No pending camp inductions</p>
              </div>
            ) : (
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-2 py-2 text-center bg-gray-50 border-r border-gray-200 w-8">
                      <Checkbox
                        checked={selectedIds.length === sortedInduction.length && sortedInduction.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Action
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Name</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('full_name')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueNames}
                            selected={filterName}
                            setSelected={setFilterName}
                            searchValue={searchName}
                            setSearchValue={setSearchName}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Employee ID</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('employee_id')}>
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
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Type</span>
                        <ColumnFilter
                          values={uniqueTypes}
                          selected={filterType}
                          setSelected={setFilterType}
                          searchValue={searchType}
                          setSearchValue={setSearchType}
                        />
                      </div>
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Camp</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('camp_name')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueCamps}
                            selected={filterCamp}
                            setSelected={setFilterCamp}
                            searchValue={searchCamp}
                            setSearchValue={setSearchCamp}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Arrived</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('actual_arrival_date')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueArrivalDates}
                            selected={filterArrivalDate}
                            setSelected={setFilterArrivalDate}
                            searchValue={searchArrivalDate}
                            setSearchValue={setSearchArrivalDate}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Nationality</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('nationality')}>
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
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Trade/Role</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('trade')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueTrades}
                            selected={filterTrade}
                            setSelected={setFilterTrade}
                            searchValue={searchTrade}
                            setSearchValue={setSearchTrade}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Time Status</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('hoursSinceArrival')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueTimeStatuses}
                            selected={filterTimeStatus}
                            setSelected={setFilterTimeStatus}
                            searchValue={searchTimeStatus}
                            setSearchValue={setSearchTimeStatus}
                          />
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInduction.map((person, index) => {
                    const camp = camps.find(c => c.id === person.camp_id);
                    const isSelected = selectedIds.includes(person.uniqueId);

                    return (
                      <tr
                        key={person.uniqueId}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                          isSelected ? 'bg-blue-100' :
                          person.isOverdue ? 'bg-red-50' : 
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-2 py-2 text-center border-r border-gray-200">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectPerson(person.uniqueId)}
                          />
                        </td>
                        <td className="px-2 py-2 text-sm border-r border-gray-200">
                          <Button
                            onClick={() => {
                              setSelectedPersonnel(person);
                              setInductionDate(new Date().toISOString().split('T')[0]);
                              setInductionTime(new Date().toTimeString().slice(0, 5));
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Complete
                          </Button>
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900 border-r border-gray-200 font-medium">
                          {person.full_name}
                        </td>
                        <td className="px-2 py-2 text-sm font-medium text-blue-600 border-r border-gray-200">
                          {person.employee_id || person.company_name}
                        </td>
                        <td className="px-2 py-2 text-sm border-r border-gray-200">
                          <Badge variant={person.type === 'technician' ? 'default' : 'secondary'}>
                            {person.type === 'technician' ? 'Technician' : 'External'}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 border-r border-gray-200">
                          {camp?.name || '-'}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {format(parseISO(person.actual_arrival_date), 'MMM dd, yyyy')}
                          {person.actual_arrival_time && (
                            <div className="text-xs text-gray-500">{person.actual_arrival_time}</div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 border-r border-gray-200">
                          {person.nationality}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 border-r border-gray-200">
                          {person.trade || person.role || '-'}
                        </td>
                        <td className="px-2 py-2 text-sm border-r border-gray-200">
                          {person.isOverdue ? (
                            <Badge className="bg-red-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {person.hoursSinceArrival - 24}h overdue
                            </Badge>
                          ) : (
                            <Badge className="bg-green-600">
                              <Clock className="w-3 h-3 mr-1" />
                              {24 - person.hoursSinceArrival}h left
                            </Badge>
                          )}
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
              Showing <span className="font-semibold">{sortedInduction.length}</span> of <span className="font-semibold">{allPendingInduction.length}</span> pending inductions
            </p>
          </div>
        </Card>

        {/* Single Complete Dialog */}
        {selectedPersonnel && (
          <Dialog open={!!selectedPersonnel} onOpenChange={() => setSelectedPersonnel(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete Camp Induction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900">{selectedPersonnel.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedPersonnel.employee_id || selectedPersonnel.company_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Induction Date*</Label>
                    <Input
                      type="date"
                      value={inductionDate}
                      onChange={(e) => setInductionDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Induction Time*</Label>
                    <Input
                      type="time"
                      value={inductionTime}
                      onChange={(e) => setInductionTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Attachments Section */}
                <div>
                  <Label className="mb-2 block">Attachments (Optional)</Label>
                  <p className="text-xs text-gray-500 mb-2">Upload attendance sheet, test reports, or other induction documents</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleFileUpload(false)}
                    disabled={uploading}
                    className="mb-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Files'}
                  </Button>
                  {attachments.length > 0 && (
                    <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm truncate max-w-[180px]">{file.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(file.url, '_blank')}>
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => removeAttachment(index, false)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedPersonnel(null)}>
                  Cancel
                </Button>
                <Button onClick={handleMarkComplete} disabled={processing} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Bulk Complete Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Batch Induction ({selectedIds.length} personnel)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  All selected personnel will be marked as inducted with the same date and time.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Induction Date*</Label>
                  <Input
                    type="date"
                    value={bulkInductionDate}
                    onChange={(e) => setBulkInductionDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Induction Time*</Label>
                  <Input
                    type="time"
                    value={bulkInductionTime}
                    onChange={(e) => setBulkInductionTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Bulk Attachments Section */}
              <div>
                <Label className="mb-2 block">Attachments (Optional)</Label>
                <p className="text-xs text-gray-500 mb-2">Upload attendance sheet, test reports, or other induction documents (will be attached to all selected personnel)</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload(true)}
                  disabled={uploading}
                  className="mb-2"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </Button>
                {bulkAttachments.length > 0 && (
                  <div className="space-y-2 mt-2 max-h-24 overflow-y-auto">
                    {bulkAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-sm truncate max-w-[180px]">{file.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(file.url, '_blank')}>
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => removeAttachment(index, true)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Selected Personnel:</p>
                <ul className="space-y-1 text-sm">
                  {selectedIds.map(uniqueId => {
                    const person = sortedInduction.find(p => p.uniqueId === uniqueId);
                    return person ? (
                      <li key={uniqueId}>• {person.full_name} ({person.employee_id || person.company_name})</li>
                    ) : null;
                  })}
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkComplete} disabled={processing} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Batch Induction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}