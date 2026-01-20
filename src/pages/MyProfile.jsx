import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client'; // uses db.js under the hood
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, FileText, Activity } from 'lucide-react';
import { formatDate } from "@/components/utils/dateFormatter";
import { useAuth } from '@/lib/AuthContext';

export default function MyProfile() {
    const { user, isLoadingAuth } = useAuth();
    const [technician, setTechnician] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchMyDetails() {
            if (!user?.email) return;

            try {
                setLoading(true);
                // We rely on RLS or filtering by email to find the technician record
                // Since we are "user", RLS might restrict us to only seeing our own record in list()
                // Or we can explicitly filter by email if RLS isn't strictly enforced yet
                const techs = await base44.entities.Technician.list();
                const myRecord = techs.find(t => t.email === user.email);

                if (myRecord) {
                    setTechnician(myRecord);
                } else {
                    // If not found in Technician table, maybe they are just a system user without a tech record
                    // But for this use-case, we assume they are a technician
                    setError("Technician record not found for this email.");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load profile.");
            } finally {
                setLoading(false);
            }
        }

        if (!isLoadingAuth && user) {
            fetchMyDetails();
        }
    }, [user, isLoadingAuth]);

    if (isLoadingAuth || loading) {
        return <div className="p-8 flex justify-center text-gray-500">Loading profile...</div>;
    }

    if (error) {
        return (
            <div className="p-8">
                <Card className="max-w-md mx-auto border-red-200 bg-red-50">
                    <CardContent className="pt-6 text-center text-red-600">
                        <p>{error}</p>
                        <p className="text-sm mt-2 text-gray-600">Contact admin if you believe this is a mistake.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!technician) {
        return (
            <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card className="border-none shadow-md overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-600 to-gray-800 h-32"></div>
                        <CardContent className="relative pt-0 px-6 pb-6">
                            <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-6 gap-6">
                                <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                                    <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                                        <User className="w-12 h-12 text-gray-400" />
                                    </div>
                                </div>
                                <div className="flex-1 mb-2 md:mb-0">
                                    <h1 className="text-2xl font-bold text-gray-900">{user.full_name || 'Admin User'}</h1>
                                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                                        <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                                        <span className="text-gray-300">|</span>
                                        <span>System User</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Email</p>
                                        <p className="text-sm font-medium">{user.email || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 italic">
                                        This account is a system user and is not linked to a specific technician record.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header / Identity */}
                <Card className="border-none shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32"></div>
                    <CardContent className="relative pt-0 px-6 pb-6">
                        <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-6 gap-6">
                            <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                                <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                                    <User className="w-12 h-12 text-gray-400" />
                                </div>
                            </div>
                            <div className="flex-1 mb-2 md:mb-0">
                                <h1 className="text-2xl font-bold text-gray-900">{technician.full_name}</h1>
                                <div className="flex items-center gap-2 text-gray-600 mt-1">
                                    <Briefcase className="w-4 h-4" />
                                    <span>{technician.trade}</span>
                                    <span className="text-gray-300">|</span>
                                    <span>{technician.employee_id}</span>
                                </div>
                            </div>
                            <div className="mb-2 md:mb-0">
                                <Badge className={`px-3 py-1 text-sm ${technician.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                    technician.status === 'on_leave' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {technician.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Email</p>
                                    <p className="text-sm font-medium">{technician.email || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Phone</p>
                                    <p className="text-sm font-medium">{technician.phone || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Current Location</p>
                                    <p className="text-sm font-medium">
                                        {/* We would typically fetch camp name here, simplified for now */}
                                        Camp ID: {technician.camp_id || 'Not Assigned'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                        <TabsTrigger value="details">Personal Details</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details">
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Your personal and employment details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Nationality</p>
                                        <p className="font-medium">{technician.nationality || '-'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Gender</p>
                                        <p className="font-medium capitalize">{technician.gender || '-'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Date of Birth</p>
                                        <p className="font-medium">{formatDate(technician.date_of_birth)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Marital Status</p>
                                        <p className="font-medium capitalize">{technician.marital_status || '-'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Induction Date</p>
                                        <p className="font-medium">{formatDate(technician.induction_date)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Department</p>
                                        <p className="font-medium">{technician.department || '-'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="documents">
                        <Card>
                            <CardHeader>
                                <CardTitle>Identity Documents</CardTitle>
                                <CardDescription>Your registered identification documents</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-8 h-8 text-gray-400" />
                                        <div>
                                            <p className="font-medium">Passport</p>
                                            <p className="text-sm text-gray-500">{technician.passport_no || 'Not registered'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Expires</p>
                                        <p className="text-sm font-medium">{formatDate(technician.passport_expiry_date)}</p>
                                    </div>
                                </div>

                                <div className="border rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-8 h-8 text-gray-400" />
                                        <div>
                                            <p className="font-medium">Health Insurance</p>
                                            <p className="text-sm text-gray-500">{technician.health_insurance_no || 'Not registered'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Expires</p>
                                        <p className="text-sm font-medium">{formatDate(technician.health_insurance_expiry_date)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
