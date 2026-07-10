import { UploadCloud } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { UploadDropzone } from '@/components/files/UploadDropzone'

export function QuickUpload() {
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-center gap-2">
        <UploadCloud className="h-[18px] w-[18px] text-brand-500" />
        <h3 className="text-base font-semibold">Quick upload</h3>
      </div>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Drop files here, or browse from your device.
      </p>
      <div className="mt-4 flex-1">
        <UploadDropzone compact />
      </div>
    </Card>
  )
}
