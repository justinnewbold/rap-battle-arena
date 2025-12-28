import { supabase, Beat, UserBeat } from './client'

export async function getBeats(): Promise<Beat[]> {
  const { data, error } = await supabase
    .from('beats')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching beats:', error)
    return []
  }
  return data || []
}

export async function uploadBeat(
  userId: string,
  name: string,
  artist: string,
  bpm: number,
  audioUrl: string,
  duration: number,
  coverUrl?: string,
  isPublic: boolean = false
): Promise<UserBeat | null> {
  const { data, error } = await supabase
    .from('beats')
    .insert({
      name,
      artist,
      bpm,
      audio_url: audioUrl,
      cover_url: coverUrl || null,
      duration,
      is_premium: false,
      uploaded_by: userId,
      is_public: isPublic
    })
    .select()
    .single()

  if (error) {
    console.error('Error uploading beat:', error)
    return null
  }
  return data
}

export async function getUserBeats(userId: string): Promise<UserBeat[]> {
  const { data, error } = await supabase
    .from('beats')
    .select('*')
    .eq('uploaded_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user beats:', error)
    return []
  }
  return data || []
}

export async function getPublicBeats(): Promise<UserBeat[]> {
  const { data, error } = await supabase
    .from('beats')
    .select('*')
    .eq('is_public', true)
    .order('play_count', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching public beats:', error)
    return []
  }
  return data || []
}

export async function deleteBeat(beatId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('beats')
    .delete()
    .eq('id', beatId)
    .eq('uploaded_by', userId)

  if (error) {
    console.error('Error deleting beat:', error)
    return false
  }
  return true
}

export async function incrementBeatPlayCount(beatId: string): Promise<void> {
  await supabase.rpc('increment_beat_play_count', { beat_id: beatId })
}

export async function uploadBeatFile(file: File, userId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('beats')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading beat file:', error)
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from('beats')
    .getPublicUrl(fileName)

  return publicUrl
}

export async function uploadBeatCover(file: File, userId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/covers/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('beats')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading beat cover:', error)
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from('beats')
    .getPublicUrl(fileName)

  return publicUrl
}
