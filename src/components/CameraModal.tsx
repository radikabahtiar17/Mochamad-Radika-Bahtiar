import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Upload, X } from 'lucide-react';
import { captureVideoFrame } from '../utils/imageCompress';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  onFallbackFilePick: () => void;
}

export function CameraModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackFilePick,
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      setIsStarting(true);
      setCameraError(null);
      stopStream();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Browser atau perangkat ini tidak mendukung akses kamera langsung. Gunakan tombol Unggah File Foto di bawah.',
        );
        setIsStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            'Kamera tidak terdeteksi atau izin kamera belum diberikan. Anda tetap dapat mengunggah foto langsung dari galeri/komputer.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsStarting(false);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const dataUrl = captureVideoFrame(videoRef.current);
      stopStream();
      onCapture(dataUrl);
      onClose();
    } catch {
      setCameraError('Gagal mengambil gambar dari kamera. Silakan coba lagi atau unggah file foto.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
    >
      <div className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 id="camera-modal-title" className="font-display text-base font-semibold text-slate-900">
            Ambil Foto Bukti Lapangan
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup kamera"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {cameraError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
              <p>{cameraError}</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFallbackFilePick();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                Pilih File Foto dari Perangkat
              </button>
            </div>
          ) : (
            <div className="relative aspect-[4/3] bg-slate-900 rounded-lg overflow-hidden border border-slate-200">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-white text-sm">
                  Menyiapkan kamera...
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
              }
              disabled={!!cameraError || isStarting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Ganti Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={handleTakeSnapshot}
                  disabled={isStarting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  Ambil Foto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
