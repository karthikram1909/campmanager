import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, Building2, AlertCircle, FileWarning, Bed, Briefcase, AlertTriangle, Filter, X, ArrowUpDown, ChevronDown, ChevronUp, Download, Calendar, UserPlus, UserX, UserCheck, Bell, Inbox, Plane, Clock, FileText } from "lucide-react";
import { differenceInDays, parseISO, format, isValid, differenceInHours } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  // State for overdue camp induction table
  const [showInductionTable, setShowInductionTable] = useState(false);
  const [inductionSortField, setInductionSortField] = useState("full_name");
  const [inductionSortDirection, setInductionSortDirection] = useState("asc");
  
  // Column filters for induction table
  const [filterInductionName, setFilterInductionName] = useState([]);
  const [filterInductionType, setFilterInductionType] = useState([]);
  const [filterInductionCamp, setFilterInductionCamp] = useState([]);
  const [filterInductionHoursOverdue, setFilterInductionHoursOverdue] = useState([]);
  
  // Search states for column filters
  const [searchInductionName, setSearchInductionName] = useState("");
  const [searchInductionType, setSearchInductionType] = useState("");
  const [searchInductionCamp, setSearchInductionCamp] = useState("");
  const [searchInductionHoursOverdue, setSearchInductionHoursOverdue] = useState("");

  const { data: technicians = [], isLoading: loadingTechnicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: externalPersonnel = [], isLoading: loadingExternal } = useQuery({
    queryKey: ['external-personnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: camps = [], isLoading: loadingCamps } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => base44.entities.Floor.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: beds = [], isLoading: loadingBeds } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['technician-documents'],
    queryFn: () => base44.entities.TechnicianDocument.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: campDocuments = [] } = useQuery({
    queryKey: ['camp-documents'],
    queryFn: () => base44.entities.CampDocument.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => base44.entities.LeaveRequest.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: disciplinary = [] } = useQuery({
    queryKey: ['disciplinary'],
    queryFn: () => base44.entities.DisciplinaryAction.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: visitors = [] } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => base44.entities.Visitor.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: transferRequests = [] } = useQuery({
    queryKey: ['transfer-requests'],
    queryFn: () => base44.entities.TransferRequest.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => base44.entities.LeaveRequest.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Safe date parsing helper
  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return isValid(date) ? date : null;
    } catch (err) {
      return null;
    }
  };

  // Safe date formatting helper
  const safeFormatDate = (dateString, formatString = 'MMM dd, yyyy') => {
    if (!dateString) return '-';
    const date = safeParseDate(dateString);
    if (!date) return '-';
    try {
      return format(date, formatString);
    } catch (err) {
      return '-';
    }
  };

  // Safe days difference calculator
  const safeDaysDifference = (dateString) => {
    const date = safeParseDate(dateString);
    if (!date) return null;
    try {
      return differenceInDays(date, new Date());
    } catch (err) {
      return null;
    }
  };

  // Calculate metrics
  const activeTechnicians = technicians.filter(t => t.status === 'active').length;
  const onLeave = technicians.filter(t => t.status === 'on_leave').length;
  const pendingArrival = technicians.filter(t => t.status === 'pending_arrival').length;
  const pendingExit = technicians.filter(t => t.status === 'pending_exit').length;
  const exitedCountry = technicians.filter(t => t.status === 'exited_country').length;

  // Count technicians with actual inactive statuses
  const inactiveTechnicians = technicians.filter(t => 
    ['exited_country', 'suspended', 'absconded', 'transferred'].includes(t.status)
  ).length;

  // Separate count for disciplinary records (for reference, not for tiles)
  const resignedTechnicians = disciplinary.filter(d => d.action_type === 'resignation').length;
  const terminatedTechnicians = disciplinary.filter(d => d.action_type === 'termination').length;
  const activeExternal = externalPersonnel.filter(e => e.status === 'active').length;
  const activeCamps = camps.filter(c => c.status === 'active').length;
  
  // Use ACTUAL BED COUNT based on assignments, not bed status
  const totalPhysicalBeds = beds.length;

  // Count beds by actual assignments - including pending_exit (still occupying beds)
  const activeTechnicianBeds = technicians.filter(t => t.bed_id && t.status === 'active').length;
  const onLeaveTechnicianBeds = technicians.filter(t => t.bed_id && t.status === 'on_leave').length;
  const pendingExitBeds = technicians.filter(t => t.bed_id && t.status === 'pending_exit').length;
  const externalBeds = externalPersonnel.filter(e => e.bed_id && e.status === 'active').length;

  // Total occupied beds = all personnel with bed_id assignments (including pending_exit)
  const occupiedBeds = activeTechnicianBeds + onLeaveTechnicianBeds + pendingExitBeds + externalBeds;
  const occupancyRate = totalPhysicalBeds > 0 ? ((occupiedBeds / totalPhysicalBeds) * 100).toFixed(1) : 0;
  
  const checkedInVisitors = visitors.filter(v => v.status === 'checked_in').length;

  // Document expiry alerts - with safe date handling
  const expiringDocs = [...documents, ...campDocuments].filter(doc => {
    if (!doc.expiry_date) return false;
    const daysUntilExpiry = safeDaysDifference(doc.expiry_date);
    if (daysUntilExpiry === null) return false;
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  });

  const expiredDocs = [...documents, ...campDocuments].filter(doc => {
    if (!doc.expiry_date) return false;
    const daysUntilExpiry = safeDaysDifference(doc.expiry_date);
    if (daysUntilExpiry === null) return false;
    return daysUntilExpiry < 0;
  });

  // Visa renewal alerts - separate tracking for visas expiring in next 60 days
  const visaRenewalAlerts = documents.filter(doc => {
    if (doc.document_type !== 'visa' || !doc.expiry_date) return false;
    const daysUntilExpiry = safeDaysDifference(doc.expiry_date);
    if (daysUntilExpiry === null) return false;
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 60; // 60 days warning for visa renewal
  });

  // Overdue exits - pending_exit technicians past their expected_country_exit_date
  const overdueExits = technicians.filter(tech => {
    if (tech.status !== 'pending_exit' || !tech.expected_country_exit_date) return false;
    const daysUntilExit = safeDaysDifference(tech.expected_country_exit_date);
    if (daysUntilExit === null) return false;
    return daysUntilExit < 0; // Past the expected date
  });

  // Upcoming exits - within 7 days
  const upcomingExits = technicians.filter(tech => {
    if (tech.status !== 'pending_exit' || !tech.expected_country_exit_date) return false;
    const daysUntilExit = safeDaysDifference(tech.expected_country_exit_date);
    if (daysUntilExit === null) return false;
    return daysUntilExit >= 0 && daysUntilExit <= 7;
  });

  // Camp Induction Overdue Alerts
  const allPersonnel = [
    ...technicians.map(t => ({ ...t, type: 'technician', id: `t-${t.id}` })), // Add unique ID and type
    ...externalPersonnel.map(e => ({ ...e, type: 'external', id: `e-${e.id}` })) // Add unique ID and type
  ];

  const overdueCampInduction = allPersonnel.filter(person => {
    if (person.status !== 'active' || !person.actual_arrival_date) return false;
    // Check if camp induction is required and not completed
    if (person.camp_induction_required === false || person.camp_induction_completed === true) return false;
    
    try {
      // Ensure actual_arrival_time is present, default to '00:00' if not to avoid parseISO error
      const arrivalDateTimeString = `${person.actual_arrival_date}T${person.actual_arrival_time || '00:00:00'}`;
      const arrivalDateTime = parseISO(arrivalDateTimeString);

      if (!isValid(arrivalDateTime)) return false; // Ensure the parsed date is valid
      
      const hoursSinceArrival = differenceInHours(new Date(), arrivalDateTime);
      return hoursSinceArrival > 24;
    } catch {
      return false; // Return false if any date parsing or calculation fails
    }
  });

  // Enrich with camp info and hours overdue for table display
  const enrichedOverdueInduction = overdueCampInduction.map(person => {
    const camp = camps.find(c => c.id === person.camp_id);
    const arrivalDateTimeString = `${person.actual_arrival_date}T${person.actual_arrival_time || '00:00:00'}`;
    const arrivalDateTime = parseISO(arrivalDateTimeString);
    const hoursSinceArrival = isValid(arrivalDateTime) ? differenceInHours(new Date(), arrivalDateTime) : 'N/A';
    const hoursOverdue = typeof hoursSinceArrival === 'number' ? hoursSinceArrival - 24 : 0;
    
    return {
      ...person,
      camp,
      hoursSinceArrival,
      hoursOverdue
    };
  });

  // Apply filters to induction table
  let filteredInduction = enrichedOverdueInduction;

  if (filterInductionName.length > 0) {
    filteredInduction = filteredInduction.filter(p => filterInductionName.includes(p.full_name || '-'));
  }
  if (filterInductionType.length > 0) {
    filteredInduction = filteredInduction.filter(p => filterInductionType.includes(p.type));
  }
  if (filterInductionCamp.length > 0) {
    filteredInduction = filteredInduction.filter(p => filterInductionCamp.includes(p.camp?.name || '-'));
  }
  if (filterInductionHoursOverdue.length > 0) {
    filteredInduction = filteredInduction.filter(p => {
      const hoursStr = typeof p.hoursOverdue === 'number' ? `${p.hoursOverdue}h` : '-';
      return filterInductionHoursOverdue.includes(hoursStr);
    });
  }

  // Sort induction table
  const sortedInduction = [...filteredInduction].sort((a, b) => {
    let aVal, bVal;

    switch (inductionSortField) {
      case 'full_name':
        aVal = a.full_name || '';
        bVal = b.full_name || '';
        break;
      case 'type':
        aVal = a.type;
        bVal = b.type;
        break;
      case 'camp':
        aVal = a.camp?.name || '';
        bVal = b.camp?.name || '';
        break;
      case 'hours_overdue':
        aVal = typeof a.hoursOverdue === 'number' ? a.hoursOverdue : 0;
        bVal = typeof b.hoursOverdue === 'number' ? b.hoursOverdue : 0;
        break;
      default:
        aVal = '';
        bVal = '';
    }

    if (inductionSortDirection === 'asc') {
      return typeof aVal === 'string' ? String(aVal).localeCompare(String(bVal)) : aVal - bVal;
    } else {
      return typeof aVal === 'string' ? String(bVal).localeCompare(String(aVal)) : bVal - aVal;
    }
  });

  // Get unique values for filters
  const uniqueInductionNames = [...new Set(enrichedOverdueInduction.map(p => p.full_name || '-'))].sort();
  const uniqueInductionTypes = [...new Set(enrichedOverdueInduction.map(p => p.type))].sort();
  const uniqueInductionCamps = [...new Set(enrichedOverdueInduction.map(p => p.camp?.name || '-'))].sort();
  const uniqueInductionHoursOverdue = [...new Set(enrichedOverdueInduction.map(p => {
    return typeof p.hoursOverdue === 'number' ? `${p.hoursOverdue}h` : '-';
  }))].sort((a, b) => {
    const aNum = parseInt(a) || 0;
    const bNum = parseInt(b) || 0;
    return aNum - bNum;
  });

  const handleInductionSort = (field) => {
    if (inductionSortField === field) {
      setInductionSortDirection(inductionSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setInductionSortField(field);
      setInductionSortDirection('asc');
    }
  };

  const clearInductionFilters = () => {
    setFilterInductionName([]);
    setFilterInductionType([]);
    setFilterInductionCamp([]);
    setFilterInductionHoursOverdue([]);
  };

  const hasInductionFilters = 
    filterInductionName.length > 0 ||
    filterInductionType.length > 0 ||
    filterInductionCamp.length > 0 ||
    filterInductionHoursOverdue.length > 0;

  const exportInductionToCSV = () => {
    const headers = ['Full Name', 'Type', 'Employee ID / Company', 'Camp', 'Arrival Date', 'Arrival Time', 'Hours Since Arrival', 'Hours Overdue'];
    const rows = sortedInduction.map(person => [
      person.full_name,
      person.type,
      person.type === 'technician' ? person.employee_id : person.company_name,
      person.camp?.name || '-',
      safeFormatDate(person.actual_arrival_date),
      person.actual_arrival_time || '-',
      typeof person.hoursSinceArrival === 'number' ? `${person.hoursSinceArrival}h` : '-',
      typeof person.hoursOverdue === 'number' ? `${person.hoursOverdue}h` : '-'
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `overdue_camp_induction_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Column Filter Component
  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue }) => {
    const filteredValues = values.filter(v =>
      String(v).toLowerCase().includes(searchValue.toLowerCase())
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

  // Sajja Pre-Induction Stats
  const sajjaCamp = camps.find(c => c.code?.toLowerCase() === 'sajja' || c.name?.toLowerCase().includes('sajja'));
  
  const preInductionTechnicians = technicians.filter(tech => 
    tech.camp_id === sajjaCamp?.id &&
    tech.induction_status === 'pre_induction' &&
    tech.sajja_induction_start_date
  );

  const overduePreInduction = preInductionTechnicians.filter(tech => {
    if (!tech.sajja_induction_start_date) return false;
    try {
      const startDate = parseISO(tech.sajja_induction_start_date);
      const daysInInduction = differenceInDays(new Date(), startDate);
      return daysInInduction > 5;
    } catch {
      return false;
    }
  });

  // Sonapur Exit Camp - Overdue Exit Formalities
  const sonapurExitCamps = camps.filter(camp => {
    const nameMatch = camp.name?.toLowerCase().includes('sonapur') && camp.name?.toLowerCase().includes('exit');
    const codeMatch = camp.code?.toLowerCase().includes('sonapur') && camp.code?.toLowerCase().includes('exit');
    return nameMatch || codeMatch;
  });

  const overdueExitFormalities = technicians.filter(tech => {
    if (!tech.sonapur_exit_start_date || tech.exit_process_status === 'formalities_completed') return false;
    
    const isInSonapurExit = sonapurExitCamps.some(camp => camp.id === tech.camp_id);
    if (!isInSonapurExit) return false;
    
    try {
      const startDate = parseISO(tech.sonapur_exit_start_date);
      if (!isValid(startDate)) return false;

      const daysInProcess = differenceInDays(new Date(), startDate);
      return daysInProcess > 7;
    } catch {
      return false;
    }
  });



  // Calculate pending tasks for current user
  const userPendingTasks = React.useMemo(() => {
    if (!currentUser) return [];
    
    const tasks = [];
    const today = new Date().toISOString().split('T')[0];
    
    // Incoming transfer requests
    if (currentUser.role === 'admin' || currentUser.is_camp_manager) {
      const incomingCount = transferRequests.filter(tr => 
        tr.target_camp_id === currentUser.camp_id && 
        ['pending_allocation', 'beds_allocated'].includes(tr.status)
      ).length;
      if (incomingCount > 0) {
        tasks.push({
          title: `${incomingCount} Incoming Transfer Request${incomingCount > 1 ? 's' : ''}`,
          description: 'Pending allocation or approval',
          link: 'IncomingTransferRequests',
          icon: Inbox,
          color: 'blue',
          count: incomingCount
        });
      }
    }
    
    // Expected arrivals today
    const arrivalsToday = technicians.filter(t => 
      t.status === 'pending_arrival' && 
      t.expected_arrival_date === today
    ).length;
    if (arrivalsToday > 0) {
      tasks.push({
        title: `${arrivalsToday} Expected Arrival${arrivalsToday > 1 ? 's' : ''} Today`,
        description: 'Technicians arriving today',
        link: 'ExpectedArrivals',
        icon: Plane,
        color: 'green',
        count: arrivalsToday
      });
    }
    
    // Overdue camp inductions
    if (overdueCampInduction.length > 0) {
      tasks.push({
        title: `${overdueCampInduction.length} Overdue Camp Induction${overdueCampInduction.length > 1 ? 's' : ''}`,
        description: 'Action required within 24 hours of arrival',
        link: 'CampInductionTracker',
        icon: AlertCircle,
        color: 'red',
        count: overdueCampInduction.length
      });
    }
    
    // Overdue Sajja pre-inductions
    if (overduePreInduction.length > 0) {
      tasks.push({
        title: `${overduePreInduction.length} Overdue Sajja Pre-Induction${overduePreInduction.length > 1 ? 's' : ''}`,
        description: 'Exceeded 5 days in Sajja Camp',
        link: 'SajjaInductionTracker',
        icon: Clock,
        color: 'orange',
        count: overduePreInduction.length
      });
    }
    
    // Document expirations
    const expiringDocsCount = expiringDocs.length + visaRenewalAlerts.length;
    if (expiringDocsCount > 0) {
      tasks.push({
        title: `${expiringDocsCount} Document${expiringDocsCount > 1 ? 's' : ''} Expiring Soon`,
        description: 'Within next 30-60 days',
        link: 'ExpiryReport',
        icon: FileText,
        color: 'yellow',
        count: expiringDocsCount
      });
    }
    
    // Pending leaves
    const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
    if (pendingLeaves > 0 && (currentUser.role === 'admin' || currentUser.is_camp_manager)) {
      tasks.push({
        title: `${pendingLeaves} Pending Leave Request${pendingLeaves > 1 ? 's' : ''}`,
        description: 'Awaiting approval',
        link: 'LeaveManagement',
        icon: Briefcase,
        color: 'purple',
        count: pendingLeaves
      });
    }
    
    return tasks;
  }, [currentUser, transferRequests, technicians, overdueCampInduction.length, overduePreInduction.length, expiringDocs.length, visaRenewalAlerts.length, leaveRequests]);

  const overdueInductionCount = overdueCampInduction.length;
  const overdueSajjaCount = overduePreInduction.length;
  const expiringDocumentsCount = expiringDocs.length;

  // Show loading state if data is still being fetched - AFTER all hooks
  const isLoading = loadingTechnicians || loadingExternal || loadingCamps || loadingBeds;

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FD' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      title: "Active Technicians", 
      value: activeTechnicians.toLocaleString(), 
      icon: UserCheck, 
      color: "#0A4DBF",
      subtitle: `${technicians.length} total technicians`
    },
    { 
      title: "On Annual Leave", 
      value: onLeave.toLocaleString(), 
      icon: Calendar, 
      color: "#3BB273",
      subtitle: "Approved leave requests"
    },
    { 
      title: "Pending Arrival", 
      value: pendingArrival.toLocaleString(), 
      icon: UserPlus, 
      color: "#FF8A00",
      subtitle: "Awaiting arrival at camp"
    },
    { 
      title: "Inactive/Exited", 
      value: inactiveTechnicians.toLocaleString(), 
      icon: UserX, 
      color: "#EA4335",
      subtitle: "Exited, suspended, or transferred"
    },
    { 
      title: "Pending Exit (In Camp)", 
      value: pendingExit, 
      icon: AlertCircle, 
      color: "#FF8A00",
      subtitle: `${pendingExitBeds} occupying beds, ${overdueExits.length} overdue`
    },
    { 
      title: "External Personnel", 
      value: externalPersonnel.length.toLocaleString(), 
      icon: Users, 
      color: "#6AB6F5",
      subtitle: `${externalPersonnel.filter(e => e.status === 'active').length} active`
    },
    { 
      title: "Active Camps", 
      value: activeCamps, 
      icon: Building2, 
      color: "#3BB273",
      subtitle: `${camps.length} total camps`
    },
    { 
      title: "Total Beds Occupied", 
      value: occupiedBeds.toLocaleString(), 
      icon: Bed, 
      color: "#0A4DBF",
      subtitle: `Active: ${activeTechnicianBeds}, Leave: ${onLeaveTechnicianBeds}, Exit: ${pendingExitBeds}, External: ${externalBeds}`
    },
    { 
      title: "Document Alerts", 
      value: expiredDocs.length + expiringDocs.length + visaRenewalAlerts.length,
      icon: FileWarning, 
      color: "#EA4335",
      subtitle: `${expiredDocs.length} expired, ${expiringDocs.length + visaRenewalAlerts.length} expiring`
    },
  ];

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ backgroundColor: '#F8F9FD' }}>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#333333' }}>Dashboard</h1>
          <p style={{ color: '#6C717C' }}>Real-time overview of camp operations</p>
        </div>

        {/* Pending Tasks Card */}
        {userPendingTasks.length > 0 && (
          <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-l-blue-600">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Your Pending Tasks ({userPendingTasks.length})</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {userPendingTasks.map((task, index) => (
                  <Link key={index} to={createPageUrl(task.link)}>
                    <Card className={`border-2 hover:shadow-lg transition-all cursor-pointer ${
                      task.color === 'blue' ? 'border-blue-200 hover:border-blue-400 bg-blue-50' :
                      task.color === 'green' ? 'border-green-200 hover:border-green-400 bg-green-50' :
                      task.color === 'red' ? 'border-red-200 hover:border-red-400 bg-red-50' :
                      task.color === 'orange' ? 'border-orange-200 hover:border-orange-400 bg-orange-50' :
                      task.color === 'yellow' ? 'border-yellow-200 hover:border-yellow-400 bg-yellow-50' :
                      'border-purple-200 hover:border-purple-400 bg-purple-50'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            task.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                            task.color === 'green' ? 'bg-green-100 text-green-600' :
                            task.color === 'red' ? 'bg-red-100 text-red-600' :
                            task.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                            task.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            <task.icon className="w-5 h-5" />
                          </div>
                          <Badge className={`${
                            task.color === 'blue' ? 'bg-blue-600' :
                            task.color === 'green' ? 'bg-green-600' :
                            task.color === 'red' ? 'bg-red-600' :
                            task.color === 'orange' ? 'bg-orange-600' :
                            task.color === 'yellow' ? 'bg-yellow-600' :
                            'bg-purple-600'
                          } text-white`}>
                            {task.count}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{task.title}</h3>
                        <p className="text-xs text-gray-600">{task.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => {
            return (
              <Card key={stat.title} className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden" style={{ borderRadius: '16px' }}>
                <div className="h-2 bg-gradient-to-r" style={{ 
                  backgroundImage: `linear-gradient(to right, ${stat.color}, ${stat.color}dd)` 
                }}></div>
                <CardContent className="p-6" style={{ 
                  background: `linear-gradient(135deg, ${stat.color}30 0%, ${stat.color}15 100%)` 
                }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: stat.color }}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold mb-2 text-gray-900">{stat.value}</div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: stat.color }}>
                    {stat.title}
                  </p>
                  <p className="text-sm text-gray-600">{stat.subtitle}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Camp Induction Overdue Alert with Table */}
        {overdueCampInduction.length > 0 && (
          <Card className="border-none shadow-md" style={{ borderLeftColor: '#EA4335', backgroundColor: '#FFFFFF', borderRadius: '14px', borderLeft: '4px solid #EA4335' }}>
            <CardHeader className="cursor-pointer rounded-t-xl" onClick={() => setShowInductionTable(!showInductionTable)} style={{ backgroundColor: '#FFE7E1', borderBottom: '1px solid #E5E7ED' }}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#EA4335' }}>
                  <AlertCircle className="w-5 h-5" />
                  Overdue Camp Induction - Compliance Alert
                  <Badge className="ml-2 text-white" style={{ backgroundColor: '#EA4335' }}>{overdueCampInduction.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {sortedInduction.length > 0 && showInductionTable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportInductionToCSV();
                      }}
                      className="text-red-700 border-red-300 hover:bg-red-100"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    {showInductionTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-700 mb-4">
                <strong>24-Hour Policy Violation:</strong> The following personnel have NOT completed their camp induction within 24 hours of arrival. Immediate action required.
              </p>

              {showInductionTable ? (
                <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
                  {hasInductionFilters && (
                    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-blue-700 font-medium">
                          <Filter className="w-4 h-4 inline mr-2" />
                          Column filters active
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearInductionFilters}
                          className="text-blue-700 hover:text-blue-900 hover:bg-blue-100 h-7"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300 bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex-grow">Full Name</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleInductionSort('full_name')}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueInductionNames}
                                  selected={filterInductionName}
                                  setSelected={setFilterInductionName}
                                  searchValue={searchInductionName}
                                  setSearchValue={setSearchInductionName}
                                />
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex-grow">Type</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleInductionSort('type')}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueInductionTypes}
                                  selected={filterInductionType}
                                  setSelected={setFilterInductionType}
                                  searchValue={searchInductionType}
                                  setSearchValue={setSearchInductionType}
                                />
                              </div>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Employee ID / Company</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex-grow">Camp</span>
                              <ColumnFilter
                                values={uniqueInductionCamps}
                                selected={filterInductionCamp}
                                setSelected={setFilterInductionCamp}
                                searchValue={searchInductionCamp}
                                setSearchValue={setSearchInductionCamp}
                              />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Arrival Date/Time</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex-grow">Hours Overdue</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleInductionSort('hours_overdue')}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueInductionHoursOverdue}
                                  selected={filterInductionHoursOverdue}
                                  setSelected={setFilterInductionHoursOverdue}
                                  searchValue={searchInductionHoursOverdue}
                                  setSearchValue={setSearchInductionHoursOverdue}
                                />
                              </div>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedInduction.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-8 text-gray-500">No overdue inductions matching current filters.</td>
                          </tr>
                        ) : (
                          sortedInduction.map((person, index) => (
                            <tr key={person.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{person.full_name}</td>
                              <td className="px-4 py-3 text-sm">
                                <Badge variant={person.type === 'technician' ? 'default' : 'secondary'}>
                                  {person.type}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {person.type === 'technician' ? person.employee_id : person.company_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{person.camp?.name || 'Unknown Camp'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {safeFormatDate(person.actual_arrival_date)} {person.actual_arrival_time && `at ${person.actual_arrival_time}`}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <Badge variant="destructive" className="text-sm">
                                  {typeof person.hoursSinceArrival === 'number' ? `${person.hoursSinceArrival}h` : 'N/A'} 
                                  ({typeof person.hoursOverdue === 'number' ? `${person.hoursOverdue}h overdue` : 'N/A'})
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing <span className="font-semibold">{sortedInduction.length}</span> of <span className="font-semibold">{enrichedOverdueInduction.length}</span> total overdue inductions
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {overdueCampInduction.slice(0, 5).map((person) => {
                    const camp = camps.find(c => c.id === person.camp_id);
                    const arrivalDateTimeString = `${person.actual_arrival_date}T${person.actual_arrival_time || '00:00:00'}`;
                    const arrivalDateTime = parseISO(arrivalDateTimeString);
                    const hoursSinceArrival = isValid(arrivalDateTime) ? differenceInHours(new Date(), arrivalDateTime) : 'N/A';
                    
                    return (
                      <div key={person.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                        <div>
                          <p className="font-semibold text-gray-900">{person.full_name}</p>
                          <p className="text-sm text-gray-600">
                            {person.type === 'technician' ? person.employee_id : person.company_name} • {camp?.name || 'Unknown Camp'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Arrived: {safeFormatDate(person.actual_arrival_date)} {person.actual_arrival_time && `at ${person.actual_arrival_time}`}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-sm">
                          {hoursSinceArrival}h ({typeof hoursSinceArrival === 'number' ? hoursSinceArrival - 24 : 0}h overdue)
                        </Badge>
                      </div>
                    );
                  })}
                  {overdueCampInduction.length > 5 && (
                    <p className="text-sm text-red-600 text-center pt-2">
                      +{overdueCampInduction.length - 5} more overdue (click to expand full table)
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sajja Pre-Induction Alert */}
        {overduePreInduction.length > 0 && (
          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', borderLeft: '4px solid #FF8A00' }}>
            <CardHeader className="rounded-t-xl" style={{ backgroundColor: '#FFF4D6', borderBottom: '1px solid #E5E7ED' }}>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#FF8A00' }}>
                <AlertCircle className="w-5 h-5" />
                Sajja Camp - Overdue Pre-Induction
                <Badge className="ml-2 text-white" style={{ backgroundColor: '#FF8A00' }}>{overduePreInduction.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700 mb-4">
                The following technicians have exceeded the 5-day pre-induction period at Sajja Camp. Please complete their induction.
              </p>
              <div className="space-y-2">
                {overduePreInduction.slice(0, 5).map((tech) => {
                  const daysInInduction = differenceInDays(new Date(), parseISO(tech.sajja_induction_start_date));
                  return (
                    <div key={tech.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                      <div>
                        <p className="font-semibold text-gray-900">{tech.full_name}</p>
                        <p className="text-sm text-gray-600">{tech.employee_id} - {tech.nationality}</p>
                        <p className="text-xs text-gray-500">
                          Started: {safeFormatDate(tech.sajja_induction_start_date)}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-sm">
                        {daysInInduction} days ({daysInInduction - 5} overdue)
                      </Badge>
                    </div>
                  );
                })}
                {overduePreInduction.length > 5 && (
                  <p className="text-sm text-orange-600 text-center pt-2">
                    +{overduePreInduction.length - 5} more overdue
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Exit Formalities Alert */}
        {overdueExitFormalities.length > 0 && (
          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', borderLeft: '4px solid #EA4335' }}>
            <CardHeader className="rounded-t-xl" style={{ backgroundColor: '#FFE7E1', borderBottom: '1px solid #E5E7ED' }}>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#EA4335' }}>
                <AlertCircle className="w-5 h-5" />
                Overdue Sonapur Exit Formalities
                <Badge className="ml-2 text-white" style={{ backgroundColor: '#EA4335' }}>{overdueExitFormalities.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-700 mb-4">
                <strong>7-Day Policy Violation:</strong> The following technicians have exceeded the 7-day limit for completing exit formalities at Sonapur Exit Camp. Immediate action required.
              </p>
              <div className="space-y-2">
                {overdueExitFormalities.slice(0, 5).map((tech) => {
                  const camp = camps.find(c => c.id === tech.camp_id);
                  const startDate = safeParseDate(tech.sonapur_exit_start_date);
                  const daysInProcess = startDate ? differenceInDays(new Date(), startDate) : 'N/A';
                  const overdueBy = typeof daysInProcess === 'number' ? daysInProcess - 7 : 'N/A';
                  
                  return (
                    <div key={tech.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                      <div>
                        <p className="font-semibold text-gray-900">{tech.full_name}</p>
                        <p className="text-sm text-gray-600">{tech.employee_id} • {camp?.name || 'Unknown Camp'}</p>
                        <p className="text-xs text-gray-500">
                          Started: {safeFormatDate(tech.sonapur_exit_start_date)}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-sm">
                        {daysInProcess} days ({overdueBy} overdue)
                      </Badge>
                    </div>
                  );
                })}
                {overdueExitFormalities.length > 5 && (
                  <p className="text-sm text-red-600 text-center pt-2">
                    +{overdueExitFormalities.length - 5} more overdue
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Exits Alert */}
        {overdueExits.length > 0 && (
          <Card className="border-l-4 border-l-red-600 shadow-lg bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                Overdue Country Exits
                <Badge className="bg-red-600 text-white ml-2">{overdueExits.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-700 mb-4">
                The following technicians have passed their expected country exit date but are still marked as pending_exit. Update their status immediately.
              </p>
              <div className="space-y-2">
                {overdueExits.slice(0, 5).map((tech) => {
                  const daysOverdue = Math.abs(safeDaysDifference(tech.expected_country_exit_date));
                  return (
                    <div key={tech.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                      <div>
                        <p className="font-semibold text-gray-900">{tech.full_name}</p>
                        <p className="text-sm text-gray-600">{tech.employee_id} - {tech.nationality}</p>
                        <p className="text-xs text-gray-500">
                          Expected Exit: {safeFormatDate(tech.expected_country_exit_date)}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-sm">
                        {daysOverdue} days overdue
                      </Badge>
                    </div>
                  );
                })}
                {overdueExits.length > 5 && (
                  <p className="text-sm text-red-600 text-center pt-2">
                    +{overdueExits.length - 5} more overdue exits
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Exits Within 7 Days */}
        {upcomingExits.length > 0 && (
          <Card className="border-l-4 border-l-orange-500 shadow-lg bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="w-5 h-5" />
                Upcoming Country Exits - Next 7 Days
                <Badge className="bg-orange-600 text-white ml-2">{upcomingExits.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700 mb-4">
                These technicians are scheduled to leave the country within the next 7 days. Ensure all exit procedures are completed.
              </p>
              <div className="space-y-2">
                {upcomingExits.map((tech) => {
                  const daysLeft = safeDaysDifference(tech.expected_country_exit_date);
                  return (
                    <div key={tech.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                      <div>
                        <p className="font-semibold text-gray-900">{tech.full_name}</p>
                        <p className="text-sm text-gray-600">{tech.employee_id} - {tech.nationality}</p>
                        <p className="text-xs text-gray-500">
                          Expected Exit: {safeFormatDate(tech.expected_country_exit_date)}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                        {daysLeft} days left
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* External Personnel by Role Breakdown */}
        {externalPersonnel.length > 0 && (
          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
            <CardHeader className="rounded-t-xl border-b" style={{ backgroundColor: '#072C77', borderColor: '#E5E7ED', height: '48px', display: 'flex', alignItems: 'center' }}>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="w-5 h-5" />
                External Personnel Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(
                  externalPersonnel
                    .filter(e => e.status === 'active')
                    .reduce((acc, person) => {
                      const role = person.role || 'Unknown';
                      acc[role] = (acc[role] || 0) + 1;
                      return acc;
                    }, {})
                ).map(([role, count]) => (
                  <div key={role} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-600 capitalize mb-1">
                      {role.replace(/_/g, ' ')}
                    </p>
                    <p className="text-2xl font-bold text-purple-900">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visa Renewal Alerts - Priority Section */}
        {visaRenewalAlerts.length > 0 && (
          <Card className="border-l-4 border-l-orange-500 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="w-5 h-5" />
                Visa Renewal Process Required
                <Badge className="bg-orange-600 text-white ml-2">{visaRenewalAlerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  The following visas are expiring within 60 days. Start renewal process immediately to avoid legal issues.
                </p>
                {visaRenewalAlerts.map((doc) => {
                  const tech = technicians.find(t => t.id === doc.technician_id);
                  const daysLeft = safeDaysDifference(doc.expiry_date);
                  if (daysLeft === null) return null; 
                  
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{tech?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{tech?.employee_id} - {tech?.nationality}</p>
                        <p className="text-sm text-gray-600">Visa #{doc.document_number}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={daysLeft <= 30 ? "destructive" : "outline"} className="mb-2">
                          {daysLeft} days left
                        </Badge>
                        <p className="text-xs text-gray-500">
                          Expires: {safeFormatDate(doc.expiry_date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Leaves */}
          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
            <CardHeader className="rounded-t-xl border-b" style={{ backgroundColor: '#072C77', borderColor: '#E5E7ED', height: '48px', display: 'flex', alignItems: 'center' }}>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
                <Briefcase className="w-5 h-5" />
                Recent Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {leaves.slice(0, 5).map((leave) => {
                const tech = technicians.find(t => t.id === leave.technician_id);
                return (
                  <div key={leave.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{tech?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{leave.leave_type}</p>
                    </div>
                    <Badge variant={
                      leave.status === 'approved' ? 'default' : 
                      leave.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {leave.status}
                    </Badge>
                  </div>
                );
              })}
              {leaves.length === 0 && (
                <p className="text-center text-gray-500 py-8">No leave requests</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Disciplinary */}
          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
            <CardHeader className="rounded-t-xl border-b" style={{ backgroundColor: '#072C77', borderColor: '#E5E7ED', height: '48px', display: 'flex', alignItems: 'center' }}>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
                <AlertTriangle className="w-5 h-5" />
                Recent Disciplinary Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {disciplinary.slice(0, 5).map((action) => {
                const tech = technicians.find(t => t.id === action.technician_id);
                return (
                  <div key={action.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{tech?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{action.action_type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant={
                      action.severity === 'critical' ? 'destructive' :
                      action.severity === 'major' ? 'destructive' :
                      'secondary'
                    }>
                      {action.severity}
                    </Badge>
                  </div>
                );
              })}
              {disciplinary.length === 0 && (
                <p className="text-center text-gray-500 py-8">No disciplinary actions</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Document Expiry Alerts */}
        {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
          <Card className="border-l-4 border-l-red-500 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Document Expiry Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expiredDocs.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-700 mb-2">Expired Documents ({expiredDocs.length})</h4>
                    <div className="space-y-2">
                      {expiredDocs.slice(0, 5).map((doc) => {
                        const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
                        const camp = doc.camp_id ? camps.find(c => c.id === doc.camp_id) : null;
                        return (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                            <div>
                              <p className="font-medium text-gray-900">
                                {doc.document_type?.replace(/_/g, ' ').toUpperCase() || doc.document_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {tech ? `${tech.full_name} (${tech.employee_id})` : camp ? camp.name : 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Expired: {safeFormatDate(doc.expiry_date)}
                              </p>
                            </div>
                            <Badge variant="destructive">EXPIRED</Badge>
                          </div>
                        );
                      })}
                      {expiredDocs.length > 5 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          +{expiredDocs.length - 5} more expired documents
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {expiringDocs.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-orange-700 mb-2">Expiring Soon ({expiringDocs.length})</h4>
                    <div className="space-y-2">
                      {expiringDocs.slice(0, 5).map((doc) => {
                        const tech = doc.technician_id ? technicians.find(t => t.id === doc.technician_id) : null;
                        const camp = doc.camp_id ? camps.find(c => c.id === doc.camp_id) : null;
                        const daysLeft = safeDaysDifference(doc.expiry_date);
                        if (daysLeft === null) return null;
                        
                        return (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div>
                              <p className="font-medium text-gray-900">
                                {doc.document_type?.replace(/_/g, ' ').toUpperCase() || doc.document_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {tech ? `${tech.full_name} (${tech.employee_id})` : camp ? camp.name : 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Expires: {safeFormatDate(doc.expiry_date)}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                              {daysLeft} days left
                            </Badge>
                          </div>
                        );
                      })}
                      {expiringDocs.length > 5 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          +{expiringDocs.length - 5} more expiring documents
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}