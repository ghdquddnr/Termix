import React, {useState, useEffect} from "react";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter} from "@/components/ui/sheet.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {
    Share,
    Users,
    Globe,
    Lock,
    Unlock,
    Copy,
    Calendar,
    UserPlus,
    Trash2,
    Eye,
    Edit,
    PlayCircle,
    Shield,
    CheckCircle,
    X,
    Link
} from "lucide-react";
import {useTranslation} from "react-i18next";
import axios from "axios";

interface ScriptShareDialogProps {
    script: Script;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

interface Script {
    id: number;
    name: string;
    description: string;
    isPublic: boolean;
    isTemplate: boolean;
    userId: string;
}

interface Permission {
    id: number;
    userId: string;
    userEmail?: string;
    userName?: string;
    permissionType: 'read' | 'execute' | 'edit' | 'admin';
    grantedBy: string;
    grantedAt: string;
    expiresAt?: string;
}

interface User {
    id: string;
    username: string;
    email: string;
}

export function ScriptShareDialog({script, isOpen, onClose, onUpdate}: ScriptShareDialogProps): React.ReactElement {
    const {t} = useTranslation();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [isPublic, setIsPublic] = useState(script.isPublic);
    const [isTemplate, setIsTemplate] = useState(script.isTemplate);
    const [newPermissionUser, setNewPermissionUser] = useState("");
    const [newPermissionType, setNewPermissionType] = useState<'read' | 'execute' | 'edit' | 'admin'>('read');
    const [newPermissionExpiry, setNewPermissionExpiry] = useState("");

    // Load data on dialog open
    useEffect(() => {
        if (isOpen) {
            loadPermissions();
            loadUsers();
            setIsPublic(script.isPublic);
            setIsTemplate(script.isTemplate);
        }
    }, [isOpen, script]);

    const loadPermissions = async () => {
        try {
            const response = await axios.get(`/scripts/${script.id}/permissions`);
            setPermissions(response.data);
        } catch (error) {
            console.error('Failed to load permissions:', error);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await axios.get('/users');
            setUsers(response.data.filter((user: User) => user.id !== script.userId));
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handlePublicToggle = async (checked: boolean) => {
        setLoading(true);
        try {
            await axios.patch(`/scripts/${script.id}`, {
                isPublic: checked
            });
            setIsPublic(checked);
            onUpdate();
        } catch (error) {
            console.error('Failed to update public setting:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateToggle = async (checked: boolean) => {
        setLoading(true);
        try {
            await axios.patch(`/scripts/${script.id}`, {
                isTemplate: checked
            });
            setIsTemplate(checked);
            onUpdate();
        } catch (error) {
            console.error('Failed to update template setting:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPermission = async () => {
        if (!newPermissionUser) {
            alert(t('script.share.selectUser'));
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                userId: newPermissionUser,
                permissionType: newPermissionType
            };

            if (newPermissionExpiry) {
                payload.expiresAt = newPermissionExpiry;
            }

            await axios.post(`/scripts/${script.id}/permissions`, payload);

            // Reset form
            setNewPermissionUser("");
            setNewPermissionType('read');
            setNewPermissionExpiry("");

            // Reload permissions
            loadPermissions();
        } catch (error) {
            console.error('Failed to add permission:', error);
            alert(t('script.share.addPermissionFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePermission = async (permissionId: number) => {
        if (confirm(t('script.share.confirmRemovePermission'))) {
            setLoading(true);
            try {
                await axios.delete(`/scripts/${script.id}/permissions/${permissionId}`);
                loadPermissions();
            } catch (error) {
                console.error('Failed to remove permission:', error);
                alert(t('script.share.removePermissionFailed'));
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUpdatePermission = async (permissionId: number, newType: string) => {
        setLoading(true);
        try {
            await axios.patch(`/scripts/${script.id}/permissions/${permissionId}`, {
                permissionType: newType
            });
            loadPermissions();
        } catch (error) {
            console.error('Failed to update permission:', error);
            alert(t('script.share.updatePermissionFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleCopyShareLink = () => {
        const shareUrl = `${window.location.origin}/scripts/${script.id}`;
        navigator.clipboard.writeText(shareUrl);
        // TODO: Show toast notification
    };

    const getPermissionIcon = (type: string) => {
        switch (type) {
            case 'read':
                return <Eye className="h-4 w-4"/>;
            case 'execute':
                return <PlayCircle className="h-4 w-4"/>;
            case 'edit':
                return <Edit className="h-4 w-4"/>;
            case 'admin':
                return <Shield className="h-4 w-4"/>;
            default:
                return <Eye className="h-4 w-4"/>;
        }
    };

    const getPermissionColor = (type: string) => {
        switch (type) {
            case 'read':
                return 'text-blue-600';
            case 'execute':
                return 'text-green-600';
            case 'edit':
                return 'text-orange-600';
            case 'admin':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const isPermissionExpired = (expiresAt?: string) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    const formatExpiryDate = (expiresAt?: string) => {
        if (!expiresAt) return t('script.share.neverExpires');
        const date = new Date(expiresAt);
        return date.toLocaleDateString();
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="max-w-2xl max-h-[80vh] overflow-y-auto w-full max-w-full">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Share className="h-5 w-5"/>
                        {t('script.share.title')}: {script.name}
                    </SheetTitle>
                    <SheetDescription>
                        {t('script.share.description')}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Public Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-4 w-4"/>
                                {t('script.share.publicAccess')}
                            </CardTitle>
                            <CardDescription>
                                {t('script.share.publicAccessDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>{t('script.share.makePublic')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('script.share.makePublicDescription')}
                                    </p>
                                </div>
                                <Switch
                                    checked={isPublic}
                                    onCheckedChange={handlePublicToggle}
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>{t('script.share.makeTemplate')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('script.share.makeTemplateDescription')}
                                    </p>
                                </div>
                                <Switch
                                    checked={isTemplate}
                                    onCheckedChange={handleTemplateToggle}
                                    disabled={loading}
                                />
                            </div>

                            {isPublic && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                                    <CheckCircle className="h-4 w-4 text-green-600"/>
                                    <span className="text-sm text-green-800 dark:text-green-200">
                                        {t('script.share.publicNotice')}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyShareLink}
                                        className="ml-auto"
                                    >
                                        <Link className="h-3 w-3 mr-1"/>
                                        {t('script.share.copyLink')}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* User Permissions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-4 w-4"/>
                                {t('script.share.userPermissions')}
                            </CardTitle>
                            <CardDescription>
                                {t('script.share.userPermissionsDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Add New Permission */}
                            <div className="space-y-3 p-4 border rounded-md">
                                <h4 className="font-medium flex items-center gap-2">
                                    <UserPlus className="h-4 w-4"/>
                                    {t('script.share.addUser')}
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <Label>{t('script.share.selectUser')}</Label>
                                        <Select value={newPermissionUser} onValueChange={setNewPermissionUser}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('script.share.selectUserPlaceholder')}/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.username} ({user.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>{t('script.share.permissionLevel')}</Label>
                                        <Select value={newPermissionType} onValueChange={(value: any) => setNewPermissionType(value)}>
                                            <SelectTrigger>
                                                <SelectValue/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="read">
                                                    <div className="flex items-center gap-2">
                                                        <Eye className="h-3 w-3"/>
                                                        {t('script.share.readOnly')}
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="execute">
                                                    <div className="flex items-center gap-2">
                                                        <PlayCircle className="h-3 w-3"/>
                                                        {t('script.share.executeOnly')}
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="edit">
                                                    <div className="flex items-center gap-2">
                                                        <Edit className="h-3 w-3"/>
                                                        {t('script.share.editAccess')}
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="admin">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="h-3 w-3"/>
                                                        {t('script.share.adminAccess')}
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>{t('script.share.expiryDate')} ({t('script.share.optional')})</Label>
                                        <Input
                                            type="date"
                                            value={newPermissionExpiry}
                                            onChange={(e) => setNewPermissionExpiry(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleAddPermission}
                                    disabled={loading || !newPermissionUser}
                                    className="w-full"
                                >
                                    <UserPlus className="h-4 w-4 mr-2"/>
                                    {t('script.share.grantAccess')}
                                </Button>
                            </div>

                            {/* Existing Permissions */}
                            <div className="space-y-2">
                                {permissions.length > 0 ? (
                                    permissions.map((permission) => (
                                        <div
                                            key={permission.id}
                                            className={`flex items-center justify-between p-3 border rounded-md ${
                                                isPermissionExpired(permission.expiresAt) ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`${getPermissionColor(permission.permissionType)}`}>
                                                    {getPermissionIcon(permission.permissionType)}
                                                </div>
                                                <div>
                                                    <div className="font-medium">
                                                        {permission.userName || permission.userEmail || permission.userId}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {t(`script.share.${permission.permissionType}`)}
                                                        {permission.expiresAt && (
                                                            <>
                                                                {' • '}
                                                                {t('script.share.expires')}: {formatExpiryDate(permission.expiresAt)}
                                                                {isPermissionExpired(permission.expiresAt) && (
                                                                    <Badge variant="destructive" className="ml-2 text-xs">
                                                                        {t('script.share.expired')}
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={permission.permissionType}
                                                    onValueChange={(value) => handleUpdatePermission(permission.id, value)}
                                                    disabled={loading}
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="read">{t('script.share.readOnly')}</SelectItem>
                                                        <SelectItem value="execute">{t('script.share.executeOnly')}</SelectItem>
                                                        <SelectItem value="edit">{t('script.share.editAccess')}</SelectItem>
                                                        <SelectItem value="admin">{t('script.share.adminAccess')}</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRemovePermission(permission.id)}
                                                    disabled={loading}
                                                >
                                                    <Trash2 className="h-3 w-3"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                                        <p>{t('script.share.noPermissions')}</p>
                                        <p className="text-sm">{t('script.share.addUserPrompt')}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Permission Levels Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-4 w-4"/>
                                {t('script.share.permissionLevels')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Eye className="h-4 w-4 text-blue-600"/>
                                    <div>
                                        <strong>{t('script.share.readOnly')}:</strong> {t('script.share.readOnlyDescription')}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <PlayCircle className="h-4 w-4 text-green-600"/>
                                    <div>
                                        <strong>{t('script.share.executeOnly')}:</strong> {t('script.share.executeOnlyDescription')}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Edit className="h-4 w-4 text-orange-600"/>
                                    <div>
                                        <strong>{t('script.share.editAccess')}:</strong> {t('script.share.editAccessDescription')}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Shield className="h-4 w-4 text-red-600"/>
                                    <div>
                                        <strong>{t('script.share.adminAccess')}:</strong> {t('script.share.adminAccessDescription')}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <SheetFooter>
                    <Button variant="outline" onClick={onClose}>
                        {t('common.close')}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}