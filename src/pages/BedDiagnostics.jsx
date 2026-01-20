import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Bed, Users, Wrench } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BedDiagnostics() {
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => base44.entities.Floor.list(),
  });

  // Find orphaned beds (occupied but no technician)
  const orphanedBeds = beds.filter(bed => 
    bed.status === 'occupied' && 
    !bed.technician_id
  );

  // Find mismatched beds (occupied with technician_id, but technician doesn't reference this bed)
  const mismatchedBeds = beds.filter(bed => {
    if (bed.status === 'occupied' && bed.technician_id) {
      const tech = technicians.find(t => t.id === bed.technician_id);
      return !tech || tech.bed_id !== bed.id;
    }
    return false;
  });

  // Find technicians with bed_id but bed doesn't match
  const mismatchedTechnicians = technicians.filter(tech => {
    if (tech.bed_id) {
      const bed = beds.find(b => b.id === tech.bed_id);
      return !bed || bed.technician_id !== tech.id || bed.status !== 'occupied';
    }
    return false;
  });

  // Total occupied beds
  const occupiedBeds = beds.filter(b => b.status === 'occupied');

  // Technicians with beds assigned
  const techniciansWithBeds = technicians.filter(t => t.bed_id);

  const handleFixAll = async () => {
    setFixing(true);
    setResult(null);

    let fixedCount = 0;
    const errors = [];

    try {
      // Fix orphaned beds (occupied but no technician) - mark as available
      for (const bed of orphanedBeds) {
        try {
          await base44.entities.Bed.update(bed.id, {
            status: 'available',
            technician_id: null,
            reserved_for: null,
            reserved_until: null
          });
          fixedCount++;
        } catch (err) {
          errors.push(`Bed ${bed.bed_number}: ${err.message}`);
        }
      }

      // Fix mismatched beds (bed has technician_id but technician doesn't match)
      for (const bed of mismatchedBeds) {
        try {
          const tech = technicians.find(t => t.id === bed.technician_id);
          if (!tech) {
            // Technician doesn't exist - clear the bed
            await base44.entities.Bed.update(bed.id, {
              status: 'available',
              technician_id: null,
              reserved_for: null,
              reserved_until: null
            });
          } else if (tech.bed_id !== bed.id) {
            // Technician exists but points to different bed - clear this bed
            await base44.entities.Bed.update(bed.id, {
              status: 'available',
              technician_id: null,
              reserved_for: null,
              reserved_until: null
            });
          }
          fixedCount++;
        } catch (err) {
          errors.push(`Bed ${bed.bed_number}: ${err.message}`);
        }
      }

      // Fix mismatched technicians (technician has bed_id but bed doesn't match)
      for (const tech of mismatchedTechnicians) {
        try {
          const bed = beds.find(b => b.id === tech.bed_id);
          if (!bed) {
            // Bed doesn't exist - clear technician's bed_id
            await base44.entities.Technician.update(tech.id, {
              bed_id: null
            });
          } else if (bed.technician_id !== tech.id) {
            // Bed exists but points to different technician
            // Update the bed to point to this technician
            await base44.entities.Bed.update(bed.id, {
              status: 'occupied',
              technician_id: tech.id,
              reserved_for: null,
              reserved_until: null
            });
          } else if (bed.status !== 'occupied') {
            // Bed status is wrong - fix it
            await base44.entities.Bed.update(bed.id, {
              status: 'occupied'
            });
          }
          fixedCount++;
        } catch (err) {
          errors.push(`Technician ${tech.employee_id}: ${err.message}`);
        }
      }

      setResult({
        success: true,
        fixed: fixedCount,
        errors: errors.length,
        errorDetails: errors
      });

      queryClient.invalidateQueries();

    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    }

    setFixing(false);
  };

  const getBedLocation = (bed) => {
    const room = rooms.find(r => r.id === bed.room_id);
    const floor = room ? floors.find(f => f.id === room.floor_id) : null;
    const camp = floor ? camps.find(c => c.id === floor.camp_id) : null;
    
    return {
      camp: camp?.name || 'Unknown',
      floor: floor ? `Floor ${floor.floor_number}` : 'Unknown',
      room: room ? `Room ${room.room_number}` : 'Unknown'
    };
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bed Occupancy Diagnostics</h1>
              <p className="text-gray-600">Find and fix bed-technician data mismatches</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Beds</p>
                  <p className="text-2xl font-bold text-gray-900">{beds.length}</p>
                </div>
                <Bed className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Occupied Beds</p>
                  <p className="text-2xl font-bold text-gray-900">{occupiedBeds.length}</p>
                </div>
                <Bed className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Technicians w/ Beds</p>
                  <p className="text-2xl font-bold text-gray-900">{techniciansWithBeds.length}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 mb-1">Issues Found</p>
                  <p className="text-2xl font-bold text-red-900">
                    {orphanedBeds.length + mismatchedBeds.length + mismatchedTechnicians.length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issues Summary */}
        {(orphanedBeds.length > 0 || mismatchedBeds.length > 0 || mismatchedTechnicians.length > 0) && (
          <Card className="border-l-4 border-l-red-500 shadow-lg">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Data Integrity Issues Detected
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {orphanedBeds.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>{orphanedBeds.length} orphaned bed(s)</strong> - Marked as "occupied" but no technician assigned
                  </AlertDescription>
                </Alert>
              )}

              {mismatchedBeds.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>{mismatchedBeds.length} mismatched bed(s)</strong> - Bed has technician_id but technician doesn't reference this bed
                  </AlertDescription>
                </Alert>
              )}

              {mismatchedTechnicians.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>{mismatchedTechnicians.length} mismatched technician(s)</strong> - Technician has bed_id but bed doesn't match
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleFixAll}
                disabled={fixing}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                {fixing ? 'Fixing Issues...' : 'Fix All Issues Automatically'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result Message */}
        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            <AlertDescription>
              {result.success ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Successfully fixed {result.fixed} issue(s)!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Error: {result.error}</span>
                </div>
              )}
              {result.errors > 0 && (
                <div className="mt-2 text-sm">
                  {result.errorDetails.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Orphaned Beds Details */}
        {orphanedBeds.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <CardTitle>Orphaned Beds ({orphanedBeds.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {orphanedBeds.map(bed => {
                  const location = getBedLocation(bed);
                  return (
                    <div key={bed.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Bed {bed.bed_number}</p>
                          <p className="text-sm text-gray-600">
                            {location.camp} → {location.floor} → {location.room}
                          </p>
                          <p className="text-xs text-red-600 mt-1">Status: {bed.status}, but no technician_id</p>
                        </div>
                        <Badge variant="destructive">Orphaned</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mismatched Beds Details */}
        {mismatchedBeds.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b">
              <CardTitle>Mismatched Beds ({mismatchedBeds.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {mismatchedBeds.map(bed => {
                  const location = getBedLocation(bed);
                  const tech = technicians.find(t => t.id === bed.technician_id);
                  return (
                    <div key={bed.id} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Bed {bed.bed_number}</p>
                          <p className="text-sm text-gray-600">
                            {location.camp} → {location.floor} → {location.room}
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            Points to: {tech ? `${tech.full_name} (${tech.employee_id})` : 'Non-existent technician'}
                            {tech && tech.bed_id !== bed.id && ' - but technician points to different bed'}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-orange-100 text-orange-700">Mismatched</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mismatched Technicians Details */}
        {mismatchedTechnicians.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b">
              <CardTitle>Mismatched Technicians ({mismatchedTechnicians.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {mismatchedTechnicians.map(tech => {
                  const bed = beds.find(b => b.id === tech.bed_id);
                  return (
                    <div key={tech.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{tech.full_name}</p>
                          <p className="text-sm text-gray-600">{tech.employee_id}</p>
                          <p className="text-xs text-yellow-600 mt-1">
                            {bed ? 
                              `Points to Bed ${bed.bed_number} (status: ${bed.status}, technician_id: ${bed.technician_id || 'null'})` :
                              'Points to non-existent bed'
                            }
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Mismatched</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Clear Message */}
        {orphanedBeds.length === 0 && mismatchedBeds.length === 0 && mismatchedTechnicians.length === 0 && (
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">All Clear! 🎉</h3>
              <p className="text-gray-600">
                No data integrity issues found. Bed-technician relationships are properly synchronized.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600">Occupied Beds</p>
                  <p className="text-xl font-bold text-gray-900">{occupiedBeds.length}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600">Technicians w/ Beds</p>
                  <p className="text-xl font-bold text-gray-900">{techniciansWithBeds.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}