import { useEffect, useRef, useState } from 'react'

// Голосовой ввод через Web Speech API (если поддерживается).
export function useSpeech(onResult: (text: string) => void, lang = 'ru-RU') {
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const SpeechRecognition =
    typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined
  const supported = !!SpeechRecognition

  useEffect(() => {
    if (!supported) return
    const rec = new SpeechRecognition()
    rec.lang = lang
    rec.interimResults = false
    rec.continuous = false
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ')
      onResultRef.current(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => { try { rec.stop() } catch { /* ignore */ } }
  }, [supported, lang])

  const toggle = () => {
    const rec = recRef.current
    if (!rec) return
    if (listening) { rec.stop(); setListening(false) }
    else { try { rec.start(); setListening(true) } catch { /* already started */ } }
  }

  return { supported, listening, toggle }
}
