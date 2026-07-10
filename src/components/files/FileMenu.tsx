import { MoreVertical, Download, Pencil, FolderInput, Trash2, Star } from 'lucide-react'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { Entry } from '@/data/dummyData'

export function FileMenu({ entry }: { entry: Entry }) {
  return (
    <DropdownMenu
      trigger={
        <button
          className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700 dark:hover:bg-dark-surface2 dark:hover:text-white"
          aria-label={`More actions for ${entry.name}`}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      }
      items={[
        { label: 'Download', icon: <Download className="h-4 w-4" />, onSelect: () => {} },
        { label: 'Rename', icon: <Pencil className="h-4 w-4" />, onSelect: () => {} },
        { label: 'Move', icon: <FolderInput className="h-4 w-4" />, onSelect: () => {} },
        {
          label: entry.favorite ? 'Unfavorite' : 'Favorite',
          icon: <Star className="h-4 w-4" />,
          onSelect: () => {},
        },
        { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, tone: 'danger', onSelect: () => {} },
      ]}
    />
  )
}
