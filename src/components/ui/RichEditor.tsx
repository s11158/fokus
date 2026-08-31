import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import { Bold, Italic, List, ListOrdered, Link2 } from 'lucide-react'
import { cn } from '../../lib/cn'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

// Описание задачи с базовым форматированием и кликабельными ссылками.
export function RichEditor({ value, onChange, placeholder = 'Описание…' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Link.configure({ openOnClick: true, autolink: true, HTMLAttributes: { rel: 'noopener', target: '_blank' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: 'prose-none text-sm leading-relaxed' } },
  })

  // Подхватываем смену задачи извне.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) return null

  const Btn = ({ on, active, children }: { on: () => void; active?: boolean; children: React.ReactNode }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); on() }}
      className={cn('icon-btn h-7 w-7', active && 'bg-surface-3 text-text')}
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-xl border border-border bg-surface-2">
      <div className="flex items-center gap-0.5 border-b border-border px-1.5 py-1">
        <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold size={14} /></Btn>
        <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={14} /></Btn>
        <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List size={14} /></Btn>
        <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={14} /></Btn>
        <Btn
          on={() => {
            const url = window.prompt('Ссылка (URL):', editor.getAttributes('link').href ?? 'https://')
            if (url === null) return
            if (url === '') editor.chain().focus().unsetLink().run()
            else editor.chain().focus().setLink({ href: url }).run()
          }}
          active={editor.isActive('link')}
        >
          <Link2 size={14} />
        </Btn>
      </div>
      <EditorContent editor={editor} className="px-3 py-2" />
    </div>
  )
}
