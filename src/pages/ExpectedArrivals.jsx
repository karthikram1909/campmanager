import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { UserCheck, Calendar as CalendarIconImport, Users, AlertCircle, CheckCircle2, Download, Printer, ArrowUpDown, Filter, X, FileText } from "lucide-react";
import { format, parseISO, isToday, isPast, isFuture, isValid } from "date-fns";
import { formatDate as formatDateDisplay, parseDate } from "@/components/utils/dateFormatter";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function ExpectedArrivals() {
  const queryClient = useQueryClient();
  const [confirmingIds, setConfirmingIds] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [actualArrivalDate, setActualArrivalDate] = useState('');
  const [actualArrivalTime, setActualArrivalTime] = useState('');
  const [selectedMealPreference, setSelectedMealPreference] = useState('');
  // New fields for biometric and personal details
  const [biometricCaptureDate, setBiometricCaptureDate] = useState('');
  const [biometricCaptureTime, setBiometricCaptureTime] = useState('');
  const [languagePreferences, setLanguagePreferences] = useState([]);
  const [whatsappMobile, setWhatsappMobile] = useState('');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+971');
  const [workExperienceUAE, setWorkExperienceUAE] = useState('0');
  const [workExperienceOther, setWorkExperienceOther] = useState('0');
  
  const [sortField, setSortField] = useState("expected_arrival_date");
  const [sortDirection, setSortDirection] = useState("asc");

  // Bulk selection state
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [bulkArrivalDate, setBulkArrivalDate] = useState('');
  const [bulkArrivalTime, setBulkArrivalTime] = useState('');

  // Excel-style column filters
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterGender, setFilterGender] = useState([]);
  const [filterTrade, setFilterTrade] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState([]);
  const [filterCamp, setFilterCamp] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterMealPreference, setFilterMealPreference] = useState([]);

  // Search states for column filters
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchGender, setSearchGender] = useState("");
  const [searchTrade, setSearchTrade] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [searchCamp, setSearchCamp] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchMealPreference, setSearchMealPreference] = useState("");

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-expected_arrival_date'),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: mealPreferences = [] } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list(),
  });

  const confirmArrivalMutation = useMutation({
    mutationFn: ({ id, ...data }) => 
      base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      // Dialogs are handled separately, so no need to close them here.
      // Selected technician and date/time are also cleared by the dialog handlers.
    },
  });



  // Safe date checking helpers
  const safeIsToday = (dateString) => {
    try {
      const date = parseDate(dateString);
      return date && isValid(date) && isToday(date);
    } catch {
      return false;
    }
  };

  const safeIsFuture = (dateString) => {
    try {
      const date = parseDate(dateString);
      return date && isValid(date) && isFuture(date);
    } catch {
      return false;
    }
  };

  const safeIsPast = (dateString) => {
    try {
      const date = parseDate(dateString);
      return date && isValid(date) && isPast(date);
    } catch {
      return false;
    }
  };

  // Filter for pending arrivals - show those picked up from airport
  const pendingArrivals = technicians.filter(t => 
    t.status === 'pending_arrival' && 
    t.pickup_status === 'picked_up'
  );

  // Apply column filters
  let filteredArrivals = pendingArrivals.filter(tech => {
    const camp = camps.find(c => c.id === tech.camp_id);
    const mealPref = mealPreferences.find(m => m.id === tech.meal_preference_id);
    
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(tech.employee_id || '-')) return false;
    if (filterFullName.length > 0 && !filterFullName.includes(tech.full_name || '-')) return false;
    if (filterNationality.length > 0 && !filterNationality.includes(tech.nationality || '-')) return false;
    if (filterGender.length > 0 && !filterGender.includes(tech.gender || '-')) return false;
    if (filterTrade.length > 0 && !filterTrade.includes(tech.trade || '-')) return false;
    if (filterDepartment.length > 0 && !filterDepartment.includes(tech.department || '-')) return false;
    if (filterCamp.length > 0 && !filterCamp.includes(camp?.name || '-')) return false;
    if (filterMealPreference.length > 0 && !filterMealPreference.includes(mealPref?.name || '-')) return false;
    if (filterStatus.length > 0) {
      const status = safeIsToday(tech.expected_arrival_date) ? 'Today' :
                     safeIsFuture(tech.expected_arrival_date) ? 'Future' :
                     safeIsPast(tech.expected_arrival_date) ? 'Overdue' : 'Unknown';
      if (!filterStatus.includes(status)) return false;
    }
    
    return true;
  });

  // Sort
  const sortedArrivals = [...filteredArrivals].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (sortField === 'expected_arrival_date' || sortField === 'passport_expiry_date' || sortField === 'health_insurance_expiry_date' || sortField === 'actual_arrival_date') {
      const aDate = parseDate(aVal);
      const bDate = parseDate(bVal);
      if (aDate && bDate) {
        aVal = aDate.getTime();
        bVal = bDate.getTime();
      } else if (aDate) { // Only one date is valid, treat the other as extremely small/large for sorting
        aVal = aDate.getTime();
        bVal = sortDirection === 'asc' ? Infinity : -Infinity;
      } else if (bDate) {
        aVal = sortDirection === 'asc' ? Infinity : -Infinity;
        bVal = bDate.getTime();
      } else { // Both are invalid or null, compare as strings
        aVal = a[sortField] || '';
        bVal = b[sortField] || '';
      }
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const arrivingToday = sortedArrivals.filter(t => safeIsToday(t.expected_arrival_date));
  const arrivingFuture = sortedArrivals.filter(t => safeIsFuture(t.expected_arrival_date));
  const overdueArrivals = sortedArrivals.filter(t => 
    safeIsPast(t.expected_arrival_date) && !safeIsToday(t.expected_arrival_date)
  );

  // Get unique values for filters
  const uniqueEmployeeIds = [...new Set(pendingArrivals.map(t => t.employee_id || '-'))].sort();
  const uniqueFullNames = [...new Set(pendingArrivals.map(t => t.full_name || '-'))].sort();
  const uniqueNationalities = [...new Set(pendingArrivals.map(t => t.nationality || '-'))].sort();
  const uniqueGenders = [...new Set(pendingArrivals.map(t => t.gender || '-'))].sort();
  const uniqueTrades = [...new Set(pendingArrivals.map(t => t.trade || '-'))].sort();
  const uniqueDepartments = [...new Set(pendingArrivals.map(t => t.department || '-'))].sort();
  const uniqueCamps = [...new Set(pendingArrivals.map(t => {
    const camp = camps.find(c => c.id === t.camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueStatuses = ['Today', 'Future', 'Overdue'];
  const uniqueMealPreferences = [...new Set(pendingArrivals.map(t => {
    const mealPref = mealPreferences.find(m => m.id === t.meal_preference_id);
    return mealPref?.name || '-';
  }))].sort();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearAllFilters = () => {
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterNationality([]);
    setFilterGender([]);
    setFilterTrade([]);
    setFilterDepartment([]);
    setFilterCamp([]);
    setFilterStatus([]);
    setFilterMealPreference([]);
  };

  const hasActiveFilters = filterEmployeeId.length > 0 || filterFullName.length > 0 ||
    filterNationality.length > 0 || filterGender.length > 0 || filterTrade.length > 0 ||
    filterDepartment.length > 0 || filterCamp.length > 0 || filterStatus.length > 0 ||
    filterMealPreference.length > 0;

  const countryPhoneRules = {
    "+971": { name: "UAE", digits: 9, pattern: /^[0-9]{9}$/ },
    "+91": { name: "India", digits: 10, pattern: /^[0-9]{10}$/ },
    "+92": { name: "Pakistan", digits: 10, pattern: /^[0-9]{10}$/ },
    "+880": { name: "Bangladesh", digits: 10, pattern: /^[0-9]{10}$/ },
    "+63": { name: "Philippines", digits: 10, pattern: /^[0-9]{10}$/ },
    "+94": { name: "Sri Lanka", digits: 9, pattern: /^[0-9]{9}$/ },
    "+977": { name: "Nepal", digits: 10, pattern: /^[0-9]{10}$/ },
  };

  const handleConfirmClick = (tech) => {
    setSelectedTechnician(tech);
    setSelectedMealPreference(tech.meal_preference_id || '');
    setLanguagePreferences(tech.language_preference ? tech.language_preference.split(',').map(l => l.trim()) : []);
    
    // Parse WhatsApp number if exists
    if (tech.whatsapp_mobile) {
      const match = tech.whatsapp_mobile.match(/^(\+\d+)(.+)$/);
      if (match) {
        setWhatsappCountryCode(match[1]);
        setWhatsappMobile(match[2].trim());
      } else {
        setWhatsappCountryCode('+971');
        setWhatsappMobile('');
      }
    } else {
      setWhatsappCountryCode('+971');
      setWhatsappMobile('');
    }
    
    setWorkExperienceUAE(tech.work_experience_uae || '0');
    setWorkExperienceOther(tech.work_experience_other || '0');
    
    try {
      const now = new Date();
      if (isValid(now)) {
        setActualArrivalDate(format(now, 'yyyy-MM-dd'));
        setActualArrivalTime(format(now, 'HH:mm'));
        setBiometricCaptureDate(format(now, 'yyyy-MM-dd'));
        setBiometricCaptureTime(format(now, 'HH:mm'));
      } else {
        setActualArrivalDate('');
        setActualArrivalTime('');
        setBiometricCaptureDate('');
        setBiometricCaptureTime('');
      }
    } catch (err) {
      console.error('Error setting current date/time:', err);
      setActualArrivalDate('');
      setActualArrivalTime('');
      setBiometricCaptureDate('');
      setBiometricCaptureTime('');
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmArrival = async () => {
    if (!selectedTechnician || !actualArrivalDate) return;

    // Validate WhatsApp number - MANDATORY
    if (!whatsappMobile || !whatsappMobile.trim()) {
      alert('WhatsApp Mobile Number is mandatory.');
      return;
    }
    const whatsappRule = countryPhoneRules[whatsappCountryCode];
    if (!whatsappRule.pattern.test(whatsappMobile)) {
      alert(`Invalid WhatsApp number for ${whatsappRule.name}. Please enter exactly ${whatsappRule.digits} digits.`);
      return;
    }

    setConfirmingIds([...confirmingIds, selectedTechnician.id]);
    try {
      const sajjaCamp = camps.find(c => c.code?.toLowerCase() === 'sajja' || c.name?.toLowerCase().includes('sajja'));
      
      const updateData = { 
        status: 'active',
        pickup_status: 'arrived_at_camp',
        actual_arrival_date: actualArrivalDate,
        actual_arrival_time: actualArrivalTime,
        meal_preference_id: selectedMealPreference || null,
        biometric_capture_date: biometricCaptureDate || null,
        biometric_capture_time: biometricCaptureTime || null,
        language_preference: languagePreferences.length > 0 ? languagePreferences.join(', ') : null,
        whatsapp_mobile: whatsappMobile ? `${whatsappCountryCode}${whatsappMobile}` : null,
        work_experience_uae: workExperienceUAE || '0',
        work_experience_other: workExperienceOther || '0',
      };

      if (sajjaCamp && selectedTechnician.camp_id === sajjaCamp.id) {
        updateData.sajja_induction_start_date = actualArrivalDate;
        updateData.induction_status = 'pre_induction';
      }

      await confirmArrivalMutation.mutateAsync({ 
        id: selectedTechnician.id,
        ...updateData
      });
    } catch (err) {
      console.error('Error confirming arrival:', err);
      alert(`Failed to confirm arrival for ${selectedTechnician.full_name}. Please try again.`);
    } finally {
      setConfirmingIds(confirmingIds.filter(id => id !== selectedTechnician.id));
      setShowConfirmDialog(false);
      setSelectedTechnician(null);
      setActualArrivalDate('');
      setActualArrivalTime('');
      setSelectedMealPreference('');
      setBiometricCaptureDate('');
      setBiometricCaptureTime('');
      setLanguagePreferences([]);
      setWhatsappMobile('');
      setWhatsappCountryCode('+971');
      setWorkExperienceUAE('0');
      setWorkExperienceOther('0');
    }
  };

  const handleSelectAll = () => {
    if (selectedTechnicians.length === sortedArrivals.length) {
      setSelectedTechnicians([]);
    } else {
      setSelectedTechnicians(sortedArrivals.map(t => t.id));
    }
  };

  const handleSelectTechnician = (techId) => {
    if (selectedTechnicians.includes(techId)) {
      setSelectedTechnicians(selectedTechnicians.filter(id => id !== techId));
    } else {
      setSelectedTechnicians([...selectedTechnicians, techId]);
    }
  };

  const handleBulkConfirmClick = () => {
    if (selectedTechnicians.length === 0) {
      alert("Please select at least one technician to confirm.");
      return;
    }

    try {
      const now = new Date();
      if (isValid(now)) {
        setBulkArrivalDate(format(now, 'yyyy-MM-dd'));
        setBulkArrivalTime(format(now, 'HH:mm'));
      } else {
        setBulkArrivalDate('');
        setBulkArrivalTime('');
      }
    } catch (err) {
      console.error('Error setting current date/time for bulk:', err);
      setBulkArrivalDate('');
      setBulkArrivalTime('');
    }
    setShowBulkConfirmDialog(true);
  };

  const handleBulkConfirmArrival = async () => {
    if (!bulkArrivalDate) {
      alert("Please enter the arrival date.");
      return;
    }

    setConfirmingIds([...selectedTechnicians]); // Mark all selected as confirming
    
    try {
      const sajjaCamp = camps.find(c => c.code?.toLowerCase() === 'sajja' || c.name?.toLowerCase().includes('sajja'));
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const updatedTechnicianIds = [];

      // Use Promise.all for parallel mutations if the backend can handle it,
      // or sequential for better error reporting per item.
      // For simplicity and detailed error feedback, we'll do sequential here.
      for (const techId of selectedTechnicians) {
        const tech = technicians.find(t => t.id === techId);
        if (!tech) {
          errorCount++;
          errors.push(`Unknown technician ID: ${techId}`);
          continue;
        }

        try {
          const updateData = { 
            status: 'active',
            pickup_status: 'arrived_at_camp',
            actual_arrival_date: bulkArrivalDate,
            actual_arrival_time: bulkArrivalTime
          };

          if (sajjaCamp && tech.camp_id === sajjaCamp.id) {
            updateData.sajja_induction_start_date = bulkArrivalDate;
            updateData.induction_status = 'pre_induction';
          }

          await confirmArrivalMutation.mutateAsync({ 
            id: techId,
            ...updateData
          });
          successCount++;
          updatedTechnicianIds.push(techId);
        } catch (err) {
          errorCount++;
          errors.push(`${tech.full_name} (${tech.employee_id}): ${err.message || 'API error'}`);
          console.error(`Failed to confirm ${tech.full_name}:`, err);
        }
      }

      if (successCount > 0) {
        alert(`Successfully confirmed ${successCount} arrival(s)${errorCount > 0 ? ` with ${errorCount} failure(s).` : '.'}`);
      } else if (errorCount > 0) {
        alert(`Failed to confirm all selected arrivals. Please check the console for details.`);
      } else {
        alert("No technicians were confirmed.");
      }

      if (errors.length > 0) {
        console.error("Bulk confirmation errors:", errors);
        // Optionally display errors in a more user-friendly way
      }

    } catch (err) {
      console.error('An unexpected error occurred during bulk confirmation:', err);
      alert('An unexpected error occurred during bulk confirmation. Please try again.');
    } finally {
      setSelectedTechnicians([]);
      setShowBulkConfirmDialog(false);
      setBulkArrivalDate('');
      setBulkArrivalTime('');
      setConfirmingIds([]); // Clear all confirming IDs
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Full Name', 'Nationality', 'Gender', 'Trade', 'Department', 'Camp', 'State', 'Marital Status', 'Language Preference', 'WhatsApp Mobile', 'Emergency Contact', 'Legal Nominee', 'Passport No', 'Passport Expiry', 'Health Insurance No', 'Health Insurance Expiry', 'Meal Preference', 'Expected Date', 'Expected Time', 'Actual Arrival Date', 'Actual Arrival Time', 'Biometric Capture Date', 'Biometric Capture Time', 'Status']; // Added biometric fields
    
    const data = sortedArrivals.map(tech => {
      const camp = camps.find(c => c.id === tech.camp_id);
      const mealPref = mealPreferences.find(m => m.id === tech.meal_preference_id);
      const status = safeIsToday(tech.expected_arrival_date) ? 'Today' :
                     safeIsFuture(tech.expected_arrival_date) ? 'Future' :
                     'Overdue';
      
      return [
        tech.employee_id,
        tech.full_name,
        tech.nationality || '-',
        tech.gender || '-',
        tech.trade || '-',
        tech.department || '-',
        camp?.name || '-',
        tech.state || '-',
        tech.marital_status || '-',
        tech.language_preference || '-',
        tech.whatsapp_mobile || '-',
        tech.emergency_contact_no || '-',
        tech.legal_nominee_name || '-',
        tech.passport_no || '-',
        formatDateDisplay(tech.passport_expiry_date),
        tech.health_insurance_no || '-',
        formatDateDisplay(tech.health_insurance_expiry_date),
        mealPref?.name || '-',
        formatDateDisplay(tech.expected_arrival_date),
        tech.expected_arrival_time || '-',
        formatDateDisplay(tech.actual_arrival_date),
        tech.actual_arrival_time || '-',
        formatDateDisplay(tech.biometric_capture_date), // Added
        tech.biometric_capture_time || '-', // Added
        status
      ];
    });

    const csv = [headers, ...data].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expected_arrivals_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

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

    const toggleAllFilterOptions = () => {
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
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={toggleAllFilterOptions}>
                <Checkbox
                  checked={selected.length === values.length && values.length > 0}
                  onCheckedChange={toggleAllFilterOptions}
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

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expected arrivals...</p>
        </div>
      </div>
    );
  }

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
            padding: 10px;
          }
          .no-print {
            display: none !important;
          }
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
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-4">
        <Alert className="border-blue-200 bg-blue-50 no-print">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Step 3 of 6: Confirm Arrivals at Camp</strong><br/>
            After airport pickup, confirm arrival at camp → Capture personal details → Set meal preference → Status changes to "Active" → Next: Smart Allocation (Camp Operations)
          </AlertDescription>
        </Alert>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expected Arrivals</h1>
            <p className="text-sm text-gray-600 mt-0.5">Confirm technician arrivals and proceed to bed allocation</p>
          </div>
          <div className="flex gap-2">
            {selectedTechnicians.length > 0 && (
              <Button 
                onClick={handleBulkConfirmClick}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
                disabled={confirmArrivalMutation.isLoading}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Confirm Selected ({selectedTechnicians.length})
              </Button>
            )}
            <Button variant="outline" onClick={exportToCSV} size="sm" className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button variant="outline" onClick={printReport} size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Printer className="w-3 h-3 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {/* Stats - More Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
          <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 mb-0.5">Arriving Today</p>
                  <p className="text-2xl font-bold text-green-900">{arrivingToday.length}</p>
                </div>
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 mb-0.5">Future Arrivals</p>
                  <p className="text-2xl font-bold text-blue-900">{arrivingFuture.length}</p>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <CalendarIconImport className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600 mb-0.5">Overdue</p>
                  <p className="text-2xl font-bold text-red-900">{overdueArrivals.length}</p>
                </div>
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-none shadow-lg" id="printable-table">
          {hasActiveFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 no-print">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-700 font-medium">
                  <Filter className="w-3 h-3 inline mr-1" />
                  Column filters active
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs h-7 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}

          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Expected Arrivals ({sortedArrivals.length})</CardTitle>
              {selectedTechnicians.length > 0 && (
                <div className="flex items-center gap-2 no-print">
                  <Badge variant="default" className="text-xs bg-blue-600">
                    {selectedTechnicians.length} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedTechnicians([])}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-3 py-3 text-center bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200 no-print w-10">
                    <Checkbox
                      checked={selectedTechnicians.length === sortedArrivals.length && sortedArrivals.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200 no-print">
                    Action
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Employee ID</span>
                      <div className="flex gap-0.5 no-print">
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Full Name</span>
                      <div className="flex gap-0.5 no-print">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('full_name')}>
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Nationality</span>
                      <div className="flex gap-0.5 no-print">
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Gender</span>
                      <div className="flex gap-0.5 no-print">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('gender')}>
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Trade</span>
                      <div className="flex gap-0.5 no-print">
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Department</span>
                      <div className="flex gap-0.5 no-print">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('department')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueDepartments}
                          selected={filterDepartment}
                          setSelected={setFilterDepartment}
                          searchValue={searchDepartment}
                          setSearchValue={setSearchDepartment}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>State</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('state')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Marital Status</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('marital_status')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Language Pref</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('language_preference')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>WhatsApp Mobile</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('whatsapp_mobile')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Emergency Contact</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('emergency_contact_no')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Legal Nominee</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('legal_nominee_name')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Passport No</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('passport_no')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Passport Expiry</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('passport_expiry_date')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Health Ins. No</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('health_insurance_no')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Health Ins. Expiry</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('health_insurance_expiry_date')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Meal Preference</span>
                      <ColumnFilter
                        values={uniqueMealPreferences}
                        selected={filterMealPreference}
                        setSelected={setFilterMealPreference}
                        searchValue={searchMealPreference}
                        setSearchValue={setSearchMealPreference}
                      />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Expected Date</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('expected_arrival_date')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    Expected Time
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Actual Arrival Date</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('actual_arrival_date')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    Actual Arrival Time
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Biometric Date</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('biometric_capture_date')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                    Biometric Time
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center justify-between gap-1">
                      <span>Status</span>
                      <ColumnFilter
                        values={uniqueStatuses}
                        selected={filterStatus}
                        setSelected={setFilterStatus}
                        searchValue={searchStatus}
                        setSearchValue={setSearchStatus}
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedArrivals.length === 0 ? (
                  <tr>
                    <td colSpan="27" className="px-6 py-12 text-center">
                      <Users className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium text-gray-500">No expected arrivals found</p>
                      <p className="text-sm text-gray-400 mt-1">Technicians picked up from airport will appear here</p>
                    </td>
                  </tr>
                ) : (
                  sortedArrivals.map((tech, index) => {
                    const camp = camps.find(c => c.id === tech.camp_id);
                    const mealPref = mealPreferences.find(m => m.id === tech.meal_preference_id);
                    const isOverdue = safeIsPast(tech.expected_arrival_date) && !safeIsToday(tech.expected_arrival_date);
                    const isToday = safeIsToday(tech.expected_arrival_date);
                    const isConfirming = confirmingIds.includes(tech.id);
                    const isSelected = selectedTechnicians.includes(tech.id);

                    return (
                      <tr
                        key={tech.id}
                        className={`border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all ${
                          isSelected ? 'bg-blue-100' :
                          isOverdue ? 'bg-red-50/50' :
                          isToday ? 'bg-green-50/50' :
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <td className="px-3 py-3 text-center border-r border-gray-200 no-print">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectTechnician(tech.id)}
                            disabled={isConfirming}
                          />
                        </td>
                        <td className="px-3 py-3 text-center border-r border-gray-200 no-print">
                          <Button
                            onClick={() => handleConfirmClick(tech)}
                            disabled={isConfirming || selectedTechnicians.length > 0}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 h-8 text-xs px-3 shadow-sm"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1.5" />
                            {isConfirming ? 'Confirming...' : 'Confirm'}
                          </Button>
                        </td>
                        <td className="px-3 py-3 border-r border-gray-200">
                          <Badge className="bg-blue-600 text-white font-mono text-xs px-2 py-1">
                            {tech.employee_id}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold border-r border-gray-200 whitespace-nowrap">
                          {tech.full_name}
                        </td>
                        <td className="px-3 py-3 border-r border-gray-200">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                            {tech.nationality || '-'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 border-r border-gray-200">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            {tech.gender || '-'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 border-r border-gray-200">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            {tech.trade || '-'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 border-r border-gray-200">
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                            {tech.department || '-'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-medium border-r border-gray-200 whitespace-nowrap">
                          {camp?.name || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.state || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.marital_status || '-'}
                        </td>
                        
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.language_preference || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.whatsapp_mobile || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.emergency_contact_no || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.legal_nominee_name || '-'}
                        </td>
                        
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.passport_no || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDateDisplay(tech.passport_expiry_date)}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.health_insurance_no || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDateDisplay(tech.health_insurance_expiry_date)}
                        </td>
                        <td className="px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                          {mealPref ? (
                            <Badge variant="outline" className={`text-xs ${mealPref.type === 'veg' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              <span className={`w-2 h-2 rounded-full mr-1.5 ${mealPref.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                              {mealPref.name}
                            </Badge>
                          ) : <span className="text-xs text-gray-400">Not set</span>}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">
                          {formatDateDisplay(tech.expected_arrival_date)}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 border-r border-gray-200 whitespace-nowrap">
                          {tech.expected_arrival_time || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200 whitespace-nowrap">
                          {formatDateDisplay(tech.actual_arrival_date)}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 border-r border-gray-200 whitespace-nowrap">
                          {tech.actual_arrival_time || '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDateDisplay(tech.biometric_capture_date)}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600 border-r border-gray-200 whitespace-nowrap">
                          {tech.biometric_capture_time || '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Badge className={`text-xs px-2 py-1 shadow-sm ${
                            isOverdue ? 'bg-red-600 text-white' :
                            isToday ? 'bg-green-600 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            {isOverdue ? 'Overdue' : isToday ? 'Today' : 'Future'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 no-print">
            <p className="text-xs text-gray-600">
              Showing <span className="font-semibold">{sortedArrivals.length}</span> of <span className="font-semibold">{pendingArrivals.length}</span> expected arrivals
            </p>
          </div>
        </Card>
      </div>

      {/* Confirm Arrival Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Confirm Arrival
            </DialogTitle>
          </DialogHeader>
          
          {selectedTechnician && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900">{selectedTechnician.full_name}</p>
                <p className="text-sm text-gray-600">{selectedTechnician.employee_id}</p>
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">Expected: </span>
                  <span className="font-medium">
                    {formatDateDisplay(selectedTechnician.expected_arrival_date)}
                    {selectedTechnician.expected_arrival_time && ` at ${selectedTechnician.expected_arrival_time}`}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Actual Arrival Date* (Auto-generated)</Label>
                  <Input
                    value={actualArrivalDate ? format(parseISO(actualArrivalDate), 'dd/MMM/yyyy') : ''}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actual_time">Actual Arrival Time (Auto-generated)</Label>
                  <Input
                    id="actual_time"
                    type="text"
                    value={actualArrivalTime}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Biometric Details
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Biometric Capture Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIconImport className="mr-2 h-4 w-4" />
                          {biometricCaptureDate ? format(parseISO(biometricCaptureDate), 'dd/MMM/yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={biometricCaptureDate ? parseISO(biometricCaptureDate) : undefined}
                          onSelect={(date) => setBiometricCaptureDate(date ? format(date, 'yyyy-MM-dd') : '')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="biometric_time">Biometric Capture Time</Label>
                    <Input
                      id="biometric_time"
                      type="time"
                      value={biometricCaptureTime}
                      onChange={(e) => setBiometricCaptureTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Personal Details
                </h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language_pref">Language Preference (Multi-Select)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {languagePreferences.length > 0 
                            ? `${languagePreferences.length} language(s) selected: ${languagePreferences.join(', ')}`
                            : 'Select languages'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="max-h-64 overflow-y-auto p-2">
                          {['Hindi', 'English', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Odia', 'Assamese', 'Nepali', 'Arabic', 'Tagalog', 'Other'].map(lang => (
                            <div
                              key={lang}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              onClick={() => {
                                if (languagePreferences.includes(lang)) {
                                  setLanguagePreferences(languagePreferences.filter(l => l !== lang));
                                } else {
                                  setLanguagePreferences([...languagePreferences, lang]);
                                }
                              }}
                            >
                              <Checkbox
                                checked={languagePreferences.includes(lang)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setLanguagePreferences([...languagePreferences, lang]);
                                  } else {
                                    setLanguagePreferences(languagePreferences.filter(l => l !== lang));
                                  }
                                }}
                              />
                              <label className="text-sm cursor-pointer flex-1">
                                {lang}
                              </label>
                            </div>
                          ))}
                        </div>
                        {languagePreferences.length > 0 && (
                          <div className="p-2 border-t bg-gray-50">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => setLanguagePreferences([])}
                            >
                              Clear All ({languagePreferences.length})
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp Mobile Number*</Label>
                    <div className="flex gap-2">
                      <Select value={whatsappCountryCode} onValueChange={setWhatsappCountryCode}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+971">🇦🇪 +971</SelectItem>
                          <SelectItem value="+91">🇮🇳 +91</SelectItem>
                          <SelectItem value="+92">🇵🇰 +92</SelectItem>
                          <SelectItem value="+880">🇧🇩 +880</SelectItem>
                          <SelectItem value="+63">🇵🇭 +63</SelectItem>
                          <SelectItem value="+94">🇱🇰 +94</SelectItem>
                          <SelectItem value="+977">🇳🇵 +977</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="whatsapp"
                        type="tel"
                        placeholder={`Enter ${countryPhoneRules[whatsappCountryCode]?.digits} digits`}
                        value={whatsappMobile}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setWhatsappMobile(value);
                        }}
                        maxLength={countryPhoneRules[whatsappCountryCode]?.digits}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Enter exactly {countryPhoneRules[whatsappCountryCode]?.digits} digits for {countryPhoneRules[whatsappCountryCode]?.name}
                    </p>
                  </div>

                  {/* Display Emergency Contact & Legal Nominee (Read-only from Onboarding) */}
                  {(selectedTechnician.emergency_contact_no || selectedTechnician.legal_nominee_name) && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact & Legal Nominee (From Onboarding)</h4>
                      <div className="space-y-2 text-sm">
                        {selectedTechnician.emergency_contact_no && (
                          <div className="flex justify-between items-center py-1 border-b border-gray-200">
                            <span className="text-gray-600">Emergency Contact:</span>
                            <span className="font-medium text-gray-900">
                              {selectedTechnician.emergency_contact_no}
                              {selectedTechnician.emergency_contact_no_relationship && (
                                <span className="text-xs text-gray-500 ml-2">({selectedTechnician.emergency_contact_no_relationship})</span>
                              )}
                            </span>
                          </div>
                        )}
                        {selectedTechnician.emergency_contact_no_2 && (
                          <div className="flex justify-between items-center py-1 border-b border-gray-200">
                            <span className="text-gray-600">Emergency Contact 2:</span>
                            <span className="font-medium text-gray-900">
                              {selectedTechnician.emergency_contact_no_2}
                              {selectedTechnician.emergency_contact_no_2_relationship && (
                                <span className="text-xs text-gray-500 ml-2">({selectedTechnician.emergency_contact_no_2_relationship})</span>
                              )}
                            </span>
                          </div>
                        )}
                        {selectedTechnician.legal_nominee_name && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-600">Legal Nominee:</span>
                            <span className="font-medium text-gray-900">
                              {selectedTechnician.legal_nominee_name}
                              {selectedTechnician.nominee_relationship && (
                                <span className="text-xs text-gray-500 ml-2">({selectedTechnician.nominee_relationship})</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-3 italic">These details were captured during onboarding and are read-only here.</p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="exp_uae">Work Experience in UAE (Years)</Label>
                      <Select value={workExperienceUAE} onValueChange={setWorkExperienceUAE}>
                        <SelectTrigger id="exp_uae">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 21 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>{i} {i === 1 ? 'year' : 'years'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exp_other">Work Experience in Other Country (Years)</Label>
                      <Select value={workExperienceOther} onValueChange={setWorkExperienceOther}>
                        <SelectTrigger id="exp_other">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 21 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>{i} {i === 1 ? 'year' : 'years'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meal_preference">Meal Preference</Label>
                <Select
                  value={selectedMealPreference}
                  onValueChange={setSelectedMealPreference}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {mealPreferences
                      .filter(mp => mp.is_active !== false)
                      .map(mp => (
                          <SelectItem key={mp.id} value={mp.id}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${mp.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                              {mp.name}
                            </div>
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { 
                setShowConfirmDialog(false); 
                setSelectedTechnician(null); 
                setActualArrivalDate(''); 
                setActualArrivalTime(''); 
                setSelectedMealPreference('');
                setBiometricCaptureDate('');
                setBiometricCaptureTime('');
                setLanguagePreferences([]);
                setWhatsappMobile('');
                setWhatsappCountryCode('+971');
                setWorkExperienceUAE('0');
                setWorkExperienceOther('0');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmArrival}
              disabled={!actualArrivalDate || !whatsappMobile || confirmArrivalMutation.isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {confirmArrivalMutation.isLoading ? 'Confirming...' : 'Confirm Arrival'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Confirm Arrival Dialog */}
      <Dialog open={showBulkConfirmDialog} onOpenChange={setShowBulkConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Bulk Confirm Arrivals ({selectedTechnicians.length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">Selected Technicians:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedTechnicians.map(techId => {
                  const tech = technicians.find(t => t.id === techId);
                  if (!tech) return null;
                  return (
                    <div key={techId} className="text-sm text-gray-700">
                      • {tech.full_name} ({tech.employee_id})
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk_actual_date">Actual Arrival Date*</Label>
                <Input
                  id="bulk_actual_date"
                  type="date"
                  required
                  value={bulkArrivalDate}
                  onChange={(e) => setBulkArrivalDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk_actual_time">Actual Arrival Time</Label>
                <Input
                  id="bulk_actual_time"
                  type="time"
                  value={bulkArrivalTime}
                  onChange={(e) => setBulkArrivalTime(e.target.value)}
                />
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                This will confirm the arrival of all {selectedTechnicians.length} selected technician(s) with the same date and time.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowBulkConfirmDialog(false); setBulkArrivalDate(''); setBulkArrivalTime(''); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkConfirmArrival}
              disabled={!bulkArrivalDate || confirmArrivalMutation.isLoading} // Check if any mutation is in progress
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {confirmArrivalMutation.isLoading ? 'Confirming...' : `Confirm ${selectedTechnicians.length} Arrival(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}