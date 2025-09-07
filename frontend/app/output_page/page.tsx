"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Wand2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function OutputPage() {
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [messageBox, setMessageBox] = useState({ isVisible: false, title: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([])
  const [fiveps, setFiveps] = useState<any>(null)

  const [imagesLoading, setImagesLoading] = useState(false)

  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem("image_urls") || "[]")
      const fp = JSON.parse(localStorage.getItem("fiveps") || "null")
      setImages(arr)
      setFiveps(fp)
      const pending = localStorage.getItem("pending_generate") === "1"
      if ((arr.length === 0 || pending) && fp) {
        // Kick off generation on this page so user sees loading state
        ;(async () => {
          try {
            setImagesLoading(true)
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
            const res = await fetch(`${API_BASE}/api/v1/generate`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                product: fp.product,
                price: fp.price,
                place: fp.place,
                promotion: fp.promotion,
                people: fp.people,
              }),
            })
            if (!res.ok) throw new Error(await res.text())
            const data = await res.json()
            const urls: string[] = data.image_urls || (data.image_url ? [data.image_url] : [])
            setImages(urls)
            localStorage.setItem("image_urls", JSON.stringify(urls))
          } catch (e) {
            console.error(e)
            setMessageBox({ isVisible: true, title: "Error", message: "Failed to generate creatives." })
          } finally {
            setImagesLoading(false)
            localStorage.removeItem("pending_generate")
          }
        })()
      }
    } catch {}
  }, [])

  const handleImageSelect = (index: number) => {
    setSelectedImage(index)
  }

  const handleFeedbackSubmit = async () => {
    if (selectedImage === null) {
      setMessageBox({
        isVisible: true,
        title: "Feedback Required",
        message: "Please select a creative before regenerating."
      });
      return;
    }
    setIsSubmitting(true);
    setImagesLoading(true)
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
      const selected_url = images[selectedImage]
      const res = await fetch(`${API_BASE}/api/v1/regenerate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product: fiveps?.product || "",
          price: fiveps?.price || "",
          place: fiveps?.place || "",
          promotion: fiveps?.promotion || "",
          people: fiveps?.people || "",
          selected_image_url: selected_url,
          feedback,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const urls: string[] = data.image_urls || []
      setImages(urls)
      localStorage.setItem("image_urls", JSON.stringify(urls))
      setSelectedImage(null)
      setFeedback("")
      setMessageBox({ isVisible: true, title: "Regenerated", message: "Created 4 new variants based on your selection." })
    } catch (e: any) {
      console.error(e)
      setMessageBox({ isVisible: true, title: "Error", message: e?.message || "Regenerate failed" })
    } finally {
      setIsSubmitting(false)
      setImagesLoading(false)
    }
  }

  const handleCloseMessageBox = () => {
    setMessageBox({ isVisible: false, title: "", message: "" });
  };

  const handleBackToInput = () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
    const urls = images
    // Fire-and-forget cleanup; don't block navigation
    navigator.sendBeacon?.(
      `${API_BASE}/api/v1/cleanup`,
      new Blob([JSON.stringify({ image_urls: urls })], { type: "application/json" })
    )
    localStorage.removeItem("image_urls")
    localStorage.removeItem("pending_generate")
    router.push("/")
  }

  const handleGoHome = () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
    const urls = images
    navigator.sendBeacon?.(
      `${API_BASE}/api/v1/cleanup`,
      new Blob([JSON.stringify({ image_urls: urls })], { type: "application/json" })
    )
    localStorage.removeItem("image_urls")
    localStorage.removeItem("pending_generate")
    router.push("/")
  }

  const handleDownloadImage = async (imageIndex: number) => {
    try {
      const url = images[imageIndex]
      const filename = (url.split("/").pop() || "creative.png").split("?")[0]
      // Fetch the image as a Blob to force a real download (works cross-origin)
      const resp = await fetch(url, { mode: "cors" })
      if (!resp.ok) throw new Error("Failed to fetch image for download")
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.error(e)
      // Fallback: open in new tab if download fails
      const url = images[imageIndex]
      window.open(url, "_blank")
    }
  }

  // Best-effort cleanup when tab/window closes
  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
    const onUnload = () => {
      const urls = JSON.parse(localStorage.getItem("image_urls") || "[]")
      if (urls && urls.length && navigator.sendBeacon) {
        const data = new Blob([JSON.stringify({ image_urls: urls })], { type: "application/json" })
        navigator.sendBeacon(`${API_BASE}/api/v1/cleanup`, data)
      }
      // Do not clear localStorage here to allow retry if beacon fails
    }
    window.addEventListener("pagehide", onUnload)
    window.addEventListener("beforeunload", onUnload)
    return () => {
      window.removeEventListener("pagehide", onUnload)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-32 left-1/4 w-28 h-28 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div
            onClick={handleBackToInput}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 border border-gray-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-gray-700 font-medium">Back to Input</span>
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Generated Marketing Creatives</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select your preferred creative and provide feedback for improvements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(imagesLoading ? [null, null, null, null] : (images.length ? images : [null, null, null, null])).map((u, idx) => (
            <Card
              key={idx}
              className={`bg-white cursor-pointer transition-all duration-300 hover:shadow-xl ${
                selectedImage === idx ? "ring-4 ring-purple-500 shadow-2xl" : "hover:shadow-lg"
              }`}
              onClick={() => handleImageSelect(idx)}
            >
              <CardContent className="p-6">
                <div className="aspect-video bg-white rounded-lg flex items-center justify-center mb-4 overflow-hidden border border-gray-200">
                  {u ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u} alt={`Creative ${idx + 1}`} className="w-full h-full object-contain bg-white" />
                  ) : (
                    <div className="w-full h-full animate-pulse bg-white/70"></div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {selectedImage === idx && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownloadImage(idx)
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-all duration-200"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-sm text-gray-600 font-medium">Download</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="max-w-4xl mx-auto mb-8 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Provide Feedback for Improvements</h2>

            {selectedImage !== null && (
              <div className="mb-4 text-center">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  Selected: Creative {selectedImage + 1}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                What changes would you like to make to the selected creative?
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe the changes you'd like to see... (e.g., change colors, modify text, adjust layout, different style, etc.)"
                className="w-full h-32 px-4 py-3 bg-white/70 border border-gray-200 rounded-xl placeholder:text-gray-500 text-gray-800 focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition resize-none"
              />
            </div>

            <div
              onClick={handleFeedbackSubmit}
              className={`w-full mt-6 h-12 rounded-lg cursor-pointer flex items-center justify-center text-white font-semibold transition-all duration-300 hover:shadow-lg ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #be185d 100%)",
              }}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 animate-pulse" />
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Feedback & Regenerate"
              )}
            </div>

            {/* Create Social Post button */}
            <div
              onClick={() => {
                if (selectedImage === null) {
                  setMessageBox({ isVisible: true, title: "Select a Creative", message: "Please select one of the creatives first." })
                  return
                }
                try {
                  const selected_url = images[selectedImage]
                  localStorage.setItem("social_selected_image", selected_url)
                  localStorage.setItem("social_feedback", feedback || "")
                  // Reuse fiveps stored earlier
                  router.push("/social")
                } catch (e) {
                  console.error(e)
                  setMessageBox({ isVisible: true, title: "Error", message: "Could not prepare social post." })
                }
              }}
              className="w-full mt-3 h-12 rounded-lg cursor-pointer flex items-center justify-center text-white font-semibold transition-all duration-300 hover:shadow-lg"
              style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }}
            >
              Create Social Post
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <div
            onClick={handleGoHome}
            className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 border border-gray-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-gray-700 font-medium">Home</span>
          </div>
        </div>
      </div>

      {messageBox.isVisible && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-2 text-gray-800">{messageBox.title}</h3>
            <p className="text-gray-600 mb-4">{messageBox.message}</p>
            <button
              onClick={handleCloseMessageBox}
              className="w-full h-10 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
