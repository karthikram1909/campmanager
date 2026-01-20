import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Utensils, Plus, CheckCircle2, AlertCircle, Search, Download, Filter, X, ArrowUpDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";

export default function MealPreferenceChanges() {
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [personnelType, setPersonnelType] = useState('technician');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState("");
  const [newMealPreferenceId, setNewMealPreferenceId] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [oldCouponsCollected, setOldCouponsCollected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mealPrefSearchTerm, setMealPrefSearchTerm] = useState("");
  const [personnelPopoverOpen, setPersonnelPopoverOpen] = useState(false);
  const [mealPrefPopoverOpen, setMealPrefPopoverOpen] = useState(false);

  // Table filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("approval_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Excel-style column filters
  const [filterDate, setFilterDate] = useState([]);
  const [filterPerson, setFilterPerson] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterCamp, setFilterCamp] = useState([]);
  const [filterPreviousPref, setFilterPreviousPref] = useState([]);
  const [filterNewPref, setFilterNewPref] = useState([]);
  const [filterReason, setFilterReason] = useState([]);
  const [filterChangedBy, setFilterChangedBy] = useState([]);

  // Search states for column filters
  const [searchDate, setSearchDate] = useState("");
  const [searchPerson, setSearchPerson] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchCamp, setSearchCamp] = useState("");
  const [searchPreviousPref, setSearchPreviousPref] = useState("");
  const [searchNewPref, setSearchNewPref] = useState("");
  const [searchReason, setSearchReason] = useState("");
  const [searchChangedBy, setSearchChangedBy] = useState("");

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: externalPersonnel = [] } = useQuery({
    queryKey: ['external-personnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list(),
  });

  const { data: mealPreferences = [] } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list(),
  });

  const { data: changeRequests = [] } = useQuery({
    queryKey: ['meal-preference-change-requests'],
    queryFn: () => base44.entities.MealPreferenceChangeRequest.list('-approval_date'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.MealPreferenceChangeRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-preference-change-requests'] });
    },
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
      queryClient.invalidateQueries({ queryKey: ['external-personnel'] });
    },
  });

  // Get selected person
  const selectedPerson = personnelType === 'technician'
    ? technicians.find(t => t.id === selectedPersonnelId)
    : externalPersonnel.find(e => e.id === selectedPersonnelId);

  const currentMealPreference = selectedPerson 
    ? mealPreferences.find(mp => mp.id === selectedPerson.meal_preference_id)
    : null;

  // Filter personnel list based on search
  const filteredTechnicians = technicians.filter(t => 
    t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExternal = externalPersonnel.filter(e =>
    e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter meal preferences based on search
  const filteredMealPreferences = mealPreferences.filter(mp =>
    mp.is_active && (
      mp.name?.toLowerCase().includes(mealPrefSearchTerm.toLowerCase()) ||
      mp.type?.toLowerCase().includes(mealPrefSearchTerm.toLowerCase()) ||
      mp.cuisine?.toLowerCase().includes(mealPrefSearchTerm.toLowerCase())
    )
  );

  const handleSaveAndApprove = async () => {
    if (!selectedPersonnelId) {
      alert("Please select a technician or external personnel");
      return;
    }

    if (!newMealPreferenceId) {
      alert("Please select a new meal preference");
      return;
    }

    if (!changeReason.trim()) {
      alert("Please provide a reason for the change");
      return;
    }

    if (!oldCouponsCollected) {
      alert("⚠️ Please confirm that old meal coupons have been collected");
      return;
    }

    if (newMealPreferenceId === selectedPerson?.meal_preference_id) {
      alert("Selected preference is the same as current preference");
      return;
    }

    const newPref = mealPreferences.find(mp => mp.id === newMealPreferenceId);
    const confirmChange = window.confirm(
      `Change meal preference for ${selectedPerson?.full_name}?\n\nFrom: ${currentMealPreference?.name || 'Not Set'}\nTo: ${newPref?.name}\n\nThis will update immediately and issue new coupons.`
    );

    if (!confirmChange) return;

    setProcessing(true);

    try {
      // 1. Create the change request record (for audit trail) with approved status
      const requestData = {
        [personnelType === 'technician' ? 'technician_id' : 'external_personnel_id']: selectedPersonnelId,
        current_meal_preference_id: selectedPerson.meal_preference_id || null,
        requested_meal_preference_id: newMealPreferenceId,
        request_date: new Date().toISOString().split('T')[0],
        reason: changeReason,
        status: 'approved',
        approved_by_id: currentUser?.id,
        approval_date: new Date().toISOString().split('T')[0]
      };

      await createRequestMutation.mutateAsync(requestData);

      // 2. Update the person's meal preference immediately
      if (personnelType === 'technician') {
        await updateTechnicianMutation.mutateAsync({
          id: selectedPersonnelId,
          data: { meal_preference_id: newMealPreferenceId }
        });
      } else {
        await updateExternalMutation.mutateAsync({
          id: selectedPersonnelId,
          data: { meal_preference_id: newMealPreferenceId }
        });
      }

      alert(`✅ Meal preference updated successfully!\n\n${selectedPerson?.full_name} can now collect new coupons for ${newPref?.name}`);
      
      // Reset form
      setShowRecordDialog(false);
      setSelectedPersonnelId("");
      setNewMealPreferenceId("");
      setChangeReason("");
      setOldCouponsCollected(false);
      setSearchTerm("");
      setMealPrefSearchTerm("");
    } catch (error) {
      alert(`Failed to update meal preference: ${error.message}`);
    }

    setProcessing(false);
  };

  const getMealPreferenceDetails = (prefId) => {
    const pref = mealPreferences.find(mp => mp.id === prefId);
    if (!pref) return null;
    return pref;
  };

  // Get recent approved changes
  const recentChanges = changeRequests.filter(req => req.status === 'approved');

  // Enrich changes with full details
  const enrichedChanges = recentChanges.map(request => {
    const person = request.technician_id
      ? technicians.find(t => t.id === request.technician_id)
      : externalPersonnel.find(e => e.id === request.external_personnel_id);
    
    const personType = request.technician_id ? 'Technician' : 'External';
    const camp = camps.find(c => c.id === person?.camp_id);
    const approver = users.find(u => u.id === request.approved_by_id);
    const currentPref = getMealPreferenceDetails(request.current_meal_preference_id);
    const newPref = getMealPreferenceDetails(request.requested_meal_preference_id);

    return {
      ...request,
      person,
      personType,
      camp,
      approver,
      currentPref,
      newPref
    };
  });

  // Apply global search filter
  let filteredChanges = enrichedChanges;

  if (searchQuery.trim()) {
    const searchLower = searchQuery.toLowerCase();
    filteredChanges = filteredChanges.filter(change =>
      change.person?.full_name?.toLowerCase().includes(searchLower) ||
      change.person?.employee_id?.toLowerCase().includes(searchLower) ||
      change.person?.company_name?.toLowerCase().includes(searchLower) ||
      change.camp?.name?.toLowerCase().includes(searchLower) ||
      change.currentPref?.name?.toLowerCase().includes(searchLower) ||
      change.newPref?.name?.toLowerCase().includes(searchLower) ||
      change.reason?.toLowerCase().includes(searchLower) ||
      change.approver?.full_name?.toLowerCase().includes(searchLower)
    );
  }

  // Apply Excel-style column filters
  filteredChanges = filteredChanges.filter(change => {
    const dateStr = change.approval_date ? format(parseISO(change.approval_date), 'dd/MM/yyyy') : '-';
    const personName = change.person?.full_name || 'Unknown';
    const type = change.personType || '-';
    const employeeId = change.person?.employee_id || change.person?.company_name || '-';
    const campName = change.camp?.name || '-';
    const previousPref = change.currentPref?.name || 'Not Set';
    const newPrefName = change.newPref?.name || '-';
    const reason = change.reason || '-';
    const changedBy = change.approver?.full_name || '-';

    if (filterDate.length > 0 && !filterDate.includes(dateStr)) return false;
    if (filterPerson.length > 0 && !filterPerson.includes(personName)) return false;
    if (filterType.length > 0 && !filterType.includes(type)) return false;
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(employeeId)) return false;
    if (filterCamp.length > 0 && !filterCamp.includes(campName)) return false;
    if (filterPreviousPref.length > 0 && !filterPreviousPref.includes(previousPref)) return false;
    if (filterNewPref.length > 0 && !filterNewPref.includes(newPrefName)) return false;
    if (filterReason.length > 0 && !filterReason.includes(reason)) return false;
    if (filterChangedBy.length > 0 && !filterChangedBy.includes(changedBy)) return false;

    return true;
  });

  // Get unique values for each column (for filter options)
  const uniqueDates = [...new Set(enrichedChanges.map(c => c.approval_date ? format(parseISO(c.approval_date), 'dd/MM/yyyy') : '-'))].sort().reverse();
  const uniquePersons = [...new Set(enrichedChanges.map(c => c.person?.full_name || 'Unknown'))].sort();
  const uniqueTypes = ['Technician', 'External'];
  const uniqueEmployeeIds = [...new Set(enrichedChanges.map(c => c.person?.employee_id || c.person?.company_name || '-'))].sort();
  const uniqueCamps = [...new Set(enrichedChanges.map(c => c.camp?.name || '-'))].sort();
  const uniquePreviousPrefs = [...new Set(enrichedChanges.map(c => c.currentPref?.name || 'Not Set'))].sort();
  const uniqueNewPrefs = [...new Set(enrichedChanges.map(c => c.newPref?.name || '-'))].sort();
  const uniqueReasons = [...new Set(enrichedChanges.map(c => c.reason || '-'))].sort();
  const uniqueChangedBy = [...new Set(enrichedChanges.map(c => c.approver?.full_name || '-'))].sort();

  // Sort filtered changes
  const sortedChanges = [...filteredChanges].sort((a, b) => {
    let aVal, bVal;

    switch (sortField) {
      case 'approval_date':
        aVal = a.approval_date ? new Date(a.approval_date).getTime() : 0;
        bVal = b.approval_date ? new Date(b.approval_date).getTime() : 0;
        break;
      case 'person':
        aVal = a.person?.full_name || '';
        bVal = b.person?.full_name || '';
        break;
      case 'camp':
        aVal = a.camp?.name || '';
        bVal = b.camp?.name || '';
        break;
      case 'currentPref':
        aVal = a.currentPref?.name || '';
        bVal = b.currentPref?.name || '';
        break;
      case 'newPref':
        aVal = a.newPref?.name || '';
        bVal = b.newPref?.name || '';
        break;
      case 'changedBy':
        aVal = a.approver?.full_name || '';
        bVal = b.approver?.full_name || '';
        break;
      default:
        aVal = a[sortField] || '';
        bVal = b[sortField] || '';
    }

    if (sortDirection === 'asc') {
      return String(aVal).localeCompare(String(bVal));
    } else {
      return String(bVal).localeCompare(String(aVal));
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

  const clearAllColumnFilters = () => {
    setFilterDate([]);
    setFilterPerson([]);
    setFilterType([]);
    setFilterEmployeeId([]);
    setFilterCamp([]);
    setFilterPreviousPref([]);
    setFilterNewPref([]);
    setFilterReason([]);
    setFilterChangedBy([]);
    setSearchQuery(""); // Clear global search as well
  };

  const hasActiveColumnFilters = 
    filterDate.length > 0 || filterPerson.length > 0 || filterType.length > 0 ||
    filterEmployeeId.length > 0 || filterCamp.length > 0 || filterPreviousPref.length > 0 ||
    filterNewPref.length > 0 || filterReason.length > 0 || filterChangedBy.length > 0 ||
    searchQuery.trim() !== "";

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

  const exportToCSV = () => {
    const headers = ['Date', 'Person', 'Type', 'Employee ID', 'Camp', 'Previous Preference', 'New Preference', 'Reason', 'Changed By'];
    
    const rows = sortedChanges.map(change => [
      change.approval_date ? format(parseISO(change.approval_date), 'dd/MM/yyyy') : '-',
      change.person?.full_name || 'Unknown',
      change.personType || '-',
      change.person?.employee_id || change.person?.company_name || '-',
      change.camp?.name || '-',
      change.currentPref?.name || 'Not Set',
      change.newPref?.name || '-',
      change.reason || '-',
      change.approver?.full_name || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meal_preference_changes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ backgroundColor: '#F8F9FD' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF8A00' }}>
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#333333' }}>Meal Preference Changes</h1>
                <p style={{ color: '#6C717C' }}>Record and manage meal preference changes for your camp</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowRecordDialog(true)}
              className="hover:opacity-90"
              style={{ backgroundColor: '#FF8A00', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Record New Change
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Camp Operations: Meal Preference Changes</strong><br/>
            Technician requests change → Collect old meal coupons → Record in system → Issue new coupons immediately → Maintain audit trail of all changes
          </AlertDescription>
        </Alert>

        {/* Summary Card */}
        <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Changes (All Time)</p>
                <p className="text-3xl font-bold" style={{ color: '#333333' }}>{enrichedChanges.length}</p>
              </div>
              <div className="flex gap-3">
                {sortedChanges.length > 0 && (
                  <Button onClick={exportToCSV} variant="outline" className="hover:opacity-80" style={{ borderColor: '#FF8A00', color: '#FF8A00' }}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, ID, camp, or meal preference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Changes Table */}
        <Card className="border-none shadow-lg">
          {hasActiveColumnFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Filters active
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllColumnFilters}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}

          <CardHeader className="rounded-t-xl border-b" style={{ backgroundColor: '#072C77', borderColor: '#E5E7ED', height: '48px', display: 'flex', alignItems: 'center' }}>
            <CardTitle className="text-sm font-semibold text-white">Recent Changes ({sortedChanges.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sortedChanges.length === 0 ? (
              <div className="text-center py-12">
                <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-500">
                  {hasActiveColumnFilters ? 'No changes match your filters' : 'No meal preference changes recorded yet'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {hasActiveColumnFilters 
                    ? 'Try adjusting your search or filters'
                    : 'Changes will appear here as personnel update their meal preferences'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 min-w-[120px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>Date</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('approval_date')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueDates}
                              selected={filterDate}
                              setSelected={setFilterDate}
                              searchValue={searchDate}
                              setSearchValue={setSearchDate}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 min-w-[150px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>Person</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('person')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniquePersons}
                              selected={filterPerson}
                              setSelected={setFilterPerson}
                              searchValue={searchPerson}
                              setSearchValue={setSearchPerson}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 min-w-[100px]">
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 min-w-[130px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>ID/Company</span>
                          <ColumnFilter
                            values={uniqueEmployeeIds}
                            selected={filterEmployeeId}
                            setSelected={setFilterEmployeeId}
                            searchValue={searchEmployeeId}
                            setSearchValue={setSearchEmployeeId}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 min-w-[120px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>Camp</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('camp')}>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 min-w-[180px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>Previous Preference</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('currentPref')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniquePreviousPrefs}
                              selected={filterPreviousPref}
                              setSelected={setFilterPreviousPref}
                              searchValue={searchPreviousPref}
                              setSearchValue={setSearchPreviousPref}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 min-w-[180px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>New Preference</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('newPref')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueNewPrefs}
                              selected={filterNewPref}
                              setSelected={setFilterNewPref}
                              searchValue={searchNewPref}
                              setSearchValue={setSearchNewPref}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 min-w-[150px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>Reason</span>
                          <ColumnFilter
                            values={uniqueReasons}
                            selected={filterReason}
                            setSelected={setFilterReason}
                            searchValue={searchReason}
                            setSearchValue={setSearchReason}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 min-w-[130px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>Changed By</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('changedBy')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueChangedBy}
                              selected={filterChangedBy}
                              setSelected={setFilterChangedBy}
                              searchValue={searchChangedBy}
                              setSearchValue={setSearchChangedBy}
                            />
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedChanges.map((change, index) => (
                      <tr key={change.id} className={`border-b border-gray-200 hover:bg-orange-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <span className="font-medium text-gray-900">
                            {change.approval_date ? format(parseISO(change.approval_date), 'dd/MM/yyyy') : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <p className="font-semibold text-gray-900">{change.person?.full_name || 'Unknown'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge variant={change.personType === 'Technician' ? 'default' : 'secondary'}>
                            {change.personType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {change.person?.employee_id || change.person?.company_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge variant="outline">{change.camp?.name || '-'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200">
                          {change.currentPref ? (
                            <div>
                              <p className="font-medium text-gray-900">{change.currentPref.name}</p>
                              <div className="flex gap-1 mt-1">
                                <Badge className={change.currentPref.type === 'veg' ? 'bg-green-600 text-xs' : 'bg-red-600 text-xs'}>
                                  {change.currentPref.type === 'veg' ? 'Veg' : 'Non-Veg'}
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">Not Set</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200">
                          {change.newPref && (
                            <div>
                              <p className="font-medium text-green-900">{change.newPref.name}</p>
                              <div className="flex gap-1 mt-1">
                                <Badge className={change.newPref.type === 'veg' ? 'bg-green-600 text-xs' : 'bg-red-600 text-xs'}>
                                  {change.newPref.type === 'veg' ? 'Veg' : 'Non-Veg'}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {change.reason || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {change.approver?.full_name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedChanges.length}</span> of <span className="font-semibold">{enrichedChanges.length}</span> changes
            </p>
          </div>
        </Card>
      </div>

      {/* Record Change Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-orange-600" />
              Record Meal Preference Change
            </DialogTitle>
          </DialogHeader>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> This will immediately update the person's meal preference and create an audit record. 
              Ensure old coupons are collected before proceeding.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Personnel Type*</Label>
              <Select value={personnelType} onValueChange={(value) => {
                setPersonnelType(value);
                setSelectedPersonnelId("");
                setSearchTerm("");
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="external">External Personnel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select {personnelType === 'technician' ? 'Technician' : 'External Personnel'}*</Label>
              <Popover open={personnelPopoverOpen} onOpenChange={setPersonnelPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-12"
                  >
                    {selectedPersonnelId 
                      ? (selectedPerson?.full_name + ' (' + (selectedPerson?.employee_id || selectedPerson?.company_name) + ')')
                      : "Search and select person..."}
                    <Search className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder={`Search ${personnelType}...`}
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandEmpty>No {personnelType} found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {personnelType === 'technician' ? (
                        filteredTechnicians.map(tech => (
                          <CommandItem
                            key={tech.id}
                            value={tech.full_name}
                            onSelect={() => {
                              setSelectedPersonnelId(tech.id);
                              setPersonnelPopoverOpen(false);
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${
                                selectedPersonnelId === tech.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{tech.full_name}</span>
                              <span className="text-xs text-gray-500">{tech.employee_id} • {tech.nationality}</span>
                            </div>
                          </CommandItem>
                        ))
                      ) : (
                        filteredExternal.map(ext => (
                          <CommandItem
                            key={ext.id}
                            value={ext.full_name}
                            onSelect={() => {
                              setSelectedPersonnelId(ext.id);
                              setPersonnelPopoverOpen(false);
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${
                                selectedPersonnelId === ext.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{ext.full_name}</span>
                              <span className="text-xs text-gray-500">{ext.company_name} • {ext.nationality}</span>
                            </div>
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedPerson && (
              <div className="space-y-2">
                <Label>Current Meal Preference</Label>
                <div className="p-3 bg-gray-100 rounded-lg border">
                  {currentMealPreference ? (
                    <>
                      <p className="font-medium text-gray-900">{currentMealPreference.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className={currentMealPreference.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}>
                          {currentMealPreference.type === 'veg' ? '🥗 Vegetarian' : '🍗 Non-Vegetarian'}
                        </Badge>
                        <Badge variant="outline">
                          {currentMealPreference.cuisine.replace('_', ' ')}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500 italic">No meal preference set</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>New Meal Preference*</Label>
              <Popover open={mealPrefPopoverOpen} onOpenChange={setMealPrefPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-12"
                  >
                    {newMealPreferenceId 
                      ? mealPreferences.find(mp => mp.id === newMealPreferenceId)?.name
                      : "Search and select meal preference..."}
                    <Search className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search meal preferences..."
                      value={mealPrefSearchTerm}
                      onValueChange={setMealPrefSearchTerm}
                    />
                    <CommandEmpty>No meal preference found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {filteredMealPreferences.map(pref => (
                        <CommandItem
                          key={pref.id}
                          value={pref.name}
                          onSelect={() => {
                            setNewMealPreferenceId(pref.id);
                            setMealPrefPopoverOpen(false);
                          }}
                        >
                          <CheckCircle2
                            className={`mr-2 h-4 w-4 ${
                              newMealPreferenceId === pref.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col flex-1">
                            <span className="font-medium">{pref.name}</span>
                            <div className="flex gap-1 mt-1">
                              <Badge className={pref.type === 'veg' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'} variant="secondary">
                                {pref.type === 'veg' ? 'Veg' : 'Non-Veg'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {pref.cuisine.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Reason for Change*</Label>
              <Textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g., Dietary preference changed, Health reasons, etc."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
              <input
                type="checkbox"
                id="old-coupons"
                checked={oldCouponsCollected}
                onChange={(e) => setOldCouponsCollected(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="old-coupons" className="text-sm font-medium text-orange-900 cursor-pointer">
                ✓ I confirm that old meal coupons have been collected from this person
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRecordDialog(false);
                setSelectedPersonnelId("");
                setNewMealPreferenceId("");
                setChangeReason("");
                setOldCouponsCollected(false);
                setSearchTerm("");
                setMealPrefSearchTerm("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAndApprove}
              disabled={processing || !selectedPersonnelId || !newMealPreferenceId || !changeReason.trim() || !oldCouponsCollected}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {processing ? 'Processing...' : 'Save & Update Preference'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}