'use client';
import { Header } from '@/components/header';
import { useSidebar } from '@/components/ui/sidebar';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

export default function Prompts() {
  const { theme } = useTheme();
  const { state } = useSidebar();
  const editorRef =
    useRef<
      Parameters<NonNullable<Parameters<typeof Editor>['0']['onMount']>>['0']
    >(null);

  const updateEditorLayout = () => {
    if (editorRef.current) {
      editorRef.current.layout(); // Force Monaco to re-layout based on container size
    }
  };

  useEffect(() => {
    updateEditorLayout();
    window.addEventListener('resize', updateEditorLayout);
    return () => window.removeEventListener('resize', updateEditorLayout);
  }, [state]);

  return (
    <>
      <Header />
      <Editor
        height="100%"
        width="100%"
        defaultLanguage="markdown"
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        onMount={editor => {
          editorRef.current = editor;
        }}
        options={{
          wordWrap: 'on',

          fontSize: 18,
          minimap: {
            enabled: false,
          },
        }}
      />
    </>
  );
}
