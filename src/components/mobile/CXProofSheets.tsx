// @ts-nocheck
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Check, ChevronLeft, RotateCcw, ShieldCheck, Package, PenLine, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";

/**
 * Captures a photo with the rear camera, returns a Blob via onCapture.
 * Lightweight inline replacement for the customer DeliveryCamera, themed orange.
 */
function CameraCapture({
  label,
  onCapture,
  onCancel,
}: {
  label: string;
  onCapture: (blob: Blob, dataUrl: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (e) {
      toast.error("Camera unavailable");
      onCancel();
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // start on mount
  useState(() => {
    setTimeout(start, 0);
    return undefined;
  });

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      stop();
      onCapture(blob, url);
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div
        className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 text-white"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <button onClick={() => { stop(); onCancel(); }} className="p-2">
          <X className="h-6 w-6" />
        </button>
        <div className="text-sm font-semibold">{label}</div>
        <div className="w-9" />
      </div>
      <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
        <div className="w-4/5 aspect-square border-2 border-white/70 rounded-2xl" />
      </div>
      <div
        className="absolute bottom-0 inset-x-0 flex items-center justify-center py-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      >
        <button
          onClick={snap}
          className="h-20 w-20 rounded-full bg-orange-500 border-4 border-white shadow-2xl active:scale-95 transition flex items-center justify-center"
        >
          <Camera className="h-8 w-8 text-white" />
        </button>
      </div>
    </div>
  );
}

async function uploadProof(blob: Blob, kind: string, jobId: string, stopId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const path = `${user.id}/cx/${jobId}/${stopId}-${kind}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("delivery-photos").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("delivery-photos").getPublicUrl(path).data.publicUrl;
}

/** Best-effort GPS capture — never throws, never blocks the flow. */
async function snapPosition(): Promise<GeolocationPosition | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 },
    );
  });
}

async function logCxEvent(
  jobId: string,
  eventType: string,
  extra: { photo_url?: string | null; notes?: string | null; pos?: GeolocationPosition | null } = {},
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from("cx_job_events").insert({
      job_id: jobId,
      actor_id: user?.id ?? null,
      event_type: eventType,
      photo_url: extra.photo_url ?? null,
      notes: extra.notes ?? null,
      lat: extra.pos?.coords.latitude ?? null,
      lng: extra.pos?.coords.longitude ?? null,
      accuracy_m: extra.pos?.coords.accuracy ?? null,
    });
  } catch (err) {
    console.warn("[cx] logCxEvent failed", err);
  }
}

/**
 * Pickup proof: package verified + photo of package(s) at pickup.
 */
export function CXPickupProofSheet({
  job,
  stop,
  onClose,
  onConfirmed,
}: {
  job: any;
  stop: any;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [verified, setVerified] = useState(false);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [cam, setCam] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!verified || !photo) {
      toast.error("Confirm the package and capture a pickup photo");
      return;
    }
    setBusy(true);
    try {
      const pos = await snapPosition();
      const url = await uploadProof(photo.blob, "pickup", job.id, stop.id);
      const { error: e1 } = await supabase
        .from("cx_job_stops")
        .update({
          pickup_photo_url: url,
          pickup_photo_lat: pos?.coords.latitude ?? null,
          pickup_photo_lng: pos?.coords.longitude ?? null,
          package_verified_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", stop.id);
      if (e1) throw e1;
      await logCxEvent(job.id, "pickup_photo_captured", {
        photo_url: url,
        notes: "Package verified at pickup",
        pos,
      });
      const { data, error: e2 } = await supabase.functions.invoke("cx-update-status", {
        body: { job_id: job.id, status: "picked_up" },
      });
      if (e2 || data?.error) throw new Error(data?.error ?? e2?.message ?? "Couldn't update");
      toast.success("Pickup confirmed");
      onConfirmed();
    } catch (e: any) {
      toast.error(e.message ?? "Pickup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-white flex flex-col">
      <div
        className="bg-[#0F2A2A] text-white px-4 pb-3 flex items-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <button onClick={onClose} className="p-1 -ml-1"><ChevronLeft className="h-6 w-6" /></button>
        <div className="flex-1 text-center text-base font-semibold pr-6">Confirm Pickup</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <div className="text-[10px] tracking-widest font-bold text-slate-500">PICKING UP FROM</div>
          <div className="text-lg font-semibold text-slate-900 mt-1">{stop.address}</div>
          {stop.contact_name && (
            <div className="text-sm text-slate-600 mt-0.5">Contact: {stop.contact_name}</div>
          )}
        </div>

        <div className="border rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">Package verification</div>
              <div className="text-xs text-slate-600 mt-1">
                {stop.package_label || stop.package_description || "Confirm the package matches the order details."}
              </div>
            </div>
          </div>
          <button
            onClick={() => setVerified((v) => !v)}
            className={`mt-3 w-full h-12 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition ${
              verified ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-700"
            }`}
          >
            {verified ? <ShieldCheck className="h-5 w-5" /> : null}
            {verified ? "Package verified" : "I have the correct package"}
          </button>
        </div>

        <div className="border rounded-2xl p-4">
          <div className="text-sm font-semibold text-slate-900">Pickup photo</div>
          <div className="text-xs text-slate-600 mt-1">
            Capture a clear photo of the package(s) before leaving.
          </div>
          {photo ? (
            <div className="mt-3">
              <img src={photo.url} alt="Pickup" className="w-full rounded-xl object-cover max-h-64" />
              <button
                onClick={() => setPhoto(null)}
                className="mt-2 text-sm text-slate-600 inline-flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" /> Retake
              </button>
            </div>
          ) : (
            <Button
              onClick={() => setCam(true)}
              variant="outline"
              className="mt-3 w-full h-12 border-2 border-orange-300 text-orange-700 font-semibold"
            >
              <Camera className="h-5 w-5 mr-2" /> Take pickup photo
            </Button>
          )}
        </div>
      </div>

      <div
        className="border-t bg-white px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <Button
          disabled={busy || !verified || !photo}
          onClick={submit}
          className="w-full h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-base font-bold tracking-wide"
        >
          {busy ? "CONFIRMING…" : "CONFIRM PICKUP"}
        </Button>
      </div>

      {cam && (
        <CameraCapture
          label="Pickup photo"
          onCancel={() => setCam(false)}
          onCapture={(blob, url) => {
            setPhoto({ blob, url });
            setCam(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Dropoff proof: delivery photo + signature (unless waived for this stop).
 */
export function CXDropoffProofSheet({
  job,
  stop,
  onClose,
  onConfirmed,
}: {
  job: any;
  stop: any;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [cam, setCam] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [sigSaved, setSigSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signatureRequired = stop.signature_required !== false;

  const clearSig = () => {
    sigRef.current?.clear();
    setSigSaved(null);
  };

  const captureSig = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Please capture the customer's signature");
      return null;
    }
    const dataUrl = sigRef.current.getCanvas().toDataURL("image/png");
    setSigSaved(dataUrl);
    return dataUrl;
  };

  const submit = async () => {
    if (!photo) {
      toast.error("Capture a delivery photo");
      return;
    }
    let signaturePngDataUrl: string | null = null;
    if (signatureRequired) {
      if (!signerName.trim()) {
        toast.error("Enter the recipient's name");
        return;
      }
      signaturePngDataUrl = sigSaved || captureSig();
      if (!signaturePngDataUrl) return;
    }

    setBusy(true);
    try {
      const pos = await snapPosition();
      const photoUrl = await uploadProof(photo.blob, "dropoff", job.id, stop.id);

      let signatureUrl: string | null = null;
      if (signaturePngDataUrl) {
        const sigBlob = await (await fetch(signaturePngDataUrl)).blob();
        const { data: { user } } = await supabase.auth.getUser();
        const sigPath = `${user!.id}/cx/${job.id}/${stop.id}-signature-${Date.now()}.png`;
        const { error: sigErr } = await supabase.storage
          .from("delivery-photos")
          .upload(sigPath, sigBlob, { contentType: "image/png", upsert: false });
        if (sigErr) throw sigErr;
        signatureUrl = supabase.storage.from("delivery-photos").getPublicUrl(sigPath).data.publicUrl;
      }

      const { error: e1 } = await supabase
        .from("cx_job_stops")
        .update({
          dropoff_photo_url: photoUrl,
          dropoff_photo_lat: pos?.coords.latitude ?? null,
          dropoff_photo_lng: pos?.coords.longitude ?? null,
          signature_url: signatureUrl,
          signer_name: signerName || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", stop.id);
      if (e1) throw e1;
      await logCxEvent(job.id, "delivery_photo_captured", {
        photo_url: photoUrl,
        notes: signerName ? `Signed by ${signerName}` : "Delivered (no-signature waived)",
        pos,
      });
      if (signatureUrl) {
        await logCxEvent(job.id, "signature_captured", {
          photo_url: signatureUrl,
          notes: `Recipient: ${signerName}`,
          pos,
        });
      }

      const { data, error: e2 } = await supabase.functions.invoke("cx-update-status", {
        body: { job_id: job.id, status: "delivered" },
      });
      if (e2 || data?.error) throw new Error(data?.error ?? e2?.message ?? "Couldn't update");
      toast.success("Delivered");
      onConfirmed();
    } catch (e: any) {
      toast.error(e.message ?? "Delivery failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-white flex flex-col">
      <div
        className="bg-[#0F2A2A] text-white px-4 pb-3 flex items-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <button onClick={onClose} className="p-1 -ml-1"><ChevronLeft className="h-6 w-6" /></button>
        <div className="flex-1 text-center text-base font-semibold pr-6">Confirm Delivery</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <div className="text-[10px] tracking-widest font-bold text-slate-500">DELIVERING TO</div>
          <div className="text-lg font-semibold text-slate-900 mt-1">{stop.address}</div>
          {stop.contact_name && (
            <div className="text-sm text-slate-600 mt-0.5">Contact: {stop.contact_name}</div>
          )}
        </div>

        <div className="border rounded-2xl p-4">
          <div className="text-sm font-semibold text-slate-900">Delivery photo</div>
          <div className="text-xs text-slate-600 mt-1">
            Photo of the package at the drop-off location (door, counter, recipient).
          </div>
          {photo ? (
            <div className="mt-3">
              <img src={photo.url} alt="Delivery" className="w-full rounded-xl object-cover max-h-64" />
              <button
                onClick={() => setPhoto(null)}
                className="mt-2 text-sm text-slate-600 inline-flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" /> Retake
              </button>
            </div>
          ) : (
            <Button
              onClick={() => setCam(true)}
              variant="outline"
              className="mt-3 w-full h-12 border-2 border-orange-300 text-orange-700 font-semibold"
            >
              <Camera className="h-5 w-5 mr-2" /> Take delivery photo
            </Button>
          )}
        </div>

        {signatureRequired ? (
          <div className="border rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-orange-500" />
              <div className="text-sm font-semibold text-slate-900">Recipient signature</div>
            </div>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Recipient name"
              className="mt-3 w-full h-11 px-3 rounded-lg border border-slate-300 text-sm"
            />
            <div className="mt-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
              <SignatureCanvas
                ref={(r) => (sigRef.current = r)}
                canvasProps={{
                  className: "w-full",
                  style: { width: "100%", height: 180, borderRadius: 12, background: "white" },
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <button onClick={clearSig} className="text-sm text-slate-600">Clear</button>
              <button
                onClick={() => captureSig() && toast.success("Signature captured")}
                className="text-sm font-semibold text-orange-600 inline-flex items-center gap-1"
              >
                <Check className="h-4 w-4" /> Save signature
              </button>
            </div>
          </div>
        ) : (
          <div className="border rounded-2xl p-4 bg-slate-50 text-sm text-slate-700">
            Customer waived signature. Delivery photo is sufficient.
          </div>
        )}
      </div>

      <div
        className="border-t bg-white px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <Button
          disabled={busy || !photo || (signatureRequired && !signerName.trim())}
          onClick={submit}
          className="w-full h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-base font-bold tracking-wide"
        >
          {busy ? "FINISHING…" : "COMPLETE DELIVERY"}
        </Button>
      </div>

      {cam && (
        <CameraCapture
          label="Delivery photo"
          onCancel={() => setCam(false)}
          onCapture={(blob, url) => {
            setPhoto({ blob, url });
            setCam(false);
          }}
        />
      )}
    </div>
  );
}