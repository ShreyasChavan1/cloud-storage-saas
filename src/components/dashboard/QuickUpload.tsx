import { UploadCloud } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { UploadDropzone } from '@/components/files/UploadDropzone'
import { useUploadFile } from '@/hooks/useFileMutations'
import { useToast } from '@/context/ToastContext'
import { useUploadQueue } from '@/context/UploadQueueContext'
import { getErrorMessage } from '@/lib/getErrorMessage'

export function QuickUpload() {
  const { showToast } = useToast()
  const { startUpload, updateProgress, finishUpload } = useUploadQueue()
  // Quick upload always targets the root folder — for uploading into a
  // specific folder, use the dropzone on the Files page instead.
  const uploadFile = useUploadFile(undefined)

  const handleFilesSelected = (files: File[]) => {
    files.forEach((file) => {
      const uploadId = startUpload(file.name)
      uploadFile.mutate(
        { file, onProgress: (percent) => updateProgress(uploadId, percent) },
        {
          onSuccess: () => {
            finishUpload(uploadId, 'success')
            showToast(`Uploaded "${file.name}".`)
          },
          onError: (err) => {
            finishUpload(uploadId, 'error')
            showToast(getErrorMessage(err, `Failed to upload "${file.name}".`), 'error')
          },
        }
      )
    })
  }

  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-center gap-2">
        <UploadCloud className="h-[18px] w-[18px] text-brand-500" />
        <h3 className="text-base font-semibold">Quick upload</h3>
      </div>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Drop files here, or browse from your device.</p>
      <div className="mt-4 flex-1">
        <UploadDropzone compact onFilesSelected={handleFilesSelected} />
      </div>
    </Card>
  )
}
