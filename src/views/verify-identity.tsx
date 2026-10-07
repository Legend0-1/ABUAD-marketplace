'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChevronRight, ShieldCheck, Loader2, CheckCircle2, Clock, XCircle, Upload, X, Lock, IdCard,
  Video, Square, RotateCcw, Camera, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ID_TYPES, ID_TYPE_LABELS, requiresBackImage, FACE_VIDEO_SECONDS, MAX_FACE_VIDEO_CHARS, type IdType,
} from '@/lib/verification'

type MyVerification = {
  idType: string
  status: string
  rejectionReason?: string | null
  reviewedAt?: string | null
  createdAt?: string
  updatedAt?: string
} | null

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function VerifyIdentityPage() {
  const { user, setView, setAuthModalOpen, setUser } = useStore()
  const [loading, setLoading] = useState(true)
  const [idVerified, setIdVerified] = useState(false)
  const [record, setRecord] = useState<MyVerification>(null)

  const [idType, setIdType] = useState<IdType>('national_id')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [faceVideo, setFaceVideo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) { setAuthModalOpen(true); setLoading(false); return }
    (async () => {
      const { data } = await api<{ idVerified: boolean; verification: MyVerification }>('/api/verification/me')
      setIdVerified(!!data?.idVerified)
      setRecord(data?.verification || null)
      if (data?.verification?.idType && (ID_TYPES as readonly string[]).includes(data.verification.idType)) {
        setIdType(data.verification.idType as IdType)
      }
      // If the fresh check says we're verified but the store still has the old
      // flag (an admin approved us since this session loaded), refresh the store
      // so the selling gates stop blocking. /api/auth/me returns the canonical
      // shape the rest of the app expects.
      if (data?.idVerified && !user.idVerified) {
        api<{ user: any }>('/api/auth/me').then(({ data: me }) => { if (me?.user) setUser(me.user) })
      }
      setLoading(false)
    })()
  }, [user, setAuthModalOpen, setUser])

  const onPick = (which: 'front' | 'back', file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image too large', { description: 'Maximum 5MB. Try a smaller or more compressed photo.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      if (which === 'front') setFront(dataUrl)
      else setBack(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!front) { toast.error('Upload a photo of the front of your ID'); return }
    if (requiresBackImage(idType) && !back) { toast.error('Upload a photo of the back of your ID too'); return }
    if (!faceVideo) { toast.error('Record the short facial video so we can confirm it\'s you'); return }
    setBusy(true)
    const { data, error } = await api<{ message?: string }>('/api/verification/submit', {
      method: 'POST',
      body: { idType, frontImageUrl: front, backImageUrl: back || undefined, faceVideoUrl: faceVideo },
    })
    setBusy(false)
    if (error) { toast.error('Could not submit', { description: error }); return }
    toast.success('Submitted for review', { description: data?.message })
    setRecord({ idType, status: 'pending' })
    setFront(''); setBack(''); setFaceVideo('')
    // Keep the store's user flag in sync (still unverified until an admin approves,
    // but this refreshes any other derived state cleanly).
    api<{ user: any }>('/api/auth/me').then(({ data }) => { if (data?.user) setUser(data.user) })
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="w-10 h-10 mx-auto text-primary mb-3" />
        <p className="text-muted-foreground mb-4">Sign in to verify your identity.</p>
        <Button onClick={() => setAuthModalOpen(true)}>Sign In</Button>
      </div>
    )
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin" /></div>

  const status = idVerified ? 'approved' : (record?.status || 'none')
  const showForm = status === 'none' || status === 'rejected'

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Verify your identity</span>
      </div>

      <div className="bg-primary text-primary-foreground rounded-lg p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Identity Verification</h1>
            <p className="text-sm text-white/80">Confirm who you are to start selling on UNI MART.</p>
          </div>
        </div>
      </div>

      {/* Status cards */}
      {status === 'approved' && (
        <div className="bg-card border rounded-lg p-6 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-2" />
          <h2 className="font-bold text-lg">You're verified</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Your identity has been confirmed. You can set up a storefront and start listing.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setView({ name: 'setup-storefront' })}>Set up Storefront</Button>
            <Button variant="outline" onClick={() => setView({ name: 'home' })}>Browse</Button>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="bg-card border rounded-lg p-6 text-center">
          <Clock className="w-12 h-12 mx-auto text-amber-500 mb-2" />
          <h2 className="font-bold text-lg">Under review</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We've received your {ID_TYPE_LABELS[(record?.idType as IdType)] || 'ID'} and it's being reviewed. This is usually quick —
            you'll be able to sell as soon as it's approved.
          </p>
        </div>
      )}

      {status === 'rejected' && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-500/30 rounded-lg p-4 mb-4 flex gap-2">
          <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-red-700 dark:text-red-400">Your previous submission was rejected</p>
            {record?.rejectionReason && <p className="text-red-700/90 dark:text-red-400/90 mt-0.5">Reason: {record.rejectionReason}</p>}
            <p className="text-muted-foreground mt-1">Please re-check the guidance below and submit again.</p>
          </div>
        </div>
      )}

      {/* Submission form (new or re-submit after rejection) */}
      {showForm && (
        <div className="bg-card border rounded-lg p-4 sm:p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400 flex gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your ID is used only to confirm your identity and is visible only to UNI MART admins. Make sure the photo is clear, in focus, and shows all four corners of the document.</span>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-1"><IdCard className="w-4 h-4 text-primary" /> Which ID are you using? <span className="text-destructive">*</span></Label>
            <Select value={idType} onValueChange={(v) => { setIdType(v as IdType); setBack('') }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ID_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{ID_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <ImageDropzone
              label={requiresBackImage(idType) ? 'Front of ID' : 'Photo page'}
              required
              value={front}
              onPick={(f) => onPick('front', f)}
              onClear={() => setFront('')}
            />
            {requiresBackImage(idType) && (
              <ImageDropzone
                label="Back of ID"
                required
                value={back}
                onPick={(f) => onPick('back', f)}
                onClear={() => setBack('')}
              />
            )}
          </div>

          <LivenessRecorder value={faceVideo} onChange={setFaceVideo} />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setView({ name: 'home' })}>Cancel</Button>
            <Button onClick={submit} disabled={busy} size="lg">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : <><Upload className="w-4 h-4 mr-2" /> Submit for review</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageDropzone({
  label, required, value, onPick, onClear,
}: {
  label: string; required?: boolean; value: string; onPick: (f: File | undefined) => void; onClear: () => void
}) {
  return (
    <div>
      <Label className="text-xs">{label} {required && <span className="text-destructive">*</span>}</Label>
      {value ? (
        <div className="relative mt-1 aspect-[16/10] bg-muted rounded-lg overflow-hidden border">
          <img src={value} alt={label} className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
            aria-label={`Remove ${label}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className="mt-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg aspect-[16/10] cursor-pointer hover:bg-accent/30">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <Upload className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Tap to upload or take a photo</span>
        </label>
      )}
    </div>
  )
}

// Picks the first container/codec the browser will actually record. Chrome/Edge
// give us WebM; Safari (iOS/macOS) tends to give MP4. An empty string lets the
// browser use its own default if none of these are reported.
function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return ''
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  for (const c of candidates) {
    try { if (MediaRecorder.isTypeSupported(c)) return c } catch { /* ignore */ }
  }
  return ''
}

// A short, scripted liveness (selfie) recording — the same idea as a bank app's
// "record a video to confirm it's you" step. The user films their own face with
// the front camera for a few seconds; the clip is stored with the submission so
// an admin can match the face against the ID photo. Nothing is uploaded here —
// the parent holds the data URL and sends it with the rest of the submission.
function LivenessRecorder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const liveRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [recording, setRecording] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(FACE_VIDEO_SECONDS)
  const [cameraError, setCameraError] = useState('')

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined'

  // Always release the camera when the component unmounts so the indicator light
  // doesn't stay on after the user navigates away.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Show the live camera feed the moment the preview is on screen. We attach the
  // MediaStream here, in an effect, rather than right after getUserMedia — that
  // way the <video> element is guaranteed to be mounted (its ref is set), so you
  // see yourself immediately instead of a black frame that only "fills in" after
  // recording. Together with autoPlay + muted on the element, this behaves like a
  // phone's video recorder: the live feed is visible while you record.
  useEffect(() => {
    const el = liveRef.current
    if (cameraOn && el && streamRef.current) {
      el.srcObject = streamRef.current
      el.play().catch(() => {})
    }
  }, [cameraOn])

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      // Flip the preview on; the effect above attaches the stream to the <video>
      // as soon as the element is mounted, so the live feed shows right away.
      setCameraOn(true)
    } catch {
      setCameraError('We couldn\'t access your camera. Allow camera access in your browser, then try again.')
    }
  }

  const stopCamera = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
    setRecording(false)
  }

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream || recording) return
    try {
      const mimeType = pickRecorderMime()
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
        chunksRef.current = []
        if (blob.size === 0) { toast.error('Nothing was recorded — please try again'); return }
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          if (result.length > MAX_FACE_VIDEO_CHARS) {
            toast.error('Video too large', { description: 'Please record a shorter clip.' })
            return
          }
          onChange(result)
        }
        reader.readAsDataURL(blob)
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
      setSecondsLeft(FACE_VIDEO_SECONDS)
      // Auto-stop after FACE_VIDEO_SECONDS. We compute remaining time from a
      // wall-clock deadline so the countdown stays accurate even if the interval
      // is throttled in a background tab.
      const deadline = Date.now() + FACE_VIDEO_SECONDS * 1000
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
        setSecondsLeft(remaining)
        if (remaining <= 0) finishRecording()
      }, 250)
    } catch {
      toast.error('Recording isn\'t supported here', { description: 'Try a recent Chrome, Edge, or Safari.' })
    }
  }

  // Shared end-of-recording path for both the auto-stop timer and the Stop button.
  const finishRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      try { recorderRef.current.stop() } catch { /* ignore */ }
    }
    setRecording(false)
    stopCamera()
  }

  const redo = () => { onChange(''); setSecondsLeft(FACE_VIDEO_SECONDS) }

  return (
    <div>
      <Label className="flex items-center gap-1.5 mb-1">
        <Video className="w-4 h-4 text-primary" /> Facial video (liveness check) <span className="text-destructive">*</span>
      </Label>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400 flex gap-2 mb-2">
        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Record a {FACE_VIDEO_SECONDS}-second video of your face — look straight at the camera and slowly turn your head. This confirms you match the photo on your ID. Only UNI MART admins can see it.</span>
      </div>

      {value ? (
        // Already recorded — show the clip with a redo option.
        <div className="relative">
          <video
            src={value}
            controls
            playsInline
            className="w-full max-w-xs mx-auto rounded-lg border bg-black"
          />
          <div className="flex justify-center mt-2">
            <Button type="button" variant="outline" size="sm" onClick={redo}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Record again
            </Button>
          </div>
        </div>
      ) : cameraOn ? (
        // Live camera preview + record / stop controls.
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-xs rounded-lg overflow-hidden border bg-black">
            <video ref={liveRef} autoPlay muted playsInline className="w-full aspect-[3/4] object-cover" />
            {recording && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {secondsLeft}s
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            {recording ? (
              <Button type="button" size="sm" variant="destructive" onClick={finishRecording}>
                <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={startRecording}>
                <Video className="w-3.5 h-3.5 mr-1.5" /> Start recording
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={stopCamera} disabled={recording}>Cancel</Button>
          </div>
        </div>
      ) : (
        // Idle — prompt to open the camera.
        <div className="flex flex-col items-center gap-2">
          {cameraError ? (
            <div className="flex gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-3 w-full">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{cameraError}</span>
            </div>
          ) : null}
          <Button type="button" variant="outline" onClick={supported ? startCamera : undefined} disabled={!supported}>
            <Camera className="w-4 h-4 mr-2" /> {cameraError ? 'Try camera again' : 'Open camera'}
          </Button>
          {!supported && (
            <p className="text-xs text-muted-foreground text-center">
              Video recording isn't supported in this browser. Please open UNI MART in a recent Chrome, Edge, or Safari to verify.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
