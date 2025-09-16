import React, {useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
    Plus,
    Edit,
    Trash2,
    FileText
} from "lucide-react";
import {cn} from "@/lib/utils.ts";
import {useTranslation} from "react-i18next";

interface Category {
    id: number;
    name: string;
    description?: string;
    parentId?: number;
    color: string;
    icon: string;
    sortOrder: number;
    scriptCount?: number;
    children?: Category[];
}

interface ScriptCategoryTreeProps {
    categories: Category[];
    selectedCategory: string;
    onCategorySelect: (categoryId: string) => void;
    showScriptCount?: boolean;
    allowEdit?: boolean;
    onCategoryEdit?: (category: Category) => void;
    onCategoryDelete?: (category: Category) => void;
    onCategoryAdd?: (parentId?: number) => void;
}

interface TreeNodeProps {
    category: Category;
    level: number;
    isSelected: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onSelect: () => void;
    showScriptCount?: boolean;
    allowEdit?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onAddChild?: () => void;
}

function TreeNode({
    category,
    level,
    isSelected,
    isExpanded,
    onToggle,
    onSelect,
    showScriptCount = false,
    allowEdit = false,
    onEdit,
    onDelete,
    onAddChild
}: TreeNodeProps) {
    const {t} = useTranslation();
    const hasChildren = category.children && category.children.length > 0;
    const paddingLeft = level * 16 + 8;

    const getIconForCategory = (iconName: string) => {
        const iconMap: Record<string, React.ReactNode> = {
            'folder': isExpanded ? <FolderOpen className="h-4 w-4"/> : <Folder className="h-4 w-4"/>,
            'file': <FileText className="h-4 w-4"/>,
            'script': <FileText className="h-4 w-4"/>
        };
        return iconMap[iconName] || <Folder className="h-4 w-4"/>;
    };

    return (
        <div>
            <div
                className={cn(
                    "flex items-center py-1 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors",
                    isSelected && "bg-blue-100 dark:bg-blue-900"
                )}
                style={{paddingLeft: `${paddingLeft}px`}}
            >
                {/* Expand/Collapse Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 mr-1"
                    onClick={onToggle}
                    disabled={!hasChildren}
                >
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className="h-3 w-3"/>
                        ) : (
                            <ChevronRight className="h-3 w-3"/>
                        )
                    ) : (
                        <div className="h-3 w-3"/>
                    )}
                </Button>

                {/* Category Icon */}
                <div className="mr-2" style={{color: category.color}}>
                    {getIconForCategory(category.icon)}
                </div>

                {/* Category Name */}
                <div
                    className="flex-1 flex items-center justify-between"
                    onClick={onSelect}
                >
                    <span className="text-sm font-medium truncate">
                        {category.name}
                    </span>

                    <div className="flex items-center gap-2">
                        {/* Script Count */}
                        {showScriptCount && category.scriptCount !== undefined && (
                            <Badge variant="outline" className="text-xs">
                                {category.scriptCount}
                            </Badge>
                        )}

                        {/* Edit Actions */}
                        {allowEdit && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddChild?.();
                                    }}
                                    title={t('script.addSubcategory')}
                                >
                                    <Plus className="h-3 w-3"/>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit?.();
                                    }}
                                    title={t('script.editCategory')}
                                >
                                    <Edit className="h-3 w-3"/>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete?.();
                                    }}
                                    title={t('script.deleteCategory')}
                                >
                                    <Trash2 className="h-3 w-3"/>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Children */}
            {isExpanded && hasChildren && (
                <div>
                    {category.children!.map((child) => (
                        <ConnectedTreeNode
                            key={child.id}
                            category={child}
                            level={level + 1}
                            selectedCategory={isSelected ? category.id.toString() : ""}
                            onCategorySelect={() => {}}
                            showScriptCount={showScriptCount}
                            allowEdit={allowEdit}
                            onCategoryEdit={onEdit}
                            onCategoryDelete={onDelete}
                            onCategoryAdd={onAddChild}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ConnectedTreeNode({
    category,
    level,
    selectedCategory,
    onCategorySelect,
    showScriptCount,
    allowEdit,
    onCategoryEdit,
    onCategoryDelete,
    onCategoryAdd
}: {
    category: Category;
    level: number;
    selectedCategory: string;
    onCategorySelect: (categoryId: string) => void;
    showScriptCount?: boolean;
    allowEdit?: boolean;
    onCategoryEdit?: (category: Category) => void;
    onCategoryDelete?: (category: Category) => void;
    onCategoryAdd?: (parentId?: number) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isSelected = selectedCategory === category.id.toString();

    return (
        <TreeNode
            category={category}
            level={level}
            isSelected={isSelected}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
            onSelect={() => onCategorySelect(category.id.toString())}
            showScriptCount={showScriptCount}
            allowEdit={allowEdit}
            onEdit={() => onCategoryEdit?.(category)}
            onDelete={() => onCategoryDelete?.(category)}
            onAddChild={() => onCategoryAdd?.(category.id)}
        />
    );
}

export function ScriptCategoryTree({
    categories,
    selectedCategory,
    onCategorySelect,
    showScriptCount = false,
    allowEdit = false,
    onCategoryEdit,
    onCategoryDelete,
    onCategoryAdd
}: ScriptCategoryTreeProps): React.ReactElement {
    const {t} = useTranslation();

    // Build hierarchical category tree
    const buildCategoryTree = (categories: Category[]): Category[] => {
        const categoryMap = new Map<number, Category>();
        const roots: Category[] = [];

        // First pass: create nodes
        categories.forEach(category => {
            categoryMap.set(category.id, {...category, children: []});
        });

        // Second pass: build tree structure
        categories.forEach(category => {
            const node = categoryMap.get(category.id)!;
            if (category.parentId && categoryMap.has(category.parentId)) {
                const parent = categoryMap.get(category.parentId)!;
                parent.children!.push(node);
            } else {
                roots.push(node);
            }
        });

        // Sort by sortOrder and name
        const sortCategories = (cats: Category[]) => {
            cats.sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) {
                    return a.sortOrder - b.sortOrder;
                }
                return a.name.localeCompare(b.name);
            });
            cats.forEach(cat => {
                if (cat.children && cat.children.length > 0) {
                    sortCategories(cat.children);
                }
            });
        };

        sortCategories(roots);
        return roots;
    };

    const categoryTree = buildCategoryTree(categories);

    return (
        <div className="space-y-1">
            {/* All Categories Option */}
            <div
                className={cn(
                    "flex items-center py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors",
                    selectedCategory === "all" && "bg-blue-100 dark:bg-blue-900"
                )}
                onClick={() => onCategorySelect("all")}
            >
                <div className="mr-2">
                    <Folder className="h-4 w-4"/>
                </div>
                <span className="text-sm font-medium">
                    {t('script.allCategories')}
                </span>
                {showScriptCount && (
                    <Badge variant="outline" className="text-xs ml-auto">
                        {categories.reduce((sum, cat) => sum + (cat.scriptCount || 0), 0)}
                    </Badge>
                )}
            </div>

            {/* Uncategorized Option */}
            <div
                className={cn(
                    "flex items-center py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors",
                    selectedCategory === "uncategorized" && "bg-blue-100 dark:bg-blue-900"
                )}
                onClick={() => onCategorySelect("uncategorized")}
            >
                <div className="mr-2">
                    <FileText className="h-4 w-4"/>
                </div>
                <span className="text-sm font-medium">
                    {t('script.uncategorized')}
                </span>
            </div>

            {/* Category Tree */}
            <div className="group">
                {categoryTree.length > 0 ? (
                    categoryTree.map((category) => (
                        <ConnectedTreeNode
                            key={category.id}
                            category={category}
                            level={0}
                            selectedCategory={selectedCategory}
                            onCategorySelect={onCategorySelect}
                            showScriptCount={showScriptCount}
                            allowEdit={allowEdit}
                            onCategoryEdit={onCategoryEdit}
                            onCategoryDelete={onCategoryDelete}
                            onCategoryAdd={onCategoryAdd}
                        />
                    ))
                ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        {t('script.noCategories')}
                    </div>
                )}
            </div>

            {/* Add Root Category Button */}
            {allowEdit && (
                <div className="pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onCategoryAdd?.()}
                    >
                        <Plus className="h-4 w-4 mr-2"/>
                        {t('script.addCategory')}
                    </Button>
                </div>
            )}
        </div>
    );
}