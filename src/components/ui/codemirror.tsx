import React from 'react';

interface CodeMirrorProps {
    value: string;
    onChange: (value: string) => void;
    language?: string;
    theme?: 'light' | 'dark';
    placeholder?: string;
    readOnly?: boolean;
    className?: string;
}

export function CodeMirror({
    value,
    onChange,
    language = 'text',
    theme = 'light',
    placeholder,
    readOnly = false,
    className = ''
}: CodeMirrorProps) {
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`w-full h-full font-mono text-sm p-4 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
            style={{
                backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                color: theme === 'dark' ? '#d4d4d4' : '#333333',
                border: '1px solid #ccc'
            }}
        />
    );
}