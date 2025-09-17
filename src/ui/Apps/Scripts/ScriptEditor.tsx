import React, {useState, useEffect, useRef} from "react";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter} from "@/components/ui/sheet.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {
    Save,
    Play,
    Copy,
    Download,
    Upload,
    FileText,
    Settings,
    Tag,
    X,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Code,
    Palette
} from "lucide-react";
import {useTranslation} from "react-i18next";
import {CodeMirror} from "@/components/ui/codemirror.tsx";
import {authApi} from "@/ui/main-axios.ts";

interface ScriptEditorProps {
    script?: Script | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

interface Script {
    id?: number;
    name: string;
    description: string;
    content: string;
    language: string;
    categoryId?: number;
    tags: string;
    isPublic: boolean;
    isTemplate: boolean;
    isFavorite: boolean;
    version: string;
    parameters?: string;
    environment?: string;
    timeout: number;
    retryCount: number;
}

interface Category {
    id: number;
    name: string;
    description?: string;
    parentId?: number;
    color: string;
    icon: string;
}

interface Parameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'file';
    description: string;
    defaultValue?: string;
    required: boolean;
}

export function ScriptEditor({script, isOpen, onClose, onSave}: ScriptEditorProps): React.ReactElement {
    const {t} = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("content");

    // Form state
    const [formData, setFormData] = useState<Script>({
        name: "",
        description: "",
        content: "",
        language: "bash",
        categoryId: undefined,
        tags: "[]",
        isPublic: false,
        isTemplate: false,
        isFavorite: false,
        version: "1.0.0",
        parameters: "[]",
        environment: "{}",
        timeout: 300,
        retryCount: 0
    });

    const [tagInput, setTagInput] = useState("");
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [environment, setEnvironment] = useState<Record<string, string>>({});

    // Load data on mount
    useEffect(() => {
        if (isOpen) {
            loadCategories();
            if (script) {
                setFormData({
                    ...script,
                    tags: script.tags || "[]",
                    parameters: script.parameters || "[]",
                    environment: script.environment || "{}"
                });
                try {
                    setParameters(JSON.parse(script.parameters || "[]"));
                    setEnvironment(JSON.parse(script.environment || "{}"));
                } catch (e) {
                    console.error("Failed to parse script parameters/environment:", e);
                }
            } else {
                resetForm();
            }
        }
    }, [isOpen, script]);

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            content: "",
            language: "bash",
            categoryId: undefined,
            tags: "[]",
            isPublic: false,
            isTemplate: false,
            isFavorite: false,
            version: "1.0.0",
            parameters: "[]",
            environment: "{}",
            timeout: 300,
            retryCount: 0
        });
        setParameters([]);
        setEnvironment({});
        setTagInput("");
        setActiveTab("content");
    };

    const loadCategories = async () => {
        try {
            const response = await authApi.get('/scripts/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const handleInputChange = (field: keyof Script, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleTagAdd = () => {
        if (tagInput.trim()) {
            const currentTags = JSON.parse(formData.tags || "[]");
            if (!currentTags.includes(tagInput.trim())) {
                const newTags = [...currentTags, tagInput.trim()];
                setFormData(prev => ({
                    ...prev,
                    tags: JSON.stringify(newTags)
                }));
            }
            setTagInput("");
        }
    };

    const handleTagRemove = (tagToRemove: string) => {
        const currentTags = JSON.parse(formData.tags || "[]");
        const newTags = currentTags.filter((tag: string) => tag !== tagToRemove);
        setFormData(prev => ({
            ...prev,
            tags: JSON.stringify(newTags)
        }));
    };

    const handleParameterAdd = () => {
        const newParam: Parameter = {
            name: `param${parameters.length + 1}`,
            type: 'string',
            description: '',
            required: false
        };
        const newParameters = [...parameters, newParam];
        setParameters(newParameters);
        setFormData(prev => ({
            ...prev,
            parameters: JSON.stringify(newParameters)
        }));
    };

    const handleParameterUpdate = (index: number, field: keyof Parameter, value: any) => {
        const newParameters = [...parameters];
        newParameters[index] = {...newParameters[index], [field]: value};
        setParameters(newParameters);
        setFormData(prev => ({
            ...prev,
            parameters: JSON.stringify(newParameters)
        }));
    };

    const handleParameterRemove = (index: number) => {
        const newParameters = parameters.filter((_, i) => i !== index);
        setParameters(newParameters);
        setFormData(prev => ({
            ...prev,
            parameters: JSON.stringify(newParameters)
        }));
    };

    const handleEnvironmentAdd = (key: string, value: string) => {
        if (key && !environment[key]) {
            const newEnvironment = {...environment, [key]: value};
            setEnvironment(newEnvironment);
            setFormData(prev => ({
                ...prev,
                environment: JSON.stringify(newEnvironment)
            }));
        }
    };

    const handleEnvironmentRemove = (key: string) => {
        const newEnvironment = {...environment};
        delete newEnvironment[key];
        setEnvironment(newEnvironment);
        setFormData(prev => ({
            ...prev,
            environment: JSON.stringify(newEnvironment)
        }));
    };

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.content.trim()) {
            alert(t('script.validation.nameAndContentRequired'));
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                tags: JSON.parse(formData.tags),
                parameters: JSON.parse(formData.parameters),
                environment: JSON.parse(formData.environment)
            };

            if (script?.id) {
                await authApi.put(`/scripts/${script.id}`, payload);
            } else {
                await authApi.post('/scripts', payload);
            }

            onSave();
        } catch (error) {
            console.error('Failed to save script:', error);
            alert(t('script.error.failedToSave'));
        } finally {
            setLoading(false);
        }
    };

    const handleTest = () => {
        // TODO: Implement script testing functionality
        console.log('Test script functionality to be implemented');
    };

    const getLanguageMode = (language: string) => {
        const modes: Record<string, string> = {
            'bash': 'shell',
            'python': 'python',
            'javascript': 'javascript',
            'typescript': 'typescript',
            'powershell': 'powershell',
            'sql': 'sql',
            'yaml': 'yaml',
            'json': 'json'
        };
        return modes[language] || 'text';
    };

    const currentTags = JSON.parse(formData.tags || "[]");

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="max-w-6xl h-[90vh] flex flex-col w-full max-w-full">
                <SheetHeader>
                    <SheetTitle>
                        {script?.id ? t('script.editScript') : t('script.newScript')}
                    </SheetTitle>
                    <SheetDescription>
                        {t('script.editorDescription')}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="content">
                                <Code className="h-4 w-4 mr-2"/>
                                {t('script.content')}
                            </TabsTrigger>
                            <TabsTrigger value="settings">
                                <Settings className="h-4 w-4 mr-2"/>
                                {t('script.settings')}
                            </TabsTrigger>
                            <TabsTrigger value="parameters">
                                <Tag className="h-4 w-4 mr-2"/>
                                {t('script.parameters')}
                            </TabsTrigger>
                            <TabsTrigger value="environment">
                                <Palette className="h-4 w-4 mr-2"/>
                                {t('script.environment')}
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 mt-4 overflow-auto">
                            <TabsContent value="content" className="h-full space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="name">{t('script.name')} *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder={t('script.namePlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="language">{t('script.language')}</Label>
                                        <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                                            <SelectTrigger>
                                                <SelectValue/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bash">Bash</SelectItem>
                                                <SelectItem value="python">Python</SelectItem>
                                                <SelectItem value="javascript">JavaScript</SelectItem>
                                                <SelectItem value="typescript">TypeScript</SelectItem>
                                                <SelectItem value="powershell">PowerShell</SelectItem>
                                                <SelectItem value="sql">SQL</SelectItem>
                                                <SelectItem value="yaml">YAML</SelectItem>
                                                <SelectItem value="json">JSON</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="description">{t('script.description')}</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        placeholder={t('script.descriptionPlaceholder')}
                                        rows={3}
                                    />
                                </div>

                                <div className="h-96">
                                    <Label>{t('script.content')} *</Label>
                                    <div className="mt-1 h-full border rounded-md">
                                        <CodeMirror
                                            value={formData.content}
                                            onChange={(value) => handleInputChange('content', value)}
                                            language={getLanguageMode(formData.language)}
                                            theme="light"
                                            placeholder={t('script.contentPlaceholder')}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="category">{t('script.category')}</Label>
                                        <Select value={formData.categoryId?.toString() || ""} onValueChange={(value) => handleInputChange('categoryId', value ? parseInt(value) : undefined)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('script.selectCategory')}/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">{t('script.noCategory')}</SelectItem>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id.toString()}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="version">{t('script.version')}</Label>
                                        <Input
                                            id="version"
                                            value={formData.version}
                                            onChange={(e) => handleInputChange('version', e.target.value)}
                                            placeholder="1.0.0"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>{t('script.tags')}</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            placeholder={t('script.addTag')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleTagAdd();
                                                }
                                            }}
                                        />
                                        <Button variant="outline" onClick={handleTagAdd}>
                                            <Plus className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {currentTags.map((tag: string, index: number) => (
                                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                {tag}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-4 w-4 p-0"
                                                    onClick={() => handleTagRemove(tag)}
                                                >
                                                    <X className="h-3 w-3"/>
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="timeout">{t('script.timeout')} (seconds)</Label>
                                        <Input
                                            id="timeout"
                                            type="number"
                                            value={formData.timeout}
                                            onChange={(e) => handleInputChange('timeout', parseInt(e.target.value))}
                                            min="1"
                                            max="3600"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="retryCount">{t('script.retryCount')}</Label>
                                        <Input
                                            id="retryCount"
                                            type="number"
                                            value={formData.retryCount}
                                            onChange={(e) => handleInputChange('retryCount', parseInt(e.target.value))}
                                            min="0"
                                            max="10"
                                        />
                                    </div>
                                </div>

                                <Separator/>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{t('script.publicScript')}</Label>
                                            <p className="text-sm text-muted-foreground">{t('script.publicDescription')}</p>
                                        </div>
                                        <Switch
                                            checked={formData.isPublic}
                                            onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{t('script.templateScript')}</Label>
                                            <p className="text-sm text-muted-foreground">{t('script.templateDescription')}</p>
                                        </div>
                                        <Switch
                                            checked={formData.isTemplate}
                                            onCheckedChange={(checked) => handleInputChange('isTemplate', checked)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{t('script.favoriteScript')}</Label>
                                            <p className="text-sm text-muted-foreground">{t('script.favoriteDescription')}</p>
                                        </div>
                                        <Switch
                                            checked={formData.isFavorite}
                                            onCheckedChange={(checked) => handleInputChange('isFavorite', checked)}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="parameters" className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium">{t('script.scriptParameters')}</h3>
                                        <p className="text-sm text-muted-foreground">{t('script.parametersDescription')}</p>
                                    </div>
                                    <Button onClick={handleParameterAdd}>
                                        <Plus className="h-4 w-4 mr-2"/>
                                        {t('script.addParameter')}
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {parameters.map((param, index) => (
                                        <Card key={index}>
                                            <CardContent className="pt-4">
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div>
                                                        <Label>{t('script.paramName')}</Label>
                                                        <Input
                                                            value={param.name}
                                                            onChange={(e) => handleParameterUpdate(index, 'name', e.target.value)}
                                                            placeholder="paramName"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>{t('script.paramType')}</Label>
                                                        <Select value={param.type} onValueChange={(value) => handleParameterUpdate(index, 'type', value)}>
                                                            <SelectTrigger>
                                                                <SelectValue/>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="string">String</SelectItem>
                                                                <SelectItem value="number">Number</SelectItem>
                                                                <SelectItem value="boolean">Boolean</SelectItem>
                                                                <SelectItem value="file">File</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label>{t('script.defaultValue')}</Label>
                                                        <Input
                                                            value={param.defaultValue || ""}
                                                            onChange={(e) => handleParameterUpdate(index, 'defaultValue', e.target.value)}
                                                            placeholder={t('script.defaultValuePlaceholder')}
                                                        />
                                                    </div>
                                                    <div className="flex items-end gap-2">
                                                        <div className="flex items-center space-x-2">
                                                            <Switch
                                                                id={`required-${index}`}
                                                                checked={param.required}
                                                                onCheckedChange={(checked) => handleParameterUpdate(index, 'required', checked)}
                                                            />
                                                            <Label htmlFor={`required-${index}`} className="text-sm">
                                                                {t('script.required')}
                                                            </Label>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleParameterRemove(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4"/>
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <Label>{t('script.paramDescription')}</Label>
                                                    <Input
                                                        value={param.description}
                                                        onChange={(e) => handleParameterUpdate(index, 'description', e.target.value)}
                                                        placeholder={t('script.paramDescriptionPlaceholder')}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {parameters.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {t('script.noParameters')}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="environment" className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium">{t('script.environmentVariables')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('script.environmentDescription')}</p>
                                </div>

                                <div className="space-y-2">
                                    {Object.entries(environment).map(([key, value]) => (
                                        <div key={key} className="flex gap-2">
                                            <Input value={key} readOnly className="flex-1"/>
                                            <Input value={value} readOnly className="flex-1"/>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEnvironmentRemove(key)}
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    ))}

                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={t('script.envKey')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const target = e.target as HTMLInputElement;
                                                    const value = (e.target as any).nextElementSibling.value;
                                                    handleEnvironmentAdd(target.value, value);
                                                    target.value = '';
                                                    (e.target as any).nextElementSibling.value = '';
                                                }
                                            }}
                                        />
                                        <Input
                                            placeholder={t('script.envValue')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const target = e.target as HTMLInputElement;
                                                    const key = (e.target as any).previousElementSibling.value;
                                                    handleEnvironmentAdd(key, target.value);
                                                    (e.target as any).previousElementSibling.value = '';
                                                    target.value = '';
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                const keyInput = document.querySelector('[placeholder="' + t('script.envKey') + '"]') as HTMLInputElement;
                                                const valueInput = document.querySelector('[placeholder="' + t('script.envValue') + '"]') as HTMLInputElement;
                                                if (keyInput && valueInput && keyInput.value && valueInput.value) {
                                                    handleEnvironmentAdd(keyInput.value, valueInput.value);
                                                    keyInput.value = '';
                                                    valueInput.value = '';
                                                }
                                            }}
                                        >
                                            <Plus className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <SheetFooter>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="outline" onClick={handleTest} disabled={loading}>
                            <Play className="h-4 w-4 mr-2"/>
                            {t('script.test')}
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                            <Save className="h-4 w-4 mr-2"/>
                            {loading ? t('common.saving') : t('common.save')}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}