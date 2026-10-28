import { useState } from 'react'

// The parent BookCover checks permission before passing an image URL here.
export default function CoverImage({ url, title }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <div className="book-cover">
      <img
        src={url}
        alt={`Cover of ${title}`}
        width="180"
        height="260"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
