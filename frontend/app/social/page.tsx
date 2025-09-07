"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type Platform = "instagram" | "linkedin" | "twitter" | "youtube"

export default function SocialPreviewPage() {
  const router = useRouter()
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("instagram")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [fiveps, setFiveps] = useState<any>(null)
  const [feedback, setFeedback] = useState<string>("")

  useEffect(() => {
    try {
      setSelectedImage(localStorage.getItem("social_selected_image"))
      setFeedback(localStorage.getItem("social_feedback") || "")
      const fp = JSON.parse(localStorage.getItem("fiveps") || "null")
      setFiveps(fp)
    } catch {}
  }, [])

  const [postData, setPostData] = useState({
    title: "",
    caption: "",
    websiteLink: "www.yourwebsite.com",
    contactEmail: "hello@yourcompany.com",
    collaborationInfo: "Open for partnerships & collaborations",
    orderForm: "Link in bio for orders",
  })
  const [companyName, setCompanyName] = useState<string>("yourcompany")
  const [handle, setHandle] = useState<string>("@yourcompany")
  const [sponsored, setSponsored] = useState<boolean>(true)

  // Fetch Gemini-generated social copy when platform or inputs change
  useEffect(() => {
    const load = async () => {
      if (!fiveps) return
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"
        const res = await fetch(`${API_BASE}/api/v1/social_copy`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ platform: selectedPlatform, ...fiveps, feedback }),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setPostData((p) => ({
          ...p,
          title: data.title || p.title,
          caption: [data.caption, (data.hashtags||[]).join(" ")].filter(Boolean).join("\n\n"),
          websiteLink: data.website || p.websiteLink,
          contactEmail: data.contact_email || p.contactEmail,
        }))
        if (data.company_name) setCompanyName(data.company_name)
        if (data.handle) setHandle(data.handle)
        if (typeof data.sponsored === 'boolean') setSponsored(data.sponsored)
      } catch (e) {
        console.error(e)
        // fallback: simple composition
        const baseTitle = fiveps?.product ? `Introducing ${fiveps.product}` : "New Post"
        const caption = [fiveps?.promotion, feedback].filter(Boolean).join(" • ")
        setPostData((p) => ({ ...p, title: baseTitle, caption }))
      }
    }
    load()
  }, [selectedPlatform, JSON.stringify(fiveps), feedback])

  const platforms = [
    { id: "instagram", name: "Instagram", color: "from-pink-500 to-purple-600", icon: "📷", aspect: "1:1" },
    { id: "linkedin", name: "LinkedIn", color: "from-blue-600 to-blue-700", icon: "💼", aspect: "1200x627" },
    { id: "twitter", name: "Twitter", color: "from-blue-400 to-blue-500", icon: "🐦", aspect: "16:9" },
    { id: "youtube", name: "YouTube", color: "from-red-500 to-red-600", icon: "📺", aspect: "16:9" },
  ] as const

  const openCompose = async () => {
    // Copy caption to clipboard
    try { await navigator.clipboard.writeText(`${postData.title}\n\n${postData.caption}`) } catch {}

    // Download image with simple aspect fit (pad to white background)
    if (selectedImage) {
      try {
        const blob = await fetch(selectedImage).then(r => r.blob())
        const padded = await padToAspect(blob, selectedPlatform)
        const a = document.createElement("a")
        a.href = URL.createObjectURL(padded)
        a.download = suggestFilename(selectedPlatform)
        document.body.appendChild(a)
        a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000)
      } catch (e) { console.error(e) }
    }

    // Redirect to platform
    switch (selectedPlatform) {
      case "twitter": {
        const url = new URL("https://twitter.com/intent/tweet")
        url.searchParams.set("text", `${postData.title}\n\n${postData.caption}`)
        window.open(url.toString(), "_blank")
        break
      }
      case "linkedin": {
        // LinkedIn share generally requires a URL; open homepage as a convenience
        window.open("https://www.linkedin.com/", "_blank")
        break
      }
      case "instagram": {
        window.open("https://www.instagram.com/", "_blank")
        break
      }
      case "youtube": {
        window.open("https://studio.youtube.com/", "_blank")
        break
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-xl" />
        <div className="absolute bottom-32 left-1/4 w-28 h-28 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div
            onClick={() => router.push("/output_page")}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 border border-gray-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            <span className="text-gray-700 font-medium">Back to Output</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Social Media Post Preview</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Select a platform, copy-ready caption is prepared, and an image is downloaded with a matching aspect.</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-md">
            {platforms.map((p) => (
              <button key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${selectedPlatform===p.id?`bg-gradient-to-r ${p.color} text-white shadow-lg`:"text-gray-600 hover:bg-gray-100"}`}
              >
                <span>{p.icon}</span>{p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Platform-like preview cards */}
        <div className="flex justify-center mb-10">
          <div className="max-w-sm w-full">
            {selectedPlatform === "instagram" && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center p-3 border-b">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3"><span className="text-white text-xs font-bold">{(companyName||'YC').slice(0,2).toUpperCase()}</span></div>
                  <div><p className="font-semibold text-sm text-black">{companyName}</p><p className="text-xs text-gray-500">{sponsored ? 'Sponsored' : 'Public'}</p></div>
                </div>
                {/* Image */}
                <div className="aspect-square bg-white flex items-center justify-center">
                  {selectedImage ? (<img src={selectedImage} alt="post" className="w-full h-full object-contain" />) : (<div className="text-gray-400">No image selected</div>)}
                </div>
                {/* Actions */}
                <div className="p-3 flex items-center justify-between text-xl">
                  <div className="flex gap-4"><span>❤️</span><span>💬</span><span>📤</span></div>
                  <span>🔖</span>
                </div>
                {/* Likes + caption */}
                <div className="px-3 pb-3 text-sm">
                  <p className="mb-2 text-black"><span className="font-semibold">1,234 Likes</span></p>
                  <p className="text-black"><span className="font-semibold">{companyName}</span> <span className="whitespace-pre-wrap">{postData.caption}</span></p>
                  {/* Optional info block */}
                  <div className="mt-2 text-xs text-black space-y-1">
                    {postData.websiteLink && (<p className="text-black">🌐 {postData.websiteLink}</p>)}
                    {postData.contactEmail && (<p className="text-black">📧 {postData.contactEmail}</p>)}
                    {postData.collaborationInfo && (<p className="text-black">🤝 {postData.collaborationInfo}</p>)}
                    {postData.orderForm && (<p className="text-black">🛒 {postData.orderForm}</p>)}
                  </div>
                </div>
              </div>
            )}
            {selectedPlatform === "linkedin" && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="flex items-center p-4 border-b">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mr-3"><span className="text-white text-sm font-bold">{(companyName||'YC').slice(0,2).toUpperCase()}</span></div>
                  <div><p className="font-semibold text-black">{companyName}</p><p className="text-sm text-gray-500">Marketing Technology • 2h</p></div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-3 text-black">{postData.title}</h3>
                  <p className="text-sm text-black mb-4 whitespace-pre-wrap">{postData.caption}</p>
                  <div className="aspect-video bg-white rounded-lg border flex items-center justify-center">
                    {selectedImage ? (<img src={selectedImage} alt="post" className="w-full h-full object-contain" />) : (<div className="text-gray-400">No image selected</div>)}
                  </div>
                  <div className="text-sm text-black space-y-1 mt-4">
                    {postData.websiteLink && (<p className="text-black">🌐 Website: {postData.websiteLink}</p>)}
                    {postData.contactEmail && (<p className="text-black">📧 Contact: {postData.contactEmail}</p>)}
                    {postData.collaborationInfo && (<p className="text-black">🤝 {postData.collaborationInfo}</p>)}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t mt-3 text-gray-500"><span className="text-sm">👍 💬 🔄</span><span className="text-sm">42 reactions • 8 comments</span></div>
                </div>
              </div>
            )}
            {selectedPlatform === "twitter" && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mr-3"><span className="text-white text-sm font-bold">{(companyName||'YC').slice(0,2).toUpperCase()}</span></div>
                    <div className="flex-1">
                      <div className="flex items-center"><p className="font-bold text-black">{companyName}</p><span className="text-blue-500 ml-1">✓</span><p className="text-gray-500 ml-2">{handle} • 2h</p></div>
                    </div>
                  </div>
                  <div className="mb-3"><h3 className="font-semibold mb-2 text-black">{postData.title}</h3><p className="text-sm whitespace-pre-wrap text-black">{postData.caption}</p></div>
                  <div className="aspect-video bg-white rounded-lg border flex items-center justify-center mb-3">
                    {selectedImage ? (<img src={selectedImage} alt="post" className="w-full h-full object-contain" />) : (<div className="text-gray-400">No image selected</div>)}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t text-gray-500">
                    <span className="flex items-center text-sm">💬 12</span>
                    <span className="flex items-center text-sm">🔄 24</span>
                    <span className="flex items-center text-sm">❤️ 156</span>
                    <span className="flex items-center text-sm">📤</span>
                  </div>
                </div>
              </div>
            )}
            {selectedPlatform === "youtube" && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="aspect-video bg-white rounded-b-none border-b flex items-center justify-center">
                  {selectedImage ? (<img src={selectedImage} alt="post" className="w-full h-full object-contain" />) : (<div className="text-gray-400">No image selected</div>)}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-base mb-2 line-clamp-2 text-black">{postData.title}</h3>
                  <p className="text-sm text-black whitespace-pre-wrap">{postData.caption}</p>
                  <div className="flex items-center justify-between pt-3 border-t mt-3 text-gray-500">
                    <span className="flex items-center text-xs">👍 234</span>
                    <span className="flex items-center text-xs">👎 2</span>
                    <span className="flex items-center text-xs">💬 18</span>
                    <span className="flex items-center text-xs">📤 Share</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-xl mx-auto">
          <div className="w-full h-12 rounded-lg cursor-pointer flex items-center justify-center text-white font-semibold transition-all duration-300 hover:shadow-lg"
            style={{background:"linear-gradient(135deg,#22c55e 0%, #3b82f6 100%)"}}
            onClick={openCompose}
          >
            Post — Copy caption & download image
          </div>
        </div>
      </div>
    </div>
  )
}

function suggestFilename(platform: Platform): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  return `creative-${platform}-${ts}.png`
}

async function padToAspect(blob: Blob, platform: Platform): Promise<Blob> {
  // Determine aspect
  let target: number | null = null
  if (platform === "instagram") target = 1
  else if (platform === "twitter" || platform === "youtube") target = 16/9
  else if (platform === "linkedin") target = 1200/627

  const img = await blobToImage(blob)
  const [w, h] = [img.width, img.height]
  if (!target) return blob
  const current = w/h
  let canvasW = w, canvasH = h
  if (Math.abs(current - target) > 0.01) {
    if (current > target) {
      // too wide -> pad height
      canvasH = Math.round(w/target)
    } else {
      // too tall -> pad width
      canvasW = Math.round(h*target)
    }
  }
  const canvas = document.createElement("canvas")
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,canvasW,canvasH)
  const dx = Math.round((canvasW - w)/2)
  const dy = Math.round((canvasH - h)/2)
  ctx.drawImage(img, dx, dy)
  return await new Promise<Blob>((resolve)=>canvas.toBlob(b=>resolve(b||blob), "image/png", 0.95))
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.src = url
  })
}
