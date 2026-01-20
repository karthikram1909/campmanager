import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Download, UserCheck, UserX, AlertCircle, CheckCircle2, Calendar as CalendarIcon, MapPin, Search, ArrowUpDown, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const [absentTableOpen, setAbsentTableOpen] = useState(true); // Added as per outline
  const [absentSearch, setAbsentSearch] = useState("");
  const [selectedAbsentIds, setSelectedAbsentIds] = useState([]); // New state for selected absent technicians
  const [filterAbsentName, setFilterAbsentName] = useState([]);
  const [filterAbsentEmpId, setFilterAbsentEmpId] = useState([]);
  const [filterAbsentNationality, setFilterAbsentNationality] = useState([]);
  const [filterAbsentCamp, setFilterAbsentCamp] = useState([]);
  const [filterAbsentFloor, setFilterAbsentFloor] = useState([]);
  const [filterAbsentRoom, setFilterAbsentRoom] = useState([]);
  const [filterAbsentBed, setFilterAbsentBed] = useState([]);

  const [searchAbsentName, setSearchAbsentName] = useState("");
  const [searchAbsentEmpId, setSearchAbsentEmpId] = useState("");
  const [searchAbsentNationality, setSearchAbsentNationality] = useState("");
  const [searchAbsentCamp, setSearchAbsentCamp] = useState("");
  const [searchAbsentFloor, setSearchAbsentFloor] = useState("");
  const [searchAbsentRoom, setSearchAbsentRoom] = useState("");
  const [searchAbsentBed, setSearchAbsentBed] = useState("");

  const [absentSortField, setAbsentSortField] = useState("employee_id");
  const [absentSortDirection, setAbsentSortDirection] = useState("asc");

  const queryClient = useQueryClient();

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => base44.entities.Attendance.filter({ date: selectedDate }),
  });

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

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.Attendance.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const activeTechnicians = technicians.filter(t => t.status === 'active');

  // Get present/absent lists
  const presentTechnicians = activeTechnicians.filter(tech => {
    const att = attendance.find(a => a.technician_id === tech.id);
    return att && att.status === 'present';
  });

  const absentTechnicians = activeTechnicians.filter(tech => {
    const att = attendance.find(a => a.technician_id === tech.id);
    return !att || att.status === 'absent';
  });

  // Group absent technicians by camp -> floor -> room (old functionality, kept for now but not used in new UI)
  const groupAbsentByLocation = () => {
    const grouped = {};

    absentTechnicians.forEach(tech => {
      if (!tech.bed_id) return;

      const bed = beds.find(b => b.id === tech.bed_id);
      if (!bed) return;

      const room = rooms.find(r => r.id === bed.room_id);
      if (!room) return;

      const floor = floors.find(f => f.id === room.floor_id);
      if (!floor) return;

      const camp = camps.find(c => c.id === floor.camp_id); // Assuming camp_id is on floor
      if (!camp) return;

      const campKey = camp.name;
      const floorKey = `Floor ${floor.floor_number}`;
      const roomKey = `Room ${room.room_number}`;

      if (!grouped[campKey]) grouped[campKey] = {};
      if (!grouped[campKey][floorKey]) grouped[campKey][floorKey] = {};
      if (!grouped[campKey][floorKey][roomKey]) grouped[campKey][floorKey][roomKey] = [];

      grouped[campKey][floorKey][roomKey].push(tech);
    });

    return grouped;
  };

  const absentGrouped = groupAbsentByLocation(); // Still called, but not used in JSX

  // Create flat list of absent technicians with location info
  const absentTechniciansWithLocation = absentTechnicians.map(tech => {
    const bed = beds.find(b => b.id === tech.bed_id);
    const room = bed ? rooms.find(r => r.id === bed.room_id) : null;
    const floor = room ? floors.find(f => f.id === room.floor_id) : null;
    // Assuming camp_id is directly on technician or derived from floor
    // Using tech.camp_id for consistency with data model if available
    const camp = camps.find(c => c.id === tech.camp_id);

    return {
      ...tech,
      camp_name: camp?.name || '-',
      floor_name: floor ? `Floor ${floor.floor_number}` : '-',
      room_name: room ? `Room ${room.room_number}` : '-',
      bed_name: bed ? `Bed ${bed.bed_number}` : '-'
    };
  });

  // Filter absent technicians
  let filteredAbsentTechs = absentTechniciansWithLocation.filter(tech => {
    const matchesSearch = !absentSearch ||
      tech.full_name?.toLowerCase().includes(absentSearch.toLowerCase()) ||
      tech.employee_id?.toLowerCase().includes(absentSearch.toLowerCase()) ||
      tech.nationality?.toLowerCase().includes(absentSearch.toLowerCase());

    return matchesSearch;
  });

  // Apply column filters
  if (filterAbsentName.length > 0) {
    filteredAbsentTechs = filteredAbsentTechs.filter(t => filterAbsentName.includes(t.full_name || '-'));
  }
  if (filterAbsentEmpId.length > 0) {
    filteredAbsentTechs = filteredAbsentTechs.filter(t => filterAbsentEmpId.includes(t.employee_id || '-'));
  }
  if (filterAbsentNationality.length > 0) {
    filteredAbsentTechs = filteredAbsentTechs.filter(t => filterAbsentNationality.includes(t.nationality || '-'));
  }
  if (filterAbsentCamp.length > 0) {
    filteredAbsentTechs = filteredAbsentTechs.filter(t => filterAbsentCamp.includes(t.camp_name));
  }
  if (filterAbsentFloor.length > 0) {
    filteredAbsentTechs = filteredAbsentTechs.filter(t => filterAbsentFloor.includes(t.floor_name));
  }
  if (filterAbsentRoom.length > 0) {
    filteredAbsentTechs = filteredAbsentTechs.filter(t => filterAbsentRoom.includes(t.room_name));
  }
  if (filterAbsentBed.length > 0) {
    filteredAbsentTechs = filteredAbsentTechs.filter(t => filterAbsentBed.includes(t.bed_name));
  }

  // Get unique values for filters
  const uniqueAbsentNames = [...new Set(absentTechniciansWithLocation.map(t => t.full_name || '-'))].sort();
  const uniqueAbsentEmpIds = [...new Set(absentTechniciansWithLocation.map(t => t.employee_id || '-'))].sort();
  const uniqueAbsentNationalities = [...new Set(absentTechniciansWithLocation.map(t => t.nationality || '-'))].sort();
  const uniqueAbsentCamps = [...new Set(absentTechniciansWithLocation.map(t => t.camp_name))].sort();
  const uniqueAbsentFloors = [...new Set(absentTechniciansWithLocation.map(t => t.floor_name))].sort();
  const uniqueAbsentRooms = [...new Set(absentTechniciansWithLocation.map(t => t.room_name))].sort();
  const uniqueAbsentBeds = [...new Set(absentTechniciansWithLocation.map(t => t.bed_name))].sort();

  // Sort absent technicians
  const sortedAbsentTechs = [...filteredAbsentTechs].sort((a, b) => {
    let aVal = a[absentSortField] || '';
    let bVal = b[absentSortField] || '';

    if (typeof aVal === 'string' && typeof bVal === 'string') {
        // Case-insensitive string comparison
        return absentSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
        // Numeric or other comparison
        if (absentSortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    }
  });


  const handleAbsentSort = (field) => {
    if (absentSortField === field) {
      setAbsentSortDirection(absentSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAbsentSortField(field);
      setAbsentSortDirection('asc');
    }
  };

  const clearAbsentFilters = () => {
    setFilterAbsentName([]);
    setFilterAbsentEmpId([]);
    setFilterAbsentNationality([]);
    setFilterAbsentCamp([]);
    setFilterAbsentFloor([]);
    setFilterAbsentRoom([]);
    setFilterAbsentBed([]);
  };

  const hasActiveAbsentFilters = filterAbsentName.length > 0 || filterAbsentEmpId.length > 0 ||
    filterAbsentNationality.length > 0 || filterAbsentCamp.length > 0 || filterAbsentFloor.length > 0 ||
    filterAbsentRoom.length > 0 || filterAbsentBed.length > 0;

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


  const downloadTemplate = () => {
    const template = `employee_id
EMP001
EMP002
EMP003`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_template_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        data.push(obj);
      }
    }

    return data;
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await bulkFile.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setUploadResult({ success: false, error: "No valid data found in CSV file" });
        setUploading(false);
        return;
      }

      // Get employee IDs from CSV
      const presentEmployeeIds = rows.map(r => r.employee_id).filter(Boolean);

      // Find matching technicians
      const presentTechIds = activeTechnicians
        .filter(tech => presentEmployeeIds.includes(tech.employee_id))
        .map(tech => tech.id);

      // Create attendance records for ALL active technicians
      const attendanceRecords = activeTechnicians.map(tech => ({
        technician_id: tech.id,
        date: selectedDate,
        status: presentTechIds.includes(tech.id) ? 'present' : 'absent',
        marked_by: currentUser?.id
      }));

      await bulkCreateMutation.mutateAsync(attendanceRecords);

      setUploadResult({
        success: true,
        present: presentTechIds.length,
        absent: activeTechnicians.length - presentTechIds.length,
        total: activeTechnicians.length
      });

      setBulkFile(null);
      setShowUploadDialog(false);

    } catch (error) {
      setUploadResult({ success: false, error: error.message });
    }

    setUploading(false);
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Attendance</h1>
            <p className="text-gray-600 mt-1">Track who's present and locate absent technicians</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(true)}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Attendance
            </Button>
          </div>
        </div>

        {/* Date Selector */}
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Label>Select Date</Label>
                <div className="relative mt-2">
                  <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Showing attendance for: <strong>{format(new Date(selectedDate), 'MMM dd, yyyy')}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Result */}
        {uploadResult && (
          <Alert variant={uploadResult.success ? "default" : "destructive"}>
            <AlertDescription>
              {uploadResult.success ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    Attendance marked successfully!
                    <div className="mt-1 text-sm">
                      ✅ Present: {uploadResult.present} | ❌ Absent: {uploadResult.absent} | Total: {uploadResult.total}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Error: {uploadResult.error}</span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Active</p>
                  <p className="text-3xl font-bold text-blue-900">{activeTechnicians.length}</p>
                </div>
                <UserCheck className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Present</p>
                  <p className="text-3xl font-bold text-green-900">{presentTechnicians.length}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Absent</p>
                  <p className="text-3xl font-bold text-red-900">{absentTechnicians.length}</p>
                </div>
                <UserX className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Present Technicians */}
        {presentTechnicians.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Present Today ({presentTechnicians.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {presentTechnicians.map(tech => (
                  <div key={tech.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{tech.full_name}</p>
                        <p className="text-xs text-gray-600">{tech.employee_id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Absent Technicians - Table Format */}
        {absentTechnicians.length > 0 && (
          <Card className="border-l-4 border-l-red-500 shadow-lg">
            {hasActiveAbsentFilters && (
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-700 font-medium">
                    <Filter className="w-4 h-4 inline mr-2" />
                    Column filters active
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAbsentFilters}
                    className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}

            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-red-600" />
                  Absent Today - Action Required ({absentTechnicians.length})
                  {selectedAbsentIds.length > 0 && (
                    <Badge className="bg-orange-600 ml-2">
                      {selectedAbsentIds.length} selected
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  {selectedAbsentIds.length > 0 && (
                    <Link to={`${createPageUrl("DailyActivityLog")}?date=${selectedDate}&preselected=${selectedAbsentIds.join(',')}`}>
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                        <MapPin className="w-4 h-4 mr-2" />
                        Update Selected in Activity Log ({selectedAbsentIds.length})
                      </Button>
                    </Link>
                  )}
                  <Link to={createPageUrl("DailyActivityLog")}>
                    <Button size="sm" variant="outline" className="border-orange-600 text-orange-600 hover:bg-orange-50">
                      <MapPin className="w-4 h-4 mr-2" />
                      Go to Activity Log
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <Alert className="mb-4 border-orange-300 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>Camp Boss Action Required:</strong> Select absent technicians and click "Update Selected in Activity Log" to record their actual status (hospital visit, visa renewal, etc.). 
                  Or visit rooms individually to check on them.
                </AlertDescription>
              </Alert>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, employee ID, or nationality..."
                    value={absentSearch}
                    onChange={(e) => setAbsentSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="px-3 py-3 text-left bg-gray-50 border-r border-gray-200">
                        <Checkbox
                          checked={selectedAbsentIds.length === sortedAbsentTechs.length && sortedAbsentTechs.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAbsentIds(sortedAbsentTechs.map(t => t.id));
                            } else {
                              setSelectedAbsentIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-1">
                          <span>Employee ID</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAbsentSort('employee_id')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueAbsentEmpIds}
                              selected={filterAbsentEmpId}
                              setSelected={setFilterAbsentEmpId}
                              searchValue={searchAbsentEmpId}
                              setSearchValue={setSearchAbsentEmpId}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-1">
                          <span>Full Name</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAbsentSort('full_name')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueAbsentNames}
                              selected={filterAbsentName}
                              setSelected={setFilterAbsentName}
                              searchValue={searchAbsentName}
                              setSearchValue={setSearchAbsentName}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-1">
                          <span>Nationality</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAbsentSort('nationality')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueAbsentNationalities}
                              selected={filterAbsentNationality}
                              setSelected={setFilterAbsentNationality}
                              searchValue={searchAbsentNationality}
                              setSearchValue={setSearchAbsentNationality}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-1">
                          <span>Camp</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAbsentSort('camp_name')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueAbsentCamps}
                              selected={filterAbsentCamp}
                              setSelected={setFilterAbsentCamp}
                              searchValue={searchAbsentCamp}
                              setSearchValue={setSearchAbsentCamp}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-1">
                          <span>Floor</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAbsentSort('floor_name')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueAbsentFloors}
                              selected={filterAbsentFloor}
                              setSelected={setFilterAbsentFloor}
                              searchValue={searchAbsentFloor}
                              setSearchValue={setSearchAbsentFloor}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-1">
                          <span>Room</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAbsentSort('room_name')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueAbsentRooms}
                              selected={filterAbsentRoom}
                              setSelected={setFilterAbsentRoom}
                              searchValue={searchAbsentRoom}
                              setSearchValue={setSearchAbsentRoom}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-1">
                          <span>Bed</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAbsentSort('bed_name')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueAbsentBeds}
                              selected={filterAbsentBed}
                              setSelected={setFilterAbsentBed}
                              searchValue={searchAbsentBed}
                              setSearchValue={setSearchAbsentBed}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAbsentTechs.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                          {absentSearch || hasActiveAbsentFilters ? 'No technicians match your filters' : 'No absent technicians'}
                        </td>
                      </tr>
                    ) : (
                      sortedAbsentTechs.map((tech, index) => (
                        <tr
                          key={tech.id}
                          className={`border-b border-gray-200 hover:bg-red-50 transition-colors cursor-pointer ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } ${selectedAbsentIds.includes(tech.id) ? 'bg-orange-50' : ''}`}
                          onClick={() => {
                            if (selectedAbsentIds.includes(tech.id)) {
                              setSelectedAbsentIds(selectedAbsentIds.filter(id => id !== tech.id));
                            } else {
                              setSelectedAbsentIds([...selectedAbsentIds, tech.id]);
                            }
                          }}
                        >
                          <td className="px-3 py-3 border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedAbsentIds.includes(tech.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAbsentIds([...selectedAbsentIds, tech.id]);
                                } else {
                                  setSelectedAbsentIds(selectedAbsentIds.filter(id => id !== tech.id));
                                }
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-blue-600 border-r border-gray-200 whitespace-nowrap">
                            {tech.employee_id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                            {tech.full_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {tech.nationality || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {tech.camp_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {tech.floor_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {tech.room_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {tech.bed_name}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <Badge variant="destructive">ABSENT</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              {sortedAbsentTechs.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{sortedAbsentTechs.length}</span> of <span className="font-semibold">{absentTechnicians.length}</span> absent technicians
                  </div>
                  {selectedAbsentIds.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAbsentIds([])}
                      className="text-gray-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear Selection
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No Attendance Data */}
        {attendance.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center text-gray-500">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No Attendance Data for This Date</p>
              <p className="text-sm mt-2">Upload attendance file to mark present/absent technicians</p>
              <Button
                onClick={() => setShowUploadDialog(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Attendance Now
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload Daily Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Upload a CSV file with employee IDs of technicians who are PRESENT today.
                All other active technicians will be marked as ABSENT.
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 mb-2">
                <strong>How it works:</strong>
              </p>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Upload CSV with employee IDs of present technicians</li>
                <li>System marks them as PRESENT</li>
                <li>All other active technicians marked as ABSENT</li>
                <li>Check absent list to locate technicians in their rooms</li>
                <li>Update actual status in Daily Activity Log</li>
              </ol>
            </div>

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>

            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setBulkFile(e.target.files[0])}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setBulkFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={!bulkFile || uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? 'Processing...' : 'Upload & Mark Attendance'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}