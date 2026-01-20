
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Hospital, Phone, Mail, MapPin, AlertCircle, Pencil, Trash2 } from "lucide-react";

export default function Hospitals() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [formData, setFormData] = useState({});

  const queryClient = useQueryClient();

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => base44.entities.Hospital.list('name'),
    staleTime: 0, // Mark data as stale immediately
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Hospital.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      setShowAddDialog(false);
      setFormData({});
      alert("Hospital added successfully!");
    },
    onError: (error) => {
      console.error("Error adding hospital:", error);
      alert(`Error adding hospital: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Hospital.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      setShowEditDialog(false);
      setEditingHospital(null);
      alert("Hospital updated successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Hospital.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      alert("Hospital deleted successfully!");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: editingHospital.id, data: editingHospital });
  };

  const handleEdit = (hospital) => {
    setEditingHospital({ ...hospital });
    setShowEditDialog(true);
  };

  const handleDelete = (hospital) => {
    if (confirm(`Delete ${hospital.name}? This action cannot be undone.`)) {
      deleteMutation.mutate(hospital.id);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Hospital className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hospitals</h1>
              <p className="text-gray-600">Manage external medical facilities</p>
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Hospital
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center p-12 text-gray-600">Loading hospitals...</div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hospitals.map((hospital) => (
                <Card key={hospital.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{hospital.name}</CardTitle>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="w-4 h-4" />
                          {hospital.location}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(hospital)} className="h-8 w-8 p-0">
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(hospital)} className="h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    {hospital.address && (
                      <p className="text-sm text-gray-700">{hospital.address}</p>
                    )}
                    {hospital.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Phone className="w-4 h-4 text-purple-600" />
                        {hospital.phone}
                      </div>
                    )}
                    {hospital.emergency_number && (
                      <div className="flex items-center gap-2 text-sm text-red-600 font-semibold">
                        <AlertCircle className="w-4 h-4" />
                        Emergency: {hospital.emergency_number}
                      </div>
                    )}
                    {hospital.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Mail className="w-4 h-4 text-purple-600" />
                        {hospital.email}
                      </div>
                    )}
                    {hospital.contact_person && (
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Contact:</span> {hospital.contact_person}
                      </div>
                    )}
                    {hospital.specialties && (
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Specialties:</span> {hospital.specialties}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {hospitals.length === 0 && (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Hospital className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Hospitals Added</h3>
                  <p className="text-gray-600 mb-4">Add hospitals to track medical referrals and treatments</p>
                  <Button onClick={() => setShowAddDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Hospital
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Hospital</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hospital Name*</Label>
                <Input
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Dubai Hospital"
                />
              </div>
              <div className="space-y-2">
                <Label>Location/City*</Label>
                <Input
                  required
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Dubai"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Full Address</Label>
                <Input
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Complete address"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number*</Label>
                <Input
                  required
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+971 4 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Number</Label>
                <Input
                  value={formData.emergency_number || ''}
                  onChange={(e) => setFormData({ ...formData, emergency_number: e.target.value })}
                  placeholder="+971 4 999 9999"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@hospital.ae"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  value={formData.contact_person || ''}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Key contact name"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Specialties</Label>
                <Input
                  value={formData.specialties || ''}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  placeholder="e.g., Cardiology, Orthopedics, Emergency Care"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                Add Hospital
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Hospital</DialogTitle>
          </DialogHeader>
          {editingHospital && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hospital Name*</Label>
                  <Input
                    required
                    value={editingHospital.name || ''}
                    onChange={(e) => setEditingHospital({ ...editingHospital, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location/City*</Label>
                  <Input
                    required
                    value={editingHospital.location || ''}
                    onChange={(e) => setEditingHospital({ ...editingHospital, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Full Address</Label>
                  <Input
                    value={editingHospital.address || ''}
                    onChange={(e) => setEditingHospital({ ...editingHospital, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number*</Label>
                  <Input
                    required
                    value={editingHospital.phone || ''}
                    onChange={(e) => setEditingHospital({ ...editingHospital, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Number</Label>
                  <Input
                    value={editingHospital.emergency_number || ''}
                    onChange={(e) => setEditingHospital({ ...editingHospital, emergency_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editingHospital.email || ''}
                    onChange={(e) => setEditingHospital({ ...editingHospital, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={editingHospital.contact_person || ''}
                    onChange={(e) => setEditingHospital({ ...editingHospital, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Specialties</Label>
                  <Input
                    value={editingHospital.specialties || ''}
                    onChange={(e) => setEditingHospital({ ...editingHospital, specialties: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editingHospital.notes || ''}
                    onChange={(e) => setEditingHospital({ ...editingHospital, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
