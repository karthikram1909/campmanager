import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Bed, Building2, Search, AlertCircle, ArrowRight, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ManualAllocation() {
  const [selectedCamp, setSelectedCamp] = useState("");
  const [personnelType, setPersonnelType] = useState("technician");
  const [searchPersonnel, setSearchPersonnel] = useState("");
  const [searchBed, setSearchBed] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);

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

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['technicians'] }),
  });

  const updateExternalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExternalPersonnel.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['external-personnel'] }),
  });

  const updateBedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bed.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beds'] }),
  });

  // Get unassigned personnel
  const unassignedPersonnel = personnelType === 'technician'
    ? technicians.filter(t => !t.bed_id && t.status === 'active')
    : externalPersonnel.filter(e => !e.bed_id && e.status === 'active');

  const filteredPersonnel = unassignedPersonnel.filter(p =>
    p.full_name?.toLowerCase().includes(searchPersonnel.toLowerCase()) ||
    (personnelType === 'technician' ? p.employee_id : p.company_name)?.toLowerCase().includes(searchPersonnel.toLowerCase())
  );

  // Get available beds for selected camp
  const campFloors = selectedCamp ? floors.filter(f => f.camp_id === selectedCamp) : [];
  const campRooms = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
  const availableBeds = beds.filter(b =>
    b.status === 'available' &&
    campRooms.some(r => r.id === b.room_id)
  );

  const filteredBeds = availableBeds.filter(bed => {
    const room = rooms.find(r => r.id === bed.room_id);
    const floor = floors.find(f => f.id === room?.floor_id);
    const searchLower = searchBed.toLowerCase();
    return (
      bed.bed_number?.toLowerCase().includes(searchLower) ||
      room?.room_number?.toLowerCase().includes(searchLower) ||
      floor?.floor_number?.toLowerCase().includes(searchLower)
    );
  });

  const getBedDetails = (bed) => {
    const room = rooms.find(r => r.id === bed.room_id);
    const floor = floors.find(f => f.id === room?.floor_id);
    return { room, floor };
  };

  const handleAssign = async () => {
    if (!selectedPerson || !selectedBed) {
      alert('Please select both a person and a bed');
      return;
    }

    const { room } = getBedDetails(selectedBed);

    // Validate room occupant type
    if (room.occupant_type === 'technician_only' && personnelType !== 'technician') {
      alert('This room is designated for technicians only');
      return;
    }
    if (room.occupant_type === 'external_only' && personnelType !== 'external') {
      alert('This room is designated for external personnel only');
      return;
    }

    // Validate gender restriction
    if (room.gender_restriction !== 'mixed' && selectedPerson.gender !== room.gender_restriction) {
      alert(`This room is designated for ${room.gender_restriction || 'mixed'} only`);
      return;
    }

    try {
      // Update personnel
      if (personnelType === 'technician') {
        await updateTechnicianMutation.mutateAsync({
          id: selectedPerson.id,
          data: { bed_id: selectedBed.id, camp_id: selectedCamp }
        });
        await updateBedMutation.mutateAsync({
          id: selectedBed.id,
          data: { status: 'occupied', technician_id: selectedPerson.id }
        });
      } else {
        await updateExternalMutation.mutateAsync({
          id: selectedPerson.id,
          data: { bed_id: selectedBed.id, camp_id: selectedCamp }
        });
        await updateBedMutation.mutateAsync({
          id: selectedBed.id,
          data: { status: 'occupied', external_personnel_id: selectedPerson.id }
        });
      }

      alert('Bed assigned successfully!');
      setSelectedPerson(null);
      setSelectedBed(null);
    } catch (error) {
      alert('Error assigning bed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FD' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manual Bed Allocation</h1>
            <p className="text-gray-600 mt-1">Manually assign personnel to specific beds</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Manual Mode
          </Badge>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Camp Operations: Manual Bed Allocation</strong><br />
            For special cases requiring manual intervention → Conflict resolution, medical needs, VIP requests → Select person + bed → Confirm assignment → Overrides smart allocation
          </AlertDescription>
        </Alert>

        {/* Configuration */}
        <Card className="border-none shadow-md">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Personnel Type</label>
                <Select value={personnelType} onValueChange={setPersonnelType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technician">Technicians</SelectItem>
                    <SelectItem value="external">External Personnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Target Camp *</label>
                <Select value={selectedCamp} onValueChange={setSelectedCamp}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select camp" />
                  </SelectTrigger>
                  <SelectContent>
                    {camps.map(camp => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.name} ({camp.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedCamp && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Unassigned Personnel */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Unassigned ({filteredPersonnel.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search personnel..."
                    value={searchPersonnel}
                    onChange={(e) => setSearchPersonnel(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredPersonnel.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No unassigned personnel</p>
                  ) : (
                    filteredPersonnel.map(person => (
                      <div
                        key={person.id}
                        onClick={() => setSelectedPerson(person)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedPerson?.id === person.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                          }`}
                      >
                        <p className="font-semibold text-gray-900">{person.full_name}</p>
                        <p className="text-sm text-gray-600">
                          {personnelType === 'technician' ? person.employee_id : person.company_name}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{person.gender}</Badge>
                          {person.nationality && (
                            <Badge variant="secondary" className="text-xs">{person.nationality}</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Assignment Arrow */}
            <div className="flex items-center justify-center">
              <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
                <CardContent className="p-6">
                  {selectedPerson && selectedBed ? (
                    <div className="text-center space-y-4">
                      <ArrowRight className="w-12 h-12 text-blue-600 mx-auto" />
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-900">{selectedPerson.full_name}</p>
                        <ArrowRight className="w-6 h-6 text-gray-400 mx-auto" />
                        <p className="font-semibold text-gray-900">
                          {(() => {
                            const { room, floor } = getBedDetails(selectedBed);
                            return `Floor ${floor?.floor_number}, Room ${room?.room_number}, Bed ${selectedBed.bed_number}`;
                          })()}
                        </p>
                      </div>
                      <Button onClick={handleAssign} className="w-full bg-green-600 hover:bg-green-700">
                        Confirm Assignment
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedPerson(null);
                          setSelectedBed(null);
                        }}
                        className="w-full"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Selection
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm">Select a person and a bed to assign</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Available Beds */}
            <Card className="border-none shadow-md">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                <CardTitle className="flex items-center gap-2">
                  <Bed className="w-5 h-5 text-green-600" />
                  Available Beds ({filteredBeds.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search beds..."
                    value={searchBed}
                    onChange={(e) => setSearchBed(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredBeds.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No available beds</p>
                  ) : (
                    filteredBeds.map(bed => {
                      const { room, floor } = getBedDetails(bed);
                      return (
                        <div
                          key={bed.id}
                          onClick={() => setSelectedBed(bed)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedBed?.id === bed.id
                              ? 'border-green-600 bg-green-50'
                              : 'border-gray-200 hover:border-green-300'
                            }`}
                        >
                          <p className="font-semibold text-gray-900">
                            Floor {floor?.floor_number}, Room {room?.room_number}
                          </p>
                          <p className="text-sm text-gray-600">Bed {bed.bed_number}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{room?.gender_restriction}</Badge>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {room?.occupant_type?.replace(/_/g, ' ')}
                            </Badge>
                            {bed.is_lower_berth && (
                              <Badge className="text-xs bg-blue-100 text-blue-700">Lower Berth</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedCamp && (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Please select a target camp to begin manual allocation</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}