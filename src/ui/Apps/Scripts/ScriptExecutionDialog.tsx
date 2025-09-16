import React, {useState, useEffect, useRef} from "react";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter} from "@/components/ui/sheet.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import {Progress} from "@/components/ui/progress.tsx";
import {
    Play,
    Square,
    RotateCcw,
    Download,
    Copy,
    CheckCircle,
    XCircle,
    Clock,
    Server,
    Terminal,
    FileText,
    AlertTriangle,
    Info,
    RefreshCw
} from "lucide-react";
import {useTranslation} from "react-i18next";
import axios from "axios";

interface ScriptExecutionDialogProps {
    script: Script;
    isOpen: boolean;
    onClose: () => void;
}

interface Script {
    id: number;
    name: string;
    description: string;
    content: string;
    language: string;
    parameters?: string;
    timeout: number;
    retryCount: number;
}

interface Parameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'file';
    description: string;
    defaultValue?: string;
    required: boolean;
}

interface SSHHost {
    id: number;
    name: string;
    ip: string;
    port: number;
    username: string;
}

interface ExecutionResult {
    executionId: number;
    status: 'running' | 'completed' | 'failed';
    exitCode?: number;
    output?: string;
    errorOutput?: string;
    duration?: number;
    startTime?: string;
    endTime?: string;
}

export function ScriptExecutionDialog({script, isOpen, onClose}: ScriptExecutionDialogProps): React.ReactElement {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState("setup");
    const [sshHosts, setSshHosts] = useState<SSHHost[]>([]);
    const [selectedHost, setSelectedHost] = useState<string>("");
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
    const [executionProgress, setExecutionProgress] = useState(0);
    const [executionLog, setExecutionLog] = useState<string[]>([]);
    const outputRef = useRef<HTMLDivElement>(null);

    // Load data on dialog open
    useEffect(() => {
        if (isOpen) {
            loadSSHHosts();
            loadScriptParameters();
            resetExecution();
        }
    }, [isOpen, script]);

    // Auto-scroll execution log
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [executionLog]);

    const loadSSHHosts = async () => {
        try {
            const response = await axios.get('/ssh');
            setSshHosts(response.data);
            if (response.data.length > 0) {
                setSelectedHost(response.data[0].id.toString());
            }
        } catch (error) {
            console.error('Failed to load SSH hosts:', error);
        }
    };

    const loadScriptParameters = () => {
        try {
            const params = JSON.parse(script.parameters || "[]") as Parameter[];
            setParameters(params);

            // Initialize parameter values with defaults
            const initialValues: Record<string, any> = {};
            params.forEach(param => {
                if (param.defaultValue !== undefined) {
                    initialValues[param.name] = param.defaultValue;
                } else {
                    switch (param.type) {
                        case 'boolean':
                            initialValues[param.name] = false;
                            break;
                        case 'number':
                            initialValues[param.name] = 0;
                            break;
                        default:
                            initialValues[param.name] = '';
                    }
                }
            });
            setParameterValues(initialValues);
        } catch (e) {
            console.error("Failed to parse script parameters:", e);
            setParameters([]);
        }
    };

    const resetExecution = () => {
        setIsExecuting(false);
        setExecutionResult(null);
        setExecutionProgress(0);
        setExecutionLog([]);
        setActiveTab("setup");
    };

    const handleParameterChange = (paramName: string, value: any) => {
        setParameterValues(prev => ({
            ...prev,
            [paramName]: value
        }));
    };

    const validateParameters = (): boolean => {
        for (const param of parameters) {
            if (param.required && (!parameterValues[param.name] || parameterValues[param.name] === '')) {
                alert(t('script.validation.requiredParameter', {name: param.name}));
                return false;
            }
        }
        return true;
    };

    const handleExecute = async () => {
        if (!selectedHost) {
            alert(t('script.validation.hostRequired'));
            return;
        }

        if (!validateParameters()) {
            return;
        }

        setIsExecuting(true);
        setExecutionProgress(0);
        setExecutionLog([]);
        setActiveTab("output");

        try {
            // Add initial log
            addLogEntry('info', t('script.execution.starting', {script: script.name}));
            addLogEntry('info', t('script.execution.host', {host: sshHosts.find(h => h.id.toString() === selectedHost)?.name}));

            setExecutionProgress(10);

            const response = await axios.post(`/scripts/${script.id}/execute`, {
                hostId: parseInt(selectedHost),
                parameters: parameterValues
            });

            setExecutionProgress(100);
            setExecutionResult(response.data);

            if (response.data.status === 'completed') {
                addLogEntry('success', t('script.execution.completed'));
                if (response.data.output) {
                    addLogEntry('output', response.data.output);
                }
            } else {
                addLogEntry('error', t('script.execution.failed'));
                if (response.data.errorOutput) {
                    addLogEntry('error', response.data.errorOutput);
                }
            }

        } catch (error: any) {
            setExecutionProgress(100);
            const errorMessage = error.response?.data?.details || error.message || t('script.execution.unknownError');
            addLogEntry('error', t('script.execution.failed') + ': ' + errorMessage);

            setExecutionResult({
                executionId: 0,
                status: 'failed',
                exitCode: error.response?.data?.exitCode || -1,
                errorOutput: errorMessage,
                duration: 0
            });
        } finally {
            setIsExecuting(false);
        }
    };

    const addLogEntry = (type: 'info' | 'success' | 'error' | 'output', message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'info' ? '[INFO]' :
                      type === 'success' ? '[SUCCESS]' :
                      type === 'error' ? '[ERROR]' : '[OUTPUT]';
        setExecutionLog(prev => [...prev, `${timestamp} ${prefix} ${message}`]);
    };

    const handleCopyOutput = () => {
        const output = executionResult?.output || '';
        navigator.clipboard.writeText(output);
    };

    const handleDownloadOutput = () => {
        const output = executionResult?.output || '';
        const blob = new Blob([output], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${script.name}_output.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-500"/>;
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-500"/>;
            case 'running':
                return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin"/>;
            default:
                return <Clock className="h-5 w-5 text-gray-500"/>;
        }
    };

    const renderParameterInput = (param: Parameter) => {
        const value = parameterValues[param.name] || '';

        switch (param.type) {
            case 'boolean':
                return (
                    <div className="flex items-center space-x-2">
                        <Switch
                            id={param.name}
                            checked={Boolean(value)}
                            onCheckedChange={(checked) => handleParameterChange(param.name, checked)}
                        />
                        <Label htmlFor={param.name} className="text-sm font-normal">
                            {param.description || param.name}
                        </Label>
                    </div>
                );

            case 'number':
                return (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value) || 0)}
                        placeholder={param.defaultValue}
                    />
                );

            case 'file':
                return (
                    <Input
                        type="file"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleParameterChange(param.name, file?.name || '');
                        }}
                    />
                );

            default: // string
                return (
                    <Input
                        value={value}
                        onChange={(e) => handleParameterChange(param.name, e.target.value)}
                        placeholder={param.defaultValue || param.description}
                    />
                );
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="max-w-4xl h-[80vh] flex flex-col w-full max-w-full">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5"/>
                        {t('script.executeScript')}: {script.name}
                    </SheetTitle>
                    <SheetDescription>
                        {script.description || t('script.noDescription')}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="setup" disabled={isExecuting}>
                                <Settings className="h-4 w-4 mr-2"/>
                                {t('script.setup')}
                            </TabsTrigger>
                            <TabsTrigger value="output">
                                <Terminal className="h-4 w-4 mr-2"/>
                                {t('script.output')}
                            </TabsTrigger>
                            <TabsTrigger value="result" disabled={!executionResult}>
                                <FileText className="h-4 w-4 mr-2"/>
                                {t('script.result')}
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 mt-4 overflow-auto">
                            <TabsContent value="setup" className="space-y-4">
                                {/* Host Selection */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Server className="h-4 w-4"/>
                                            {t('script.selectHost')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Select value={selectedHost} onValueChange={setSelectedHost}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('script.selectHostPlaceholder')}/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sshHosts.map((host) => (
                                                    <SelectItem key={host.id} value={host.id.toString()}>
                                                        {host.name} ({host.ip}:{host.port})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </CardContent>
                                </Card>

                                {/* Parameters */}
                                {parameters.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Tag className="h-4 w-4"/>
                                                {t('script.parameters')}
                                            </CardTitle>
                                            <CardDescription>
                                                {t('script.parametersDescription')}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {parameters.map((param) => (
                                                <div key={param.name} className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor={param.name} className="font-medium">
                                                            {param.name}
                                                        </Label>
                                                        {param.required && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                {t('script.required')}
                                                            </Badge>
                                                        )}
                                                        <Badge variant="outline" className="text-xs">
                                                            {param.type}
                                                        </Badge>
                                                    </div>
                                                    {param.description && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {param.description}
                                                        </p>
                                                    )}
                                                    {renderParameterInput(param)}
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Script Info */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Info className="h-4 w-4"/>
                                            {t('script.scriptInfo')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('script.language')}:</span>
                                            <span>{script.language}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('script.timeout')}:</span>
                                            <span>{script.timeout}s</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('script.retryCount')}:</span>
                                            <span>{script.retryCount}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="output" className="h-full">
                                <Card className="h-full flex flex-col">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2">
                                                <Terminal className="h-4 w-4"/>
                                                {t('script.executionOutput')}
                                            </CardTitle>
                                            {isExecuting && (
                                                <div className="flex items-center gap-2">
                                                    <RefreshCw className="h-4 w-4 animate-spin"/>
                                                    <span className="text-sm">{t('script.executing')}</span>
                                                </div>
                                            )}
                                        </div>
                                        {isExecuting && (
                                            <Progress value={executionProgress} className="w-full"/>
                                        )}
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-hidden">
                                        <ScrollArea className="h-full">
                                            <div
                                                ref={outputRef}
                                                className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded border h-full overflow-auto"
                                            >
                                                {executionLog.length > 0 ? (
                                                    executionLog.map((log, index) => (
                                                        <div key={index} className="mb-1">
                                                            {log}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-muted-foreground">
                                                        {t('script.noOutput')}
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="result" className="space-y-4">
                                {executionResult && (
                                    <>
                                        {/* Execution Summary */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    {getStatusIcon(executionResult.status)}
                                                    {t('script.executionSummary')}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">{t('script.status')}:</span>
                                                    <Badge variant={executionResult.status === 'completed' ? 'default' : 'destructive'}>
                                                        {executionResult.status}
                                                    </Badge>
                                                </div>
                                                {executionResult.exitCode !== undefined && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">{t('script.exitCode')}:</span>
                                                        <span>{executionResult.exitCode}</span>
                                                    </div>
                                                )}
                                                {executionResult.duration && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">{t('script.duration')}:</span>
                                                        <span>{formatDuration(executionResult.duration)}</span>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Output */}
                                        {executionResult.output && (
                                            <Card>
                                                <CardHeader>
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle>{t('script.standardOutput')}</CardTitle>
                                                        <div className="flex gap-2">
                                                            <Button variant="outline" size="sm" onClick={handleCopyOutput}>
                                                                <Copy className="h-4 w-4 mr-2"/>
                                                                {t('common.copy')}
                                                            </Button>
                                                            <Button variant="outline" size="sm" onClick={handleDownloadOutput}>
                                                                <Download className="h-4 w-4 mr-2"/>
                                                                {t('common.download')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <ScrollArea className="h-64">
                                                        <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded border whitespace-pre-wrap">
                                                            {executionResult.output}
                                                        </pre>
                                                    </ScrollArea>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Error Output */}
                                        {executionResult.errorOutput && (
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-red-600">
                                                        <AlertTriangle className="h-4 w-4"/>
                                                        {t('script.errorOutput')}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <ScrollArea className="h-32">
                                                        <pre className="text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded border whitespace-pre-wrap text-red-800 dark:text-red-200">
                                                            {executionResult.errorOutput}
                                                        </pre>
                                                    </ScrollArea>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <SheetFooter>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            {t('common.close')}
                        </Button>
                        {activeTab === "setup" && (
                            <Button onClick={handleExecute} disabled={isExecuting || !selectedHost}>
                                <Play className="h-4 w-4 mr-2"/>
                                {isExecuting ? t('script.executing') : t('script.execute')}
                            </Button>
                        )}
                        {executionResult && (
                            <Button variant="outline" onClick={resetExecution}>
                                <RotateCcw className="h-4 w-4 mr-2"/>
                                {t('script.runAgain')}
                            </Button>
                        )}
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}