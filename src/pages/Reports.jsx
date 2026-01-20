import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Printer, MapPin, Building2, DoorOpen, Bed, Users, AlertCircle, Filter, X, Utensils } from "lucide-react";
import { format } from "date-fns";
// Added Select components for filters (these will be removed from Room Details tab)


import { Alert, AlertDescription } from "@/components/ui/alert"; // Added Alert components
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input"; // Assuming Input component exists for search within filters

export default function Reports() {
  // roomFilters state and related Select components are being replaced by column filters for 'room-details' tab
  // Keeping it for now in case other parts of the app rely on it, but it won't be used in the Room Details tab.
  // const [roomFilters, setRoomFilters] = useState({
  //   camp: 'all',
  //   occupantType: 'all',
  //   genderRestriction: 'all'
  // });

  // Excel-style column filters for room details
  const [filterCampName, setFilterCampName] = useState([]);
  const [filterFloorNumber, setFilterFloorNumber] = useState([]);
  const [filterRoomNumber, setFilterRoomNumber] = useState([]);
  const [filterOccupantType, setFilterOccupantType] = useState([]);
  const [filterGenderRestriction, setFilterGenderRestriction] = useState([]);

  // Search states for column filters
  const [searchCampName, setSearchCampName] = useState("");
  const [searchFloorNumber, setSearchFloorNumber] = useState("");
  const [searchRoomNumber, setSearchRoomNumber] = useState("");
  const [searchOccupantType, setSearchOccupantType] = useState("");
  const [searchGenderRestriction, setSearchGenderRestriction] = useState("");

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => base44.entities.Floor.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
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

  // Calculate metrics for summary statistics
  const activeTechnicians = technicians.filter(t => t.status === 'active').length;
  // const onLeave = technicians.filter(t => t.status === 'on_leave').length; // Not used in current UI, but kept as per outline
  // const pendingExit = technicians.filter(t => t.status === 'pending_exit').length; // Not used in current UI, but kept as per outline
  const activeExternal = externalPersonnel.filter(e => e.status === 'active').length;
  const activeCamps = camps.filter(c => c.status === 'active').length;
  
  // Use ACTUAL BED COUNT instead of camp capacity for overall stats
  const totalPhysicalBeds = beds.length;

  // Count beds by actual assignments - including pending_exit (still in camp)
  const technicianBedsSummary = technicians.filter(t => 
    t.bed_id && (t.status === 'active' || t.status === 'on_leave' || t.status === 'pending_exit')
  ).length;
  const externalBedsSummary = externalPersonnel.filter(e => 
    e.bed_id && e.status === 'active'
  ).length;

  const occupiedBeds = technicianBedsSummary + externalBedsSummary;
  const availableBeds = totalPhysicalBeds - occupiedBeds;
  const occupancyRate = totalPhysicalBeds > 0 ? ((occupiedBeds / totalPhysicalBeds) * 100).toFixed(1) : 0;

  // Beds occupied by pending exit technicians (for global alert breakdown)
  const pendingExitBedsSummary = technicians.filter(t => t.status === 'pending_exit' && t.bed_id).length;


  // Calculate camp statistics with breakdown by occupant type
  const getCampStats = (campId) => {
    const campFloors = floors.filter(f => f.camp_id === campId);
    const campRooms = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
    const campBeds = beds.filter(b => campRooms.some(r => r.id === b.room_id));
    const campBedIds = campBeds.map(b => b.id);

    // Count technician beds - including pending_exit (still occupying beds)
    const technicianBeds = technicians.filter(t => 
      campBedIds.includes(t.bed_id) && 
      (t.status === 'active' || t.status === 'on_leave' || t.status === 'pending_exit')
    ).length;

    // Count external personnel beds - only active
    const externalBeds = externalPersonnel.filter(e => 
      campBedIds.includes(e.bed_id) && 
      e.status === 'active'
    ).length;

    const occupiedBeds = technicianBeds + externalBeds;
    const totalBeds = campBeds.length;

    return {
      totalBeds,
      occupiedBeds,
      technicianBeds,
      externalBeds,
      freeBeds: totalBeds - occupiedBeds
    };
  };

  // Get detailed room data with camp and floor info
  const getRoomDetailsData = () => {
    return rooms.map(room => {
      const floor = floors.find(f => f.id === room.floor_id);
      const camp = floor ? camps.find(c => c.id === floor.camp_id) : null;
      const roomBeds = beds.filter(b => b.room_id === room.id);
      const occupiedBeds = roomBeds.filter(b => b.status === 'occupied').length;
      const totalBeds = roomBeds.length;
      const balanceBeds = totalBeds - occupiedBeds;

      return {
        campName: camp?.name || '-',
        campCode: camp?.code || '-',
        campCapacity: camp?.capacity || 0,
        floorNumber: floor?.floor_number || '-',
        floorName: floor?.name || '-',
        roomNumber: room.room_number,
        roomCapacity: room.capacity || 0,
        occupantType: room.occupant_type || 'mixed',
        genderRestriction: room.gender_restriction || 'mixed',
        totalBeds,
        occupiedBeds,
        balanceBeds,
        occupancyRate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0
      };
    }).sort((a, b) => {
      // Sort by camp name, then floor, then room number
      if (a.campName !== b.campName) return a.campName.localeCompare(b.campName);
      if (a.floorNumber !== b.floorNumber) return String(a.floorNumber).localeCompare(String(b.floorNumber), undefined, { numeric: true });
      return String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true });
    });
  };

  // Get all room details
  const allRoomDetails = getRoomDetailsData();

  // Get unique values for filters from ALL rooms
  const uniqueCampNames = [...new Set(allRoomDetails.map(r => r.campName))].sort();
  const uniqueFloorNumbers = [...new Set(allRoomDetails.map(r => String(r.floorNumber)))].sort((a, b) => 
    a.localeCompare(b, undefined, { numeric: true })
  );
  const uniqueRoomNumbers = [...new Set(allRoomDetails.map(r => String(r.roomNumber)))].sort((a, b) => 
    a.localeCompare(b, undefined, { numeric: true })
  );
  const uniqueOccupantTypes = [...new Set(allRoomDetails.map(r => r.occupantType))].sort();
  const uniqueGenderRestrictions = [...new Set(allRoomDetails.map(r => r.genderRestriction))].sort();

  // Apply Excel-style column filters
  const filteredRoomDetails = allRoomDetails.filter(room => {
    if (filterCampName.length > 0 && !filterCampName.includes(room.campName)) return false;
    if (filterFloorNumber.length > 0 && !filterFloorNumber.includes(String(room.floorNumber))) return false;
    if (filterRoomNumber.length > 0 && !filterRoomNumber.includes(String(room.roomNumber))) return false;
    if (filterOccupantType.length > 0 && !filterOccupantType.includes(room.occupantType)) return false;
    if (filterGenderRestriction.length > 0 && !filterGenderRestriction.includes(room.genderRestriction)) return false;
    return true;
  });

  const hasActiveRoomFilters = filterCampName.length > 0 || filterFloorNumber.length > 0 || 
    filterRoomNumber.length > 0 || filterOccupantType.length > 0 || filterGenderRestriction.length > 0;

  const clearAllRoomFilters = () => {
    setFilterCampName([]);
    setFilterFloorNumber([]);
    setFilterRoomNumber([]);
    setFilterOccupantType([]);
    setFilterGenderRestriction([]);
  };

  // Column Filter Component with Search
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

  // Group camps by location with breakdown
  const locationWiseData = camps.reduce((acc, camp) => {
    const location = camp.location || 'Unknown Location';
    if (!acc[location]) {
      acc[location] = [];
    }
    
    const stats = getCampStats(camp.id);

    // Calculate pending exit beds (technicians staying but employment terminated)
    const campFloors = floors.filter(f => f.camp_id === camp.id);
    const campRooms = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
    const campBeds = beds.filter(b => campRooms.some(r => r.id === b.room_id));
    const pendingExitBeds = technicians.filter(t => 
      t.status === 'pending_exit' && 
      campBeds.some(b => b.id === t.bed_id)
    ).length;

    acc[location].push({
      campName: camp.name,
      campCode: camp.code,
      definedCapacity: camp.capacity,
      totalBeds: stats.totalBeds,
      occupiedBeds: stats.occupiedBeds,
      technicianBeds: stats.technicianBeds,
      externalBeds: stats.externalBeds,
      pendingExitBeds: pendingExitBeds, // Added new field
      freeBeds: stats.freeBeds,
      status: camp.status
    });
    
    return acc;
  }, {});

  // Camp-wise data (sorted by camp name) with breakdown including pending exit
  const campWiseData = camps.map(camp => {
    const stats = getCampStats(camp.id);
    
    // Calculate pending exit beds (technicians staying but employment terminated)
    const campFloors = floors.filter(f => f.camp_id === camp.id);
    const campRoomsCorrect = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
    const campBeds = beds.filter(b => campRoomsCorrect.some(r => r.id === b.room_id));
    const pendingExitBeds = technicians.filter(t => 
      t.status === 'pending_exit' && 
      campBeds.some(b => b.id === t.bed_id)
    ).length;
    
    return {
      campName: camp.name,
      campCode: camp.code,
      location: camp.location,
      definedCapacity: camp.capacity,
      totalBeds: stats.totalBeds,
      occupiedBeds: stats.occupiedBeds,
      technicianBeds: stats.technicianBeds,
      externalBeds: stats.externalBeds,
      pendingExitBeds: pendingExitBeds, // Added new field
      freeBeds: stats.freeBeds,
      occupancyRate: stats.totalBeds > 0 ? ((stats.occupiedBeds / stats.totalBeds) * 100).toFixed(1) : 0,
      status: camp.status
    };
  }).sort((a, b) => (a.campName || '').localeCompare(b.campName || ''));

  // Calculate location totals
  const getLocationTotals = (camps) => {
    return camps.reduce((acc, camp) => ({
      definedCapacity: acc.definedCapacity + camp.definedCapacity,
      totalBeds: acc.totalBeds + camp.totalBeds,
      occupiedBeds: acc.occupiedBeds + camp.occupiedBeds,
      technicianBeds: acc.technicianBeds + camp.technicianBeds,
      externalBeds: acc.externalBeds + camp.externalBeds,
      pendingExitBeds: acc.pendingExitBeds + camp.pendingExitBeds, // Added new field
      freeBeds: acc.freeBeds + camp.freeBeds
    }), { definedCapacity: 0, totalBeds: 0, occupiedBeds: 0, technicianBeds: 0, externalBeds: 0, pendingExitBeds: 0, freeBeds: 0 }); // Initialize new field
  };

  // Calculate grand totals including pending exit
  const grandTotals = campWiseData.reduce((acc, camp) => ({
    definedCapacity: acc.definedCapacity + camp.definedCapacity,
    totalBeds: acc.totalBeds + camp.totalBeds,
    occupiedBeds: acc.occupiedBeds + camp.occupiedBeds,
    technicianBeds: acc.technicianBeds + camp.technicianBeds,
    externalBeds: acc.externalBeds + camp.externalBeds,
    pendingExitBeds: acc.pendingExitBeds + camp.pendingExitBeds, // Added new field
    freeBeds: acc.freeBeds + camp.freeBeds
  }), { definedCapacity: 0, totalBeds: 0, occupiedBeds: 0, technicianBeds: 0, externalBeds: 0, pendingExitBeds: 0, freeBeds: 0 }); // Initialize new field

  // Calculate technicians by status with bed counts
  const getStatusWiseBeds = () => {
    // Initialize all statuses with 0
    const allStatuses = [
      'active',
      'pending_arrival',
      'on_leave',
      'pending_exit',
      'exited_country',
      'transferred',
      'absconded',
      'suspended'
    ];
    
    const statusData = {};
    allStatuses.forEach(status => {
      statusData[status] = { count: 0, bedsOccupied: 0 };
    });
    
    technicians.forEach(tech => {
      const status = tech.status || 'unknown';
      if (!statusData[status]) {
        statusData[status] = { count: 0, bedsOccupied: 0 };
      }
      statusData[status].count++;
      if (tech.bed_id) {
        statusData[status].bedsOccupied++;
      }
    });

    return Object.entries(statusData).map(([status, data]) => ({
      status,
      technicianCount: data.count,
      bedCount: data.bedsOccupied
    })).sort((a, b) => b.technicianCount - a.technicianCount);
  };

  const statusWiseBeds = getStatusWiseBeds();
  const totalTechnicians = statusWiseBeds.reduce((sum, item) => sum + item.technicianCount, 0);
  const totalBedsOccupied = statusWiseBeds.reduce((sum, item) => sum + item.bedCount, 0);

  // Get camp-wise meal preference data
  const getMealPreferenceData = () => {
    const mealPrefMap = mealPreferences.reduce((acc, pref) => {
      acc[pref.id] = pref.name;
      return acc;
    }, {});

    return camps.map(camp => {
      // Get technicians in this camp (exclude on_leave as they don't need meals)
      const campTechnicians = technicians.filter(t => 
        t.camp_id === camp.id && 
        (t.status === 'active' || t.status === 'pending_exit')
      );
      
      // Get external personnel in this camp
      const campExternal = externalPersonnel.filter(e => 
        e.camp_id === camp.id && e.status === 'active'
      );

      // Count by meal preference
      const mealCounts = {};
      mealPreferences.forEach(pref => {
        mealCounts[pref.name] = { technicians: 0, external: 0, total: 0 };
      });
      mealCounts['Not Assigned'] = { technicians: 0, external: 0, total: 0 };

      campTechnicians.forEach(tech => {
        const prefName = mealPrefMap[tech.meal_preference_id] || 'Not Assigned';
        if (!mealCounts[prefName]) {
          mealCounts[prefName] = { technicians: 0, external: 0, total: 0 };
        }
        mealCounts[prefName].technicians++;
        mealCounts[prefName].total++;
      });

      campExternal.forEach(ext => {
        const prefName = mealPrefMap[ext.meal_preference_id] || 'Not Assigned';
        if (!mealCounts[prefName]) {
          mealCounts[prefName] = { technicians: 0, external: 0, total: 0 };
        }
        mealCounts[prefName].external++;
        mealCounts[prefName].total++;
      });

      return {
        campId: camp.id,
        campName: camp.name,
        campCode: camp.code,
        location: camp.location,
        totalPersonnel: campTechnicians.length + campExternal.length,
        mealCounts
      };
    }).filter(camp => camp.totalPersonnel > 0).sort((a, b) => a.campName.localeCompare(b.campName));
  };

  const mealPreferenceData = getMealPreferenceData();
  const allMealPrefNames = [...new Set([...mealPreferences.map(p => p.name), 'Not Assigned'])];

  // Calculate grand totals for meal preferences
  const mealPrefGrandTotals = allMealPrefNames.reduce((acc, prefName) => {
    acc[prefName] = { technicians: 0, external: 0, total: 0 };
    mealPreferenceData.forEach(camp => {
      if (camp.mealCounts[prefName]) {
        acc[prefName].technicians += camp.mealCounts[prefName].technicians;
        acc[prefName].external += camp.mealCounts[prefName].external;
        acc[prefName].total += camp.mealCounts[prefName].total;
      }
    });
    return acc;
  }, {});

  const totalMealPersonnel = mealPreferenceData.reduce((sum, camp) => sum + camp.totalPersonnel, 0);

  const exportToCSV = (type) => {
    let headers, rows;
    
    if (type === 'location') {
      headers = ['Location', 'Camp Name', 'Camp Code', 'Defined Capacity', 'Physical Beds', 'Occupied', 'Technician Beds', 'External Personnel Beds', 'Pending Exit Beds', 'Free', 'Status']; // Updated headers
      rows = [];
      
      Object.entries(locationWiseData).forEach(([location, camps]) => {
        camps.forEach((camp, index) => {
          rows.push([
            index === 0 ? location : '',
            camp.campName,
            camp.campCode,
            camp.definedCapacity,
            camp.totalBeds,
            camp.occupiedBeds,
            camp.technicianBeds,
            camp.externalBeds,
            camp.pendingExitBeds, // Added new field
            camp.freeBeds,
            camp.status
          ]);
        });
        
        // Add location subtotal
        const totals = getLocationTotals(camps);
        rows.push([
          `${location} - TOTAL`,
          '',
          '',
          totals.definedCapacity,
          totals.totalBeds,
          totals.occupiedBeds,
          totals.technicianBeds,
          totals.externalBeds,
          totals.pendingExitBeds, // Added new field
          totals.freeBeds,
          ''
        ]);
        rows.push(['', '', '', '', '', '', '', '', '', '', '']); // Empty row for separation, adjusted length
      });
    } else if (type === 'room-details') {
      headers = ['Camp Name', 'Camp Code', 'Camp Capacity', 'Floor Number', 'Floor Name', 'Room Number', 'Room Capacity', 'Occupant Type', 'Gender Restriction', 'Total Beds', 'Occupied Beds', 'Balance Beds', 'Occupancy %'];
      rows = filteredRoomDetails.map(room => [
        room.campName,
        room.campCode,
        room.campCapacity,
        room.floorNumber,
        room.floorName,
        room.roomNumber,
        room.roomCapacity,
        room.occupantType.replace(/_/g, ' '),
        room.genderRestriction,
        room.totalBeds,
        room.occupiedBeds,
        room.balanceBeds,
        `${room.occupancyRate}%`
      ]);
    } else if (type === 'status-wise') {
      headers = ['Technician Status', 'Technician Count', 'Beds Occupied'];
      rows = statusWiseBeds.map(item => [
        item.status.replace(/_/g, ' ').toUpperCase(),
        item.technicianCount,
        item.bedCount
      ]);
      rows.push(['', '', '']);
      rows.push(['TOTAL', totalTechnicians, totalBedsOccupied]);
    } else if (type === 'meal-preferences') {
      headers = ['Camp Name', 'Camp Code', 'Location', 'Total Personnel', 'Technicians', 'External', ...allMealPrefNames];
      rows = mealPreferenceData.map(camp => [
        camp.campName,
        camp.campCode,
        camp.location,
        camp.totalPersonnel,
        Object.values(camp.mealCounts).reduce((sum, mc) => sum + (mc.technicians || 0), 0),
        Object.values(camp.mealCounts).reduce((sum, mc) => sum + (mc.external || 0), 0),
        ...allMealPrefNames.map(prefName => camp.mealCounts[prefName]?.total || 0)
      ]);
      rows.push(['', '', '', '', '', '', ...allMealPrefNames.map(() => '')]);
      rows.push(['GRAND TOTAL', '', '', totalMealPersonnel, 
        Object.values(mealPrefGrandTotals).reduce((sum, mc) => sum + (mc.technicians || 0), 0),
        Object.values(mealPrefGrandTotals).reduce((sum, mc) => sum + (mc.external || 0), 0),
        ...allMealPrefNames.map(prefName => mealPrefGrandTotals[prefName]?.total || 0)]);
    } else {
      headers = ['Camp Name', 'Camp Code', 'Location', 'Defined Capacity', 'Physical Beds', 'Occupied', 'Technician Beds', 'External Personnel Beds', 'Pending Exit Beds', 'Free', 'Occupancy %', 'Status']; // Updated headers
      rows = campWiseData.map(camp => [
        camp.campName,
        camp.campCode,
        camp.location,
        camp.definedCapacity,
        camp.totalBeds,
        camp.occupiedBeds,
        camp.technicianBeds,
        camp.externalBeds,
        camp.pendingExitBeds, // Added new field
        camp.freeBeds,
        `${camp.occupancyRate}%`,
        camp.status
      ]);
    }

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report,
          #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
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
          @page {
            size: landscape;
            margin: 1cm;
          }
          /* Ensure sticky elements do not interfere with printing or are removed */
          #printable-report th.sticky, #printable-report td.sticky {
            position: static !important;
            left: auto !important;
            background-color: #f3f4f6 !important; /* Re-apply header bg */
            -webkit-print-color-adjust: exact; /* Ensure background prints */
            print-color-adjust: exact; /* Ensure background prints */
          }
          #printable-report td.sticky {
            background-color: inherit !important; /* For data rows, respect row color */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #printable-report tfoot tr.bg-gray-800 td.sticky {
            background-color: #1f2937 !important; /* For footer, respect footer color */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center no-print">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Building2 className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Capacity Reports</h1>
              <p className="text-gray-700 mt-1 font-medium">Camp occupancy and capacity analysis</p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 no-print">
          <Card className="border-none shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Building2 className="w-10 h-10 text-blue-700" />
              </div>
              <p className="text-sm text-blue-800 font-bold mb-1 uppercase tracking-wide">Total Camps</p>
              <p className="text-3xl font-extrabold text-blue-900">{camps.length}</p>
              <p className="text-xs text-blue-800 mt-2 font-semibold">{activeCamps} active</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 bg-gradient-to-br from-purple-100 via-purple-200 to-purple-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Bed className="w-10 h-10 text-purple-700" />
              </div>
              <p className="text-sm text-purple-800 font-bold mb-1 uppercase tracking-wide">Total Beds</p>
              <p className="text-3xl font-extrabold text-purple-900">{totalPhysicalBeds.toLocaleString()}</p>
              <p className="text-xs text-purple-800 mt-2 font-semibold">Physical beds</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 bg-gradient-to-br from-red-100 via-red-200 to-red-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-10 h-10 text-red-700" />
              </div>
              <p className="text-sm text-red-800 font-bold mb-1 uppercase tracking-wide">Occupied Beds</p>
              <p className="text-3xl font-extrabold text-red-900">{occupiedBeds.toLocaleString()}</p>
              <p className="text-xs text-red-800 mt-2 font-semibold">{occupancyRate}% occupancy</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 bg-gradient-to-br from-green-100 via-green-200 to-green-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Bed className="w-10 h-10 text-green-700" />
              </div>
              <p className="text-sm text-green-800 font-bold mb-1 uppercase tracking-wide">Available Beds</p>
              <p className="text-3xl font-extrabold text-green-900">{availableBeds.toLocaleString()}</p>
              <p className="text-xs text-green-800 mt-2 font-semibold">Ready to allocate</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 bg-gradient-to-br from-indigo-100 via-indigo-200 to-indigo-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-10 h-10 text-indigo-700" />
              </div>
              <p className="text-sm text-indigo-800 font-bold mb-1 uppercase tracking-wide">Technician Beds</p>
              <p className="text-3xl font-extrabold text-indigo-900">{technicianBedsSummary.toLocaleString()}</p>
              <p className="text-xs text-indigo-800 mt-2 font-semibold">{activeTechnicians} active, {pendingExitBedsSummary} exit</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 bg-gradient-to-br from-orange-100 via-orange-200 to-orange-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-10 h-10 text-orange-700" />
              </div>
              <p className="text-sm text-orange-800 font-bold mb-1 uppercase tracking-wide">External Beds</p>
              <p className="text-3xl font-extrabold text-orange-900">{externalBedsSummary.toLocaleString()}</p>
              <p className="text-xs text-orange-800 mt-2 font-semibold">{activeExternal} active</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert for Pending Exit Occupying Beds */}
        {pendingExitBedsSummary > 0 && (
          <Alert className="border-l-4 border-l-orange-600 bg-orange-50 no-print">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{pendingExitBedsSummary} bed(s)</strong> are currently occupied by technicians with <strong>pending_exit</strong> status.
              These beds will become available once these technicians leave the country.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="location" className="space-y-6">
          <div className="flex justify-between items-center no-print">
            <TabsList className="bg-white shadow-lg rounded-xl p-1.5">
              <TabsTrigger value="location" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white font-semibold rounded-lg px-4 py-2">
                <MapPin className="w-4 h-4" />
                Location-wise
              </TabsTrigger>
              <TabsTrigger value="camp" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white font-semibold rounded-lg px-4 py-2">
                <Building2 className="w-4 h-4" />
                Camp-wise
              </TabsTrigger>
              <TabsTrigger value="room-details" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white font-semibold rounded-lg px-4 py-2">
                <DoorOpen className="w-4 h-4" />
                Room Details
              </TabsTrigger>
              <TabsTrigger value="status-wise" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white font-semibold rounded-lg px-4 py-2">
                <Users className="w-4 h-4" />
                Status-wise Beds
              </TabsTrigger>
              <TabsTrigger value="meal-preferences" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-pink-600 data-[state=active]:text-white font-semibold rounded-lg px-4 py-2">
                <Utensils className="w-4 h-4" />
                Meal Preferences
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Location-wise Report */}
          <TabsContent value="location" className="space-y-6">
            <Card className="border-none shadow-2xl rounded-2xl overflow-hidden" id="printable-report">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-b no-print">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-bold">Location-wise Capacity Report</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToCSV('location')} className="border-white text-white hover:bg-white/20 font-semibold">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={printReport} className="border-white text-white hover:bg-white/20 font-semibold">
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gradient-to-r from-blue-100 to-purple-100">
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Camp Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Camp Code</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">Defined Capacity</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">Physical Beds</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">Occupied</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">Tech Beds</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-purple-700 uppercase tracking-wider">Ext Beds</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-orange-700 uppercase tracking-wider">Pending Exit</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">Free</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider no-print">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(locationWiseData).sort(([a], [b]) => a.localeCompare(b)).map(([location, camps], locationIndex) => (
                        <React.Fragment key={location}>
                          {camps.map((camp, campIndex) => (
                            <tr key={camp.campCode} className={campIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {campIndex === 0 ? (
                                <td rowSpan={camps.length} className="px-4 py-3 font-semibold text-gray-900 border-r-2 border-gray-300 align-top bg-blue-50">
                                  {location}
                                </td>
                              ) : null}
                              <td className="px-4 py-3 text-sm text-gray-900">{camp.campName}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{camp.campCode}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{camp.definedCapacity.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-700">{camp.totalBeds.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">{camp.occupiedBeds.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">{camp.technicianBeds.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right text-purple-600 font-medium">{camp.externalBeds.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right text-orange-600 font-medium">{camp.pendingExitBeds.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{camp.freeBeds.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm no-print">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  camp.status === 'active' ? 'bg-green-100 text-green-700' :
                                  camp.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {camp.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {/* Grand Total Row */}
                      <tr className="bg-gray-800 text-white font-bold border-t-4 border-gray-900">
                        <td className="px-4 py-3 text-sm text-right" colSpan="3">GRAND TOTAL</td>
                        <td className="px-4 py-3 text-sm text-right">{grandTotals.definedCapacity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right">{grandTotals.totalBeds.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right">{grandTotals.occupiedBeds.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right">{grandTotals.technicianBeds.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right">{grandTotals.externalBeds.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right">{grandTotals.pendingExitBeds.toLocaleString()}</td> {/* Added new total cell */}
                        <td className="px-4 py-3 text-sm text-right">{grandTotals.freeBeds.toLocaleString()}</td>
                        <td className="no-print"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Camp-wise Report */}
          <TabsContent value="camp" className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200" id="printable-report">
              <div className="bg-white border-b-4 border-blue-600 px-6 py-5 no-print">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Camp-wise Capacity Report</h2>
                      <p className="text-sm text-gray-600 mt-0.5">Detailed occupancy breakdown by camp</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToCSV('camp')} className="border-2 border-green-600 text-green-600 hover:bg-green-50 font-semibold">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={printReport} className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold">
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border border-gray-700">Camp Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border border-gray-700">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border border-gray-700">Location</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border border-gray-700">Capacity</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border border-gray-700">Physical</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border border-gray-700">Occupied</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-blue-300 uppercase border border-gray-700">Tech</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-purple-300 uppercase border border-gray-700">Ext</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-orange-300 uppercase border border-gray-700">Exit</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-green-300 uppercase border border-gray-700">Free</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border border-gray-700">Occupancy %</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border border-gray-700 no-print">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {campWiseData.map((camp, index) => (
                        <tr key={camp.campCode} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-300">{camp.campName}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-700 border border-gray-300">{camp.campCode}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 border border-gray-300">{camp.location}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-gray-900 border border-gray-300 bg-gray-50">{camp.definedCapacity.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center font-semibold text-gray-700 border border-gray-300">{camp.totalBeds.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-red-700 border border-gray-300 bg-red-50">{camp.occupiedBeds.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-blue-700 border border-gray-300 bg-blue-50">{camp.technicianBeds.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-purple-700 border border-gray-300 bg-purple-50">{camp.externalBeds.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-orange-700 border border-gray-300 bg-orange-50">{camp.pendingExitBeds.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-green-700 border border-gray-300 bg-green-50">{camp.freeBeds.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center border border-gray-300">
                            <span className={`inline-block px-3 py-1 font-bold text-sm border-2 ${
                              parseFloat(camp.occupancyRate) >= 90 ? 'bg-red-600 text-white border-red-700' :
                              parseFloat(camp.occupancyRate) >= 70 ? 'bg-yellow-500 text-gray-900 border-yellow-600' :
                              'bg-green-600 text-white border-green-700'
                            }`}>
                              {camp.occupancyRate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center border border-gray-300 no-print">
                            <span className={`inline-block px-3 py-1 font-semibold text-xs uppercase ${
                              camp.status === 'active' ? 'bg-green-600 text-white' :
                              camp.status === 'maintenance' ? 'bg-yellow-500 text-gray-900' :
                              'bg-gray-500 text-white'
                            }`}>
                              {camp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {/* Grand Total Row */}
                      <tr className="bg-blue-900 text-white font-extrabold border-4 border-blue-950">
                        <td className="px-4 py-4 text-sm text-right uppercase border border-blue-800" colSpan="3">GRAND TOTAL</td>
                        <td className="px-4 py-4 text-base text-center border border-blue-800">{grandTotals.definedCapacity.toLocaleString()}</td>
                        <td className="px-4 py-4 text-base text-center border border-blue-800">{grandTotals.totalBeds.toLocaleString()}</td>
                        <td className="px-4 py-4 text-base text-center border border-blue-800">{grandTotals.occupiedBeds.toLocaleString()}</td>
                        <td className="px-4 py-4 text-base text-center border border-blue-800">{grandTotals.technicianBeds.toLocaleString()}</td>
                        <td className="px-4 py-4 text-base text-center border border-blue-800">{grandTotals.externalBeds.toLocaleString()}</td>
                        <td className="px-4 py-4 text-base text-center border border-blue-800">{grandTotals.pendingExitBeds.toLocaleString()}</td>
                        <td className="px-4 py-4 text-base text-center border border-blue-800">{grandTotals.freeBeds.toLocaleString()}</td>
                        <td className="px-4 py-4 text-base text-center border border-blue-800">
                          {grandTotals.totalBeds > 0 ? ((grandTotals.occupiedBeds / grandTotals.totalBeds) * 100).toFixed(1) : 0}%
                        </td>
                        <td className="no-print border border-blue-800"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Room Details Report */}
          <TabsContent value="room-details" className="space-y-6">
            <div className="bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 rounded-2xl shadow-2xl overflow-hidden" id="printable-report">
              {hasActiveRoomFilters && (
                <div className="bg-teal-100 border-b-2 border-teal-300 px-6 py-3 no-print">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-teal-800 font-bold">
                      <Filter className="w-4 h-4 inline mr-2" />
                      Column filters active
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllRoomFilters}
                      className="text-teal-800 hover:text-teal-900 hover:bg-teal-200 font-semibold"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 px-6 py-5 border-b-4 border-emerald-700 no-print">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                      <DoorOpen className="w-9 h-9 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-white">Detailed Room-Level Report</h2>
                      <p className="text-cyan-100 mt-1 text-sm font-medium">Room-by-room occupancy breakdown</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToCSV('room-details')} className="border-2 border-white text-white hover:bg-white/20 font-bold backdrop-blur-sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={printReport} className="border-2 border-white text-white hover:bg-white/20 font-bold backdrop-blur-sm">
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-0 bg-white/80 backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500">
                        <th className="px-4 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wide sticky left-0 bg-gradient-to-r from-cyan-500 to-teal-500 z-10 shadow-lg">
                          <div className="flex items-center justify-between gap-2">
                            <span>Camp Name</span>
                            <div className="no-print">
                              <ColumnFilter
                                values={uniqueCampNames}
                                selected={filterCampName}
                                setSelected={setFilterCampName}
                                searchValue={searchCampName}
                                setSearchValue={setSearchCampName}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wide">Code</th>
                        <th className="px-4 py-4 text-right text-xs font-extrabold text-white uppercase tracking-wide">Capacity</th>
                        <th className="px-4 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wide">
                          <div className="flex items-center justify-between gap-2">
                            <span>Floor</span>
                            <div className="no-print">
                              <ColumnFilter
                                values={uniqueFloorNumbers}
                                selected={filterFloorNumber}
                                setSelected={setFilterFloorNumber}
                                searchValue={searchFloorNumber}
                                setSearchValue={setSearchFloorNumber}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wide">Floor Name</th>
                        <th className="px-4 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wide">
                          <div className="flex items-center justify-between gap-2">
                            <span>Room</span>
                            <div className="no-print">
                              <ColumnFilter
                                values={uniqueRoomNumbers}
                                selected={filterRoomNumber}
                                setSelected={setFilterRoomNumber}
                                searchValue={searchRoomNumber}
                                setSearchValue={setSearchRoomNumber}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-4 text-right text-xs font-extrabold text-white uppercase tracking-wide">Room Cap</th>
                        <th className="px-4 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wide">
                          <div className="flex items-center justify-between gap-2">
                            <span>Type</span>
                            <div className="no-print">
                              <ColumnFilter
                                values={uniqueOccupantTypes}
                                selected={filterOccupantType}
                                setSelected={setFilterOccupantType}
                                searchValue={searchOccupantType}
                                setSearchValue={setSearchOccupantType}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-extrabold text-white uppercase tracking-wide">
                          <div className="flex items-center justify-between gap-2">
                            <span>Gender</span>
                            <div className="no-print">
                              <ColumnFilter
                                values={uniqueGenderRestrictions}
                                selected={filterGenderRestriction}
                                setSelected={setFilterGenderRestriction}
                                searchValue={searchGenderRestriction}
                                setSearchValue={setSearchGenderRestriction}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-4 text-right text-xs font-extrabold text-white uppercase tracking-wide">Total</th>
                        <th className="px-4 py-4 text-right text-xs font-extrabold text-white uppercase tracking-wide">Occupied</th>
                        <th className="px-4 py-4 text-right text-xs font-extrabold text-white uppercase tracking-wide">Balance</th>
                        <th className="px-4 py-4 text-right text-xs font-extrabold text-white uppercase tracking-wide">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredRoomDetails.map((room, index) => (
                        <tr key={index} className={`transition-all hover:bg-teal-50 ${index % 2 === 0 ? 'bg-white' : 'bg-cyan-50/30'}`}>
                          <td className="px-4 py-3 text-sm text-gray-900 font-bold sticky left-0 bg-inherit shadow-sm">{room.campName}</td>
                          <td className="px-4 py-3 text-sm text-teal-700 font-semibold">{room.campCode}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-800 font-bold">{room.campCapacity.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-semibold">{room.floorNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{room.floorName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-extrabold">{room.roomNumber}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700 font-semibold">{room.roomCapacity}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                              room.occupantType === 'technician_only' ? 'bg-blue-500 text-white' :
                              room.occupantType === 'external_only' ? 'bg-purple-500 text-white' :
                              'bg-orange-500 text-white'
                            }`}>
                              {room.occupantType.replace(/_/g, ' ').replace(/only/i, '')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-3 py-1.5 bg-gray-700 text-white rounded-full text-xs font-bold shadow-sm">
                              {room.genderRestriction}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className="px-2 py-1 bg-gray-100 text-gray-900 rounded font-bold">
                              {room.totalBeds}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold">
                              {room.occupiedBeds}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">
                              {room.balanceBeds}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`px-3 py-1.5 rounded-full font-extrabold text-xs shadow-md ${
                              parseFloat(room.occupancyRate) >= 90 ? 'bg-red-600 text-white' :
                              parseFloat(room.occupancyRate) >= 70 ? 'bg-yellow-500 text-gray-900' :
                              'bg-green-600 text-white'
                            }`}>
                              {room.occupancyRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white font-extrabold border-t-4 border-teal-900 shadow-xl">
                        <td className="px-4 py-4 text-sm sticky left-0 bg-gradient-to-r from-teal-700 to-emerald-700 shadow-lg" colSpan="9">TOTAL ({filteredRoomDetails.length} rooms)</td>
                        <td className="px-4 py-4 text-base text-right">{filteredRoomDetails.reduce((sum, r) => sum + r.totalBeds, 0)}</td>
                        <td className="px-4 py-4 text-base text-right">{filteredRoomDetails.reduce((sum, r) => sum + r.occupiedBeds, 0)}</td>
                        <td className="px-4 py-4 text-base text-right">{filteredRoomDetails.reduce((sum, r) => sum + r.balanceBeds, 0)}</td>
                        <td className="px-4 py-4 text-base text-right">
                          {filteredRoomDetails.reduce((sum, r) => sum + r.totalBeds, 0) > 0 
                            ? ((filteredRoomDetails.reduce((sum, r) => sum + r.occupiedBeds, 0) / filteredRoomDetails.reduce((sum, r) => sum + r.totalBeds, 0)) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Status-wise Beds Report */}
          <TabsContent value="status-wise" className="space-y-6">
            <Card className="border-none shadow-lg" id="printable-report">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b no-print">
                <div className="flex justify-between items-center">
                  <CardTitle>Technician Status-wise Count</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToCSV('status-wise')} className="border-green-600 text-green-600 hover:bg-green-50">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={printReport} className="border-blue-600 text-blue-600 hover:bg-blue-50">
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase">Technician Status</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase">Technician Count</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-blue-700 uppercase">Beds Occupied</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusWiseBeds.map((item, index) => (
                        <tr key={item.status} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              item.status === 'active' ? 'bg-green-100 text-green-700' :
                              item.status === 'on_leave' ? 'bg-blue-100 text-blue-700' :
                              item.status === 'pending_arrival' ? 'bg-yellow-100 text-yellow-700' :
                              item.status === 'pending_exit' ? 'bg-orange-100 text-orange-700' :
                              item.status === 'exited_country' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {item.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">{item.technicianCount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">{item.bedCount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">
                            {totalTechnicians > 0 ? ((item.technicianCount / totalTechnicians) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-800 text-white font-bold border-t-4 border-gray-900">
                       <td className="px-6 py-4 text-sm">TOTAL</td>
                       <td className="px-6 py-4 text-sm text-right">{totalTechnicians.toLocaleString()}</td>
                       <td className="px-6 py-4 text-sm text-right">{totalBedsOccupied.toLocaleString()}</td>
                       <td className="px-6 py-4 text-sm text-right">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {statusWiseBeds.slice(0, 6).map(item => (
                    <Card key={item.status} className="border-none shadow-md">
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-600 mb-1 uppercase">{item.status.replace(/_/g, ' ')}</p>
                        <div className="flex items-baseline gap-2 mb-1">
                          <p className="text-2xl font-bold text-gray-900">{item.technicianCount}</p>
                          <p className="text-sm text-gray-500">technicians</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-lg font-semibold text-blue-600">{item.bedCount}</p>
                          <p className="text-xs text-gray-500">beds occupied</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meal Preferences Report */}
          <TabsContent value="meal-preferences" className="space-y-6">
            <Card className="border-none shadow-lg" id="printable-report">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b no-print">
                <div className="flex justify-between items-center">
                  <CardTitle>Camp-wise Meal Preferences Report</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToCSV('meal-preferences')} className="border-green-600 text-green-600 hover:bg-green-50">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={printReport} className="border-blue-600 text-blue-600 hover:bg-blue-50">
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-gray-50 z-10">Camp Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Camp Code</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Location</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-blue-700 uppercase">Tech</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-purple-700 uppercase">Ext</th>
                        {allMealPrefNames.map(prefName => (
                          <th key={prefName} className="px-4 py-3 text-right text-xs font-semibold text-orange-700 uppercase">
                            {prefName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mealPreferenceData.map((camp, index) => (
                        <tr key={camp.campId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-inherit">{camp.campName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{camp.campCode}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{camp.location}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{camp.totalPersonnel}</td>
                          <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                            {Object.values(camp.mealCounts).reduce((sum, mc) => sum + (mc.technicians || 0), 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-purple-600 font-medium">
                            {Object.values(camp.mealCounts).reduce((sum, mc) => sum + (mc.external || 0), 0)}
                          </td>
                          {allMealPrefNames.map(prefName => (
                            <td key={prefName} className="px-4 py-3 text-sm text-right text-orange-600 font-medium">
                              {camp.mealCounts[prefName]?.total || 0}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-800 text-white font-bold border-t-4 border-gray-900">
                        <td className="px-4 py-3 text-sm sticky left-0 bg-gray-800" colSpan="3">GRAND TOTAL</td>
                        <td className="px-4 py-3 text-sm text-right">{totalMealPersonnel}</td>
                        <td className="px-4 py-3 text-sm text-right text-blue-300">
                          {Object.values(mealPrefGrandTotals).reduce((sum, mc) => sum + (mc.technicians || 0), 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-purple-300">
                          {Object.values(mealPrefGrandTotals).reduce((sum, mc) => sum + (mc.external || 0), 0)}
                        </td>
                        {allMealPrefNames.map(prefName => (
                          <td key={prefName} className="px-4 py-3 text-sm text-right">
                            {mealPrefGrandTotals[prefName]?.total || 0}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards by Meal Preference */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 no-print">
              {allMealPrefNames.filter(name => mealPrefGrandTotals[name]?.total > 0).map((prefName, index) => {
                const colors = [
                  'from-orange-50 to-orange-100 text-orange-600',
                  'from-green-50 to-green-100 text-green-600',
                  'from-blue-50 to-blue-100 text-blue-600',
                  'from-purple-50 to-purple-100 text-purple-600',
                  'from-pink-50 to-pink-100 text-pink-600',
                  'from-yellow-50 to-yellow-100 text-yellow-600',
                  'from-red-50 to-red-100 text-red-600',
                  'from-indigo-50 to-indigo-100 text-indigo-600'
                ];
                const colorClass = colors[index % colors.length];
                
                return (
                  <Card key={prefName} className={`border-none shadow-md bg-gradient-to-br ${colorClass.split(' ').slice(0, 2).join(' ')}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Utensils className={`w-5 h-5 ${colorClass.split(' ').slice(2).join(' ')}`} />
                        <p className="text-sm font-semibold text-gray-700">{prefName}</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{mealPrefGrandTotals[prefName]?.total || 0}</p>
                      <div className="mt-2 text-xs text-gray-600">
                        <span className="font-medium">{mealPrefGrandTotals[prefName]?.technicians || 0}</span> Technicians • 
                        <span className="font-medium ml-1">{mealPrefGrandTotals[prefName]?.external || 0}</span> External
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}