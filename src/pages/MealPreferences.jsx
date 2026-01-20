import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Utensils, Plus, Edit2, Trash2, Search } from "lucide-react";

export default function MealPreferences() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPreference, setEditingPreference] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [cuisineFilter, setCuisineFilter] = useState("all");

  const [formData, setFormData] = useState({
    name: '',
    type: 'veg',
    cuisine: 'south_indian',
    description: '',
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: mealPreferences = [], isLoading } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list('name'),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MealPreference.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-preferences'] });
      setShowAddDialog(false);
      setFormData({
        name: '',
        type: 'veg',
        cuisine: 'south_indian',
        description: '',
        is_active: true
      });
      alert("Meal preference created successfully!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MealPreference.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-preferences'] });
      setShowEditDialog(false);
      setEditingPreference(null);
      alert("Meal preference updated successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPreference.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-preferences'] });
      alert("Meal preference deleted successfully!");
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'veg',
      cuisine: 'south_indian',
      description: '',
      is_active: true
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      id: editingPreference.id,
      data: formData
    });
  };

  const handleEditClick = (preference) => {
    setEditingPreference(preference);
    setFormData({
      name: preference.name || '',
      type: preference.type || 'veg',
      cuisine: preference.cuisine || 'south_indian',
      description: preference.description || '',
      is_active: preference.is_active !== false
    });
    setShowEditDialog(true);
  };

  const handleDelete = async (preference) => {
    if (!confirm(`Are you sure you want to delete "${preference.name}"?`)) {
      return;
    }
    await deleteMutation.mutateAsync(preference.id);
  };

  const filteredPreferences = mealPreferences.filter(pref => {
    const matchesSearch = !searchQuery ||
      pref.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pref.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || pref.type === typeFilter;
    const matchesCuisine = cuisineFilter === 'all' || pref.cuisine === cuisineFilter;
    
    return matchesSearch && matchesType && matchesCuisine;
  });

  const vegCount = mealPreferences.filter(p => p.type === 'veg').length;
  const nonVegCount = mealPreferences.filter(p => p.type === 'non_veg').length;
  const activeCount = mealPreferences.filter(p => p.is_active !== false).length;

  const cuisineStats = {
    african: mealPreferences.filter(p => p.cuisine === 'african').length,
    pakistani: mealPreferences.filter(p => p.cuisine === 'pakistani').length,
    south_indian: mealPreferences.filter(p => p.cuisine === 'south_indian').length,
    north_indian: mealPreferences.filter(p => p.cuisine === 'north_indian').length,
    isolation: mealPreferences.filter(p => p.cuisine === 'isolation').length
  };

  const getCuisineLabel = (cuisine) => {
    const labels = {
      african: 'African',
      pakistani: 'Pakistani',
      south_indian: 'South Indian',
      north_indian: 'North Indian',
      isolation: 'Isolation'
    };
    return labels[cuisine] || cuisine;
  };

  const getTypeLabel = (type) => {
    return type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian';
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meal preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ backgroundColor: '#F8F9FD' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#333333' }}>Meal Preferences</h1>
            <p className="mt-1" style={{ color: '#6C717C' }}>Manage dietary preferences and cuisine types</p>
          </div>
          <Button onClick={() => {
            setShowAddDialog(true);
            resetForm();
          }} className="hover:opacity-90" style={{ backgroundColor: '#FF8A00', color: '#FFFFFF' }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Meal Preference
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Preferences</p>
                  <p className="text-2xl font-bold" style={{ color: '#333333' }}>{mealPreferences.length}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A4DBF' }}>
                  <Utensils className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vegetarian</p>
                  <p className="text-2xl font-bold" style={{ color: '#3BB273' }}>{vegCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3BB273' }}>
                  <Utensils className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Non-Vegetarian</p>
                  <p className="text-2xl font-bold" style={{ color: '#EA4335' }}>{nonVegCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EA4335' }}>
                  <Utensils className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</p>
                  <p className="text-2xl font-bold" style={{ color: '#0A4DBF' }}>{activeCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A4DBF' }}>
                  <Utensils className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
          <CardHeader className="pb-3 rounded-t-xl" style={{ backgroundColor: '#072C77', borderBottom: '1px solid #E5E7ED' }}>
            <CardTitle className="text-sm font-semibold text-white">Cuisine Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(cuisineStats).map(([cuisine, count]) => (
                <div key={cuisine} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: '#333333' }}>{count}</div>
                  <div className="text-xs" style={{ color: '#6C717C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{getCuisineLabel(cuisine)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search meal preferences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by cuisine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cuisines</SelectItem>
                  <SelectItem value="african">African</SelectItem>
                  <SelectItem value="pakistani">Pakistani</SelectItem>
                  <SelectItem value="south_indian">South Indian</SelectItem>
                  <SelectItem value="north_indian">North Indian</SelectItem>
                  <SelectItem value="isolation">Isolation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredPreferences.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-12 text-center">
              <Utensils className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {mealPreferences.length === 0 ? 'No meal preferences created yet' : 'No preferences match your search'}
              </p>
              {mealPreferences.length === 0 && (
                <Button onClick={() => {
                  setShowAddDialog(true);
                  resetForm();
                }} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Preference
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPreferences.map((preference) => (
              <Card key={preference.id} className="border-none shadow-md hover:shadow-lg transition-shadow" style={{ backgroundColor: '#FFFFFF', borderRadius: '14px' }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1" style={{ color: '#333333' }}>{preference.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={preference.type === 'veg' ? 'default' : 'destructive'} className="text-xs">
                          {getTypeLabel(preference.type)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getCuisineLabel(preference.cuisine)}
                        </Badge>
                        {preference.is_active === false && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <Utensils className={`w-5 h-5 ${preference.type === 'veg' ? 'text-green-600' : 'text-red-600'}`} />
                  </div>

                  {preference.description && (
                    <p className="text-sm mb-3 line-clamp-2" style={{ color: '#6C717C' }}>{preference.description}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid #E5E7ED' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(preference)}
                      className="hover:opacity-80"
                      style={{ color: '#0A4DBF' }}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(preference)}
                      className="hover:opacity-80"
                      style={{ color: '#EA4335' }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Create Meal Preference
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Preference Name*</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., South Indian Vegetarian Thali"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type*</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Vegetarian</SelectItem>
                    <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cuisine">Cuisine*</Label>
                <Select value={formData.cuisine} onValueChange={(value) => setFormData({...formData, cuisine: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cuisine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="african">African</SelectItem>
                    <SelectItem value="pakistani">Pakistani</SelectItem>
                    <SelectItem value="south_indian">South Indian</SelectItem>
                    <SelectItem value="north_indian">North Indian</SelectItem>
                    <SelectItem value="isolation">Isolation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Additional details about this meal preference..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active and available for selection</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createMutation.isLoading ? 'Creating...' : 'Create Preference'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              Edit Meal Preference
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Preference Name*</Label>
              <Input
                id="edit_name"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., South Indian Vegetarian Thali"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_type">Type*</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Vegetarian</SelectItem>
                    <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_cuisine">Cuisine*</Label>
                <Select value={formData.cuisine} onValueChange={(value) => setFormData({...formData, cuisine: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cuisine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="african">African</SelectItem>
                    <SelectItem value="pakistani">Pakistani</SelectItem>
                    <SelectItem value="south_indian">South Indian</SelectItem>
                    <SelectItem value="north_indian">North Indian</SelectItem>
                    <SelectItem value="isolation">Isolation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Additional details about this meal preference..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="edit_is_active" className="cursor-pointer">Active and available for selection</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingPreference(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {updateMutation.isLoading ? 'Updating...' : 'Update Preference'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}