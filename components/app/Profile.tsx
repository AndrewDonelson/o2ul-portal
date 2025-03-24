// file: /components/app/Profile.tsx
// feature: App - User profile component with in-place editing

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Camera, Mail, Phone, Edit2, Calendar, AtSign, Users, MessageCircle, Star,
    ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { StatusIndicator } from "@/components/shared/StatusIndicator";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useRouter } from "next/navigation";
import FileSelectionDialog from "@/components/shared/FileSelectionDialog";

interface ProfileProps {
    profileId: Id<"users">;
    isOwner: boolean;
}

interface EditableFieldProps {
    value: string;
    onSave: (value: string) => Promise<void>;
    label: string;
    isEditing: boolean;
    placeholder?: string;
    multiline?: boolean;
    className?: string;
}

function EditableField({
    value,
    onSave,
    label,
    isEditing,
    placeholder,
    multiline,
    className
}: EditableFieldProps) {
    const [isEditable, setIsEditable] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const { toast } = useToast();

    useEffect(() => {
        setEditValue(value);
    }, [value]);

    const handleSave = async () => {
        if (editValue === value) {
            setIsEditable(false);
            return;
        }

        try {
            await onSave(editValue);
            setIsEditable(false);
            toast({ title: `${label} updated successfully` });
        } catch (error) {
            toast({
                title: `Failed to update ${label.toLowerCase()}`,
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        }
    };

    if (!isEditing) {
        return (
            <span className={`text-sm text-muted-foreground ${className}`}>
                {value || placeholder}
            </span>
        );
    }

    if (!isEditable) {
        return (
            <div
                className={`group relative cursor-pointer flex-1 ${className}`}
                onClick={() => setIsEditable(true)}
            >
                <span className="text-sm text-muted-foreground">
                    {value || placeholder}
                </span>
                <Edit2 className="h-4 w-4 absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        );
    }

    return (
        <div className={`space-y-2 flex-1 ${className}`}>
            {multiline ? (
                <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="min-h-[100px] resize-none"
                    placeholder={placeholder}
                />
            ) : (
                <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm"
                    placeholder={placeholder}
                />
            )}
            <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditable(false)}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}

export default function Profile({ profileId, isOwner }: ProfileProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [imageDialogOpen, setImageDialogOpen] = useState(false);

    const updateProfile = useMutation(api.users.index.updateProfile);
    const profile = useQuery(api.users.index.get, { userId: profileId });
    const platformData = useQuery(api.users.index.getPlatformData, { platform: "github" });
    const updateBgImage = useMutation(api.users.index.updateBackgroundImage);
    const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

    if (!profile || !platformData) {
        return <LoadingSpinner fullScreen />;
    }

    const handleBgImageSelect = async (file: {
        url: string,
        storageId: Id<"_storage">
    }) => {
        try {
            await updateProfile({
                bgImageUrl: file.url,
                bgImageStorageId: file.storageId,
                bgImageOpacity: 1 // Default opacity
            });
            toast({ title: "Background image updated successfully" });
        } catch (error) {
            toast({
                title: "Failed to update background image",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        }
    };


    const saveHandlers = {
        username: async (value: string) => {
            await updateProfile({ username: value });
        },
        name: async (value: string) => {
            await updateProfile({ name: value });
        },
        bio: async (value: string) => {
            await updateProfile({ bio: value });
        },
        email: async (value: string) => {
            await updateProfile({ email: value });
        },
        phone: async (value: string) => {
            await updateProfile({ phone: value });
        },
    };

    const joinedDate = new Date(platformData.profile?.createdAt || Date.now());
    const lastActive = new Date(platformData.profile?.lastSeen || Date.now());

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-8 animate-fade-in">
            {/* Back Button */}
            <Button
                variant="ghost"
                className="absolute left-4 top-4 md:left-8 md:top-8 animate-fade-in"
                onClick={() => router.back()}
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>

            {/* Background Image with Header */}
            <div className="relative h-64 md:h-96 rounded-lg border overflow-hidden">
                {/* Semi-transparent gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-background/90">
                    {profile.bgImageUrl && (
                        <Image
                            src={profile.bgImageUrl}
                            alt="Profile background"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority
                        />
                    )}
                </div>

                {/* Profile Content Container - centered vertically and horizontally */}
                <div className="relative z-10 h-full w-full flex flex-col items-center justify-center gap-4 p-4">
                    {/* Name - if set */}
                    {profile.name && (
                        <EditableField
                            value={profile.name}
                            onSave={saveHandlers.name}
                            label="Name"
                            isEditing={isOwner}
                            placeholder="Add your name"
                            className="text-xl md:text-2xl font-semibold text-white mb-2"
                        />
                    )}

                    {/* Avatar with Status - centered */}
                    <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-background">
                            <AvatarImage src={profile.avatar} />
                            <AvatarFallback>{profile.name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                            <StatusIndicator
                                status={profile.isOnline ? "online" : "offline"}
                                pulseAnimation={profile.isOnline}
                            />
                        </div>
                    </div>

                    {/* Bio - if set */}
                    {profile.bio && (
                        <EditableField
                            value={profile.bio}
                            onSave={saveHandlers.bio}
                            label="Bio"
                            isEditing={isOwner}
                            placeholder="Add a bio..."
                            multiline
                            className="text-sm text-white/80 mt-2 text-center max-w-lg"
                        />
                    )}
                </div>

                {isOwner && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute bottom-4 right-4 z-20"
                        onClick={() => setIsFileDialogOpen(true)}
                    >
                        <Camera className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Profile Details */}
            <Card className="animate-fade-in-up delay-200">
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <AtSign className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Label className="shrink-0">Username</Label>
                            <EditableField
                                value={profile.username || ""}
                                onSave={saveHandlers.username}
                                label="Username"
                                isEditing={isOwner}
                                placeholder="Add username"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Label className="shrink-0">Joined</Label>
                            <span className="text-sm text-muted-foreground">
                                {format(joinedDate, 'PPP')}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Label className="shrink-0">Last Active</Label>
                            <span className="text-sm text-muted-foreground">
                                {format(lastActive, 'PPP')}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Image Selection Dialog */}
            <FileSelectionDialog
                isOpen={isFileDialogOpen}
                onClose={() => setIsFileDialogOpen(false)}
                onFileSelect={handleBgImageSelect}
                contentType="image"
            />
        </div>
    );
}