import React, {useState, useEffect} from "react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {
    Search,
    Plus,
    Filter,
    Star,
    StarOff,
    Play,
    Edit,
    Copy,
    Share,
    Trash2,
    FolderTree,
    Code,
    Calendar,
    User,
    Tag,
    Eye,
    EyeOff
} from "lucide-react";
import {useSidebar} from "@/components/ui/sidebar.tsx";
import {useTranslation} from "react-i18next";
import {ScriptEditor} from "./ScriptEditor.tsx";
import {ScriptCategoryTree} from "./ScriptCategoryTree.tsx";
import {ScriptExecutionDialog} from "./ScriptExecutionDialog.tsx";
import {ScriptShareDialog} from "./ScriptShareDialog.tsx";
import axios from "axios";

interface ScriptLibraryProps {
    onSelectView: (view: string) => void;
    isTopbarOpen?: boolean;
}

interface Script {
    id: number;
    name: string;
    description: string;
    content?: string;
    language: string;
    categoryId?: number;
    categoryName?: string;
    tags: string;
    isPublic: boolean;
    isTemplate: boolean;
    isFavorite: boolean;
    version: string;
    lastExecuted?: string;
    executionCount: number;
    createdAt: string;
    updatedAt: string;
    userId: string;
    userName: string;
}

interface Category {
    id: number;
    name: string;
    description?: string;
    parentId?: number;
    color: string;
    icon: string;
    sortOrder: number;
}

export function ScriptLibrary({onSelectView, isTopbarOpen}: ScriptLibraryProps): React.ReactElement {
    const {t} = useTranslation();
    const {state: sidebarState} = useSidebar();

    // State management
    const [activeTab, setActiveTab] = useState("library");
    const [scripts, setScripts] = useState<Script[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [filteredScripts, setFilteredScripts] = useState<Script[]>([]);
    const [selectedScript, setSelectedScript] = useState<Script | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isExecutionDialogOpen, setIsExecutionDialogOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [showOnlyPublic, setShowOnlyPublic] = useState(false);
    const [showOnlyTemplates, setShowOnlyTemplates] = useState(false);
    const [sortBy, setSortBy] = useState<string>("updatedAt");
    const [sortOrder, setSortOrder] = useState<string>("desc");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 12;

    // Load data on component mount
    useEffect(() => {
        loadScripts();
        loadCategories();
    }, [currentPage, selectedCategory, selectedLanguage, showOnlyFavorites, showOnlyPublic, showOnlyTemplates, sortBy, sortOrder]);

    // Filter scripts based on search query
    useEffect(() => {
        let filtered = scripts;

        if (searchQuery) {
            filtered = filtered.filter(script =>
                script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                script.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                script.tags.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredScripts(filtered);
    }, [scripts, searchQuery]);

    const loadScripts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                sortBy,
                sortOrder
            });

            if (selectedCategory !== "all") params.append('categoryId', selectedCategory);
            if (selectedLanguage !== "all") params.append('language', selectedLanguage);
            if (showOnlyFavorites) params.append('isFavorite', 'true');
            if (showOnlyPublic) params.append('isPublic', 'true');
            if (showOnlyTemplates) params.append('isTemplate', 'true');

            const response = await axios.get(`/scripts?${params.toString()}`);
            setScripts(response.data.scripts);
            setTotalPages(response.data.pagination.totalPages);
        } catch (error) {
            console.error('Failed to load scripts:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await axios.get('/scripts/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const handleScriptSelect = async (script: Script) => {
        try {
            const response = await axios.get(`/scripts/${script.id}`);
            setSelectedScript(response.data);
        } catch (error) {
            console.error('Failed to load script details:', error);
        }
    };

    const handleScriptCreate = () => {
        setSelectedScript(null);
        setIsEditorOpen(true);
    };

    const handleScriptEdit = (script: Script) => {
        setSelectedScript(script);
        setIsEditorOpen(true);
    };

    const handleScriptExecute = (script: Script) => {
        setSelectedScript(script);
        setIsExecutionDialogOpen(true);
    };

    const handleScriptShare = (script: Script) => {
        setSelectedScript(script);
        setIsShareDialogOpen(true);
    };

    const handleScriptDelete = async (script: Script) => {
        if (confirm(t('script.confirmDelete', {name: script.name}))) {
            try {
                await axios.delete(`/scripts/${script.id}`);
                loadScripts();
            } catch (error) {
                console.error('Failed to delete script:', error);
            }
        }
    };

    const handleToggleFavorite = async (script: Script) => {
        try {
            await axios.patch(`/scripts/${script.id}`, {
                isFavorite: !script.isFavorite
            });
            loadScripts();
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    };

    const getLanguageIcon = (language: string) => {
        const icons: Record<string, string> = {
            'bash': '🐚',
            'python': '🐍',
            'javascript': '🟨',
            'typescript': '🔷',
            'powershell': '💙',
            'sql': '🗃️',
            'yaml': '📄',
            'json': '📋'
        };
        return icons[language] || '📄';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const parseTags = (tagsString: string): string[] => {
        try {
            return JSON.parse(tagsString || '[]');
        } catch {
            return [];
        }
    };

    return (
        <div className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="border-b">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="library">{t('script.library')}</TabsTrigger>
                        <TabsTrigger value="templates">{t('script.templates')}</TabsTrigger>
                        <TabsTrigger value="favorites">{t('script.favorites')}</TabsTrigger>
                        <TabsTrigger value="shared">{t('script.shared')}</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 flex">
                    {/* Left Sidebar - Categories and Filters */}
                    <div className="w-80 border-r p-4 space-y-4">
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <FolderTree className="h-4 w-4"/>
                                {t('script.categories')}
                            </h3>
                            <ScriptCategoryTree
                                categories={categories}
                                selectedCategory={selectedCategory}
                                onCategorySelect={setSelectedCategory}
                            />
                        </div>

                        <Separator/>

                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Filter className="h-4 w-4"/>
                                {t('script.filters')}
                            </h3>

                            <div>
                                <label className="text-sm font-medium">{t('script.language')}</label>
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                    <SelectTrigger>
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('script.allLanguages')}</SelectItem>
                                        <SelectItem value="bash">Bash</SelectItem>
                                        <SelectItem value="python">Python</SelectItem>
                                        <SelectItem value="javascript">JavaScript</SelectItem>
                                        <SelectItem value="typescript">TypeScript</SelectItem>
                                        <SelectItem value="powershell">PowerShell</SelectItem>
                                        <SelectItem value="sql">SQL</SelectItem>
                                        <SelectItem value="yaml">YAML</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Button
                                    variant={showOnlyFavorites ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                    className="w-full justify-start"
                                >
                                    <Star className="h-4 w-4 mr-2"/>
                                    {t('script.favoritesOnly')}
                                </Button>

                                <Button
                                    variant={showOnlyPublic ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setShowOnlyPublic(!showOnlyPublic)}
                                    className="w-full justify-start"
                                >
                                    <Eye className="h-4 w-4 mr-2"/>
                                    {t('script.publicOnly')}
                                </Button>

                                <Button
                                    variant={showOnlyTemplates ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setShowOnlyTemplates(!showOnlyTemplates)}
                                    className="w-full justify-start"
                                >
                                    <Code className="h-4 w-4 mr-2"/>
                                    {t('script.templatesOnly')}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col">
                        {/* Header with Search and Actions */}
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold">{t('script.scriptLibrary')}</h2>
                                <Button onClick={handleScriptCreate}>
                                    <Plus className="h-4 w-4 mr-2"/>
                                    {t('script.newScript')}
                                </Button>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                    <Input
                                        placeholder={t('script.searchPlaceholder')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="updatedAt">{t('script.sortUpdated')}</SelectItem>
                                        <SelectItem value="name">{t('script.sortName')}</SelectItem>
                                        <SelectItem value="createdAt">{t('script.sortCreated')}</SelectItem>
                                        <SelectItem value="executionCount">{t('script.sortUsage')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Script Grid */}
                        <div className="flex-1 p-4 overflow-auto">
                            {loading ? (
                                <div className="text-center py-8">Loading...</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredScripts.map((script) => (
                                        <Card key={script.id} className="hover:shadow-md transition-shadow cursor-pointer">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{getLanguageIcon(script.language)}</span>
                                                        <CardTitle className="text-lg truncate">{script.name}</CardTitle>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleFavorite(script);
                                                            }}
                                                        >
                                                            {script.isFavorite ?
                                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/> :
                                                                <StarOff className="h-4 w-4"/>
                                                            }
                                                        </Button>
                                                    </div>
                                                </div>
                                                <CardDescription className="line-clamp-2">
                                                    {script.description || t('script.noDescription')}
                                                </CardDescription>
                                            </CardHeader>

                                            <CardContent className="pt-0">
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {parseTags(script.tags).slice(0, 3).map((tag, index) => (
                                                            <Badge key={index} variant="secondary" className="text-xs">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                        {parseTags(script.tags).length > 3 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{parseTags(script.tags).length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <User className="h-3 w-3"/>
                                                            {script.userName}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3"/>
                                                            {formatDate(script.updatedAt)}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        {script.isPublic && <Badge variant="outline" className="text-xs">Public</Badge>}
                                                        {script.isTemplate && <Badge variant="outline" className="text-xs">Template</Badge>}
                                                        <Badge variant="outline" className="text-xs">
                                                            v{script.version}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex gap-2 pt-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleScriptExecute(script);
                                                            }}
                                                            className="flex-1"
                                                        >
                                                            <Play className="h-3 w-3 mr-1"/>
                                                            {t('script.run')}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleScriptEdit(script);
                                                            }}
                                                        >
                                                            <Edit className="h-3 w-3"/>
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleScriptShare(script);
                                                            }}
                                                        >
                                                            <Share className="h-3 w-3"/>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    {t('script.showing')} {filteredScripts.length} {t('script.of')} {scripts.length} {t('script.scripts')}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        {t('common.previous')}
                                    </Button>
                                    <span className="flex items-center px-3 text-sm">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        {t('common.next')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Tabs>

            {/* Dialogs */}
            {isEditorOpen && (
                <ScriptEditor
                    script={selectedScript}
                    isOpen={isEditorOpen}
                    onClose={() => {
                        setIsEditorOpen(false);
                        setSelectedScript(null);
                    }}
                    onSave={() => {
                        loadScripts();
                        setIsEditorOpen(false);
                        setSelectedScript(null);
                    }}
                />
            )}

            {isExecutionDialogOpen && selectedScript && (
                <ScriptExecutionDialog
                    script={selectedScript}
                    isOpen={isExecutionDialogOpen}
                    onClose={() => {
                        setIsExecutionDialogOpen(false);
                        setSelectedScript(null);
                    }}
                />
            )}

            {isShareDialogOpen && selectedScript && (
                <ScriptShareDialog
                    script={selectedScript}
                    isOpen={isShareDialogOpen}
                    onClose={() => {
                        setIsShareDialogOpen(false);
                        setSelectedScript(null);
                    }}
                    onUpdate={() => {
                        loadScripts();
                    }}
                />
            )}
        </div>
    );
}