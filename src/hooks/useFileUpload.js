import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { invokeFn } from '@/api/functions'

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  async function uploadFile({ file, organisationId, linkedEntityType, linkedEntityId, retentionDays }) {
    setUploading(true)
    setError(null)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `${organisationId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('evidence')
        .getPublicUrl(filePath)

      const result = await invokeFn('upload-evidence', {
        file_url: filePath,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        linked_entity_type: linkedEntityType,
        linked_entity_id: linkedEntityId,
        organisation_id: organisationId,
        retention_days: retentionDays,
      })

      return result.data
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setUploading(false)
    }
  }

  return { uploadFile, uploading, error }
}
