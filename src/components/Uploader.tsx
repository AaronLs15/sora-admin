import { supabase } from '../lib/supabase'

export default function Uploader({ onUploaded }:{ onUploaded:(url:string)=>void }){
  async function onFile(e:React.ChangeEvent<HTMLInputElement>){
    const f = e.target.files?.[0]
    if(!f) return
    const path = `uploads/${Date.now()}-${f.name}`
    const { error } = await supabase.storage.from('props').upload(path, f, { upsert:false })
    if(!error){
      const { data: { publicUrl } } = supabase.storage.from('props').getPublicUrl(path)
      onUploaded(publicUrl)
    }
  }
  return <input type="file" accept="image/*" onChange={onFile} />
}
