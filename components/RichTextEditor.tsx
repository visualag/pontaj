'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import 'react-quill/dist/quill.snow.css';

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
    // Dynamically import ReactQuill to avoid SSR issues
    const ReactQuill = useMemo(
        () => dynamic(() => import('react-quill'), { ssr: false }),
        []
    );

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['clean']
        ],
    };

    return (
        <div className="rich-text-editor">
            <ReactQuill
                theme="snow"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                modules={modules}
                className="bg-white dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100"
            />
            <style jsx global>{`
        .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          border-color: #e4e4e7 !important;
        }
        .dark .ql-toolbar {
          border-color: #27272a !important;
          background-color: #18181b;
        }
        .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border-color: #e4e4e7 !important;
          min-height: 100px;
        }
        .dark .ql-container {
          border-color: #27272a !important;
        }
        .dark .ql-picker {
          color: #e4e4e7;
        }
        .dark .ql-fill {
          fill: #e4e4e7;
        }
        .dark .ql-stroke {
          stroke: #e4e4e7;
        }
      `}</style>
        </div>
    );
}
