"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Type,
  Heading1,
  Heading2,
  Quote
} from 'lucide-react';
import { Button } from './ui/button';

export default function TiptapEditor({ 
  content, 
  onChange 
}: { 
  content: string; 
  onChange: (html: string) => void; 
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Write your professional message here...',
      }),
      Image,
    ],
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="border border-border rounded-md overflow-hidden bg-background focus-within:ring-1 focus-within:ring-red-500/50 transition-all">
      <div className="bg-muted/50 p-1 border-b border-border flex flex-wrap gap-1 items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-muted-foreground/20' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-muted-foreground/20' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-muted-foreground/20' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-muted-foreground/20' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-muted-foreground/20' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-4 bg-border mx-1" />

        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-muted-foreground/20' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-muted-foreground/20' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-muted-foreground/20' : ''}`}
          onClick={setLink}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={addImage}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
