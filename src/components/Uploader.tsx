import { supabase } from '../lib/supabase'

export default function Uploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const path = `uploads/${Date.now()}-${f.name}`
    const { error } = await supabase.storage.from('props').upload(path, f, { upsert: false })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('props').getPublicUrl(path)
      onUploaded(publicUrl)
    }
  }
  return (
    <input
      type="file"
      accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo"
      onChange={onFile}
      className="text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-600"
    />
  )
}
