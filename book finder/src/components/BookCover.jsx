import { getApprovedCoverUrl } from '../lib/coverPermissions'
import CoverImage from './CoverImage'

export default function BookCover({ cover, title }) {
  const url = getApprovedCoverUrl(cover)
  if (!url) return null

  // A changed URL gets a fresh error state; failed images leave the pastel card.
  return <CoverImage key={url} url={url} title={title} />
}
