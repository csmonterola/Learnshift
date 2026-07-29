import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Maximize2, X } from 'lucide-react'

export interface ChatImage {
  id: number
  url: string
  caption: string
  page_number: number | null
}

// ── InlineImageRenderer ────────────────────────────────────────────
// Renders the AI response markdown, detecting [Image: ID] markers
// where ID is the unique database ID of the image. This guarantees
// the exact image is shown, even when multiple images share a page.
export function InlineImageRenderer({ content, images }: { content: string; images: ChatImage[] }) {
  if (!images || images.length === 0) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  }

  // Build a lookup map by image ID for O(1) matching
  const imagesById: Record<number, ChatImage> = {}
  for (const img of images) {
    if (img.url) {
      imagesById[img.id] = img
    }
  }

  // Find images by matching [Image: ID] markers (unique image DB ID)
  const parts = content.split(/(\[Image: \d+\])/g)

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/\[Image: (\d+)\]/)
        if (match) {
          const imageId = parseInt(match[1], 10)
          const img = imagesById[imageId]
          if (img) {
            return <InlineImage key={i} image={img} />
          }
        }
        return <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>
      })}
    </>
  )
}

export function InlineImage({ image, compact }: { image: ChatImage; compact?: boolean }) {
  const [lightbox, setLightbox] = useState<ChatImage | null>(null)

  return (
    <>
      <button
        onClick={() => setLightbox(image)}
        className={`group relative rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-300 transition-colors ${compact ? 'shrink-0' : 'block max-w-lg my-3'}`}
        style={compact ? { width: 120, height: 90 } : undefined}
      >
        <img
          src={image.url}
          alt={image.caption || 'Lesson image'}
          className={`w-full h-full object-cover ${compact ? '' : 'max-h-64'}`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
        {image.page_number && (
          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
            p.{image.page_number}
          </span>
        )}
      </button>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl max-h-full bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.caption || 'Lesson image'}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {lightbox.caption && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-600">{lightbox.caption}</p>
                {lightbox.page_number && (
                  <p className="text-[11px] text-gray-400 mt-1">Page {lightbox.page_number}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
