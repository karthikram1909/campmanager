import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Plus, Building2, Layers, DoorOpen, Bed, ChevronDown, ChevronRight, Download, Printer, Upload, QrCode, FileText, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format, parseISO, differenceInDays } from 'date-fns';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Camps() {
  const [showAddCampDialog, setShowAddCampDialog] = useState(false);
  const [showEditCampDialog, setShowEditCampDialog] = useState(false);
  const [editingCamp, setEditingCamp] = useState(null);
  const [showAddFloorDialog, setShowAddFloorDialog] = useState(false);
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false);
  const [showAddBedDialog, setShowAddBedDialog] = useState(false);
  const [showBulkStructureDialog, setShowBulkStructureDialog] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [campData, setCampData] = useState({});
  const [floorData, setFloorData] = useState({});
  const [roomData, setRoomData] = useState({});
  const [bedData, setBedData] = useState({});
  const [expandedCamps, setExpandedCamps] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [selectedCampForBarcodes, setSelectedCampForBarcodes] = useState(null);
  const [generatingBarcodes, setGeneratingBarcodes] = useState(false);
  const [capacityWarnings, setCapacityWarnings] = useState({}); // This state is kept as per outline, though not directly used for setting warnings (derived data is preferred).
  const [campTabs, setCampTabs] = useState({}); // Track active tab per camp (default: "structure")

  const queryClient = useQueryClient();

  const { data: camps = [], refetch: refetchCamps, isRefetching: isRefetchingCamps, isLoading: isLoadingCamps } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
    staleTime: 0, // Always refetch to get latest data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  const { data: floors = [], refetch: refetchFloors } = useQuery({
    queryKey: ['floors'],
    queryFn: () => base44.entities.Floor.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: beds = [], refetch: refetchBeds } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: externalPersonnel = [] } = useQuery({
    queryKey: ['external-personnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: campDocuments = [] } = useQuery({
    queryKey: ['camp-documents'],
    queryFn: () => base44.entities.CampDocument.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Helper to get ejari expiry date for a camp
  const getEjariExpiryDate = (campId) => {
    const ejariDocs = campDocuments.filter(doc => 
      doc.camp_id === campId && 
      doc.document_type === 'ejari' && 
      doc.expiry_date
    );
    if (ejariDocs.length === 0) return null;
    // Get the latest expiry date if multiple ejari docs exist
    return ejariDocs.sort((a, b) => new Date(b.expiry_date) - new Date(a.expiry_date))[0].expiry_date;
  };

  // Manual refresh function
  const handleRefreshAll = async () => {
    await Promise.all([
      refetchCamps(),
      refetchFloors(),
      refetchRooms(),
      refetchBeds()
    ]);
  };

  // Get all capacity mismatches for a camp - including zero capacity rooms
  const getCampCapacityIssues = (campId) => {
    const campFloors = floors.filter(f => f.camp_id === campId);
    const campRooms = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
    
    const issues = [];
    campRooms.forEach(room => {
      const roomBeds = beds.filter(b => b.room_id === room.id);
      const actualBeds = roomBeds.length;
      const definedCapacity = room.capacity || 0; // Treat null/undefined capacity as 0
      
      // Flag rooms with zero capacity or mismatched capacity
      if (definedCapacity === 0 || actualBeds !== definedCapacity) {
        const floor = floors.find(f => f.id === room.floor_id);
        issues.push({
          roomId: room.id,
          definedCapacity,
          actualBeds,
          difference: definedCapacity - actualBeds,
          roomNumber: room.room_number,
          floorNumber: floor?.floor_number,
          isZeroCapacity: definedCapacity === 0
        });
      }
    });
    
    return issues;
  };

  // Filter camps that have GPS coordinates
  const campsWithCoordinates = camps.filter(camp => 
    camp.latitude !== null && camp.latitude !== undefined &&
    camp.longitude !== null && camp.longitude !== undefined &&
    typeof camp.latitude === 'number' && typeof camp.longitude === 'number'
  );

  // Calculate default center (average of all camp coordinates, or Dubai default)
  const defaultCenter = campsWithCoordinates.length > 0
    ? [
        campsWithCoordinates.reduce((sum, camp) => sum + camp.latitude, 0) / campsWithCoordinates.length,
        campsWithCoordinates.reduce((sum, camp) => sum + camp.longitude, 0) / campsWithCoordinates.length
      ]
    : [25.2048, 55.2708]; // Dubai default

  const createCampMutation = useMutation({
    mutationFn: (data) => base44.entities.Camp.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['camps'] });
      await refetchCamps(); // Force immediate refetch
      setShowAddCampDialog(false);
      setCampData({}); // Changed from setFormData to setCampData for consistency
      alert("Camp created successfully!");
    },
  });

  const updateCampMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Camp.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['camps'] });
      await refetchCamps(); // Force immediate refetch
      setShowEditCampDialog(false);
      setEditingCamp(null);
      setCampData({});
      alert("Camp updated successfully!");
    },
  });

  const createFloorMutation = useMutation({
    mutationFn: (data) => base44.entities.Floor.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['floors'] });
      await refetchFloors(); // Force immediate refetch
      setShowAddFloorDialog(false);
      setFloorData({}); // Changed from setFloorFormData to setFloorData for consistency
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.Room.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      await refetchRooms(); // Force immediate refetch
      setShowAddRoomDialog(false);
      setRoomData({}); // Changed from setRoomFormData to setRoomData for consistency
    },
  });

  const createBedMutation = useMutation({
    mutationFn: (data) => base44.entities.Bed.create(data),
    onSuccess: async () => { // Added async
      await queryClient.invalidateQueries({ queryKey: ['beds'] });
      await refetchBeds(); // Force immediate refetch
      setShowAddBedDialog(false);
      setBedData({});
    },
  });

  // New bulk mutations
  const bulkCreateFloorsMutation = useMutation({
    mutationFn: (data) => base44.entities.Floor.bulkCreate(data),
    onSuccess: async () => { // Added async
      await queryClient.invalidateQueries({ queryKey: ['floors'] });
      await refetchFloors(); // Force immediate refetch
    },
  });

  const bulkCreateRoomsMutation = useMutation({
    mutationFn: (data) => base44.entities.Room.bulkCreate(data),
    onSuccess: async () => { // Added async
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      await refetchRooms(); // Force immediate refetch
    },
  });

  const bulkCreateBedsMutation = useMutation({
    mutationFn: (data) => base44.entities.Bed.bulkCreate(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['beds'] });
      await refetchBeds(); // Force immediate refetch
      // setShowAddBedsDialog(false); // Commented out as `setShowAddBedsDialog` not defined
      // setBedsFormData({ number_of_beds: 1 }); // Commented out as `setBedsFormData` not defined
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Room.update(id, data),
    onSuccess: async () => { // Added async
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      await refetchRooms(); // Force immediate refetch
      await queryClient.invalidateQueries({ queryKey: ['floors'] }); // Invalidate floors too, as they might have been created via bulk upload which impacts rooms
      await refetchFloors(); // Force immediate refetch
      await queryClient.invalidateQueries({ queryKey: ['camps'] }); // Invalidate camps too for completeness
      await refetchCamps(); // Force immediate refetch
    },
  });

  // Add mutation to update room capacity
  const updateRoomCapacityMutation = useMutation({
    mutationFn: ({ id, capacity }) => base44.entities.Room.update(id, { capacity }),
    onSuccess: async () => { // Added async
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      await refetchRooms(); // Force immediate refetch
    },
  });

  const updateBedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bed.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['beds'] });
      await refetchBeds(); // Force immediate refetch
      // setShowEditBedDialog(false); // Commented out as `setShowEditBedDialog` not defined
      // setEditingBed(null); // Commented out as `setEditingBed` not defined
    },
  });

  const deleteBedMutation = useMutation({
    mutationFn: (id) => base44.entities.Bed.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['beds'] });
      await refetchBeds(); // Force immediate refetch
    },
  });

  const handleAddCamp = (e) => {
    e.preventDefault();
    createCampMutation.mutate(campData);
  };

  const handleEditCamp = (e) => {
    e.preventDefault();
    if (editingCamp) {
      updateCampMutation.mutate({ id: editingCamp.id, data: campData });
    }
  };

  const handleAddFloor = (e) => {
    e.preventDefault();
    createFloorMutation.mutate(floorData);
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    
    // Validate capacity is a positive number
    if (!roomData.capacity || roomData.capacity < 1) {
      alert("Capacity must be at least 1 bed. Please enter a valid number of beds for this room.");
      return;
    }
    
    createRoomMutation.mutate(roomData);
  };

  const handleAddBed = (e) => {
    e.preventDefault();
    
    // Check if adding this bed would exceed room capacity
    const room = rooms.find(r => r.id === selectedRoom.id);
    if (room) {
      // Special check for zero capacity
      if (room.capacity === 0 || !room.capacity) {
        alert(`Cannot add bed: Room ${room.room_number} has capacity set to 0. Please update the room capacity first by clicking "Fix Capacity" or editing the room.`);
        return;
      }
      
      const currentBeds = beds.filter(b => b.room_id === room.id).length;
      if (currentBeds >= room.capacity) {
        alert(`Cannot add bed: Room ${room.room_number} is already at full capacity (${room.capacity} beds). Please increase room capacity first.`);
        return;
      }
    }
    
    createBedMutation.mutate(bedData);
  };

  const toggleCamp = (campId) => {
    setExpandedCamps(prev => ({ ...prev, [campId]: !prev[campId] }));
  };

  const toggleFloor = (floorId) => {
    setExpandedFloors(prev => ({ ...prev, [floorId]: !prev[floorId] }));
  };

  const handleFixCapacity = async (roomId, suggestedCapacity) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    const actualBeds = beds.filter(b => b.room_id === roomId).length;
    
    // If room has 0 capacity and no beds, ask user to set capacity
    if ((room.capacity === 0 || !room.capacity) && actualBeds === 0) {
      const newCapacity = prompt(`Room ${room.room_number} has 0 capacity. Please enter the correct capacity (number of beds):`, suggestedCapacity || '4');
      if (newCapacity && !isNaN(parseInt(newCapacity)) && parseInt(newCapacity) >= 0) { // Capacity can be 0 or more
        await updateRoomCapacityMutation.mutateAsync({ id: roomId, capacity: parseInt(newCapacity) });
      }
      return;
    }
    
    // If room has beds, update capacity to match actual beds, or if capacity is zero but beds exist
    if (confirm(`Update room ${room.room_number} capacity from ${room.capacity} to ${actualBeds} beds?`)) {
      await updateRoomCapacityMutation.mutateAsync({ id: roomId, capacity: actualBeds });
    }
  };

  const getCampStats = (campId) => {
    const campFloors = floors.filter(f => f.camp_id === campId);
    const campRooms = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
    const campBeds = beds.filter(b => campRooms.some(r => r.id === b.room_id));
    
    // Total stats for the camp
    const occupiedBedsCount = campBeds.filter(b => b.status === 'occupied').length;
    const totalPhysicalBeds = campBeds.length;
    const availableBedsCount = campBeds.filter(b => b.status === 'available').length;
    
    // Technician-specific stats (beds in rooms designated for technician_only)
    const technicianRooms = campRooms.filter(r => r.occupant_type === 'technician_only');
    const technicianRoomBeds = campBeds.filter(b => technicianRooms.some(r => r.id === b.room_id));
    const totalTechnicianBeds = technicianRoomBeds.length;
    const technicianBeds = technicianRoomBeds.filter(b => b.status === 'occupied').length; // Occupied beds in technician-only rooms
    const technicianBedsAvailable = technicianRoomBeds.filter(b => b.status === 'available').length;
    
    // External personnel-specific stats (beds in rooms designated for external_only)
    const externalRooms = campRooms.filter(r => r.occupant_type === 'external_only');
    const externalRoomBeds = campBeds.filter(b => externalRooms.some(r => r.id === b.room_id));
    const totalExternalBeds = externalRoomBeds.length;
    const externalBeds = externalRoomBeds.filter(b => b.status === 'occupied').length; // Occupied beds in external-only rooms
    const externalBedsAvailable = externalRoomBeds.filter(b => b.status === 'available').length;
    
    // Mixed-occupancy stats (beds in rooms designated for mixed)
    const mixedRooms = campRooms.filter(r => r.occupant_type === 'mixed');
    const mixedRoomBeds = campBeds.filter(b => mixedRooms.some(r => r.id === b.room_id));
    const totalMixedBeds = mixedRoomBeds.length;
    const mixedBedsAvailable = mixedRoomBeds.filter(b => b.status === 'available').length;

    return {
      floors: campFloors.length,
      rooms: campRooms.length,
      beds: totalPhysicalBeds,
      occupiedBeds: occupiedBedsCount,
      availableBeds: availableBedsCount,
      occupancy: totalPhysicalBeds > 0 ? ((occupiedBedsCount / totalPhysicalBeds) * 100).toFixed(1) : 0,
      
      // Technician stats
      technicianBeds, // This refers to occupied beds in technician-only rooms
      totalTechnicianBeds,
      technicianBedsAvailable,
      technicianOccupancy: totalTechnicianBeds > 0 ? ((technicianBeds / totalTechnicianBeds) * 100).toFixed(1) : 0,
      
      // External stats
      externalBeds, // This refers to occupied beds in external-only rooms
      totalExternalBeds,
      externalBedsAvailable,
      externalOccupancy: totalExternalBeds > 0 ? ((externalBeds / totalExternalBeds) * 100).toFixed(1) : 0,
      
      // Mixed stats
      totalMixedBeds,
      mixedBedsAvailable
    };
  };

  const exportToCSV = () => {
    // Headers for the CSV file
    const headers = ['Camp Code', 'Camp Name', 'Location', 'Defined Capacity', 'Current Occupancy (Physical Beds)', 'Occupancy Rate (vs. Defined Capacity)', 'Available Capacity (vs. Defined Capacity)', 'Status', 'Coordinates'];
    
    // Process and sort camp data for the CSV
    const allCampsData = [...camps]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(camp => {
        const stats = getCampStats(camp.id);
        const current_occupancy = stats.occupiedBeds;
        const total_defined_capacity = camp.capacity;
        
        const occupancyRate = total_defined_capacity > 0 
          ? ((current_occupancy / total_defined_capacity) * 100).toFixed(1) 
          : 0;
        const available_beds_capacity = total_defined_capacity - current_occupancy;

        return [
          camp.code || '-',
          camp.name || '-',
          camp.location || '-',
          total_defined_capacity,
          current_occupancy,
          `${occupancyRate}%`,
          available_beds_capacity,
          camp.status || '-',
          camp.latitude && camp.longitude ? `${camp.latitude}, ${camp.longitude}` : '-'
        ];
    });

    // Create CSV string
    const csv = [headers, ...allCampsData].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Create a Blob and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `camps_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const downloadStructureTemplate = () => {
    const template = `# Camp Structure Template - Upload floors, rooms, and beds together
# camp_code: Use the camp code (e.g., SAJJA). This must match an existing camp code in the system.
# floor_number: Floor identifier (e.g., GF, 1, 2, B1)
# floor_name: Optional, e.g., Ground Floor, First Floor
# room_number: Room number (e.g., 101, 102, 201)
# room_capacity: Number of beds in room
# room_gender_restriction: male, female, or mixed (default: mixed)
# room_occupant_type: technician_only, external_only, staff_only, or mixed (default: technician_only)
# room_nationality_group: Optional, e.g., Asian, Middle Eastern
# bed_number: Bed identifier (e.g., 1, 2, A, B)
# bed_status: available, occupied, reserved, or maintenance (default: available)

camp_code,floor_number,floor_name,room_number,room_capacity,room_gender_restriction,room_occupant_type,room_nationality_group,bed_number,bed_status
SAJJA,GF,Ground Floor,101,4,male,technician_only,,1,available
SAJJA,GF,Ground Floor,101,4,male,technician_only,,2,available
SAJJA,GF,Ground Floor,101,4,male,technician_only,,3,available
SAJJA,GF,Ground Floor,101,4,male,technician_only,,4,available
SAJJA,GF,Ground Floor,102,4,female,external_only,,1,available
SAJJA,GF,Ground Floor,102,4,female,external_only,,2,available
SAJJA,1,First Floor,201,6,male,mixed,Asian,1,available
SAJJA,1,First Floor,201,6,male,mixed,Asian,2,available
SAJJA,1,First Floor,202,3,mixed,,   # Example: Room 202 capacity 3, no explicit beds. All 3 beds will be auto-generated.
SAJJA,1,First Floor,203,2,female,,BedA,available # Example: Room 203 capacity 2, one explicit bed (BedA). One more bed will be auto-generated (Bed 2).
SAJJA,1,First Floor,204,1,male,,BedX,available
SAJJA,1,First Floor,204,1,male,,BedY,available # Example: Room 204 capacity 1, but two explicit beds. BedY will be ignored, and a warning will be issued.
`;

    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'camp_structure_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    // Handle Byte Order Mark (BOM)
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    const lines = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    if (lines.length < 1) return []; // Only headers, or empty

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

  const handleBulkStructureUpload = async () => {
    if (!bulkFile) {
      setUploadResult({ success: false, error: "Please select a CSV file." });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    // Initialize processing errors array
    const processingErrors = [];

    try {
      console.log('Starting bulk upload...');
      const text = await bulkFile.text();
      console.log('File read successfully, parsing CSV...');
      
      const rawRows = parseCSV(text);
      console.log(`Parsed ${rawRows.length} raw rows from CSV:`, rawRows);

      if (rawRows.length === 0) {
        setUploadResult({ success: false, error: "No valid data found in CSV file. Make sure to remove comment lines (starting with #)." });
        setUploading(false);
        return;
      }

      // First Pass: Group by camp_code -> floor_number -> room_number
      // Each room will store its collected beds and capacity
      const campStructures = {};
      
      rawRows.forEach((row, rowIndex) => {
        const campCode = (row.camp_code || '').trim();
        const floorNumber = (row.floor_number || '').trim();
        const roomNumber = (row.room_number || '').trim();
        let roomCapacity = parseInt(row.room_capacity);

        if (!campCode) {
          processingErrors.push(`Row ${rowIndex + 2}: Missing 'camp_code'. This row will be skipped.`);
          return;
        }
        if (!floorNumber) {
          processingErrors.push(`Row ${rowIndex + 2}: Missing 'floor_number' for camp '${campCode}'. This row will be skipped.`);
          return;
        }
        if (!roomNumber) {
          processingErrors.push(`Row ${rowIndex + 2}: Missing 'room_number' for camp '${campCode}', floor '${floorNumber}'. This row will be skipped.`);
          return;
        }
        if (isNaN(roomCapacity) || roomCapacity < 0) { // Capacity can be 0 if no beds are desired
          processingErrors.push(`Row ${rowIndex + 2}: Invalid 'room_capacity' for camp '${campCode}', floor '${floorNumber}', room '${roomNumber}'. Capacity must be a non-negative number. Setting to default 1.`);
          roomCapacity = 1; // Default to 1 if invalid
        }

        const campCodeUpper = campCode.toUpperCase();
        
        if (!campStructures[campCodeUpper]) {
          campStructures[campCodeUpper] = {};
        }
        
        if (!campStructures[campCodeUpper][floorNumber]) {
          campStructures[campCodeUpper][floorNumber] = {
            floor_data: {
              camp_id: null, // Will be filled later
              floor_number: floorNumber,
              name: row.floor_name || null
            },
            rooms: {}
          };
        }
        
        if (!campStructures[campCodeUpper][floorNumber].rooms[roomNumber]) {
          // Parse occupant_type with proper defaults
          let occupantType = (row.room_occupant_type || '').trim().toLowerCase();
          if (!occupantType || !['technician_only', 'external_only', 'staff_only', 'mixed'].includes(occupantType)) {
            occupantType = 'technician_only'; // Default value
          }

          // Parse gender_restriction with proper defaults
          let genderRestriction = (row.room_gender_restriction || '').trim().toLowerCase();
          if (!genderRestriction || !['male', 'female', 'mixed'].includes(genderRestriction)) {
            genderRestriction = 'mixed'; // Default value
          }

          campStructures[campCodeUpper][floorNumber].rooms[roomNumber] = {
            room_data: {
              floor_id: null, // Will be filled later
              room_number: roomNumber,
              capacity: roomCapacity, // Store parsed capacity from the first encounter
              gender_restriction: genderRestriction,
              occupant_type: occupantType,
              nationality_group: row.room_nationality_group || null
            },
            explicit_beds: [] // Store beds explicitly listed in CSV
          };
        } else {
          // If room exists, and a new capacity is provided, it should match the existing one.
          // For simplicity now, we take the first `room_capacity` encountered.
          // A more robust implementation would check for consistency and error if different.
          if (campStructures[campCodeUpper][floorNumber].rooms[roomNumber].room_data.capacity !== roomCapacity) {
            processingErrors.push(`Row ${rowIndex + 2}: Camp '${campCodeUpper}', Floor '${floorNumber}', Room '${roomNumber}': Conflicting 'room_capacity' found. Using the first encountered capacity (${campStructures[campCodeUpper][floorNumber].rooms[roomNumber].room_data.capacity}).`);
          }
        }

        // Add bed from current row if bed_number is present and not empty
        if (row.bed_number && row.bed_number.trim() !== '') {
            campStructures[campCodeUpper][floorNumber].rooms[roomNumber].explicit_beds.push({
                bed_number: row.bed_number.trim(),
                status: (row.bed_status || 'available').trim().toLowerCase(),
                room_id: null, // Will be filled later
            });
        }
      });

      console.log('Structured initial data (explicit beds):', campStructures);

      // Second Pass: Validate capacities and auto-generate beds
      const finalCampStructures = {}; // Will hold structures with auto-generated beds
      for (const campCodeUpper in campStructures) {
          finalCampStructures[campCodeUpper] = {};
          for (const floorNumber in campStructures[campCodeUpper]) {
              finalCampStructures[campCodeUpper][floorNumber] = {
                  floor_data: campStructures[campCodeUpper][floorNumber].floor_data,
                  rooms: {}
              };
              for (const roomNumber in campStructures[campCodeUpper][floorNumber].rooms) {
                  const roomConfig = campStructures[campCodeUpper][floorNumber].rooms[roomNumber];
                  const roomCapacity = roomConfig.room_data.capacity;
                  const explicitBeds = roomConfig.explicit_beds;
                  const bedsForCreation = [];

                  // Capacity Validation
                  if (explicitBeds.length > roomCapacity) {
                      processingErrors.push(`Camp '${campCodeUpper}', Floor '${floorNumber}', Room '${roomNumber}': ${explicitBeds.length} explicit beds listed, but 'room_capacity' is ${roomCapacity}. Excess beds will be ignored.`);
                      // Truncate explicit beds to roomCapacity
                      bedsForCreation.push(...explicitBeds.slice(0, roomCapacity));
                  } else {
                      bedsForCreation.push(...explicitBeds);
                  }

                  // Auto-generate beds if needed
                  for (let i = bedsForCreation.length; i < roomCapacity; i++) {
                      bedsForCreation.push({
                          bed_number: `Bed ${i + 1}`, // Default bed number, assuming 1-based indexing
                          status: 'available' // Default status
                      });
                  }

                  finalCampStructures[campCodeUpper][floorNumber].rooms[roomNumber] = {
                      ...roomConfig, // Copy existing room_data, etc.
                      beds: bedsForCreation // This is the final list of beds for creation
                  };
              }
          }
      }
      console.log('Final structured data with beds (including auto-generated):', finalCampStructures);

      // Check if there were critical processing errors (e.g., missing camp/floor/room numbers) before proceeding
      if (processingErrors.length > 0 && processingErrors.some(e => e.includes('Missing'))) {
        setUploadResult({ success: false, error: "Critical errors found during CSV processing. Please fix and re-upload:\n" + processingErrors.join('\n') });
        setUploading(false);
        return;
      }
      
      // Find camp IDs by code (CASE-INSENSITIVE)
      const campMap = {};
      camps.forEach(camp => {
        if (camp.code) {
          campMap[camp.code.toUpperCase()] = camp.id;
        }
      });
      
      console.log('Available camps:', campMap);

      let totalFloors = 0;
      let totalRooms = 0;
      let totalBeds = 0;
      let skippedCamps = [];

      // Process each camp (using uppercase keys)
      for (const [campCodeUpper, floorStructure] of Object.entries(finalCampStructures)) {
        console.log(`Processing camp code: ${campCodeUpper}`);
        const campId = campMap[campCodeUpper];
        
        if (!campId) {
          console.warn(`Camp with code ${campCodeUpper} not found, skipping floors, rooms, and beds for this camp.`);
          skippedCamps.push(campCodeUpper);
          continue;
        }

        // Create floors
        const floorsToCreate = Object.values(floorStructure).map(f => ({
          ...f.floor_data,
          camp_id: campId
        }));
        
        console.log(`Creating ${floorsToCreate.length} floors for camp ${campCodeUpper}:`, floorsToCreate);
        const createdFloors = await bulkCreateFloorsMutation.mutateAsync(floorsToCreate);
        console.log(`Created ${createdFloors.length} floors:`, createdFloors);
        totalFloors += createdFloors.length;

        // Create a map of floor_number to floor_id for the newly created floors
        const floorMap = {};
        createdFloors.forEach((floor, index) => {
          floorMap[floorsToCreate[index].floor_number] = floor.id;
        });
        console.log('Floor ID map:', floorMap);

        // Create rooms for each floor
        for (const [floorNumber, floorData] of Object.entries(floorStructure)) {
          const floorId = floorMap[floorNumber];
          if (!floorId) {
            console.warn(`Floor ID not found for floor number '${floorNumber}' for camp '${campCodeUpper}'. Rooms for this floor will be skipped.`);
            continue;
          }

          const roomsToCreate = Object.values(floorData.rooms).map(r => ({
            ...r.room_data,
            floor_id: floorId
          }));

          console.log(`Creating ${roomsToCreate.length} rooms for floor ${floorNumber}:`, roomsToCreate);
          const createdRooms = await bulkCreateRoomsMutation.mutateAsync(roomsToCreate);
          console.log(`Created ${createdRooms.length} rooms:`, createdRooms);
          totalRooms += createdRooms.length;

          // Create a map of room_number to created room ID
          const roomMapForBeds = {};
          createdRooms.forEach((createdRoom, index) => {
              // roomsToCreate[index] holds the original room_number for the createdRoom
              roomMapForBeds[roomsToCreate[index].room_number] = createdRoom.id;
          });
          console.log('Room ID map for beds:', roomMapForBeds);

          // Iterate through the rooms in the structured data (which now contain the final beds list)
          for (const roomNumber in floorData.rooms) {
            const roomId = roomMapForBeds[roomNumber];
            if (!roomId) {
              console.warn(`Room ID not found for room number '${roomNumber}' for floor '${floorNumber}'. Beds for this room will be skipped.`);
              continue;
            }

            const roomConfig = floorData.rooms[roomNumber]; // Get the room config including the final 'beds' array
            const bedsToCreate = roomConfig.beds.map(b => ({
              ...b,
              room_id: roomId
            }));

            if (bedsToCreate.length > 0) {
                console.log(`Creating ${bedsToCreate.length} beds for room ${roomNumber} (ID: ${roomId}):`, bedsToCreate);
                const createdBeds = await bulkCreateBedsMutation.mutateAsync(bedsToCreate);
                console.log(`Created ${createdBeds.length} beds:`, createdBeds);
                totalBeds += createdBeds.length;
            }
          }
        }
      }

      let message = `Successfully created ${totalFloors} floors, ${totalRooms} rooms, and ${totalBeds} beds!`;
      if (skippedCamps.length > 0) {
        message += `\n\nWarning: Skipped camps with codes: ${skippedCamps.join(', ')} (not found in system - matching is case-insensitive).`;
      }
      if (processingErrors.length > 0) {
          message += `\n\nAlso, some warnings occurred during CSV processing:\n${processingErrors.join('\n')}`;
      }


      setUploadResult({ success: true, message });
      setBulkFile(null);
      
      // Close dialog after 2 seconds on success
      setTimeout(() => {
        setShowBulkStructureDialog(false);
        setUploadResult(null);
      }, 2000);

    } catch (error) {
      console.error("Bulk structure upload error:", error);
      let errorMessage = error.message || "An unexpected error occurred. Check console for details.";
      if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message; // From API backend validation
      }
      if (processingErrors.length > 0) { // processingErrors is now guaranteed to be defined
          errorMessage += `\n\nAlso, some warnings occurred during CSV processing:\n${processingErrors.join('\n')}`;
      }
      setUploadResult({ 
        success: false, 
        error: errorMessage
      });
    }

    setUploading(false);
  };

  const generateBarcodesForCamp = async (campId) => {
    setGeneratingBarcodes(true);
    const campFloors = floors.filter(f => f.camp_id === campId);
    const campRooms = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
    
    const camp = camps.find(c => c.id === campId);
    
    // Create an array of promises for room updates
    const updatePromises = campRooms.map(async (room) => {
      if (!room.barcode_data) {
        const floor = floors.find(f => f.id === room.floor_id);
        const barcodeData = `${camp?.code || 'CAMP'}-F${floor?.floor_number || 'X'}-R${room.room_number}`;
        
        try {
          await updateRoomMutation.mutateAsync({
            id: room.id,
            data: { barcode_data: barcodeData }
          });
        } catch (error) {
          console.error(`Error generating barcode for room ${room.room_number}:`, error);
          // Optionally, store errors to display to the user
        }
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    // Invalidate queries to refetch the updated room data
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    
    setGeneratingBarcodes(false);
  };

  const printBarcodes = () => {
    window.print();
  };

  const getCampRoomsWithBarcodes = (campId) => {
    const campFloors = floors.filter(f => f.camp_id === campId);
    const campRooms = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
    
    return campRooms.map(room => {
      const floor = floors.find(f => f.id === room.floor_id);
      return {
        ...room,
        floor_number: floor?.floor_number,
        floor_name: floor?.name
      };
    }).sort((a, b) => {
      // Sort by floor number, then by room number
      const floorCompare = String(a.floor_number).localeCompare(String(b.floor_number), undefined, { numeric: true, sensitivity: 'base' });
      if (floorCompare !== 0) return floorCompare;
      return String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const getDocumentStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', className: 'bg-gray-100 text-gray-600' };
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { status: 'expired', className: 'bg-red-100 text-red-700' };
    if (days <= 30) return { status: 'expiring_soon', className: 'bg-orange-100 text-orange-700' };
    return { status: 'valid', className: 'bg-green-100 text-green-700' };
  };
    
  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FD' }}>
      {/* Print-specific CSS styles */}
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
            padding: 20px; /* Add some padding for better readability on print */
            background-color: #fff; /* Ensure white background for printing */
          }
          #printable-table table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          #printable-table th, #printable-table td {
            border: 1px solid #000;
            padding: 4px;
            text-align: left;
          }
          #printable-table th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          #printable-table tr:hover {
            background-color: inherit !important;
          }
          #printable-table tr {
            page-break-inside: avoid;
          }
          #printable-barcodes,
          #printable-barcodes * {
            visibility: visible;
          }
          #printable-barcodes {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10mm;
            background-color: #fff;
          }
          .no-print {
            display: none !important;
          }
          .barcode-item {
            page-break-inside: avoid;
            break-inside: avoid;
            width: 30%; /* Adjust width for 3 columns on A4 */
            margin: 0 1.5% 10mm; /* Adjust margin for spacing */
            display: inline-block; /* For better print layout */
            vertical-align: top;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Main content - visible normally, hidden on print */}
      <div className="max-w-[1800px] mx-auto space-y-6 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#333333' }}>Camps</h1>
            <p className="mt-1" style={{ color: '#6C717C' }}>{camps.length} total camps</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleRefreshAll}
              disabled={isRefetchingCamps}
              className="hover:opacity-80"
              style={{ borderColor: '#0A4DBF', color: '#0A4DBF' }}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetchingCamps ? 'animate-spin' : ''}`} />
              {isRefetchingCamps ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="hover:opacity-80" style={{ borderColor: '#3BB273', color: '#3BB273' }}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={printReport} className="hover:opacity-80" style={{ borderColor: '#0A4DBF', color: '#0A4DBF' }}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => setShowAddCampDialog(true)} className="hover:opacity-90" style={{ backgroundColor: '#FF8A00', color: '#FFFFFF' }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Camp
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="structure">Structure Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {camps.map((camp) => {
                const stats = getCampStats(camp.id);
                return (
                  <Card key={camp.id} className="border-none shadow-md hover:shadow-lg transition-all" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
                    <CardHeader className="pb-3 rounded-t-xl border-b" style={{ backgroundColor: '#072C77', borderColor: '#E5E7ED', height: '64px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="flex-1">
                        <CardTitle className="text-sm font-semibold text-white">{camp.name}</CardTitle>
                        <p className="text-xs text-white opacity-75 mt-1">{camp.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCamp(camp);
                            setCampData(camp);
                            setShowEditCampDialog(true);
                          }}
                          className="text-white hover:bg-white/20 h-8 w-8 p-0"
                        >
                          <span className="text-xs">✏️</span>
                        </Button>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF8A00' }}>
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: '#6C717C' }}>📍 {camp.location}</span>
                          <Badge variant={camp.status === 'active' ? 'default' : 'secondary'} style={{ backgroundColor: camp.status === 'active' ? '#3BB273' : '#6C717C', color: '#FFFFFF' }}>
                            {camp.status}
                          </Badge>
                        </div>

                        {/* Camp Type Display */}
                        {camp.camp_type && (
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs capitalize ${
                              camp.camp_type === 'induction_camp' ? 'bg-purple-100 text-purple-700' :
                              camp.camp_type === 'exit_camp' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {camp.camp_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        )}

                        {/* Ejari Expiry - show for all camps */}
                        {(
                          <div className="pt-2 border-t">
                            {(() => {
                              // Use ejari document expiry date, fallback to camp contract_end_date
                              const ejariExpiry = getEjariExpiryDate(camp.id);
                              const expiryDate = ejariExpiry || camp.contract_end_date;
                              
                              if (!expiryDate) {
                                return (
                                  <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-yellow-50">
                                    <span className="text-gray-600">Ejari Expiry:</span>
                                    <Badge className="text-xs bg-yellow-100 text-yellow-700">Not set</Badge>
                                  </div>
                                );
                              }
                              
                              const daysLeft = differenceInDays(parseISO(expiryDate), new Date());
                              const isExpired = daysLeft < 0;
                              const isUrgent = daysLeft >= 0 && daysLeft <= 30;
                              const isWarning = daysLeft > 30 && daysLeft <= 90;
                              
                              return (
                                <div className={`flex items-center justify-between text-sm p-2 rounded-lg ${
                                  isExpired ? 'bg-red-100' : 
                                  isUrgent ? 'bg-red-50' : 
                                  isWarning ? 'bg-orange-50' : 
                                  'bg-gray-50'
                                }`}>
                                  <span className="text-gray-600">Ejari Expiry:</span>
                                  <div className="text-right">
                                    <p className="font-medium">{format(parseISO(expiryDate), 'MMM dd, yyyy')}</p>
                                    <Badge className={`text-xs ${
                                      isExpired ? 'bg-red-600 text-white' :
                                      isUrgent ? 'bg-red-500 text-white' :
                                      isWarning ? 'bg-orange-500 text-white' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {isExpired 
                                        ? `${Math.abs(daysLeft)} days overdue` 
                                        : `${daysLeft} days left`}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid #E5E7ED' }}>
                          <div className="text-center">
                            <Layers className="w-4 h-4 mx-auto mb-1" style={{ color: '#6C717C' }} />
                            <p className="text-xs" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Floors</p>
                            <p className="font-semibold" style={{ color: '#333333' }}>{stats.floors}</p>
                          </div>
                          <div className="text-center">
                            <DoorOpen className="w-4 h-4 mx-auto mb-1" style={{ color: '#6C717C' }} />
                            <p className="text-xs" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rooms</p>
                            <p className="font-semibold" style={{ color: '#333333' }}>{stats.rooms}</p>
                          </div>
                          <div className="text-center">
                            <Bed className="w-4 h-4 mx-auto mb-1" style={{ color: '#6C717C' }} />
                            <p className="text-xs" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Beds</p>
                            <p className="font-semibold" style={{ color: '#333333' }}>{stats.beds}</p>
                          </div>
                        </div>

                        {/* Technician Beds Section */}
                        <div className="pt-3" style={{ borderTop: '1px solid #E5E7ED' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold" style={{ color: '#0A4DBF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Technician Beds</span>
                            <span className="text-xs" style={{ color: '#6C717C' }}>{stats.totalTechnicianBeds} total</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center rounded-lg p-2" style={{ backgroundColor: '#F8FBFF' }}>
                              <p className="text-[10px] font-medium mb-1" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Occupied</p>
                              <p className="text-lg font-bold" style={{ color: '#0A4DBF' }}>{stats.technicianBeds}</p>
                            </div>
                            <div className="text-center rounded-lg p-2" style={{ backgroundColor: '#E4F1D2' }}>
                              <p className="text-[10px] font-medium mb-1" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available</p>
                              <p className="text-lg font-bold" style={{ color: '#3BB273' }}>{stats.technicianBedsAvailable}</p>
                            </div>
                            <div className="text-center rounded-lg p-2" style={{ backgroundColor: '#F8F9FD' }}>
                              <p className="text-[10px] font-medium mb-1" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Occupancy</p>
                              <p className="text-lg font-bold" style={{ color: '#333333' }}>{stats.technicianOccupancy}%</p>
                            </div>
                          </div>
                        </div>

                        {/* External Personnel Beds Section */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold" style={{ color: '#FF8A00', textTransform: 'uppercase', letterSpacing: '0.5px' }}>External Beds</span>
                            <span className="text-xs" style={{ color: '#6C717C' }}>{stats.totalExternalBeds} total</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center rounded-lg p-2" style={{ backgroundColor: '#F8FBFF' }}>
                              <p className="text-[10px] font-medium mb-1" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Occupied</p>
                              <p className="text-lg font-bold" style={{ color: '#FF8A00' }}>{stats.externalBeds}</p>
                            </div>
                            <div className="text-center rounded-lg p-2" style={{ backgroundColor: '#E4F1D2' }}>
                              <p className="text-[10px] font-medium mb-1" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available</p>
                              <p className="text-lg font-bold" style={{ color: '#3BB273' }}>{stats.externalBedsAvailable}</p>
                            </div>
                            <div className="text-center rounded-lg p-2" style={{ backgroundColor: '#F8F9FD' }}>
                              <p className="text-[10px] font-medium mb-1" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Occupancy</p>
                              <p className="text-lg font-bold" style={{ color: '#333333' }}>{stats.externalOccupancy}%</p>
                            </div>
                          </div>
                        </div>

                        {/* Mixed Beds Section (if any) */}
                        {stats.totalMixedBeds > 0 && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-orange-700 uppercase">Mixed Beds</span>
                              <span className="text-xs text-gray-600">{stats.totalMixedBeds} total ({stats.mixedBedsAvailable} available)</span>
                            </div>
                          </div>
                        )}

                        {/* Overall Occupancy */}
                        <div className="pt-3" style={{ borderTop: '1px solid #E5E7ED' }}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold" style={{ color: '#333333' }}>Overall Occupancy</span>
                            <span className="text-sm font-semibold" style={{ color: '#333333' }}>{stats.occupancy}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                parseFloat(stats.occupancy) >= 90 ? 'bg-red-600' :
                                parseFloat(stats.occupancy) >= 70 ? 'bg-yellow-500' :
                                'bg-blue-600'
                              }`}
                              style={{ width: `${stats.occupancy}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Map View Tab */}
          <TabsContent value="map">
            <Card className="border-none shadow-md overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
              <CardHeader className="rounded-t-xl border-b" style={{ backgroundColor: '#072C77', borderColor: '#E5E7ED', height: '48px', display: 'flex', alignItems: 'center' }}>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Building2 className="w-5 h-5" />
                  Camp Locations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {campsWithCoordinates.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No GPS Coordinates Available</p>
                    <p className="text-sm">Add GPS coordinates to camps to view them on the map</p>
                  </div>
                ) : (
                  <div style={{ height: '600px', width: '100%' }}>
                    <MapContainer 
                      center={defaultCenter} 
                      zoom={11} 
                      scrollWheelZoom={false} // Disable scroll zoom to prevent accidental map movement
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {campsWithCoordinates.map((camp) => {
                        const stats = getCampStats(camp.id);
                        return (
                          <Marker 
                            key={camp.id} 
                            position={[camp.latitude, camp.longitude]}
                          >
                            <Popup>
                              <div className="p-2 min-w-[200px]">
                                <h3 className="font-bold text-lg mb-1">{camp.name}</h3>
                                <p className="text-sm text-gray-600 mb-2">{camp.code}</p>
                                <p className="text-sm text-gray-700 mb-3">📍 {camp.location}</p>
                                
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                  <div className="text-center bg-blue-50 p-2 rounded">
                                    <p className="text-xs text-gray-600">Capacity</p>
                                    <p className="font-semibold text-blue-700">{camp.capacity}</p>
                                  </div>
                                  <div className="text-center bg-green-50 p-2 rounded">
                                    <p className="text-xs text-gray-600">Occupancy</p>
                                    <p className="font-semibold text-green-700">{stats.occupancy}%</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-1 text-xs">
                                  <div className="text-center">
                                    <p className="text-gray-600">Floors</p>
                                    <p className="font-semibold">{stats.floors}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-gray-600">Rooms</p>
                                    <p className="font-semibold">{stats.rooms}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-gray-600">Beds</p>
                                    <p className="font-semibold">{stats.beds}</p>
                                  </div>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structure">
            <div className="mb-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkStructureDialog(true);
                  setUploadResult(null);
                  setBulkFile(null);
                }}
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload Structure
              </Button>
            </div>

            <div className="space-y-4">
              {camps.map((camp) => {
                const campFloors = floors.filter(f => f.camp_id === camp.id);
                const isExpanded = expandedCamps[camp.id];
                const campRooms = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
                const roomsWithBarcodes = campRooms.filter(r => r.barcode_data).length;
                const capacityIssues = getCampCapacityIssues(camp.id);
                
                return (
                  <Card key={camp.id} className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
                    <CardContent className="p-0">
                      <div className="p-4 border-b" style={{ backgroundColor: '#F8FBFF', borderColor: '#E5E7ED' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleCamp(camp.id)}>
                            {isExpanded ? <ChevronDown className="w-5 h-5" style={{ color: '#0A4DBF' }} /> : <ChevronRight className="w-5 h-5" style={{ color: '#0A4DBF' }} />}
                            <Building2 className="w-6 h-6" style={{ color: '#FF8A00' }} />
                            <div>
                              <h3 className="font-bold" style={{ color: '#333333' }}>{camp.name}</h3>
                              <p className="text-sm" style={{ color: '#6C717C' }}>
                                {camp.code} • {campFloors.length} floors • {campRooms.length} rooms
                                {capacityIssues.length > 0 && (
                                  <Badge variant="destructive" className="ml-2">
                                    {capacityIssues.length} capacity issue(s)
                                  </Badge>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCampForBarcodes(camp);
                                setShowBarcodeDialog(true);
                              }}
                              className="border-purple-600 text-purple-600 hover:bg-purple-50"
                            >
                              <QrCode className="w-4 h-4 mr-1" />
                              Room Barcodes ({roomsWithBarcodes}/{campRooms.length})
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCamp(camp);
                                setFloorData({ camp_id: camp.id });
                                setShowAddFloorDialog(true);
                              }}
                              className="hover:opacity-90"
                              style={{ backgroundColor: '#FF8A00', color: '#FFFFFF' }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Floor
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4">
                          <Tabs value={campTabs[camp.id] || "structure"} onValueChange={(val) => setCampTabs({...campTabs, [camp.id]: val})}>
                            <TabsList className="bg-gray-100 mb-4">
                              <TabsTrigger value="structure">
                                <Building2 className="w-4 h-4 mr-2" />
                                Structure
                              </TabsTrigger>
                              <TabsTrigger value="documents">
                                <FileText className="w-4 h-4 mr-2" />
                                Documents ({campDocuments.filter(d => d.camp_id === camp.id).length})
                              </TabsTrigger>
                              <TabsTrigger value="assets">
                                <Wrench className="w-4 h-4 mr-2" />
                                Assets ({assets.filter(a => a.camp_id === camp.id).length})
                              </TabsTrigger>
                            </TabsList>

                            {/* Structure Tab */}
                            <TabsContent value="structure" className="space-y-3">
                              {/* Capacity Warnings */}
                              {capacityIssues.length > 0 && (
                                <Alert variant="destructive" className="mb-4">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <strong>Capacity Issues Detected:</strong>
                                    <div className="mt-2 space-y-1 text-sm">
                                      {capacityIssues.map(issue => (
                                        <div key={issue.roomId} className="flex items-center justify-between p-2 bg-white rounded border">
                                          <span>
                                            Floor {issue.floorNumber}, Room {issue.roomNumber}: 
                                            {issue.isZeroCapacity ? (
                                              <strong className="text-red-700"> ZERO CAPACITY - Set capacity immediately!</strong>
                                            ) : (
                                              <>
                                                Defined capacity = {issue.definedCapacity}, Actual beds = {issue.actualBeds}
                                                {issue.difference > 0 ? ` (${issue.difference} bed(s) missing)` : ` (${Math.abs(issue.difference)} excess bed(s))`}
                                              </>
                                            )}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleFixCapacity(issue.roomId, 4)}
                                            className="ml-2"
                                          >
                                            {issue.isZeroCapacity ? 'Set Capacity' : 'Fix Capacity'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </AlertDescription>
                                </Alert>
                              )}

                              {campFloors.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No floors added yet</p>
                              ) : (
                                campFloors.map((floor) => {
                                  const floorRooms = rooms.filter(r => r.floor_id === floor.id);
                                  const isFloorExpanded = expandedFloors[floor.id];
                                  
                                  return (
                                    <div key={floor.id} className="border rounded-lg overflow-hidden">
                                      <div className="p-3 bg-gray-50 border-b">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleFloor(floor.id)}>
                                            {isFloorExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                                            <Layers className="w-5 h-5 text-purple-600" />
                                            <div>
                                              <p className="font-semibold text-gray-900">Floor {floor.floor_number}</p>
                                              <p className="text-xs text-gray-600">{floor.name ? `${floor.name} • ` : ''}{floorRooms.length} rooms</p>
                                            </div>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedFloor(floor);
                                              setRoomData({ floor_id: floor.id });
                                              setShowAddRoomDialog(true);
                                            }}
                                          >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add Room
                                          </Button>
                                        </div>
                                      </div>

                                      {isFloorExpanded && (
                                        <div className="p-3 space-y-2">
                                          {floorRooms.length === 0 ? (
                                            <p className="text-center text-gray-500 py-4 text-sm">No rooms added yet</p>
                                          ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              {floorRooms.map((room) => {
                                                const roomBeds = beds.filter(b => b.room_id === room.id);
                                                const occupiedBeds = roomBeds.filter(b => b.status === 'occupied').length;
                                                const capacityMismatch = roomBeds.length !== room.capacity;
                                                const isZeroCapacity = !room.capacity || room.capacity === 0;
                                                
                                                return (
                                                  <Card key={room.id} className={`border ${
                                                    isZeroCapacity ? 'border-red-500 bg-red-100' : 
                                                    capacityMismatch ? 'border-red-300 bg-red-50' : 
                                                    'border-gray-200'
                                                  }`}>
                                                    <CardContent className="p-3">
                                                      <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2 flex-1">
                                                          <DoorOpen className="w-4 h-4 text-green-600" />
                                                          <div className="flex-1">
                                                            <p className="font-medium text-sm">Room {room.room_number}</p>
                                                            <p className="text-xs text-gray-500">
                                                              Capacity: {room.capacity || 0} | Actual: {roomBeds.length}
                                                              {isZeroCapacity && (
                                                                <Badge variant="destructive" className="ml-2 text-xs">
                                                                  ZERO CAPACITY!
                                                                </Badge>
                                                              )}
                                                              {!isZeroCapacity && capacityMismatch && (
                                                                <Badge variant="destructive" className="ml-2 text-xs">
                                                                  Mismatch!
                                                                </Badge>
                                                              )}
                                                            </p>
                                                            {isZeroCapacity && (
                                                              <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleFixCapacity(room.id, 4)}
                                                                className="mt-2 text-xs border-red-500 text-red-700 hover:bg-red-50"
                                                              >
                                                                Set Capacity
                                                              </Button>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <Button
                                                          size="sm"
                                                          variant="ghost"
                                                          onClick={() => {
                                                            if (isZeroCapacity) {
                                                              alert('Please set room capacity first by clicking "Set Capacity" button');
                                                              return;
                                                            }
                                                            setSelectedRoom(room);
                                                            setBedData({ room_id: room.id });
                                                            setShowAddBedDialog(true);
                                                          }}
                                                          disabled={isZeroCapacity || roomBeds.length >= room.capacity}
                                                          title={
                                                            isZeroCapacity ? "Set capacity first to add beds" :
                                                            roomBeds.length >= room.capacity ? "Room is at full capacity" : "Add bed"
                                                          }
                                                        >
                                                          <Plus className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                      
                                                      <div className="flex flex-wrap gap-1 mb-2">
                                                        <Badge variant="outline" className="text-xs">{room.gender_restriction}</Badge>
                                                        {room.occupant_type && (
                                                          <Badge variant="secondary" className="text-xs capitalize">
                                                            {room.occupant_type.replace(/_/g, ' ')}
                                                          </Badge>
                                                        )}
                                                        {room.nationality_group && (
                                                          <Badge variant="secondary" className="text-xs">{room.nationality_group}</Badge>
                                                        )}
                                                      </div>

                                                      {roomBeds.length > 0 && (
                                                        <div className="grid grid-cols-4 gap-1">
                                                          {roomBeds.map((bed) => (
                                                           <div
                                                             key={bed.id}
                                                             className={`p-1 rounded text-center text-xs ${
                                                               bed.status === 'occupied' ? 'bg-red-100 text-red-700' :
                                                               bed.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                                                               bed.status === 'maintenance' ? 'bg-gray-100 text-gray-700' :
                                                               'bg-green-100 text-green-700'
                                                             }`}
                                                             title={`${bed.bed_number} - ${bed.status}${bed.is_lower_berth ? ' (Lower Berth)' : ' (Upper Berth)'}`}
                                                           >
                                                             {bed.bed_number} {bed.is_lower_berth ? 'L' : 'U'}
                                                           </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                      
                                                      {!isZeroCapacity && (
                                                        <div className="mt-2 text-xs text-gray-600">
                                                          {occupiedBeds}/{roomBeds.length} occupied
                                                        </div>
                                                      )}
                                                    </CardContent>
                                                  </Card>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </TabsContent>

                            {/* Documents Tab */}
                            <TabsContent value="documents">
                              {(() => {
                                const campDocs = campDocuments.filter(d => d.camp_id === camp.id);
                                
                                return campDocs.length === 0 ? (
                                  <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No documents for this camp</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {campDocs.map((doc) => {
                                      const statusInfo = getDocumentStatus(doc.expiry_date);
                                      
                                      return (
                                        <Card key={doc.id} className="border">
                                          <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <FileText className="w-4 h-4 text-blue-600" />
                                                  <h4 className="font-semibold text-gray-900">{doc.document_name}</h4>
                                                  <Badge className={`text-xs ${statusInfo.className}`}>
                                                    {statusInfo.status === 'expired' ? 'Expired' :
                                                     statusInfo.status === 'expiring_soon' ? 'Expiring Soon' :
                                                     'Valid'}
                                                  </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                  <div>
                                                    <span className="text-gray-600">Type:</span>
                                                    <span className="ml-2 font-medium">{doc.document_type?.replace(/_/g, ' ').toUpperCase()}</span>
                                                  </div>
                                                  {doc.document_number && (
                                                    <div>
                                                      <span className="text-gray-600">Number:</span>
                                                      <span className="ml-2 font-medium">{doc.document_number}</span>
                                                    </div>
                                                  )}
                                                  {doc.expiry_date && (
                                                    <div>
                                                      <span className="text-gray-600">Expiry:</span>
                                                      <span className="ml-2 font-medium">{format(parseISO(doc.expiry_date), 'dd/MMM/yyyy')}</span>
                                                    </div>
                                                  )}
                                                  {doc.issuing_authority && (
                                                    <div>
                                                      <span className="text-gray-600">Authority:</span>
                                                      <span className="ml-2 font-medium">{doc.issuing_authority}</span>
                                                    </div>
                                                  )}
                                                </div>
                                                {doc.notes && (
                                                  <p className="text-xs text-gray-600 mt-2">{doc.notes}</p>
                                                )}
                                              </div>
                                              {doc.file_url && (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => window.open(doc.file_url, '_blank')}
                                                  className="text-blue-600"
                                                >
                                                  View
                                                </Button>
                                              )}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </TabsContent>

                            {/* Assets Tab */}
                            <TabsContent value="assets">
                              {(() => {
                                const campAssets = assets.filter(a => a.camp_id === camp.id);
                                
                                return campAssets.length === 0 ? (
                                  <div className="text-center py-12">
                                    <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No assets assigned to this camp</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {campAssets.map((asset) => {
                                      return (
                                        <Card key={asset.id} className="border">
                                          <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <Wrench className="w-4 h-4 text-orange-600" />
                                                  <h4 className="font-semibold text-gray-900">{asset.asset_name}</h4>
                                                  <Badge className={`text-xs ${
                                                    asset.status === 'operational' ? 'bg-green-100 text-green-700' :
                                                    asset.status === 'maintenance' ? 'bg-orange-100 text-orange-700' :
                                                    asset.status === 'out_of_service' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                                  }`}>
                                                    {asset.status?.replace(/_/g, ' ')}
                                                  </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                  <div>
                                                    <span className="text-gray-600">Type:</span>
                                                    <span className="ml-2 font-medium">{asset.asset_type}</span>
                                                  </div>
                                                  {asset.asset_id && (
                                                    <div>
                                                      <span className="text-gray-600">Asset ID:</span>
                                                      <span className="ml-2 font-medium">{asset.asset_id}</span>
                                                    </div>
                                                  )}
                                                  {asset.manufacturer && (
                                                    <div>
                                                      <span className="text-gray-600">Manufacturer:</span>
                                                      <span className="ml-2 font-medium">{asset.manufacturer}</span>
                                                    </div>
                                                  )}
                                                  {asset.purchase_date && (
                                                    <div>
                                                      <span className="text-gray-600">Purchase Date:</span>
                                                      <span className="ml-2 font-medium">{format(parseISO(asset.purchase_date), 'dd/MMM/yyyy')}</span>
                                                    </div>
                                                  )}
                                                </div>
                                                {asset.notes && (
                                                  <p className="text-xs text-gray-600 mt-2">{asset.notes}</p>
                                                )}
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Printable table - hidden normally, visible only when printing */}
      <div id="printable-table" className="hidden">
        <h2 className="2xl font-bold mb-4">Camps Report - {format(new Date(), 'yyyy-MM-dd HH:mm')}</h2>
        <table>
          <thead>
            <tr>
              <th>Camp Code</th>
              <th>Camp Name</th>
              <th>Location</th>
              <th>Defined Capacity</th>
              <th>Current Occupancy (Physical Beds)</th>
              <th>Occupancy Rate (vs. Defined Capacity)</th>
              <th>Available Capacity (vs. Defined Capacity)</th>
              <th>Status</th>
              <th>Coordinates</th>
            </tr>
          </thead>
          <tbody>
            {[...camps]
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map(camp => {
                const stats = getCampStats(camp.id);
                const current_occupancy = stats.occupiedBeds;
                const total_defined_capacity = camp.capacity;
                const occupancyRate = total_defined_capacity > 0 
                  ? ((current_occupancy / total_defined_capacity) * 100).toFixed(1) 
                  : 0;
                const available_beds_capacity = total_defined_capacity - current_occupancy;
                
                return (
                  <tr key={camp.id}>
                    <td>{camp.code || '-'}</td>
                    <td>{camp.name || '-'}</td>
                    <td>{camp.location || '-'}</td>
                    <td>{total_defined_capacity}</td>
                    <td>{current_occupancy}</td>
                    <td>{`${occupancyRate}%`}</td>
                    <td>{available_beds_capacity}</td>
                    <td>{camp.status || '-'}</td>
                    <td>{camp.latitude && camp.longitude ? `${camp.latitude}, ${camp.longitude}` : '-'}</td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Camp Dialog */}
      <Dialog open={showAddCampDialog} onOpenChange={setShowAddCampDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Camp</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCamp} className="space-y-4">
            <div className="space-y-2">
              <Label>Camp Name*</Label>
              <Input
                required
                value={campData.name || ''}
                onChange={(e) => setCampData({...campData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Camp Code*</Label>
              <Input
                required
                value={campData.code || ''}
                onChange={(e) => setCampData({...campData, code: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Camp Type*</Label>
              <Select
                value={campData.camp_type || 'regular_camp'}
                onValueChange={(value) => setCampData({...campData, camp_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="induction_camp">Induction Camp</SelectItem>
                  <SelectItem value="regular_camp">Regular Camp</SelectItem>
                  <SelectItem value="exit_camp">Exit Camp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location*</Label>
              <Input
                required
                value={campData.location || ''}
                onChange={(e) => setCampData({...campData, location: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={campData.latitude || ''}
                  onChange={(e) => setCampData({...campData, latitude: parseFloat(e.target.value)})}
                  placeholder="25.2048"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={campData.longitude || ''}
                  onChange={(e) => setCampData({...campData, longitude: parseFloat(e.target.value)})}
                  placeholder="55.2708"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Capacity*</Label>
              <Input
                type="number"
                required
                value={campData.capacity || ''}
                onChange={(e) => setCampData({...campData, capacity: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={campData.status || 'active'}
                onValueChange={(value) => setCampData({...campData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddCampDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="hover:opacity-90" style={{ backgroundColor: '#FF8A00', color: '#FFFFFF' }}>
                Add Camp
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Camp Dialog */}
      <Dialog open={showEditCampDialog} onOpenChange={setShowEditCampDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Camp</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCamp} className="space-y-4">
            <div className="space-y-2">
              <Label>Camp Name*</Label>
              <Input
                required
                value={campData.name || ''}
                onChange={(e) => setCampData({...campData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Camp Code*</Label>
              <Input
                required
                value={campData.code || ''}
                onChange={(e) => setCampData({...campData, code: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Camp Type*</Label>
              <Select
                value={campData.camp_type || 'regular_camp'}
                onValueChange={(value) => setCampData({...campData, camp_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="induction_camp">Induction Camp</SelectItem>
                  <SelectItem value="regular_camp">Regular Camp</SelectItem>
                  <SelectItem value="exit_camp">Exit Camp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location*</Label>
              <Input
                required
                value={campData.location || ''}
                onChange={(e) => setCampData({...campData, location: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={campData.latitude || ''}
                  onChange={(e) => setCampData({...campData, latitude: parseFloat(e.target.value)})}
                  placeholder="25.2048"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={campData.longitude || ''}
                  onChange={(e) => setCampData({...campData, longitude: parseFloat(e.target.value)})}
                  placeholder="55.2708"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Capacity*</Label>
              <Input
                type="number"
                required
                value={campData.capacity || ''}
                onChange={(e) => setCampData({...campData, capacity: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={campData.status || 'active'}
                onValueChange={(value) => setCampData({...campData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setShowEditCampDialog(false);
                setEditingCamp(null);
                setCampData({});
              }}>
                Cancel
              </Button>
              <Button type="submit" className="hover:opacity-90" style={{ backgroundColor: '#FF8A00', color: '#FFFFFF' }}>
                Update Camp
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Floor Dialog */}
      <Dialog open={showAddFloorDialog} onOpenChange={setShowAddFloorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Floor to {selectedCamp?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddFloor} className="space-y-4">
            <div className="space-y-2">
              <Label>Floor Number*</Label>
              <Input
                type="text"
                required
                value={floorData.floor_number || ''}
                onChange={(e) => setFloorData({...floorData, floor_number: e.target.value})}
                placeholder="e.g. G, 1, 2, M, B1"
              />
            </div>
            <div className="space-y-2">
              <Label>Floor Name</Label>
              <Input
                value={floorData.name || ''}
                onChange={(e) => setFloorData({...floorData, name: e.target.value})}
                placeholder="e.g. Ground Floor, First Floor"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddFloorDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="hover:opacity-90" style={{ backgroundColor: '#FF8A00', color: '#FFFFFF' }}>
                Add Floor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Room Dialog */}
      <Dialog open={showAddRoomDialog} onOpenChange={setShowAddRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRoom} className="space-y-4">
            <div className="space-y-2">
              <Label>Room Number*</Label>
              <Input
                required
                value={roomData.room_number || ''}
                onChange={(e) => setRoomData({...roomData, room_number: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity (Number of Beds)*</Label>
              <Input
                type="number"
                required
                value={roomData.capacity || ''}
                onChange={(e) => setRoomData({...roomData, capacity: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Occupant Type*</Label>
              <Select
                value={roomData.occupant_type || 'technician_only'}
                onValueChange={(value) => setRoomData({...roomData, occupant_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician_only">Technician Only</SelectItem>
                  <SelectItem value="external_only">External Personnel Only</SelectItem>
                  <SelectItem value="staff_only">Staff Only</SelectItem>
                  <SelectItem value="mixed">Mixed (Use with Caution)</SelectItem>
                </SelectContent>
              </Select>
              <Alert className="mt-2 border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-900">
                  <strong>Important:</strong> Different occupant types should NOT be mixed in the same room. 
                  Keep technicians, external personnel, and staff in separate rooms for proper management.
                </AlertDescription>
              </Alert>
            </div>
            <div className="space-y-2">
              <Label>Gender Restriction</Label>
              <Select
                value={roomData.gender_restriction || 'mixed'}
                onValueChange={(value) => setRoomData({...roomData, gender_restriction: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male Only</SelectItem>
                  <SelectItem value="female">Female Only</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nationality Group (Optional)</Label>
              <Input
                value={roomData.nationality_group || ''}
                onChange={(e) => setRoomData({...roomData, nationality_group: e.target.value})}
                placeholder="e.g. Asian, Middle Eastern"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddRoomDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="hover:opacity-90" style={{ backgroundColor: '#FF8A00', color: '#FFFFFF' }}>
                Add Room
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Bed Dialog */}
      <Dialog open={showAddBedDialog} onOpenChange={setShowAddBedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bed</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBed} className="space-y-4">
            <div className="space-y-2">
              <Label>Bed Number*</Label>
              <Input
                required
                value={bedData.bed_number || ''}
                onChange={(e) => setBedData({...bedData, bed_number: e.target.value})}
                placeholder="e.g. B1, B2, A, B"
              />
            </div>
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="is_lower_berth"
                checked={bedData.is_lower_berth || false}
                onCheckedChange={(checked) => setBedData({...bedData, is_lower_berth: !!checked})}
              />
              <label htmlFor="is_lower_berth" className="text-sm font-medium cursor-pointer">
                Lower Berth (Required for technicians aged 45+)
              </label>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={bedData.status || 'available'}
                onValueChange={(value) => setBedData({...bedData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddBedDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="hover:opacity-90" style={{ backgroundColor: '#FF8A00', color: '#FFFFFF' }}>
                Add Bed
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Structure Upload Dialog */}
      <Dialog open={showBulkStructureDialog} onOpenChange={setShowBulkStructureDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Camp Structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Alert className="border-purple-200 bg-purple-50">
              <AlertDescription className="text-sm text-purple-900">
                Upload a CSV file to create floors, rooms, and beds in bulk for your camps. All related structure will be created automatically.
              </AlertDescription>
            </Alert>

            <Alert className="border-orange-300 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-xs text-orange-900">
                <strong className="block mb-2">Important Tips:</strong>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Ensure CSV is saved as <strong>`CSV UTF-8`</strong> format.</li>
                  <li>Use correct <strong>`camp_code`</strong> that matches an existing camp.</li>
                  <li>Each row represents <strong>ONE bed</strong>. If `bed_number` is left empty, beds will be auto-generated up to `room_capacity`.</li>
                  <li>If fewer beds are explicitly listed than `room_capacity`, the remaining beds will be automatically generated.</li>
                  <li>If more beds are explicitly listed than `room_capacity`, excess beds will be ignored with a warning.</li>
                  <li>Rooms and floors are created automatically from the data.</li>
                  <li>Columns `floor_name`, `room_nationality_group`, `bed_status` are optional. Default `room_gender_restriction` is `mixed`, default `room_occupant_type` is `technician_only`, default `bed_status` is `available`.</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              onClick={downloadStructureTemplate}
              className="w-full"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Structure Template
            </Button>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Upload CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setBulkFile(e.target.files[0])}
                disabled={uploading}
                className="text-sm"
              />
            </div>

            {uploading && (
              <Alert className="border-blue-300 bg-blue-50">
                <AlertDescription className="text-sm text-blue-800">
                  Processing structure... This may take a moment.
                </AlertDescription>
              </Alert>
            )}

            {uploadResult && (
              <Alert variant={uploadResult.success ? "default" : "destructive"} className="max-h-64 overflow-y-auto">
                <AlertDescription className="whitespace-pre-wrap text-sm">
                  {uploadResult.success
                    ? uploadResult.message
                    : `Error: ${uploadResult.error}`
                  }
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowBulkStructureDialog(false);
                  setBulkFile(null);
                  setUploadResult(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={handleBulkStructureUpload}
                disabled={!bulkFile || uploading}
                className="bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                {uploading ? 'Uploading...' : 'Upload Structure'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Barcodes Dialog */}
      <Dialog open={showBarcodeDialog} onOpenChange={setShowBarcodeDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Room Barcodes - {selectedCampForBarcodes?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-3 no-print">
              <p className="text-sm text-gray-600">
                Print these barcodes and affix them to room doors for quick identification and tracking.
              </p>
              <div className="flex gap-2">
                {selectedCampForBarcodes && getCampRoomsWithBarcodes(selectedCampForBarcodes.id).some(r => !r.barcode_data) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateBarcodesForCamp(selectedCampForBarcodes.id)}
                    disabled={generatingBarcodes}
                    className="border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    {generatingBarcodes ? 'Generating...' : 'Generate Missing Barcodes'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={printBarcodes}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print All
                </Button>
              </div>
            </div>

            <div id="printable-barcodes">
              <div className="print:block hidden mb-4">
                <h1 className="2xl font-bold">{selectedCampForBarcodes?.name} - Room Barcodes</h1>
                <p className="text-sm text-gray-600">Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3">
                {selectedCampForBarcodes && getCampRoomsWithBarcodes(selectedCampForBarcodes.id).map((room) => (
                  <div key={room.id} className="barcode-item border-2 border-gray-300 rounded-lg p-4 bg-white">
                    <div className="text-center space-y-2">
                      <div className="font-bold text-lg">{selectedCampForBarcodes.name}</div>
                      <div className="text-sm text-gray-600">
                        Floor {room.floor_number} {room.floor_name ? `(${room.floor_name})` : ''}
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        Room {room.room_number}
                      </div>
                      
                      {room.barcode_data ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(room.barcode_data)}`}
                            alt={`QR Code for ${room.barcode_data}`}
                            className="w-32 h-32 border-2 border-gray-200 rounded"
                          />
                          <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {room.barcode_data}
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-xs text-gray-500">
                          No barcode generated yet
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-600 pt-2 border-t">
                        Capacity: {room.capacity} beds
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}